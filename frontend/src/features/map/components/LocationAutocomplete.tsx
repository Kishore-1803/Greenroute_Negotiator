import { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin, Loader2, X,
  GraduationCap, TrainFront, Bus, Plane, Building2, Landmark
} from 'lucide-react';
import { MOCK_LOCATIONS, type LocationPoint } from '@/lib/mockLocations';

interface LocationAutocompleteProps {
  placeholder?: string;
  value: LocationPoint | null;
  onChange: (location: LocationPoint) => void;
  disabled?: boolean;
}

export async function geocodeLocationQuery(queryText: string): Promise<LocationPoint | null> {
  const trimmed = queryText.trim();
  if (!trimmed) return null;

  // 1. Check local catalog first
  const localMatch = MOCK_LOCATIONS.find((loc) =>
    loc.title?.toLowerCase().includes(trimmed.toLowerCase()) ||
    loc.label.toLowerCase().includes(trimmed.toLowerCase())
  );
  if (localMatch) return localMatch;

  // 2. Try Google Maps Geocoder if available
  if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        address: trimmed,
        componentRestrictions: { country: 'IN' },
      });
      if (response.results && response.results.length > 0) {
        const top = response.results[0];
        return {
          id: top.place_id,
          label: top.formatted_address.split(',').slice(0, 3).join(','),
          title: top.formatted_address.split(',')[0],
          subtitle: top.formatted_address.split(',').slice(1, 3).join(','),
          lat: top.geometry.location.lat(),
          lon: top.geometry.location.lng(),
          category: 'locality',
        };
      }
    } catch (err) {
      console.warn('Google Geocoder failed, falling back to Photon/OSM:', err);
    }
  }

  // 3. Fallback to Photon API
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=1&lat=13.0827&lon=80.2707`
    );
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      if (photonData.features && photonData.features.length > 0) {
        const feat = photonData.features[0];
        const p = feat.properties;
        const name = p.name || trimmed;
        const sub = [p.district, p.city, p.state].filter(Boolean).join(', ');
        return {
          id: `photon_${feat.geometry.coordinates[0]}_${feat.geometry.coordinates[1]}`,
          label: sub ? `${name}, ${sub}` : name,
          title: name,
          subtitle: sub || 'India',
          lat: feat.geometry.coordinates[1],
          lon: feat.geometry.coordinates[0],
          category: 'locality',
        };
      }
    }
  } catch (err) {
    console.warn('Photon geocoding error:', err);
  }

  // 4. Fallback to OpenStreetMap Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=in&limit=1`,
      { headers: { 'Accept-Language': 'en-US' } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const item = data[0];
      const parts = item.display_name.split(', ');
      return {
        id: item.place_id.toString(),
        label: parts.slice(0, 3).join(', '),
        title: parts[0],
        subtitle: parts.slice(1, 3).join(', '),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        category: 'locality',
      };
    }
  } catch (err) {
    console.error('Nominatim geocoding failed:', err);
  }

  return null;
}

