import type { TravelMode } from '../../types/mode';

export type StatedPriority = 'speed' | 'cost' | 'carbon' | 'balanced';

export interface CustomWeights {
  time: number;
  cost: number;
  carbon: number;
}

export type ObjectionCategory =
  | 'why_switch'
  | 'why_stay'
  | 'what_changed'
  | 'is_traffic_real'
  | 'are_emissions_exact'
  | 'why_this_mode';

export const OBJECTION_CATEGORIES: ObjectionCategory[] = [
  'why_switch',
  'why_stay',
  'what_changed',
  'is_traffic_real',
  'are_emissions_exact',
  'why_this_mode',
];

export interface GeoJsonGeometry {
  type: 'LineString' | 'MultiLineString' | 'Point';
  coordinates: any;
}

export interface ModeMetricsDTO {
  mode: TravelMode;
  distance_km: number | null;
  duration_min: number | null;
  estimated_cost_inr: number | null;
  estimated_carbon_g: number | null;
  available: boolean;
  routing_source: string;
  routing_disclosure?: string | null;
  route_geometry?: GeoJsonGeometry | null;
}

export interface UtilityScoreDTO {
  mode: TravelMode;
  norm_time: number;
  norm_cost: number;
  norm_carbon: number;
  utility: number;
}

export interface UserPreferenceDTO {
  user_id: string;
  w_time: number;
  w_cost: number;
  w_carbon: number;
  trip_count: number;
}

export interface BaselineRequest {
  origin_lon: number;
  origin_lat: number;
  dest_lon: number;
  dest_lat: number;
  current_mode?: TravelMode;
  user_id: string;
  stated_priority?: StatedPriority;
  custom_weights?: CustomWeights;
  /** Ambient AQI at trip time; feeds the Carbon agent's exposure adjustment. Omit for none. */
  aqi?: number;
  /** Whether the user is willing to carpool/share a ride. Defaults true server-side. */
  willing_to_carpool?: boolean;
}

export interface WeatherDTO {
  temp_c?: number;
  description?: string;
  precip_mm?: number;
  is_raining?: boolean;
  dest_temp_c?: number;
  dest_description?: string;
}

export interface BaselineResponse {
  trip_id: string;
  current_mode: TravelMode;
  // ADJUSTED metrics the utility formula actually scored (post specialist-agent adjustment).
  modes: ModeMetricsDTO[];
  // Untouched routing+enrichment output, pre-adjustment.
  raw_modes?: ModeMetricsDTO[];
  adjustments?: Record<string, unknown> | null;
  weather?: WeatherDTO | null;
  aqi?: number | null;
  utilities: Record<TravelMode, UtilityScoreDTO>;
  excluded: Record<string, string>;
  best_mode: TravelMode | null;
  preference: UserPreferenceDTO;
  weights_used: {
    w_time: number;
    w_cost: number;
    w_carbon: number;
  };
}

export interface SelectionRequest {
  selected_mode: TravelMode;
  /** Whether the user chose to cooperate via a shared ride or relay. */
  cooperation_used?: boolean;
}

export interface SelectionResponse {
  trip_id: string;
  selected_mode: TravelMode;
  recommended_mode: TravelMode;
  weights_changed: boolean;
  preference: UserPreferenceDTO;
}

export interface DecisionDTO {
  decision: 'SWITCH' | 'STAY';
  current_mode: TravelMode;
  recommended_mode: TravelMode | null;
  deltas?: {
    time_saved_min: number;
    cost_saved_inr: number;
    carbon_saved_g: number;
  } | null;
  gate_check?: {
    utility_gap: number;
    absolute_gate_passed: boolean;
    time_saved_min: number;
    cost_saved_inr: number;
    carbon_saved_g: number;
  } | null;
  reason?: string;
}

export interface StateSnapshotDTO {
  modes: ModeMetricsDTO[];
  utilities: Record<TravelMode, UtilityScoreDTO>;
  excluded?: Record<string, string>;
}

export interface ConditionChangeResponse {
  trip_id: string;
  before: StateSnapshotDTO;
  after: StateSnapshotDTO;
  switch_decision: DecisionDTO;
  traffic_disclosure: string;
  surge_experiment_timings?: Record<string, number>;
}

export interface AgentArgumentDTO {
  round: number;
  agent: 'speed' | 'cost' | 'carbon';
  message: string;
  mode_advocated: TravelMode;
  stance?: 'concede' | 'rebut' | null;
}

export interface CoordinatorNarrationDTO {
  winner: TravelMode;
  summary: string;
  provider: string;
}

export interface NegotiationResponse {
  trip_id: string;
  round_1: AgentArgumentDTO[];
  round_2: AgentArgumentDTO[];
  coordinator: CoordinatorNarrationDTO;
  computed_winner: TravelMode;
}

export interface ExplanationRequest {
  objection_category?: ObjectionCategory;
  objection_text?: string;
}

// --- Mobility Cooperation (carpool / relay) + Impact Dashboard ---

export interface CooperationCandidateDTO {
  commuter_id: string;
  commuter_name: string;
  commuter_mode: string;
  commuter_origin: [number, number];
  commuter_destination: [number, number];
  compatibility_score: number;
  cooperation_type: string;
  meeting_point: [number, number];
  meeting_point_label: string;
  split_point: [number, number] | null;
  split_point_label: string | null;
  relay_hub: [number, number] | null;
  relay_hub_label: string | null;
  relay_last_mile_mode: string | null;
  relay_last_mile_distance_m: number | null;
  relay_last_mile_time_min: number | null;
  estimated_detour_min: number;
  estimated_walk_m: number;
  estimated_user_cost_saving_inr: number;
  estimated_commuter_cost_saving_inr: number;
  estimated_carbon_saved_g: number;
  vehicle_trips_prevented: number;
  cooperation_narrative: string;
}

export interface TravelerNegotiationDTO {
  user_position: string;
  commuter_position: string;
  mediator_deal: string;
  deal_reached: boolean;
}

export interface CooperationResponse {
  candidates: CooperationCandidateDTO[];
  negotiation: TravelerNegotiationDTO | null;
}

export interface UserImpactStats {
  total_trips: number;
  green_choices: number;
  carbon_saved_g: number;
  cost_saved_inr: number;
  vehicle_trips_prevented: number;
  trees_equivalent: number;
}

export interface ExplanationResponse {
  summary: string;
  reason: string;
  // "RECOMMEND" = the primary flow's initial recommendation, before any SWITCH/STAY decision
  // exists. "SWITCH"/"STAY" = the advanced condition-change flow.
  decision: 'SWITCH' | 'STAY' | 'RECOMMEND';
  limitations: string[];
  confidence_note?: string;
  provider: string;
}
