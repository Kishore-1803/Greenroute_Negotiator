import { useMutation } from '@tanstack/react-query';
import { postSelection } from '@/services/api/trips';
import type { SelectionRequest } from '@/services/api/types';

/** POST /trips/{tripId}/selection -- closes the Preference Memory loop: tells the backend
 * which mode the user actually picked so the online weight-update rule can run. */
export function useSelectionMutation(tripId: string | undefined) {
  return useMutation({
    mutationFn: (body: SelectionRequest) => {
      if (!tripId) throw new Error('cannot record a selection without a trip id');
      return postSelection(tripId, body);
    },
  });
}
