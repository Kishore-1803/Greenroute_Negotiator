import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import type { LocationPoint } from '@/lib/mockLocations';

interface LocationAutocompleteProps {
  placeholder?: string;
  value: LocationPoint | null;
  onChange: (location: LocationPoint) => void;
  disabled?: boolean;
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
        // Reset query to last known value if they clicked away without selecting
        if (value) {
          setQuery(value.label);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Debounced fetch to Nominatim API
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmed = query.trim();
      // Don't search if empty or if the query exactly matches the already selected value
      if (!trimmed || trimmed === value?.label) {
        setResults([]);
        return;
      }

      setIsLoading(true);
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
    }, 500);

    return () => clearTimeout(timer);
  }, [query, value?.label]);

  const handleSelect = (loc: LocationPoint) => {
    setQuery(loc.label);
    setIsOpen(false);
    onChange(loc);
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
              Searching global locations...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                  >
                    <MapPin className="h-3.5 w-3.5 text-white/40 shrink-0" />
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
