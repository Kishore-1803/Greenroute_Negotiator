import { useMutation } from '@tanstack/react-query';
import { postConditionChange } from '@/services/api/trips';

/** POST /trips/{tripId}/condition-change -- triggers the real OSRM segment-speed-file +
 * osrm-customize recomputation server-side and returns before/after metrics + the
 * deterministic SWITCH/STAY decision. */
export function useConditionChangeMutation(tripId: string | undefined) {
  return useMutation({
    mutationFn: () => {
      if (!tripId) throw new Error('cannot trigger condition-change without a trip id');
      return postConditionChange(tripId);
    },
  });
}
