import { NativeModules, Platform } from 'react-native';

// When running on an Android emulator, localhost is 10.0.2.2.
// When running on iOS simulator or web, localhost is 127.0.0.1.
// You can also change this to your computer's LAN IP (e.g., http://192.168.1.100:8000) for real device testing.
let customBaseUrl: string | null = null;

export function setCustomBaseUrl(url: string | null) {
  customBaseUrl = url;
}

// A physical device running the app through Expo Go/dev client cannot reach 127.0.0.1 or
// 10.0.2.2 -- those only resolve to the phone itself. Metro/Expo already knows the dev
// machine's real LAN address (that's how the phone downloaded the JS bundle in the first
// place), so we recover it from the bundle's script URL instead of requiring a manual edit
// here for every developer's network.
function getDevServerHost(): string | null {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptURL) return null;
    const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function getBaseUrl(): string {
  if (customBaseUrl) return customBaseUrl;

  const devHost = getDevServerHost();
  if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
    // Real device (or emulator connected over LAN): reuse the same host Metro is served from.
    return `http://${devHost}:8000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}
