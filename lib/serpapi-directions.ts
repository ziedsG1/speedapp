import { SERPAPI_API_KEY, SERPAPI_DIRECTIONS_URL } from '@/constants/config';
import type { Coordinate } from '@/lib/marathon';
import { DirectionsError } from '@/lib/directions';

type SerpGps = { latitude: number; longitude: number };

type SerpDirectionDetail = {
  gps_coordinates?: SerpGps;
};

type SerpDirectionTrip = {
  details?: SerpDirectionDetail[];
};

type SerpDirection = {
  travel_mode?: string;
  distance?: number;
  duration?: number;
  trips?: SerpDirectionTrip[];
};

type SerpPlaceInfo = {
  address?: string;
  gps_coordinates?: SerpGps;
};

type SerpDirectionsResponse = {
  search_metadata?: { status?: string };
  error?: string;
  places_info?: SerpPlaceInfo[];
  directions?: SerpDirection[];
};

function formatCoords(c: Coordinate): string {
  return `${c.latitude},${c.longitude}`;
}

function nearlyEqual(a: Coordinate, b: Coordinate): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001 &&
    Math.abs(a.longitude - b.longitude) < 0.00001
  );
}

function dedupeCoordinates(coords: Coordinate[]): Coordinate[] {
  const merged: Coordinate[] = [];
  for (const point of coords) {
    if (!merged.length || !nearlyEqual(merged[merged.length - 1], point)) {
      merged.push(point);
    }
  }
  return merged;
}

export function extractSerpApiRouteCoordinates(
  direction: SerpDirection,
  placesInfo?: SerpPlaceInfo[]
): Coordinate[] {
  const coords: Coordinate[] = [];

  for (const trip of direction.trips ?? []) {
    for (const detail of trip.details ?? []) {
      if (detail.gps_coordinates) {
        coords.push({
          latitude: detail.gps_coordinates.latitude,
          longitude: detail.gps_coordinates.longitude,
        });
      }
    }
  }

  const deduped = dedupeCoordinates(coords);

  if (deduped.length >= 2) return deduped;

  const start = placesInfo?.[0]?.gps_coordinates;
  const end = placesInfo?.[1]?.gps_coordinates;
  if (start && end) {
    return [
      { latitude: start.latitude, longitude: start.longitude },
      { latitude: end.latitude, longitude: end.longitude },
    ];
  }

  return deduped;
}

export async function fetchSerpApiWalkingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<{ coordinates: Coordinate[]; distanceM: number; durationS: number }> {
  if (!SERPAPI_API_KEY) {
    throw new DirectionsError('SerpApi key is missing. Add SERPAPI_API_KEY to your config.');
  }

  const params = new URLSearchParams({
    engine: 'google_maps_directions',
    start_coords: formatCoords(origin),
    end_coords: formatCoords(destination),
    travel_mode: '2',
    distance_unit: '0',
    hl: 'en',
    api_key: SERPAPI_API_KEY,
  });

  const response = await fetch(`${SERPAPI_DIRECTIONS_URL}?${params.toString()}`);
  const data: SerpDirectionsResponse = await response.json();

  if (data.search_metadata?.status !== 'Success') {
    throw new DirectionsError(data.error ?? 'SerpApi directions request failed.');
  }

  const walkingDirection =
    data.directions?.find((d) => d.travel_mode === 'Walking') ?? data.directions?.[0];

  if (!walkingDirection) {
    throw new DirectionsError('No walking route returned by SerpApi.');
  }

  const coordinates = extractSerpApiRouteCoordinates(walkingDirection, data.places_info);

  if (coordinates.length < 2) {
    throw new DirectionsError('SerpApi returned no usable street coordinates for this route.');
  }

  return {
    coordinates,
    distanceM: walkingDirection.distance ?? 0,
    durationS: walkingDirection.duration ?? 0,
  };
}
