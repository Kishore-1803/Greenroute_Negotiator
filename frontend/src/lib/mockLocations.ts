export interface LocationPoint {
  id?: string;
  lat: number;
  lon: number;
  label: string;
}

export const MOCK_LOCATIONS: LocationPoint[] = [
  { lat: 10.9955, lon: 76.9605, label: "Tidel Park, Coimbatore" },
  { lat: 11.0070, lon: 76.9735, label: "PSG Tech, Coimbatore" },
  { lat: 11.0168, lon: 76.9558, label: "Gandhipuram, Coimbatore" },
  { lat: 11.0183, lon: 76.9725, label: "Peelamedu, Coimbatore" },
];
