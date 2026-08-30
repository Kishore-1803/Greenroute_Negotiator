import Constants from 'expo-constants';
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
// place), so we recover it instead of requiring a manual edit here for every developer's
// network.
//
// `Constants.expoConfig.hostUri` (backed by expo-constants) is the reliable source in Expo
// Go: it comes from Expo's own connection manifest, not the JS engine's bundle-loading
// internals. `NativeModules.SourceCode.scriptURL` looks similar but Expo Go's managed runtime
// does not consistently populate it with the *project's* Metro URL, so relying on it alone
// silently fell through to the Android-emulator-only 10.0.2.2 default even for LAN-connected
// physical devices -- kept below only as a fallback for bare/dev-client builds.
function getDevServerHost(): string | null {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ??
      (Constants as any)?.manifest?.debuggerHost;
    if (hostUri) {
      const host = String(hostUri).split(':')[0].split('/')[0];
      if (host) return host;
    }
  } catch {
    // fall through to the scriptURL heuristic
  }

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

// Baseline routes 3 modes through Google Maps (plus enrichment/scoring) on the backend --
// generous enough not to false-trip on that, short enough to fail fast on a dead connection
// instead of hanging on the OS's own multi-minute TCP timeout.
const DEFAULT_TIMEOUT_MS = 25000;

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${endpoint}`;
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(
        `Request to ${base} timed out after ${Math.round(timeoutMs / 1000)}s. Is the backend running and reachable from this device? Check the "Backend connection" setting.`
      );
    }
    throw new Error(
      `Could not reach the backend at ${base}. Make sure it's running and your device can reach this address (same Wi-Fi, correct LAN IP). Original error: ${err?.message || err}`
    );
  } finally {
    clearTimeout(timeoutId);
  }

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
