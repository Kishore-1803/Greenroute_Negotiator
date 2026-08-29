export type TravelMode = 'car' | 'two_wheeler' | 'cycling';

export const MODE_LABEL: Record<TravelMode, string> = {
  car: 'Car',
  two_wheeler: 'Two-Wheeler',
  cycling: 'Cycling',
};

export const TRAVEL_MODES: TravelMode[] = ['car', 'two_wheeler', 'cycling'];
