import { z } from 'zod';

/**
 * Zod schemas mirroring backend/app/schemas/{common,requests,responses}.py field-for-field.
 * Validated at the API boundary (Section 5's directive) so a backend contract drift fails
 * loudly here instead of silently rendering `undefined` deep in a component.
 */

export const TravelModeSchema = z.enum(['car', 'two_wheeler', 'cycling']);
export type TravelMode = z.infer<typeof TravelModeSchema>;

const RouteGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
});
export type RouteGeometry = z.infer<typeof RouteGeometrySchema>;

export const ModeMetricsDTOSchema = z.object({
  mode: z.string(),
  distance_km: z.number().nullable(),
  duration_min: z.number().nullable(),
  estimated_cost_inr: z.number().nullable(),
  estimated_carbon_g: z.number().nullable(),
  available: z.boolean(),
  routing_source: z.string(),
  routing_disclosure: z.string().nullable().optional(),
  route_geometry: RouteGeometrySchema.nullable().optional(),
});
export type ModeMetricsDTO = z.infer<typeof ModeMetricsDTOSchema>;

export const UtilityScoreDTOSchema = z.object({
  mode: z.string(),
  norm_time: z.number(),
  norm_cost: z.number(),
  norm_carbon: z.number(),
  utility: z.number(),
});
export type UtilityScoreDTO = z.infer<typeof UtilityScoreDTOSchema>;

export const GateCheckDTOSchema = z.object({
  utility_gap: z.number(),
  absolute_gate_passed: z.boolean(),
  time_saved_min: z.number(),
  cost_saved_inr: z.number(),
  carbon_saved_g: z.number(),
});
export type GateCheckDTO = z.infer<typeof GateCheckDTOSchema>;

export const DecisionDeltaDTOSchema = z.object({
  time_saved_min: z.number(),
  cost_saved_inr: z.number(),
  carbon_saved_g: z.number(),
});
export type DecisionDeltaDTO = z.infer<typeof DecisionDeltaDTOSchema>;

export const DecisionDTOSchema = z.object({
  decision: z.enum(['SWITCH', 'STAY']),
  current_mode: z.string(),
  recommended_mode: z.string().nullable(),
  deltas: DecisionDeltaDTOSchema.nullable(),
  gate_check: GateCheckDTOSchema.nullable(),
  reason: z.string(),
});
export type DecisionDTO = z.infer<typeof DecisionDTOSchema>;

export const StateSnapshotDTOSchema = z.object({
  modes: z.array(ModeMetricsDTOSchema),
  utilities: z.record(z.string(), UtilityScoreDTOSchema),
  excluded: z.record(z.string(), z.string()).default({}),
});
export type StateSnapshotDTO = z.infer<typeof StateSnapshotDTOSchema>;

export const UserPreferenceDTOSchema = z.object({
  user_id: z.string(),
  w_time: z.number(),
  w_cost: z.number(),
  w_carbon: z.number(),
  trip_count: z.number(),
});
export type UserPreferenceDTO = z.infer<typeof UserPreferenceDTOSchema>;

export const AGENT_ROLES = ['speed', 'cost', 'carbon'] as const;

/** One specialist agent's Round 1 proposal against its own channel (speed adjusts duration,
 * cost adjusts cost, carbon adjusts carbon). Mirrors
 * domain/negotiation/adjustments.py::ModeAdjustment. */
export const AdjustmentProposalSchema = z.object({
  agent: z.enum(AGENT_ROLES),
  mode: z.string(),
  channel: z.string(),
  delta: z.number(),
  reason: z.string(),
});
export type AdjustmentProposal = z.infer<typeof AdjustmentProposalSchema>;

/** The Round 2 outcome for one (mode, channel): proposals summed, then clamped. Mirrors
 * domain/negotiation/adjustments.py::ResolvedAdjustment. */
export const ResolvedAdjustmentSchema = z.object({
  mode: z.string(),
  channel: z.string(),
  proposed_delta: z.number(),
  applied_delta: z.number(),
  was_clamped: z.boolean(),
  baseline_value: z.number(),
  adjusted_value: z.number(),
});
export type ResolvedAdjustment = z.infer<typeof ResolvedAdjustmentSchema>;

