import { DirectionsError, fetchWalkingRoute, type RouteResult } from '@/lib/directions';
import type { Coordinate } from '@/lib/marathon';

/** 16 compass directions — rotated on each plan request for variety. */
const BEARINGS = Array.from({ length: 16 }, (_, i) => i * 22.5);

let nextBearingIndex = Math.floor(Math.random() * BEARINGS.length);

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
  bearing: number;
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
        best = { result, destination: dest, diff, bearing };
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

function pickBearingsForRequest(): number[] {
  const primary = nextBearingIndex % BEARINGS.length;
  nextBearingIndex = (nextBearingIndex + 1) % BEARINGS.length;

  const jitter = () => Math.random() * 24 - 12;
  const order = [
    primary,
    (primary + 4) % BEARINGS.length,
    (primary + 8) % BEARINGS.length,
    (primary + 12) % BEARINGS.length,
    Math.floor(Math.random() * BEARINGS.length),
  ];

  const seen = new Set<number>();
  const bearings: number[] = [];
  for (const idx of order) {
    const base = BEARINGS[idx];
    const rounded = Math.round((base + jitter()) * 10) / 10;
    const key = Math.round(rounded);
    if (!seen.has(key)) {
      seen.add(key);
      bearings.push(rounded);
    }
  }
  return bearings;
}

/** Find a street route close to the requested distance; rotates direction each call. */
export async function planRouteForTargetDistance(
  origin: Coordinate,
  targetKm: number
): Promise<RouteResult & { destination: Coordinate }> {
  if (targetKm <= 0) {
    throw new DirectionsError('Enter a distance greater than 0 km.');
  }

  const bearings = pickBearingsForRequest();
  const tolerance = Math.max(0.12, 0.08 + targetKm * 0.004);
  let fallback: PlanCandidate | null = null;

  for (const bearing of bearings) {
    const candidate = await planOneBearing(origin, targetKm, bearing);
    if (!candidate) continue;

    if (!fallback || candidate.diff < fallback.diff) {
      fallback = candidate;
    }

    if (candidate.diff / targetKm <= tolerance) {
      return {
        ...candidate.result,
        destination: candidate.destination,
      };
    }
  }

  if (!fallback) {
    throw new DirectionsError('Could not plan a street route for this distance.');
  }

  return {
    ...fallback.result,
    destination: fallback.destination,
  };
}
