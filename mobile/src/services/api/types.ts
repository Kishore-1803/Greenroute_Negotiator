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
  type: 'LineString';
  coordinates: [number, number][];
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
  /** Optional: a brand-new trip has no current mode yet -- omit it for the primary
   * recommendation flow. Only meaningful for the advanced condition-change flow. */
  current_mode?: TravelMode;
  user_id: string;
  stated_priority?: StatedPriority;
  custom_weights?: CustomWeights;
}

export interface BaselineResponse {
  trip_id: string;
  current_mode: TravelMode;
  modes: ModeMetricsDTO[];
  utilities: Record<TravelMode, UtilityScoreDTO>;
  excluded: Record<string, string>;
  best_mode: TravelMode | null;
  preference: UserPreferenceDTO;
  /** Normalized time/cost/carbon weight vector actually used for this baseline's utility
   * computation -- keyed "time"/"cost"/"carbon" (CustomWeights' keys), NOT UserPreferenceDTO's
   * w_time/w_cost/w_carbon keys. */
  weights_used: CustomWeights;
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
  recommended_mode: TravelMode | null;
  deltas: {
    time_saved_min: number;
    cost_saved_inr: number;
    carbon_saved_g: number;
  } | null;
  gate_check: {
    utility_gap: number;
    absolute_gate_passed: boolean;
    time_saved_min: number;
    cost_saved_inr: number;
    carbon_saved_g: number;
  } | null;
  reason: string;
}

export interface StateSnapshotDTO {
  modes: ModeMetricsDTO[];
  utilities: Record<TravelMode, UtilityScoreDTO>;
  excluded: Record<string, string>;
}

export interface ConditionChangeResponse {
  trip_id: string;
  before: StateSnapshotDTO;
  after: StateSnapshotDTO;
  switch_decision: DecisionDTO;
  traffic_disclosure: string;
  surge_experiment_timings: Record<string, number | string | boolean>;
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

export interface ExplanationResponse {
  summary: string;
  reason: string;
  // "RECOMMEND" = the primary flow's initial recommendation, before any SWITCH/STAY decision
  // exists. "SWITCH"/"STAY" = the advanced condition-change flow.
  decision: 'SWITCH' | 'STAY' | 'RECOMMEND';
  limitations: string[];
  confidence_note: string;
  provider: string;
}

// --- Voice flow (backend: app/api/routers/voice.py) -------------------------------------

export interface ResolvedPlaceDTO {
  label: string;
  lon: number;
  lat: number;
}

export interface VoiceTranscriptionResponse {
  transcript: string;
}

export interface VoiceInterpretRequest {
  transcript: string;
  /** Both or neither -- the backend ignores a lone coordinate rather than treating half a fix
   * as a position. Used to bias an ambiguous place name and to stand in as the trip's origin. */
  device_lon?: number;
  device_lat?: number;
}

export interface VoiceInterpretResponse {
  transcript: string;
  origin: ResolvedPlaceDTO | null;
  destination: ResolvedPlaceDTO | null;
  /** The place as understood, before geocoding -- shown so a mis-transcription is visible. */
  destination_query: string | null;
  stated_priority: StatedPriority | null;
  is_trip_request: boolean;
  /** Non-null means the flow cannot proceed: show it, speak it, let the user retry. */
  clarification: string | null;
  intent_provider: string;
}

export interface VoiceNarrationRequest {
  trip_id: string;
  destination_label?: string;
  spoken_priority?: StatedPriority;
}

export interface VoiceNarrationResponse {
  script: string;
  /** Server-relative path to synthesized audio, or null when no TTS provider was available and
   * the device's own speech engine should read `script` instead. */
  speech_url: string | null;
  provider: string;
}

// --- Accounts (backend: app/api/routers/auth.py) ----------------------------------------

export interface UserDTO {
  user_id: string;
  name: string;
  email: string;
  /** ISO 8601 timestamp. */
  created_at: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDTO;
  access_token: string;
  token_type: string;
  /** Seconds until the token lapses, so the client can act before it does. */
  expires_in: number;
}

export interface LearnedPreferenceDTO {
  w_time: number;
  w_cost: number;
  w_carbon: number;
  trip_count: number;
  /** False while trip_count is 0: the weights are the cold-start preset, not anything observed.
   * Rendering them as "what we learned about you" would present a default back as the user's
   * own behaviour, so the profile shows an empty state instead. */
  has_learned: boolean;
}

export interface UserProfileResponse {
  user: UserDTO;
  preference: LearnedPreferenceDTO;
}
