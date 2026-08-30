import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationPoint } from './mockLocations';

export interface CurrentLocationState {
  /** Null until a fix is obtained, or if permission was refused. */
  point: LocationPoint | null;
  loading: boolean;
  /** True when the user declined -- the UI offers manual origin selection instead of retrying. */
  denied: boolean;
  error: string | null;
  refresh: () => Promise<LocationPoint | null>;
}

/**
 * The device's GPS position as a LocationPoint, so it drops straight into the same
 * origin/destination slots the location picker fills.
 *
 * Requests a fix on mount rather than on demand: the voice flow needs an origin the instant the
 * user finishes speaking, and asking for one only then adds a multi-second GPS wait to the
 * middle of a flow that is otherwise moving.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [point, setPoint] = useState<LocationPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<LocationPoint | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return null;
      }
      setDenied(false);

      const fix = await Location.getCurrentPositionAsync({
        // Balanced is a city-block-accurate fix in a few seconds. Highest accuracy would spin
        // the GPS for far longer to refine a position that only needs to seed a route's origin.
        accuracy: Location.Accuracy.Balanced,
      });

      const next: LocationPoint = {
        id: 'gps',
        label: await describeCoords(fix.coords.longitude, fix.coords.latitude),
        lon: fix.coords.longitude,
        lat: fix.coords.latitude,
      };
      setPoint(next);
      return next;
    } catch (err: any) {
      setError(err?.message || 'Could not get your location.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { point, loading, denied, error, refresh };
}

/**
 * A human-readable name for a GPS fix, via the OS geocoder.
 *
 * Best-effort by design. The coordinates are what routing needs; the label only exists so the
 * user can confirm the app has them in the right place. A reverse-geocode failure therefore
 * falls back to a generic phrase rather than failing the fix, which would block the whole trip
 * over cosmetics.
 */
async function describeCoords(lon: number, lat: number): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ longitude: lon, latitude: lat });
    if (!place) return 'Your current location';

    // Neighbourhood and city, not the full postal address: this sits in a one-line field, and
    // "Peelamedu, Coimbatore" is what a person would actually say about where they are.
    const parts = [place.district || place.name || place.street, place.city || place.subregion]
      .filter((part): part is string => Boolean(part && part.trim()))
      // A fix that lands on a street named after its own district repeats the same word twice.
      .filter((part, index, all) => all.indexOf(part) === index);

    return parts.length ? parts.slice(0, 2).join(', ') : 'Your current location';
  } catch {
    return 'Your current location';
  }
}
