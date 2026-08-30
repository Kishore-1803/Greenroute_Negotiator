import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../services/api/auth';
import type { LearnedPreferenceDTO, UserDTO } from '../services/api/types';

// The OS keystore (Keychain / Android Keystore), not AsyncStorage: this is a live credential
// for the length of its TTL, and AsyncStorage is plain unencrypted files on disk.
const TOKEN_KEY = 'greenroute.auth.token';

export type AuthUser = UserDTO;

export interface AuthContextValue {
  user: AuthUser | null;
  /** Preference Memory's real weights for this account, or null when signed out. */
  preference: LearnedPreferenceDTO | null;
  /** True while the stored token is being checked at launch -- distinct from "signed out". */
  bootstrapping: boolean;
  /** True during an in-flight login/register, so forms can disable and show progress. */
  busy: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Re-reads the profile — call after anything that moves the learned weights. */
  refresh: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [preference, setPreference] = useState<LearnedPreferenceDTO | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore the session on launch. The stored token is only trusted after /me accepts it --
  // it may have expired, or been signed by a server that has since regenerated its secret.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!stored) return;

        const profile = await authApi.me(stored);
        if (cancelled) return;
        setToken(stored);
        setUser(profile.user);
        setPreference(profile.preference);
      } catch {
        // Covers both a rejected token and an unreachable backend. Discarding it either way is
        // deliberate: a token the app cannot currently validate is one it cannot use, and
        // keeping it would leave the UI showing a signed-in shell with no working session.
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback(async (accessToken: string, nextUser: AuthUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(nextUser);
    // A fresh session has no profile loaded yet. Left null rather than faked, so the profile
    // screen shows its loading state instead of a preset presented as learned data.
    setPreference(null);
  }, []);

  const runAuth = useCallback(
    async (call: () => Promise<{ access_token: string; user: AuthUser }>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const result = await call();
        await applySession(result.access_token, result.user);
        return true;
      } catch (err: any) {
        setError(err?.message || 'Something went wrong. Please try again.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [applySession]
  );

  const login = useCallback(
    (email: string, password: string) => runAuth(() => authApi.login({ email, password })),
    [runAuth]
  );

  const register = useCallback(
    (name: string, email: string, password: string) =>
      runAuth(() => authApi.register({ name, email, password })),
    [runAuth]
  );

  const logout = useCallback(async () => {
    // No server call: tokens are stateless, so signing out is discarding what we hold. Local
    // state is cleared regardless of whether the keystore delete succeeds -- the user asked to
    // be signed out, and a storage error must not leave them looking signed in.
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
    setPreference(null);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await authApi.me(token);
      setUser(profile.user);
      setPreference(profile.preference);
    } catch (err: any) {
      // A 401 means the session lapsed while the app was open; anything else is transient and
      // should not evict a working session over one failed refresh.
      if (typeof err?.message === 'string' && /log in again|logged in/i.test(err.message)) {
        await logout();
      }
    }
  }, [logout, token]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      preference,
      bootstrapping,
      busy,
      error,
      login,
      register,
      logout,
      refresh,
      clearError,
    }),
    [bootstrapping, busy, clearError, error, login, logout, preference, refresh, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
