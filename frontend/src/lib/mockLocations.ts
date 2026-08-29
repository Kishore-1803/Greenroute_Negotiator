export interface LocationPoint {
  id: string;
  label: string;
  lon: number;
  lat: number;
}

export const MOCK_LOCATIONS: LocationPoint[] = [
  { id: '1', label: 'Origin (Example)', lat: 28.6139, lon: 77.2090 },
  { id: '2', label: 'Destination (Example)', lat: 28.5562, lon: 77.1000 }
];
