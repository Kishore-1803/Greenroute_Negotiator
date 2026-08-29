// The one demo corridor the app is actually built around: it is the origin/destination pair
// the backend's OSRM datasets cover (backend/data/osrm/) and the only pair its cached fallback
// can serve when OSRM is down (backend/.../osrm/cached_fallback.py, matched against
// settings.default_origin/default_destination).
//
// The labels are NOT decorative copy -- they must keep naming these exact coordinates. They are
// taken from the same lat/lon entries in mockLocations.ts rather than written fresh, so the
// demo card cannot drift into describing a route it does not launch.
export const FIXED_TRIP = {
  originLat: 10.9955,
  originLon: 76.9605,
  originLabel: 'Tidel Park',
  destLat: 11.0070,
  destLon: 76.9735,
  destinationLabel: 'PSG Tech',
  // Real car distance for this pair from live OSRM (3.201 km), rounded for display. Kept here
  // next to the coordinates so the card's copy and the route it launches stay in sync.
  approxDistanceKm: 3.2,
};
