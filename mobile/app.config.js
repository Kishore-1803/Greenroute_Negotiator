require('dotenv').config({ quiet: true });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[app.config.js] GOOGLE_MAPS_API_KEY is not set — Google Maps will not render on a native build. ' +
      'Add it to mobile/.env (see .env.example).'
  );
}

module.exports = {
  expo: {
    name: 'GreenRoute',
    slug: 'greenroute-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/leaf.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/leaf.png',
      resizeMode: 'contain',
      backgroundColor: '#1a2b20',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.greenroute.mobile',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSMicrophoneUsageDescription:
          'GreenRoute records your voice only while you hold the mic button, so you can say where you want to go.',
        NSLocationWhenInUseUsageDescription:
          'GreenRoute uses your location as the starting point for routes you ask for by voice.',
      },
    },
    android: {
      package: 'com.greenroute.mobile',
      adaptiveIcon: {
        foregroundImage: './assets/leaf.png',
        backgroundColor: '#1a2b20',
      },
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: ['RECORD_AUDIO', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    plugins: [
      [
        'expo-audio',
        {
          microphonePermission:
            'GreenRoute records your voice only while you hold the mic button, so you can say where you want to go.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'GreenRoute uses your location as the starting point for routes you ask for by voice.',
        },
      ],
      // Login tokens go in the OS keystore (Keychain / Android Keystore), not AsyncStorage --
      // a bearer token is a live credential for the length of its TTL.
      'expo-secure-store',
    ],
    web: {
      favicon: './assets/leaf.png',
    },
    // Off: nothing here needs TurboModules/Fabric, and enabling it pulls in the Android NDK
    // (700MB+) purely for C++ codegen on a from-scratch build.
    newArchEnabled: false,
  },
};
