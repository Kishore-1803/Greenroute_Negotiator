export interface LocationPoint {
  id: string;
  label: string;
  lon: number;
  lat: number;
}

export const MOCK_LOCATIONS: LocationPoint[] = [
  {
    id: 'gandhipuram',
    label: 'Gandhipuram Bus Stand, Coimbatore',
    lon: 76.9605,
    lat: 10.9955,
  },
  {
    id: 'rs_puram',
    label: 'DB Road, RS Puram, Coimbatore',
    lon: 76.9735,
    lat: 11.0070,
  },
  {
    id: 'peelamedu',
    label: 'Avinashi Road, Peelamedu, Coimbatore',
    lon: 77.0025,
    lat: 11.0250,
  },
  {
    id: 'saravanampatti',
    label: 'Sathy Road, Saravanampatti, Coimbatore',
    lon: 76.9950,
    lat: 11.0800,
  },
  {
    id: 'race_course',
    label: 'Race Course Road, Coimbatore',
    lon: 76.9710,
    lat: 10.9980,
  },
];
