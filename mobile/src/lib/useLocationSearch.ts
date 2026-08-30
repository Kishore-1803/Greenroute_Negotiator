import { useEffect, useState } from 'react';
import type { LocationPoint } from './mockLocations';

// Free-text global location search (OpenStreetMap Nominatim) -- mirrors the web frontend's
// features/map/components/LocationAutocomplete.tsx. Shared by any screen that needs a location
// picker (Home, Trip Workspace) so the debounce/error handling lives in one place.
export function useLocationSearch(query: string, active: boolean) {
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!active || trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      const abortId = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=8`,
          {
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'en-US',
              'User-Agent': 'GreenRouteMobile/1.0',
            },
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults(
          (Array.isArray(data) ? data : []).map((item: any) => ({
            id: `osm_${item.place_id}`,
            label: item.display_name,
            lon: parseFloat(item.lon),
            lat: parseFloat(item.lat),
          }))
        );
      } catch (err: any) {
        setResults([]);
        setError(
          err?.name === 'AbortError'
            ? 'Location search timed out. Check your connection and try again.'
            : 'Location search failed. Check your connection and try again.'
        );
      } finally {
        clearTimeout(abortId);
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, active]);

  return { results, loading, error };
}
