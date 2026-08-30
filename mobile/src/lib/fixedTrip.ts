// The one demo corridor the app is actually built around: it is the origin/destination pair
// the backend's cached routing fallback can serve when Google Maps is unreachable
// (backend/app/infrastructure/routing/cached_fallback.py, matched against
// settings.default_origin/default_destination). Same coordinates as mockLocations.ts's
// tidel_park -> psg_tech entries -- keep the labels in sync with that file.
export const FIXED_TRIP = {
  originLon: 76.9605,
  originLat: 10.9955,
  destLon: 76.9735,
  destLat: 11.0070,
  originLabel: 'Tidel Park, Coimbatore',
  destinationLabel: 'PSG Tech, Coimbatore',
};