export const AdjustmentOutcomeSchema = z.object({
  agents_active: z.array(z.string()),
  proposals: z.array(AdjustmentProposalSchema),
  resolved: z.array(ResolvedAdjustmentSchema),
});
export type AdjustmentOutcome = z.infer<typeof AdjustmentOutcomeSchema>;

export const BaselineResponseSchema = z.object({
  trip_id: z.string(),
  current_mode: z.string(),
  // `modes` are the metrics the utility formula actually scored -- i.e. AFTER the
  // specialist agents' adjustments. `raw_modes` is the untouched routing+enrichment
  // output; `adjustments` itemises every delta and why. (backend: BaselineResponse)
  modes: z.array(ModeMetricsDTOSchema),
  raw_modes: z.array(ModeMetricsDTOSchema).default([]),
  adjustments: AdjustmentOutcomeSchema.nullable().optional(),
  aqi: z.number().nullable().optional(),
  utilities: z.record(z.string(), UtilityScoreDTOSchema),
  excluded: z.record(z.string(), z.string()),
  best_mode: z.string().nullable(),
  preference: UserPreferenceDTOSchema,
  weights_used: z.record(z.string(), z.number()),
});
export type BaselineResponse = z.infer<typeof BaselineResponseSchema>;

export const SelectionResponseSchema = z.object({
  trip_id: z.string(),
  selected_mode: z.string(),
  recommended_mode: z.string(),
  weights_changed: z.boolean(),
  preference: UserPreferenceDTOSchema,
});
export type SelectionResponse = z.infer<typeof SelectionResponseSchema>;

export const AgentArgumentDTOSchema = z.object({
  agent: z.enum(['speed', 'cost', 'carbon']),
  round: z.number(),
  mode_advocated: z.string(),
  message: z.string(),
  stance: z.enum(['concede', 'rebut']).nullable().optional(),
});
export type AgentArgumentDTO = z.infer<typeof AgentArgumentDTOSchema>;

export const CoordinatorNarrationDTOSchema = z.object({
  winner: z.string(),
  summary: z.string(),
  provider: z.string(),
});
export type CoordinatorNarrationDTO = z.infer<typeof CoordinatorNarrationDTOSchema>;

export const NegotiationResponseSchema = z.object({
  trip_id: z.string(),
  round_1: z.array(AgentArgumentDTOSchema),
  round_2: z.array(AgentArgumentDTOSchema),
  coordinator: CoordinatorNarrationDTOSchema,
  computed_winner: z.string(),
});
export type NegotiationResponse = z.infer<typeof NegotiationResponseSchema>;

export const ConditionChangeResponseSchema = z.object({
  trip_id: z.string(),
  before: StateSnapshotDTOSchema,
  after: StateSnapshotDTOSchema,
  switch_decision: DecisionDTOSchema,
  traffic_disclosure: z.string(),
  surge_experiment_timings: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
});
export type ConditionChangeResponse = z.infer<typeof ConditionChangeResponseSchema>;

export const ExplanationResponseSchema = z.object({
  summary: z.string(),
  reason: z.string(),
  // "RECOMMEND" = Master Plan primary flow (a fresh trip's initial recommendation, before any
  // condition-change/SWITCH-STAY decision exists). "SWITCH"/"STAY" = the advanced flow.
  decision: z.enum(['SWITCH', 'STAY', 'RECOMMEND']),
  limitations: z.array(z.string()),
  confidence_note: z.string(),
  provider: z.string(),
});
export type ExplanationResponse = z.infer<typeof ExplanationResponseSchema>;

