export interface LocationPoint {
  id?: string;
  lat: number;
  lon: number;
  label: string;
}

export const MOCK_LOCATIONS: LocationPoint[] = [
  { id: '1', label: 'T. Nagar (Example)', lat: 13.0300, lon: 80.2300 },
  { id: '2', label: 'Gemini Flyover (Example)', lat: 13.0450, lon: 80.2450 },
];
