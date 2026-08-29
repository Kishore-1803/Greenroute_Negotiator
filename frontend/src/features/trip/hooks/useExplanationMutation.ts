import { useMutation } from '@tanstack/react-query';
import { postExplanation } from '@/services/api/explanations';
import type { ExplanationRequest } from '@/services/api/types';

/** POST /trips/{tripId}/explanation. A mutation, not a query -- each objection chip is a new
 * request with different body, and re-requesting the initial explanation on retry is desired
 * (not something to dedupe/cache). */
export function useExplanationMutation(tripId: string | undefined) {
  return useMutation({
    mutationFn: (body: ExplanationRequest = {}) => {
      if (!tripId) throw new Error('cannot request an explanation without a trip id');
      return postExplanation(tripId, body);
    },
  });
}
