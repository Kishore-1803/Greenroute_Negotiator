import { apiFetch } from './client';
import type {
  BaselineRequest,
  BaselineResponse,
  ConditionChangeResponse,
  CooperationResponse,
  ExplanationRequest,
  ExplanationResponse,
  NegotiationResponse,
  SelectionRequest,
  SelectionResponse,
} from './types';

export const tripsApi = {
  baseline(payload: BaselineRequest): Promise<BaselineResponse> {
    return apiFetch<BaselineResponse>('/api/v1/trips/baseline', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  selection(tripId: string, payload: SelectionRequest): Promise<SelectionResponse> {
    return apiFetch<SelectionResponse>(`/api/v1/trips/${tripId}/selection`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  conditionChange(tripId: string): Promise<ConditionChangeResponse> {
    return apiFetch<ConditionChangeResponse>(`/api/v1/trips/${tripId}/condition-change`, {
      method: 'POST',
    });
  },

  negotiation(tripId: string): Promise<NegotiationResponse> {
    return apiFetch<NegotiationResponse>(`/api/v1/trips/${tripId}/negotiation`, {
      method: 'POST',
    });
  },

  explanation(tripId: string, payload: ExplanationRequest = {}): Promise<ExplanationResponse> {
    return apiFetch<ExplanationResponse>(`/api/v1/trips/${tripId}/explanation`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cooperation(tripId: string, departureHour: number = 8.5): Promise<CooperationResponse> {
    return apiFetch<CooperationResponse>(
      `/api/v1/trips/${tripId}/cooperation?departure_hour=${departureHour}`,
      { method: 'POST' }
    );
  },
};
