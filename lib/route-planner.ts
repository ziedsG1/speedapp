import { DirectionsError, fetchWalkingRoute, type RouteResult } from '@/lib/directions';
import type { Coordinate } from '@/lib/marathon';

const BEARINGS = [0, 90, 180, 270];

export function offsetCoordinate(
  origin: Coordinate,
  distanceKm: number,
  bearingDeg: number
): Coordinate {
  const R = 6371;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lon1 = (origin.longitude * Math.PI) / 180;
  const d = distanceKm / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { latitude: (lat2 * 180) / Math.PI, longitude: (lon2 * 180) / Math.PI };
}

type PlanCandidate = {
  result: RouteResult;
  destination: Coordinate;
  diff: number;
};

async function planOneBearing(
  origin: Coordinate,
  targetKm: number,
  bearing: number
): Promise<PlanCandidate | null> {
  let scale = 0.72;
  let best: PlanCandidate | null = null;

  for (let i = 0; i < 4; i++) {
    const dest = offsetCoordinate(origin, targetKm * scale, bearing);
    try {
      const result = await fetchWalkingRoute(origin, dest);
      const diff = Math.abs(result.distanceKm - targetKm);
      if (!best || diff < best.diff) {
        best = { result, destination: dest, diff };
      }
      const ratio = result.distanceKm / targetKm;
      if (Math.abs(ratio - 1) < 0.06) break;
      scale = scale / ratio;
    } catch {
      break;
    }
  }

  return best;
}

/** Find a street route from origin close to the requested distance (km). */
export async function planRouteForTargetDistance(
  origin: Coordinate,
  targetKm: number
): Promise<RouteResult & { destination: Coordinate }> {
  if (targetKm <= 0) {
    throw new DirectionsError('Enter a distance greater than 0 km.');
  }

  let best: PlanCandidate | null = null;

  for (const bearing of BEARINGS) {
    const candidate = await planOneBearing(origin, targetKm, bearing);
    if (candidate && (!best || candidate.diff < best.diff)) {
      best = candidate;
    }
  }

  if (!best) {
    throw new DirectionsError('Could not plan a street route for this distance.');
  }

  return {
    ...best.result,
    destination: best.destination,
  };
}
