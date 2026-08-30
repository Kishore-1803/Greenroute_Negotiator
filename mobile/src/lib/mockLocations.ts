export interface LocationPoint {
  id: string;
  label: string;
  lon: number;
  lat: number;
}

// Coordinates mirror frontend/src/lib/mockLocations.ts and the simulated commuter corridors
// in backend/app/infrastructure/cooperation/commuter_pool.py (COIMBATORE_COMMUTERS). Carpool
// matching (domain/cooperation/overlap.py) requires the trip's origin/destination to land
// within ~1.5km of a commuter's origin/destination, so these points are taken directly from
// that pool's real origin/destination values rather than approximated -- picking any two of
// them below reliably surfaces a carpool match instead of an empty "no compatible commuters".
export const MOCK_LOCATIONS: LocationPoint[] = [
  {
    id: 'tidel_park',
    label: 'Tidel Park, Coimbatore',
    lon: 76.9605,
    lat: 10.9955,
  },
  {
    id: 'psg_tech',
    label: 'PSG Tech, Coimbatore',
    lon: 76.9735,
    lat: 11.0070,
  },
  {
    id: 'gandhipuram',
    label: 'Gandhipuram, Coimbatore',
    lon: 76.9558,
    lat: 11.0168,
  },
  {
    id: 'peelamedu',
    label: 'Peelamedu, Coimbatore',
    lon: 76.9725,
    lat: 11.0183,
  },
  {
    id: 'rs_puram',
    label: 'RS Puram, Coimbatore',
    lon: 76.9500,
    lat: 11.0050,
  },
  {
    id: 'town_hall',
    label: 'Town Hall, Coimbatore',
    lon: 76.9620,
    lat: 11.0005,
  },
  {
    id: 'singanallur',
    label: 'Singanallur, Coimbatore',
    lon: 77.0050,
    lat: 11.0020,
  },
  {
    id: 'saravanampatti',
    label: 'Saravanampatti, Coimbatore',
    lon: 76.9900,
    lat: 11.0450,
  },
];
