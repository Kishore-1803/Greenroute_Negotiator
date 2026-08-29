import { useMutation } from '@tanstack/react-query';
import { postNegotiation } from '@/services/api/trips';

/** POST /trips/{tripId}/negotiation -- runs the 2-round Speed/Cost/Carbon negotiation panel
 * and Coordinator narration for the trip's current state. */
export function useNegotiationMutation(tripId: string | undefined) {
  return useMutation({
    mutationFn: () => {
      if (!tripId) throw new Error('cannot run a negotiation without a trip id');
      return postNegotiation(tripId);
    },
  });
}
