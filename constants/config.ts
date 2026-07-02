import Constants from 'expo-constants';

function readApiKey(): string {
  const extra = Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined;
  if (extra?.googleMapsApiKey && extra.googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
    return extra.googleMapsApiKey;
  }

  const iosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
  if (iosKey && iosKey !== 'YOUR_GOOGLE_MAPS_API_KEY') return iosKey;

  const androidKey = (
    Constants.expoConfig?.android?.config?.googleMaps as { apiKey?: string } | undefined
  )?.apiKey;
  if (androidKey && androidKey !== 'YOUR_GOOGLE_MAPS_API_KEY') return androidKey;

  return '';
}

export const GOOGLE_MAPS_API_KEY = readApiKey();

export const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
