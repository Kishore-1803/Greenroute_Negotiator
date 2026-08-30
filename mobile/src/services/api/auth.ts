import { apiFetch } from './client';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfileResponse,
} from './types';

export const authApi = {
  register(payload: RegisterRequest): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: LoginRequest): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * The signed-in account plus its real learned weights.
   *
   * Also the launch check: a 401 here is how the client learns a stored token has expired or
   * been invalidated, which is the only way to find out with stateless tokens.
   */
  me(token: string): Promise<UserProfileResponse> {
    return apiFetch<UserProfileResponse>('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      // Short: this gates the splash screen, and a user opening the app with a flaky connection
      // should reach the logged-out state quickly rather than watching a spinner.
      timeoutMs: 8000,
    });
  },
};

// There is no logout call. Tokens are stateless server-side, so signing out is the client
// discarding what it holds -- see authContext.tsx.
