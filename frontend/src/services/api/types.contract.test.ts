import { describe, expect, it } from 'vitest';
import { AdjustmentOutcomeSchema, BaselineResponseSchema, SpeechStatusSchema } from './types';

/**
 * Guards the exact contract the specialist-agent adjustment layer and the speech feature added
 * to the backend responses. If backend/app/schemas/responses.py::BaselineResponse or the
 * /speech/status shape drifts, this fails here instead of silently rendering `undefined` in
 * DecisionWorkspacePanel. Fixtures are trimmed real responses (see docstrings).
 */

// A real POST /trips/baseline response body (Coimbatore corridor, aqi=175), route_geometry and
// a couple of unused-here fields elided.
const BASELINE_FIXTURE = {
  trip_id: '317a1893-af0d-47a8-9cef-a27c7bedb9b4',
  current_mode: 'two_wheeler',
  modes: [
    { mode: 'car', distance_km: 3.201, duration_min: 7.532, estimated_cost_inr: 24.99, estimated_carbon_g: 396.98, available: true, routing_source: 'osrm-live', routing_disclosure: null, route_geometry: null },
    { mode: 'two_wheeler', distance_km: 3.201, duration_min: 5.618, estimated_cost_inr: 7.7, estimated_carbon_g: 200.46, available: true, routing_source: 'osrm-live', routing_disclosure: 'Two-Wheeler estimate', route_geometry: null },
    { mode: 'cycling', distance_km: 3.344, duration_min: 15.15, estimated_cost_inr: 1.0, estimated_carbon_g: 695.55, available: true, routing_source: 'osrm-live', routing_disclosure: null, route_geometry: null },
  ],
  raw_modes: [
    { mode: 'car', distance_km: 3.201, duration_min: 3.532, estimated_cost_inr: 15.62, estimated_carbon_g: 361.71, available: true, routing_source: 'osrm-live', routing_disclosure: null, route_geometry: null },
    { mode: 'two_wheeler', distance_km: 3.201, duration_min: 4.118, estimated_cost_inr: 5.7, estimated_carbon_g: 131.88, available: true, routing_source: 'osrm-live', routing_disclosure: null, route_geometry: null },
    { mode: 'cycling', distance_km: 3.344, duration_min: 14.65, estimated_cost_inr: 0.0, estimated_carbon_g: 434.72, available: true, routing_source: 'osrm-live', routing_disclosure: null, route_geometry: null },
  ],
  adjustments: {
    agents_active: ['speed', 'cost', 'carbon'],
    proposals: [
      { agent: 'speed', mode: 'car', channel: 'duration_min', delta: 4.0, reason: 'OSRM reports in-vehicle time only; car needs ~4 min of parking search.' },
      { agent: 'carbon', mode: 'cycling', channel: 'estimated_carbon_g', delta: 367.338, reason: 'At AQI 175, exposure scales with ventilation rate.' },
    ],
    resolved: [
      { mode: 'car', channel: 'duration_min', proposed_delta: 4.0, applied_delta: 4.0, was_clamped: false, baseline_value: 3.532, adjusted_value: 7.532 },
      { mode: 'cycling', channel: 'estimated_carbon_g', proposed_delta: 367.338, applied_delta: 260.832, was_clamped: true, baseline_value: 434.72, adjusted_value: 695.55 },
    ],
  },
  aqi: 175.0,
  utilities: {
    car: { mode: 'car', norm_time: 0.0, norm_cost: 0.7, norm_carbon: 0.6, utility: 0.42 },
    two_wheeler: { mode: 'two_wheeler', norm_time: 1.0, norm_cost: 1.0, norm_carbon: 1.0, utility: 1.0 },
    cycling: { mode: 'cycling', norm_time: 0.0, norm_cost: 0.0, norm_carbon: 0.0, utility: 0.0 },
  },
  excluded: {},
  best_mode: 'two_wheeler',
  preference: { user_id: 'u', w_time: 0.45, w_cost: 0.3, w_carbon: 0.25, trip_count: 0 },
  weights_used: { time: 0.45, cost: 0.3, carbon: 0.25 },
};

describe('BaselineResponse contract (agent adjustment layer)', () => {
  it('parses a real response carrying raw_modes / adjustments / aqi', () => {
    const parsed = BaselineResponseSchema.parse(BASELINE_FIXTURE);
    expect(parsed.raw_modes).toHaveLength(3);
    expect(parsed.aqi).toBe(175);
    expect(parsed.adjustments?.agents_active).toEqual(['speed', 'cost', 'carbon']);
    expect(parsed.adjustments?.resolved[1].was_clamped).toBe(true);
  });

  it('still parses an older response with no adjustment fields (backward compatible)', () => {
    const legacy: Record<string, unknown> = { ...BASELINE_FIXTURE };
    delete legacy.raw_modes;
    delete legacy.adjustments;
    delete legacy.aqi;
    const parsed = BaselineResponseSchema.parse(legacy);
    expect(parsed.raw_modes).toEqual([]); // schema default
    expect(parsed.adjustments ?? null).toBeNull();
  });

  it('rejects a resolved adjustment missing a numeric field', () => {
    const broken = structuredClone(BASELINE_FIXTURE);
    // @ts-expect-error deliberately corrupting the fixture
    delete broken.adjustments.resolved[0].applied_delta;
    expect(() => BaselineResponseSchema.parse(broken)).toThrow();
  });
});

describe('AdjustmentOutcome contract', () => {
  it('requires the three sub-arrays', () => {
    expect(() => AdjustmentOutcomeSchema.parse({ agents_active: [] })).toThrow();
  });
});

describe('SpeechStatus contract', () => {
  it('parses both enabled and disabled shapes', () => {
    expect(SpeechStatusSchema.parse({ enabled: true, provider: 'elevenlabs', voice_id: 'abc' }).enabled).toBe(true);
    expect(SpeechStatusSchema.parse({ enabled: false, provider: null, voice_id: null }).enabled).toBe(false);
  });
});
