import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postCooperation } from '@/services/api/trips';
import type { CooperationResponse } from '@/services/api/types';

export function useCooperationMutation(tripId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<CooperationResponse, Error, { departureHour?: number }>({
    mutationFn: ({ departureHour }) => {
      if (!tripId) throw new Error('No active trip to run cooperation on');
      return postCooperation(tripId, departureHour);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cooperation', tripId], data);
    },
  });
}
