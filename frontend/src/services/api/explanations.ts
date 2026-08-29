import { apiRequest } from './client';
import { ExplanationResponseSchema, type ExplanationRequest, type ExplanationResponse } from './types';

export function postExplanation(tripId: string, body: ExplanationRequest = {}): Promise<ExplanationResponse> {
  return apiRequest({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/explanation`,
    body,
    schema: ExplanationResponseSchema,
  });
}
