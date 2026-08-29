import { Platform } from 'react-native';

// When running on an Android emulator, localhost is 10.0.2.2.
// When running on iOS simulator or web, localhost is 127.0.0.1.
// You can also change this to your computer's LAN IP (e.g., http://192.168.1.100:8000) for real device testing.
let customBaseUrl: string | null = null;

export function setCustomBaseUrl(url: string | null) {
  customBaseUrl = url;
}

export function getBaseUrl(): string {
  if (customBaseUrl) return customBaseUrl;
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
