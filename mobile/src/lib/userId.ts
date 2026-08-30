import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './authContext';

const ANON_ID_KEY = 'greenroute.anonymous.user_id';

// Cached after the first read so the very common synchronous case (a screen rendering while
// storage is still resolving) does not flash a different id mid-session.
let cachedAnonId: string | null = null;

function generateAnonId(): string {
  return `anon_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * A stable per-device id for someone who has not signed in.
 *
 * Persisted, unlike the previous implementation which minted a fresh random id on every app
 * launch. That made Preference Memory inert on mobile: the backend learned weights against an
 * id that never appeared again, so `trip_count` was always 0 and no recommendation ever
 * improved. Anything keyed to a user must survive a restart or the feature does not exist.
 */
export async function getAnonymousUserId(): Promise<string> {
  if (cachedAnonId) return cachedAnonId;

  try {
    const stored = await AsyncStorage.getItem(ANON_ID_KEY);
    if (stored) {
      cachedAnonId = stored;
      return stored;
    }
  } catch {
    // Storage unavailable. Fall through to a fresh id: it will not persist, but the trip still
    // works, which beats blocking the flow on a device-storage failure.
  }

  const next = generateAnonId();
  cachedAnonId = next;
  await AsyncStorage.setItem(ANON_ID_KEY, next).catch(() => {});
  return next;
}

/**
 * The id trips are attributed to: the signed-in account when there is one, the persisted
 * device id otherwise.
 *
 * Returns null until it resolves, so callers wait rather than sending a placeholder — a trip
 * recorded against the wrong id trains the wrong person's preferences, and there is no way to
 * tell afterwards that it happened.
 */
export function useTripUserId(): string | null {
  const { user } = useAuth();
  const [anonId, setAnonId] = useState<string | null>(cachedAnonId);

  useEffect(() => {
    if (user || anonId) return;
    let cancelled = false;
    getAnonymousUserId().then((id) => {
      if (!cancelled) setAnonId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [anonId, user]);

  // Signing in switches attribution to the account. Trips taken before that stay under the
  // device id -- merging them would mean guessing that the same person took them, and a wrong
  // guess silently trains a stranger's preferences into someone's account.
  return user ? user.user_id : anonId;
}
