/** Frozen to the backend's three tracked modes (BaselineRequest.current_mode). */
export type TravelMode = 'car' | 'two_wheeler' | 'cycling' | 'bus' | 'metro';

export const TRAVEL_MODES: readonly TravelMode[] = ['car', 'two_wheeler', 'cycling', 'bus', 'metro'];

export const MODE_LABEL: Record<TravelMode, string> = {
  car: 'Car',
  two_wheeler: 'Two-Wheeler',
  cycling: 'Cycle',
  bus: 'Bus',
  metro: 'Metro',
};

/** Persistent, non-dismissable disclosure per CLAUDE.md Section 14 — exact frozen text. */
export const TWO_WHEELER_DISCLOSURE =
  'Two-Wheeler — estimated (adjusted OSRM car profile, not a dedicated motorcycle router)';
