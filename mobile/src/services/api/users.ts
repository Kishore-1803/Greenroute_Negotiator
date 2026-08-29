import { apiFetch } from './client';
import type { UserImpactStats } from './types';

export const usersApi = {
  impact(userId: string): Promise<UserImpactStats> {
    return apiFetch<UserImpactStats>(`/api/v1/users/${encodeURIComponent(userId)}/impact`);
  },
};
