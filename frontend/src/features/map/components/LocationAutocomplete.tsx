import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import type { LocationPoint } from '@/lib/mockLocations';

interface LocationAutocompleteProps {
  placeholder?: string;
  value: LocationPoint | null;
  onChange: (location: LocationPoint) => void;
  disabled?: boolean;
}

export async function geocodeLocationQuery(queryText: string): Promise<LocationPoint | null> {
  const trimmed = queryText.trim();
  if (!trimmed) return null;

  // 1. Try Google Maps Geocoder if available
  if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: trimmed });
      if (response.results && response.results.length > 0) {
        const top = response.results[0];
        return {
          id: top.place_id,
          label: top.formatted_address,
          lat: top.geometry.location.lat(),
          lon: top.geometry.location.lng(),
        };
      }
    } catch (err) {
      console.warn('Google Geocoder failed, falling back to Nominatim:', err);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`,
      { headers: { 'Accept-Language': 'en-US' } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const item = data[0];
      return {
        id: item.place_id.toString(),
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      };
    }
  } catch (err) {
    console.error('Nominatim geocoding failed:', err);
  }

  return null;
}

export async function reverseGeocodeLocation(lat: number, lon: number): Promise<LocationPoint | null> {
  // 1. Try Google Maps Geocoder if available
  if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng: lon } });
      if (response.results && response.results.length > 0) {
        const top = response.results[0];
        // For reverse geocoding, prefer a shorter name if possible (e.g., locality + city)
        // But using formatted_address is safest fallback
        let shortName = top.formatted_address;
        const addressComponents = top.address_components;
        if (addressComponents) {
          const locality = addressComponents.find(c => c.types.includes('locality'))?.long_name;
          const route = addressComponents.find(c => c.types.includes('route'))?.long_name;
          if (locality && route) shortName = `${route}, ${locality}`;
          else if (locality) shortName = locality;
        }

        return {
          id: top.place_id,
          label: shortName,
          lat: top.geometry.location.lat(),
          lon: top.geometry.location.lng(),
        };
      }
    } catch (err) {
      console.warn('Google Reverse Geocoder failed, falling back to Nominatim:', err);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { 'Accept-Language': 'en-US' } }
    );
    const data = await response.json();
    if (data && data.display_name) {
      return {
        id: data.place_id?.toString() || `${lat},${lon}`,
        label: data.display_name,
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
      };
    }
  } catch (err) {
    console.error('Nominatim reverse geocoding failed:', err);
  }

  return null;
}

export function LocationAutocomplete({
  placeholder = 'Search location...',
  value,
  onChange,
  disabled = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal query when value changes from outside
  useEffect(() => {
    if (value) {
      setQuery(value.label);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Auto-geocode typed text if user clicked away without explicitly selecting
        if (query.trim() && query !== value?.label) {
          geocodeLocationQuery(query).then((resolved) => {
            if (resolved) onChange(resolved);
          });
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, value?.label, onChange]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed || trimmed === value?.label) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      // Try Google Places Autocomplete first if loaded
      if (typeof google !== 'undefined' && google.maps && google.maps.places && google.maps.places.AutocompleteService) {
        try {
          const service = new google.maps.places.AutocompleteService();
          service.getPlacePredictions({ input: trimmed }, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
              const geocoder = new google.maps.Geocoder();
              const promises = predictions.slice(0, 5).map((p) =>
                geocoder.geocode({ placeId: p.place_id }).then((res) => {
                  if (res.results && res.results[0]) {
                    const loc = res.results[0];
                    return {
                      id: p.place_id,
                      label: p.description,
                      lat: loc.geometry.location.lat(),
                      lon: loc.geometry.location.lng(),
                    };
                  }
                  return null;
                })
              );
              Promise.all(promises).then((items) => {
                const valid = items.filter((x): x is NonNullable<typeof x> => Boolean(x));
                if (valid.length > 0) {
                  setResults(valid);
                  setIsLoading(false);
                }
              });
            }
          });
        } catch {
          // Fall through to Nominatim
        }
      }

      // Nominatim search
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5`,
          { headers: { 'Accept-Language': 'en-US' } }
        );
        const data = await response.json();
        const mapped: LocationPoint[] = data.map((item: any) => ({
          id: item.place_id.toString(),
          label: item.display_name,
          lon: parseFloat(item.lon),
          lat: parseFloat(item.lat),
        }));
        setResults(mapped);
      } catch (e) {
        console.error('Failed to fetch locations', e);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, value?.label]);

  const handleSelect = (loc: LocationPoint) => {
    setQuery(loc.label);
    setIsOpen(false);
    onChange(loc);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelect(results[0]);
      } else if (query.trim()) {
        setIsLoading(true);
        const resolved = await geocodeLocationQuery(query);
        setIsLoading(false);
        if (resolved) {
          handleSelect(resolved);
        }
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="bg-transparent border-none outline-none text-white font-semibold truncate flex-1 disabled:opacity-50"
        />
        {isOpen && query && isLoading ? (
          <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin ml-2 shrink-0" />
        ) : isOpen && query ? (
          <Search className="h-3.5 w-3.5 text-white/40 ml-2 shrink-0" />
        ) : null}
      </div>

      {isOpen && !disabled && query.trim() !== '' && query !== value?.label && (
        <div className="custom-scrollbar absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-4 text-xs text-white/50 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Finding real location coordinates…
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#8EE074] shrink-0" />
                    <span className="truncate" title={loc.label}>{loc.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-xs text-white/50 text-center">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
