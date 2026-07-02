import { DIRECTIONS_API_URL, GOOGLE_MAPS_API_KEY } from '@/constants/config';
import type { Coordinate } from '@/lib/marathon';
import { generateSampleRoute } from '@/lib/marathon';

type DirectionsLeg = {
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  steps: { polyline: { points: string } }[];
};

type DirectionsRoute = {
  overview_polyline: { points: string };
  legs: DirectionsLeg[];
};

type DirectionsResponse = {
  status: string;
  routes: DirectionsRoute[];
  error_message?: string;
};

export type RouteResult = {
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
  source: 'directions' | 'fallback';
};

export class DirectionsError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'DirectionsError';
  }
}

/** Decode Google's encoded polyline format into lat/lng coordinates. */
export function decodePolyline(encoded: string): Coordinate[] {
  const coords: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coords;
}

function formatCoord(c: Coordinate): string {
  return `${c.latitude},${c.longitude}`;
}

async function fetchDirectionsLeg(
  origin: Coordinate,
  destination: Coordinate,
  waypoints?: Coordinate[]
): Promise<{ coords: Coordinate[]; distanceM: number; durationS: number }> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new DirectionsError(
      'Google Maps API key is missing. Add it to app.json under extra.googleMapsApiKey.'
    );
  }

  const params = new URLSearchParams({
    origin: formatCoord(origin),
    destination: formatCoord(destination),
    mode: 'walking',
    key: GOOGLE_MAPS_API_KEY,
  });

  if (waypoints?.length) {
    params.set('waypoints', waypoints.map(formatCoord).join('|'));
  }

  const response = await fetch(`${DIRECTIONS_API_URL}?${params.toString()}`);
  const data: DirectionsResponse = await response.json();

  if (data.status !== 'OK' || !data.routes?.length) {
    throw new DirectionsError(
      data.error_message ?? `Directions request failed: ${data.status}`,
      data.status
    );
  }

  const route = data.routes[0];
  const coords = decodePolyline(route.overview_polyline.points);
  const distanceM = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
  const durationS = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

  return { coords, distanceM, durationS };
}

function destinationPoint(
  start: Coordinate,
  distanceKm: number,
  bearingDeg: number
): Coordinate {
  const R = 6371;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;
  const d = distanceKm / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
}

function waypointCountForDistance(targetKm: number): number {
  if (targetKm <= 5) return 3;
  if (targetKm <= 10) return 4;
  if (targetKm <= 21) return 6;
  return 8;
}

function generateLoopWaypoints(
  center: Coordinate,
  targetKm: number,
  count: number,
  radiusScale = 1
): Coordinate[] {
  const radiusKm = (targetKm / (2 * Math.PI)) * radiusScale;
  return Array.from({ length: count }, (_, i) =>
    destinationPoint(center, radiusKm, (360 / count) * i)
  );
}

function mergeCoordinates(segments: Coordinate[][]): Coordinate[] {
  const merged: Coordinate[] = [];
  for (const segment of segments) {
    if (!segment.length) continue;
    if (!merged.length) {
      merged.push(...segment);
      continue;
    }
    const startIdx =
      nearlyEqual(merged[merged.length - 1], segment[0]) ? 1 : 0;
    merged.push(...segment.slice(startIdx));
  }
  return merged;
}

function nearlyEqual(a: Coordinate, b: Coordinate): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001 &&
    Math.abs(a.longitude - b.longitude) < 0.00001
  );
}

/**
 * Build a running loop near `start` targeting `targetDistanceKm`.
 * Uses chained Google Directions requests (walking mode) for street-level paths.
 */
export async function generateRunningRoute(
  start: Coordinate,
  targetDistanceKm: number
): Promise<RouteResult> {
  if (!GOOGLE_MAPS_API_KEY) {
    return {
      coordinates: generateSampleRoute(start, targetDistanceKm),
      distanceKm: targetDistanceKm,
      durationMinutes: 0,
      source: 'fallback',
    };
  }

  const waypointCount = waypointCountForDistance(targetDistanceKm);
  const scales = [1, 0.85, 1.15, 1.3];
  let lastError: Error | null = null;

  for (const scale of scales) {
    try {
      const waypoints = generateLoopWaypoints(start, targetDistanceKm, waypointCount, scale);
      const stops = [start, ...waypoints, start];

      const segments: Coordinate[][] = [];
      let totalDistanceM = 0;
      let totalDurationS = 0;

      for (let i = 0; i < stops.length - 1; i++) {
        const leg = await fetchDirectionsLeg(stops[i], stops[i + 1]);
        segments.push(leg.coords);
        totalDistanceM += leg.distanceM;
        totalDurationS += leg.durationS;
      }

      const coordinates = mergeCoordinates(segments);
      const distanceKm = totalDistanceM / 1000;
      const tolerance = targetDistanceKm * 0.35;

      if (
        coordinates.length >= 2 &&
        Math.abs(distanceKm - targetDistanceKm) <= tolerance
      ) {
        return {
          coordinates,
          distanceKm,
          durationMinutes: Math.round(totalDurationS / 60),
          source: 'directions',
        };
      }

      if (coordinates.length >= 2 && scale === scales[scales.length - 1]) {
        return {
          coordinates,
          distanceKm,
          durationMinutes: Math.round(totalDurationS / 60),
          source: 'directions',
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (lastError) {
    console.warn('Directions API failed, using fallback route:', lastError.message);
  }

  return {
    coordinates: generateSampleRoute(start, targetDistanceKm),
    distanceKm: targetDistanceKm,
    durationMinutes: 0,
    source: 'fallback',
  };
}

/** Direct A→B walking route (useful for custom endpoints later). */
export async function fetchWalkingRoute(
  origin: Coordinate,
  destination: Coordinate,
  via?: Coordinate[]
): Promise<RouteResult> {
  const { coords, distanceM, durationS } = await fetchDirectionsLeg(
    origin,
    destination,
    via
  );

  return {
    coordinates: coords,
    distanceKm: distanceM / 1000,
    durationMinutes: Math.round(durationS / 60),
    source: 'directions',
  };
}
