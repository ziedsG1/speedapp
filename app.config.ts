import type { ConfigContext, ExpoConfig } from 'expo/config';

function resolveGoogleMapsApiKey(): string {
  const raw = process.env.GOOGLE_MAPS_API_KEY ?? 'YOUR_GOOGLE_MAPS_API_KEY';

  // Accept either a plain key or a full Maps JS URL pasted by mistake.
  const keyFromUrl = raw.match(/[?&]key=([^&]+)/)?.[1];
  return keyFromUrl ?? raw;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = resolveGoogleMapsApiKey();

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-maps') {
      return ['react-native-maps', { googleMapsApiKey }] as [string, { googleMapsApiKey: string }];
    }
    return plugin;
  });

  plugins.push([
    'expo-build-properties',
    {
      ios: {
        deploymentTarget: '15.1',
        useFrameworks: 'static',
      },
    },
  ]);

  return {
    ...config,
    name: 'SpeedApp',
    slug: 'speedapp',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.speedapp.runner',
      config: {
        ...(config.ios?.config as object | undefined),
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      package: 'com.speedapp.runner',
      config: {
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
    plugins,
    extra: {
      ...config.extra,
      googleMapsApiKey,
    },
  };
};
