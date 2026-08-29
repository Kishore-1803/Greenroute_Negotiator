/**
 * Authentication and session management helper.
 */

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
}

export function getStoredUserId(): string | null {
  return localStorage.getItem('userId');
}

export function logoutUser(): void {
  localStorage.removeItem('userId');
  localStorage.removeItem('greenroute_user_profile');
  localStorage.removeItem('greenroute_user_avatar');
  removeToken();
  // Also clear any cached trip preferences if needed
  sessionStorage.clear();
}

export const TOKEN_KEY = 'greenroute_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}
