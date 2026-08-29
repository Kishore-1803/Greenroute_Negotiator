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
  // Also clear any cached trip preferences if needed
  sessionStorage.clear();
}
