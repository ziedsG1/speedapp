import { OSRM_ROUTING_URL } from '@/constants/config';
import type { Coordinate } from '@/lib/marathon';
import { DirectionsError } from '@/lib/directions';

type OsrmGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: OsrmGeometry;
};

type OsrmResponse = {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
};

/** Free OpenStreetMap street routing — no API key required. */
export async function fetchOsrmWalkingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<{ coordinates: Coordinate[]; distanceM: number; durationS: number }> {
  // OSRM expects longitude,latitude
  const path = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url =
    `${OSRM_ROUTING_URL}/route/v1/foot/${path}` +
    '?overview=full&geometries=geojson&steps=false';

  const response = await fetch(url);
  const data: OsrmResponse = await response.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new DirectionsError(
      data.message ?? `OSRM routing failed: ${data.code ?? 'unknown'}`
    );
  }

  const route = data.routes[0];
  const coordinates = route.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));

  if (coordinates.length < 2) {
    throw new DirectionsError('OSRM returned no usable street route.');
  }

  return {
    coordinates,
    distanceM: route.distance,
    durationS: route.duration,
  };
}
