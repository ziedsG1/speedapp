import Constants from 'expo-constants';

const PLACEHOLDER = 'YOUR_GOOGLE_MAPS_API_KEY';
const SERPAPI_PLACEHOLDER = 'YOUR_SERPAPI_API_KEY';

function normalizeApiKey(raw: string | undefined): string {
  if (!raw || raw === PLACEHOLDER || raw === SERPAPI_PLACEHOLDER) return '';
  const keyFromUrl = raw.match(/[?&]key=([^&]+)/)?.[1];
  return keyFromUrl ?? raw;
}

function readGoogleMapsApiKey(): string {
  const fromEnv = normalizeApiKey(process.env.GOOGLE_MAPS_API_KEY);
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined;
  const fromExtra = normalizeApiKey(extra?.googleMapsApiKey);
  if (fromExtra) return fromExtra;

  const iosKey = normalizeApiKey(Constants.expoConfig?.ios?.config?.googleMapsApiKey as string | undefined);
  if (iosKey) return iosKey;

  return '';
}

function readSerpApiKey(): string {
  const fromEnv = normalizeApiKey(process.env.SERPAPI_API_KEY);
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { serpApiKey?: string } | undefined;
  return normalizeApiKey(extra?.serpApiKey);
}

export const GOOGLE_MAPS_API_KEY = readGoogleMapsApiKey();
export const SERPAPI_API_KEY = readSerpApiKey();

export const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
export const SERPAPI_DIRECTIONS_URL = 'https://serpapi.com/search.json';
export const OSRM_ROUTING_URL = 'https://router.project-osrm.org';
