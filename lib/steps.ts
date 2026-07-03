/** ~1350 steps per km based on average running stride. */
export const STEPS_PER_KM = 1350;

export function estimateStepsFromKm(distanceKm: number): number {
  return Math.round(Math.max(0, distanceKm) * STEPS_PER_KM);
}

export function estimateStepsFromMeters(distanceM: number): number {
  return estimateStepsFromKm(distanceM / 1000);
}
