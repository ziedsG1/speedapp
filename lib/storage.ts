import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coordinate, MarathonType, Split } from './marathon';

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
  marathonType: MarathonType;
  distanceKm: number;
  paceMinPerKm: number;
  finishTime: string;
  splits: Split[];
  route: Coordinate[];
  destination?: Coordinate;
  routeDistanceKm?: number;
  routeSource?: 'directions' | 'fallback';
  mapSnapshotUri?: string;
  calories?: number;
  createdAt: string;
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
  return raw ? JSON.parse(raw) : [];
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
