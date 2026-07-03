import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coordinate, MarathonType } from './marathon';

const USER_KEY = '@speedapp_user';
const HISTORY_KEY = '@speedapp_history';

export type UserProfile = {
  name: string;
  age: number;
  onboardingComplete: boolean;
};

export type SavedRun = {
  id: string;
  name: string;
  marathonType: MarathonType | 'custom';
  plannedDistanceKm: number;
  achievedDistanceKm: number;
  paceMinPerKm: number;
  finishTime: string;
  steps: number;
  route: Coordinate[];
  startPoint: Coordinate;
  destination?: Coordinate;
  routeSource?: 'serpapi' | 'osrm' | 'directions' | 'fallback';
  mapSnapshotUri?: string;
  calories?: number;
  createdAt: string;
  /** @deprecated legacy field */
  distanceKm?: number;
  /** @deprecated legacy field */
  routeDistanceKm?: number;
  /** @deprecated legacy field */
  splits?: unknown[];
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
}

export async function getRunHistory(): Promise<SavedRun[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const history: SavedRun[] = raw ? JSON.parse(raw) : [];
  return history.map(normalizeRun);
}

function normalizeRun(run: SavedRun): SavedRun {
  const achieved = run.achievedDistanceKm ?? run.routeDistanceKm ?? run.distanceKm ?? 0;
  const planned = run.plannedDistanceKm ?? run.distanceKm ?? achieved;
  return {
    ...run,
    plannedDistanceKm: planned,
    achievedDistanceKm: achieved,
    steps: run.steps ?? 0,
    startPoint: run.startPoint ?? run.route[0],
    marathonType: run.marathonType ?? 'custom',
  };
}

export async function saveRun(run: SavedRun): Promise<void> {
  const history = await getRunHistory();
  history.unshift(run);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function getRunById(id: string): Promise<SavedRun | null> {
  const history = await getRunHistory();
  return history.find((r) => r.id === id) ?? null;
}

export async function deleteRun(id: string): Promise<void> {
  const history = await getRunHistory();
  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.filter((r) => r.id !== id))
  );
}
