export type MarathonType = '5k' | '10k' | 'half' | 'full';

export const MARATHON_DISTANCES: Record<MarathonType, number> = {
  '5k': 5,
  '10k': 10,
  half: 21.0975,
  full: 42.195,
};

export const MARATHON_LABELS: Record<MarathonType, string> = {
  '5k': '5K',
  '10k': '10K',
  half: 'Half Marathon',
  full: 'Full Marathon',
};

export type Split = {
  km: number;
  cumulativeTime: string;
  pace: string;
};

export function paceToSeconds(paceMinPerKm: number): number {
  return paceMinPerKm * 60;
}

export function secondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function calculateFinishTime(distanceKm: number, paceMinPerKm: number): string {
  const totalSeconds = distanceKm * paceMinPerKm * 60;
  return secondsToTime(totalSeconds);
}

export function calculatePaceFromFinishTime(distanceKm: number, finishTimeStr: string): number {
  const parts = finishTimeStr.split(':').map(Number);
  let totalSeconds = 0;
  if (parts.length === 3) {
    totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    totalSeconds = parts[0] * 60 + parts[1];
  }
  return totalSeconds / 60 / distanceKm;
}

export function generateSplits(distanceKm: number, paceMinPerKm: number): Split[] {
  const splits: Split[] = [];
  const interval = distanceKm <= 10 ? 1 : 5;
  let km = interval;

  while (km <= distanceKm) {
    const cumulativeSeconds = km * paceMinPerKm * 60;
    splits.push({
      km,
      cumulativeTime: secondsToTime(cumulativeSeconds),
      pace: `${Math.floor(paceMinPerKm)}:${String(Math.round((paceMinPerKm % 1) * 60)).padStart(2, '0')}`,
    });
    km += interval;
  }

  if (splits.length === 0 || splits[splits.length - 1].km !== distanceKm) {
    const cumulativeSeconds = distanceKm * paceMinPerKm * 60;
    splits.push({
      km: distanceKm,
      cumulativeTime: secondsToTime(cumulativeSeconds),
      pace: `${Math.floor(paceMinPerKm)}:${String(Math.round((paceMinPerKm % 1) * 60)).padStart(2, '0')}`,
    });
  }

  return splits;
}

export function estimateCalories(distanceKm: number, weightKg: number, paceMinPerKm: number): number {
  const speedKmh = 60 / paceMinPerKm;
  const met = speedKmh < 8 ? 8 : speedKmh < 10 ? 9.8 : speedKmh < 12 ? 11 : 12.8;
  const hours = (distanceKm / speedKmh);
  return Math.round(met * weightKg * hours);
}

export type Coordinate = { latitude: number; longitude: number };

export function generateSampleRoute(
  center: Coordinate,
  distanceKm: number,
  points = 40
): Coordinate[] {
  const coords: Coordinate[] = [];
  const radiusDeg = (distanceKm / (2 * Math.PI)) / 111;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push({
      latitude: center.latitude + radiusDeg * Math.sin(angle),
      longitude: center.longitude + radiusDeg * Math.cos(angle) * 1.3,
    });
  }
  return coords;
}

export function calculateRouteDistance(coords: Coordinate[]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(coords[i - 1], coords[i]);
  }
  return total;
}

function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
