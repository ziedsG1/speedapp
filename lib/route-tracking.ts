import type { Coordinate } from '@/lib/marathon';

const EARTH_RADIUS_M = 6371000;

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function closestPointOnRoute(
  position: Coordinate,
  route: Coordinate[]
): { index: number; distanceM: number; point: Coordinate } {
  if (route.length === 0) {
    return { index: 0, distanceM: Infinity, point: position };
  }
  if (route.length === 1) {
    return { index: 0, distanceM: distanceMeters(position, route[0]), point: route[0] };
  }

  let bestIndex = 0;
  let bestDistance = Infinity;
  let bestPoint = route[0];

  for (let i = 0; i < route.length - 1; i++) {
    const projected = projectPointOnSegment(position, route[i], route[i + 1]);
    const dist = distanceMeters(position, projected);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestIndex = i;
      bestPoint = projected;
    }
  }

  return { index: bestIndex, distanceM: bestDistance, point: bestPoint };
}

function projectPointOnSegment(
  point: Coordinate,
  start: Coordinate,
  end: Coordinate
): Coordinate {
  const latScale = Math.cos(toRad((start.latitude + end.latitude) / 2));
  const ax = start.longitude * latScale;
  const ay = start.latitude;
  const bx = end.longitude * latScale;
  const by = end.latitude;
  const px = point.longitude * latScale;
  const py = point.latitude;

  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return start;

  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    latitude: ay + aby * t,
    longitude: (ax + abx * t) / latScale,
  };
}

export function sliceRouteFrom(position: Coordinate, route: Coordinate[]): Coordinate[] {
  if (route.length < 2) return route;
  const { index, point } = closestPointOnRoute(position, route);
  const ahead = route.slice(index + 1);
  return [point, ...ahead];
}

export function pathDistanceMeters(path: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += distanceMeters(path[i - 1], path[i]);
  }
  return total;
}

export function shouldAppendPathPoint(
  path: Coordinate[],
  next: Coordinate,
  minGapM = 4
): boolean {
  if (!path.length) return true;
  return distanceMeters(path[path.length - 1], next) >= minGapM;
}