export async function reverseGeocodeLocation(lat: number, lon: number): Promise<LocationPoint | null> {
  // Check local known points
  const closest = MOCK_LOCATIONS.find((loc) => {
    const dLat = Math.abs(loc.lat - lat);
    const dLon = Math.abs(loc.lon - lon);
    return dLat < 0.005 && dLon < 0.005;
  });
  if (closest) return closest;

  // Google Maps Reverse Geocoder
  if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng: lon } });
      if (response.results && response.results.length > 0) {
        const top = response.results[0];
        const parts = top.formatted_address.split(', ');
        return {
          id: top.place_id,
          label: parts.slice(0, 3).join(', '),
          title: parts[0],
          subtitle: parts.slice(1, 3).join(', '),
          lat: top.geometry.location.lat(),
          lon: top.geometry.location.lng(),
          category: 'locality',
        };
      }
    } catch (err) {
      console.warn('Google Reverse Geocoder failed:', err);
    }
  }

  // Fallback to Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { 'Accept-Language': 'en-US' } }
    );
    const data = await response.json();
    if (data && data.display_name) {
      const parts = data.display_name.split(', ');
      return {
        id: data.place_id?.toString() || `${lat},${lon}`,
        label: parts.slice(0, 3).join(', '),
        title: parts[0],
        subtitle: parts.slice(1, 3).join(', '),
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
        category: 'locality',
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
  const [remoteResults, setRemoteResults] = useState<LocationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal query when value prop changes
  useEffect(() => {
    if (value) {
      setQuery(value.label);
    }
  }, [value]);

  // Instant local catalog matches (0ms latency)
  const localMatches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed === value?.label?.toLowerCase()) return [];

    return MOCK_LOCATIONS.filter((loc) => {
      const t = loc.title?.toLowerCase() || '';
      const s = loc.subtitle?.toLowerCase() || '';
      const l = loc.label.toLowerCase();
      const id = loc.id?.toLowerCase() || '';
      return t.includes(trimmed) || s.includes(trimmed) || l.includes(trimmed) || id.includes(trimmed);
    }).slice(0, 5);
  }, [query, value?.label]);

  // Combine local and remote results (local matches appear on top immediately)
  const allResults = useMemo(() => {
    const combined = [...localMatches];
    const seen = new Set(localMatches.map((m) => `${m.lat.toFixed(4)},${m.lon.toFixed(4)}`));

    for (const r of remoteResults) {
      const key = `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(r);
      }
    }
    return combined.slice(0, 6);
  }, [localMatches, remoteResults]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Auto-select if exact match or geocode
        if (query.trim() && query !== value?.label) {
          if (allResults.length > 0) {
            onChange(allResults[0]);
            setQuery(allResults[0].label);
          } else {
            geocodeLocationQuery(query).then((resolved) => {
              if (resolved) {
                onChange(resolved);
                setQuery(resolved.label);
              }
            });
          }
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, value?.label, allResults, onChange]);

  // Debounced remote search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed === value?.label) {
      setRemoteResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);

      // Try Google Places Autocomplete if available
      if (typeof google !== 'undefined' && google.maps && google.maps.places && google.maps.places.AutocompleteService) {
        try {
          const service = new google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: trimmed,
              componentRestrictions: { country: 'in' },
            },
            (predictions, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                const geocoder = new google.maps.Geocoder();
                const promises = predictions.slice(0, 4).map((p) =>
                  geocoder.geocode({ placeId: p.place_id }).then((res) => {
                    if (res.results && res.results[0]) {
                      const loc = res.results[0];
                      const parts = p.description.split(', ');
                      return {
                        id: p.place_id,
                        label: parts.slice(0, 3).join(', '),
                        title: p.structured_formatting?.main_text || parts[0],
                        subtitle: p.structured_formatting?.secondary_text || parts.slice(1, 3).join(', '),
                        lat: loc.geometry.location.lat(),
                        lon: loc.geometry.location.lng(),
                        category: 'locality' as const,
                      };
                    }
                    return null;
                  })
                );
                Promise.all(promises).then((items) => {
                  const valid = items.filter((x): x is NonNullable<typeof x> => Boolean(x));
                  if (valid.length > 0) {
                    setRemoteResults(valid);
                    setIsLoading(false);
                  }
                });
              }
            }
          );
        } catch {
          // Continue to Photon
        }
      }

      // Photon / OSM Search
      try {
        const photonRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5&lat=13.0827&lon=80.2707`
        );
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          if (photonData.features && photonData.features.length > 0) {
            const mapped: LocationPoint[] = photonData.features.map((feat: any) => {
              const p = feat.properties;
              const title = p.name || trimmed;
              const subtitle = [p.district, p.city, p.state].filter(Boolean).join(', ');
              return {
                id: `photon_${feat.geometry.coordinates[0]}_${feat.geometry.coordinates[1]}`,
                label: subtitle ? `${title}, ${subtitle}` : title,
                title,
                subtitle: subtitle || 'India',
                lat: feat.geometry.coordinates[1],
                lon: feat.geometry.coordinates[0],
                category: 'locality',
              };
            });
            setRemoteResults(mapped);
          }
        }
      } catch (e) {
        console.error('Remote search error:', e);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, value?.label]);

  const handleSelect = (loc: LocationPoint) => {
    setQuery(loc.label);
    setIsOpen(false);
    onChange(loc);
  };

  const handleClear = () => {
    setQuery('');
    setRemoteResults([]);
    setIsOpen(true);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allResults.length) {
        handleSelect(allResults[selectedIndex]);
      } else if (allResults.length > 0) {
        handleSelect(allResults[0]);
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

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'college':
        return <GraduationCap className="h-4 w-4 text-emerald-400 shrink-0" />;
      case 'metro':
        return <TrainFront className="h-4 w-4 text-purple-400 shrink-0" />;
      case 'transit':
        return <Bus className="h-4 w-4 text-amber-400 shrink-0" />;
      case 'airport':
        return <Plane className="h-4 w-4 text-sky-400 shrink-0" />;
      case 'tech_park':
        return <Building2 className="h-4 w-4 text-blue-400 shrink-0" />;
      case 'landmark':
        return <Landmark className="h-4 w-4 text-pink-400 shrink-0" />;
      default:
        return <MapPin className="h-4 w-4 text-[#8EE074] shrink-0" />;
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'college':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Campus</span>;
      case 'metro':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Metro</span>;
      case 'transit':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Bus Hub</span>;
      case 'airport':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Airport</span>;
      case 'tech_park':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Tech Park</span>;
      default:
        return null;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center w-full relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="bg-transparent border-none outline-none text-white font-semibold truncate flex-1 disabled:opacity-50 pr-6 text-sm"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-0 p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && query.trim() !== '' && (
        <div className="custom-scrollbar absolute top-full left-0 right-0 mt-2 z-[120] rounded-2xl bg-[#0e170e]/95 backdrop-blur-2xl border border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.85)] overflow-hidden max-h-72 overflow-y-auto">
          {allResults.length > 0 ? (
            <ul className="py-1 divide-y divide-white/5">
              {allResults.map((loc, idx) => {
                const isFocused = selectedIndex === idx;
                return (
                  <li key={loc.id || `${loc.lat}_${loc.lon}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(loc)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3.5 py-2.5 transition-all flex items-start gap-3 cursor-pointer ${
                        isFocused
                          ? 'bg-[#8EE074]/20 border-l-4 border-[#8EE074]'
                          : 'hover:bg-white/10 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="mt-0.5">{getCategoryIcon(loc.category)}</div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {loc.title || loc.label}
                          </span>
                          {getCategoryBadge(loc.category)}
                        </div>
                        {loc.subtitle && (
                          <span className="text-[10px] text-white/55 truncate mt-0.5">
                            {loc.subtitle}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : isLoading ? (
            <div className="px-4 py-4 text-xs text-white/60 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8EE074]" />
              <span>Locating real coordinates…</span>
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-white/50 text-center">
              No matching locations found. Press Enter to geocode directly.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
