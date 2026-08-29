// The one demo corridor the app is actually built around: it is the origin/destination pair
// the cached routing fallback can serve when the routing provider is unreachable
// (backend/app/infrastructure/routing/cached_fallback.py, matched against
// settings.default_origin/default_destination).
//
// The labels are NOT decorative copy -- they must keep naming these exact coordinates. They are
// taken from the same lat/lon entries in mockLocations.ts rather than written fresh, so the
// demo card cannot drift into describing a route it does not launch.
export const FIXED_TRIP = {
  originLat: 10.9955,
  originLon: 76.9605,
  originLabel: 'Tidel Park, Coimbatore',
  destLat: 11.0070,
  destLon: 76.9735,
  destinationLabel: 'PSG Tech, Coimbatore',
  // Real car distance for this pair (~3.2 km), rounded for display. Kept next to the
  // coordinates so the card's copy and the route it launches stay in sync.
  approxDistanceKm: 3.2,
};
