import Constants from 'expo-constants';

const PLACEHOLDER = 'YOUR_GOOGLE_MAPS_API_KEY';

function normalizeApiKey(raw: string | undefined): string {
  if (!raw || raw === PLACEHOLDER) return '';
  const keyFromUrl = raw.match(/[?&]key=([^&]+)/)?.[1];
  return keyFromUrl ?? raw;
}

function readApiKey(): string {
  const fromEnv = normalizeApiKey(process.env.GOOGLE_MAPS_API_KEY);
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined;
  const fromExtra = normalizeApiKey(extra?.googleMapsApiKey);
  if (fromExtra) return fromExtra;

  const iosKey = normalizeApiKey(Constants.expoConfig?.ios?.config?.googleMapsApiKey as string | undefined);
  if (iosKey) return iosKey;

  const androidKey = normalizeApiKey(
    (Constants.expoConfig?.android?.config?.googleMaps as { apiKey?: string } | undefined)?.apiKey
  );
  if (androidKey) return androidKey;

  return '';
}

export const GOOGLE_MAPS_API_KEY = readApiKey();

export const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
