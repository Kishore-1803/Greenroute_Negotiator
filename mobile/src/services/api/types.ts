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
  distance_km: number;
  duration_min: number;
  estimated_cost_inr: number;
  estimated_carbon_g: number;
  route_geometry?: GeoJsonGeometry;
}

export interface UtilityScoreDTO {
  mode: TravelMode;
  utility: number;
  rank: number;
  components: {
    time_normalized: number;
    cost_normalized: number;
    carbon_normalized: number;
  };
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
  user_id?: string;
  stated_priority?: StatedPriority;
  custom_weights?: CustomWeights;
}

export interface BaselineResponse {
  trip_id: string;
  current_mode: TravelMode;
  modes: ModeMetricsDTO[];
  utilities: Record<TravelMode, UtilityScoreDTO>;
  excluded: Record<string, string>;
  best_mode: TravelMode;
  preference: UserPreferenceDTO;
  weights_used: {
    w_time: number;
    w_cost: number;
    w_carbon: number;
  };
}

export interface SelectionRequest {
  selected_mode: TravelMode;
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
  recommended_mode: TravelMode;
  deltas?: {
    time_delta_min: number;
    cost_delta_inr: number;
    carbon_delta_g: number;
  };
  gate_check?: {
    passed: boolean;
    utility_diff: number;
    threshold: number;
  };
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
  stance?: 'advocate' | 'concede';
}

export interface CoordinatorNarrationDTO {
  winner: TravelMode;
  summary: string;
  provider: 'groq' | 'template';
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

export interface ExplanationResponse {
  summary: string;
  reason: string;
  decision: string;
  limitations: string[];
  confidence_note?: string;
  provider: 'groq' | 'template';
}
