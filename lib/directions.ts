import { DIRECTIONS_API_URL, GOOGLE_MAPS_API_KEY, SERPAPI_API_KEY } from '@/constants/config';
import { fetchOsrmWalkingRoute } from '@/lib/osrm-directions';
import { fetchSerpApiWalkingRoute } from '@/lib/serpapi-directions';
import type { Coordinate } from '@/lib/marathon';

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
  source: 'serpapi' | 'osrm' | 'directions';
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

async function fetchGoogleWalkingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<{ coords: Coordinate[]; distanceM: number; durationS: number; source: 'directions' }> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new DirectionsError('Google Maps API key is missing.');
  }

  const params = new URLSearchParams({
    origin: formatCoord(origin),
    destination: formatCoord(destination),
    mode: 'walking',
    key: GOOGLE_MAPS_API_KEY,
  });

  const response = await fetch(`${DIRECTIONS_API_URL}?${params.toString()}`);
  const data: DirectionsResponse = await response.json();

  if (data.status !== 'OK' || !data.routes?.length) {
    throw new DirectionsError(
      data.error_message ?? `Google Directions failed: ${data.status}`,
      data.status
    );
  }

  const route = data.routes[0];
  const coords = decodePolyline(route.overview_polyline.points);
  const distanceM = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
  const durationS = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

  return { coords, distanceM, durationS, source: 'directions' };
}

type RouteProvider = (
  origin: Coordinate,
  destination: Coordinate
) => Promise<{ coords: Coordinate[]; distanceM: number; durationS: number; source: RouteResult['source'] }>;

/**
 * Street walking route: origin → destination.
 * 1. SerpApi (if SERPAPI_API_KEY)
 * 2. OSRM — free OpenStreetMap routing, no key
 * 3. Google Directions (if GOOGLE_MAPS_API_KEY)
 */
export async function fetchWalkingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult> {
  const providers: RouteProvider[] = [];

  if (SERPAPI_API_KEY) {
    providers.push(async (o, d) => {
      const result = await fetchSerpApiWalkingRoute(o, d);
      return { ...result, coords: result.coordinates, source: 'serpapi' };
    });
  }

  providers.push(async (o, d) => {
    const result = await fetchOsrmWalkingRoute(o, d);
    return { ...result, coords: result.coordinates, source: 'osrm' };
  });

  if (GOOGLE_MAPS_API_KEY) {
    providers.push(fetchGoogleWalkingRoute);
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await provider(origin, destination);
      if (result.coords.length < 2) {
        throw new DirectionsError('No street route found between these points.');
      }
      return {
        coordinates: result.coords,
        distanceKm: result.distanceM / 1000,
        durationMinutes: Math.round(result.durationS / 60),
        source: result.source,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError instanceof DirectionsError
    ? lastError
    : new DirectionsError(
        lastError?.message ?? 'Could not fetch a walking route. Check your internet connection.'
      );
}
