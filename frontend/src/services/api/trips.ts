import { apiRequest } from './client';
import {
  BaselineResponseSchema,
  ConditionChangeResponseSchema,
  NegotiationResponseSchema,
  SelectionResponseSchema,
  type BaselineRequest,
  type BaselineResponse,
  type ConditionChangeResponse,
  type NegotiationResponse,
  type SelectionRequest,
  type SelectionResponse,
} from './types';

export function postBaseline(body: BaselineRequest): Promise<BaselineResponse> {
  return apiRequest({ method: 'POST', path: '/trips/baseline', body, schema: BaselineResponseSchema });
}

export function postConditionChange(tripId: string): Promise<ConditionChangeResponse> {
  return apiRequest({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/condition-change`,
    schema: ConditionChangeResponseSchema,
  });
}

export function postSelection(tripId: string, body: SelectionRequest): Promise<SelectionResponse> {
  return apiRequest({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/selection`,
    body,
    schema: SelectionResponseSchema,
  });
}

export function postNegotiation(tripId: string): Promise<NegotiationResponse> {
  return apiRequest({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/negotiation`,
    schema: NegotiationResponseSchema,
  });
}

import {
  CooperationResponseSchema,
  UserImpactStatsSchema,
  type CooperationResponse,
  type UserImpactStats,
} from './types';

export function postCooperation(tripId: string, departureHour: number = 8.5): Promise<CooperationResponse> {
  return apiRequest({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/cooperation?departure_hour=${departureHour}`,
    schema: CooperationResponseSchema,
  });
}

export function getUserImpact(userId: string): Promise<UserImpactStats> {
  return apiRequest({
    method: 'GET',
    path: `/users/${encodeURIComponent(userId)}/impact`,
    schema: UserImpactStatsSchema,
  });
}
