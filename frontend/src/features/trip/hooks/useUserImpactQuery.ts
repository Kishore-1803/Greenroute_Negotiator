import { useQuery } from '@tanstack/react-query';
import { getUserImpact } from '@/services/api/trips';
import type { UserImpactStats } from '@/services/api/types';

export function useUserImpactQuery(userId: string) {
  return useQuery<UserImpactStats>({
    queryKey: ['userImpact', userId],
    queryFn: () => getUserImpact(userId),
    refetchInterval: 5000, // refresh to see impact of latest trip
  });
}
