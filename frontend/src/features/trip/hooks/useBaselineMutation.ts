import { useMutation } from '@tanstack/react-query';
import { postBaseline } from '@/services/api/trips';
import type { BaselineRequest } from '@/services/api/types';

/** POST /trips/baseline. One-shot per trip -- the resulting trip_id becomes the route param
 * for the Trip Workspace, so this stays a mutation rather than a cached query. */
export function useBaselineMutation() {
  return useMutation({
    mutationFn: (body: BaselineRequest) => postBaseline(body),
  });
}