export const ErrorEnvelopeSchema = z.object({
  error_code: z.string(),
  message: z.string(),
  request_id: z.string().nullable().optional(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

// --- Outbound request shapes (backend/app/schemas/requests.py) ---

export const STATED_PRIORITIES = ['speed', 'cost', 'carbon', 'balanced'] as const;
export type StatedPriority = (typeof STATED_PRIORITIES)[number];

/** Master Plan "Preference Slider": an explicit continuous time/cost/carbon weight vector for
 * one baseline call. Normalized server-side; takes precedence over stated_priority. */
export interface CustomWeights {
  time: number;
  cost: number;
  carbon: number;
}

export interface BaselineRequest {
  origin_lon: number;
  origin_lat: number;
  dest_lon: number;
  dest_lat: number;
  /** Optional: a brand-new trip has no current mode yet -- omit it for the primary
   * recommendation flow. Only meaningful for the advanced condition-change flow. */
  current_mode?: TravelMode;
  user_id: string;
  stated_priority?: StatedPriority;
  custom_weights?: CustomWeights;
  /** Optional ambient Air Quality Index. Feeds the Carbon agent's exposure adjustment;
   * omitting it means the carbon channel gets no AQI component. */
  aqi?: number;
  /** Whether the user is willing to carpool/share a ride. When true and a compatible
   * commuter exists, the Car mode is discounted before scoring. */
  willing_to_carpool?: boolean;
}

export interface SelectionRequest {
  selected_mode: TravelMode;
  /** Whether the user chose to cooperate via a shared ride or relay. */
  cooperation_used?: boolean;
}

// --- Mobility Cooperation (carpool / relay) + Impact Dashboard (backend: schemas/cooperation.py,
//     infrastructure/storage/impact_store.py) ---

export const CooperationCandidateDTOSchema = z.object({
  commuter_id: z.string(),
  commuter_name: z.string(),
  commuter_mode: z.string(),
  commuter_origin: z.array(z.number()),
  commuter_destination: z.array(z.number()),
  compatibility_score: z.number(),
  cooperation_type: z.string(),
  meeting_point: z.array(z.number()),
  meeting_point_label: z.string(),
  split_point: z.array(z.number()).nullable(),
  split_point_label: z.string().nullable(),
  relay_hub: z.array(z.number()).nullable(),
  relay_hub_label: z.string().nullable(),
  relay_last_mile_mode: z.string().nullable(),
  relay_last_mile_distance_m: z.number().nullable(),
  relay_last_mile_time_min: z.number().nullable(),
  estimated_detour_min: z.number(),
  estimated_walk_m: z.number(),
  estimated_user_cost_saving_inr: z.number(),
  estimated_commuter_cost_saving_inr: z.number(),
  estimated_carbon_saved_g: z.number(),
  vehicle_trips_prevented: z.number(),
  cooperation_narrative: z.string(),
});
export type CooperationCandidateDTO = z.infer<typeof CooperationCandidateDTOSchema>;

export const TravelerNegotiationDTOSchema = z.object({
  user_position: z.string(),
  commuter_position: z.string(),
  mediator_deal: z.string(),
  deal_reached: z.boolean(),
});
export type TravelerNegotiationDTO = z.infer<typeof TravelerNegotiationDTOSchema>;

export const CooperationResponseSchema = z.object({
  candidates: z.array(CooperationCandidateDTOSchema),
  negotiation: TravelerNegotiationDTOSchema.nullable(),
});
export type CooperationResponse = z.infer<typeof CooperationResponseSchema>;

export const UserImpactStatsSchema = z.object({
  total_trips: z.number(),
  green_choices: z.number(),
  carbon_saved_g: z.number(),
  cost_saved_inr: z.number(),
  vehicle_trips_prevented: z.number(),
  trees_equivalent: z.number(),
});
export type UserImpactStats = z.infer<typeof UserImpactStatsSchema>;

/** Mirrors domain/explanation/entities.py's OBJECTION_CATEGORIES minus 'unsupported_constraint'
 * (that category exists for free-text input, which this UI doesn't collect). */
export const OBJECTION_CATEGORIES = [
  'why_switch',
  'why_stay',
  'what_changed',
  'is_traffic_real',
  'are_emissions_exact',
  'why_this_mode',
] as const;
export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export interface ExplanationRequest {
  objection_category?: ObjectionCategory;
  objection_text?: string;
}

// --- Speech / voice narration (backend/app/api/routers/speech.py) ---

export const SpeechStatusSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().nullable(),
  voice_id: z.string().nullable(),
});
export type SpeechStatus = z.infer<typeof SpeechStatusSchema>;
