import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Car, Crosshair, IndianRupee, Leaf, MapPin, SlidersHorizontal, Zap } from 'lucide-react';
import { MOCK_LOCATIONS, type LocationPoint } from '@/lib/mockLocations';
import { getOrCreateUserId } from '@/lib/userId';
import type { CustomWeights, StatedPriority } from '@/services/api/types';
import { useBaselineMutation } from '@/features/trip/hooks/useBaselineMutation';
import { LocationAutocomplete } from '@/features/map/components/LocationAutocomplete';
import { PreferenceSlider } from './PreferenceSlider';
import { cn } from '@/lib/cn';

const PRIORITY_DETAILS: Record<StatedPriority, { label: string; icon: typeof Zap }> = {
  speed: { label: 'Speed', icon: Zap },
  cost: { label: 'Cost', icon: IndianRupee },
  carbon: { label: 'Carbon', icon: Leaf },
  balanced: { label: 'Balanced', icon: Car },
};

const DEFAULT_CUSTOM_WEIGHTS: CustomWeights = { time: 45, cost: 30, carbon: 25 };

export function TripPlannerForm() {
  const navigate = useNavigate();
  const [priority, setPriority] = useState<StatedPriority>('balanced');
  const [useCustomWeights, setUseCustomWeights] = useState(false);
  const [customWeights, setCustomWeights] = useState<CustomWeights>(DEFAULT_CUSTOM_WEIGHTS);
  const [origin, setOrigin] = useState<LocationPoint | null>(MOCK_LOCATIONS[0]);
  const [destination, setDestination] = useState<LocationPoint | null>(MOCK_LOCATIONS[1]);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string>();
  const baseline = useBaselineMutation();
  const userId = useMemo(() => getOrCreateUserId(), []);

  function handleLocate() {
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not available in this browser.');
      return;
    }
    setLocating(true);
    setLocateError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          id: 'gps',
          label: 'Your Location',
          lon: position.coords.longitude,
          lat: position.coords.latitude,
        });
        setLocating(false);
      },
      (error) => {
        setLocateError(error.code === error.PERMISSION_DENIED ? 'Location permission denied.' : 'Could not get your location.');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!origin || !destination) return;
    baseline.mutate(
      {
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: destination.lon,
        dest_lat: destination.lat,
        // current_mode intentionally omitted here (Master Plan primary flow): a brand-new trip
        // has no current mode yet, the recommendation IS the point. best_mode in the response
        // becomes current_mode server-side.
        user_id: userId,
        ...(useCustomWeights ? { custom_weights: customWeights } : { stated_priority: priority }),
      },
      {
        onSuccess: (data) => {
          navigate(`/trip/${data.trip_id}`, { state: { baseline: data } });
        },
      },
    );
  }

  return (
    <div id="plan-route-card" className="glass-pane w-full max-w-[340px] rounded-[22px] p-3.5 sm:p-4 transition-all">
      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mb-2.5 drop-shadow-sm">Plan Your Route</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {/* Current Location Input */}
        <div className="glass-input-box relative flex items-center justify-between rounded-xl px-3 py-2.5 hover:border-white/35 focus-within:border-[#8EE074]/70 transition-all">
          <div className="flex items-center gap-2.5 w-full">
            <MapPin className="h-4 w-4 text-white/70 shrink-0" />
            <LocationAutocomplete
              value={origin}
              onChange={setOrigin}
              placeholder="Current Location"
            />
          </div>
          <button
            type="button"
            onClick={handleLocate}
            title="Use my current position"
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded text-white/70 hover:text-[#8EE074] transition-all shrink-0 cursor-pointer',
              locating && 'animate-spin text-[#8EE074]'
            )}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        </div>
        {locateError && <span className="text-[10px] text-amber-300 px-1">{locateError}</span>}

        {/* Destination Input */}
        <div className="glass-input-box flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:border-white/35 focus-within:border-[#8EE074]/70 transition-all">
          <MapPin className="h-4 w-4 text-white/70 shrink-0" />
          <LocationAutocomplete
            value={destination}
            onChange={setDestination}
            placeholder="Destination"
          />
        </div>

        {/* Stated Priority -- Preference Memory's cold-start signal for a first-time user_id --
            or, toggled on, the Master Plan's continuous PreferenceSlider for custom weights. */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              What matters most to you?
            </span>
            <button
              type="button"
              onClick={() => setUseCustomWeights((prev) => !prev)}
              className="flex items-center gap-1 text-[9px] font-semibold text-white/50 hover:text-[#8EE074] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3" />
              {useCustomWeights ? 'Use presets' : 'Custom weights'}
            </button>
          </div>

          {useCustomWeights ? (
            <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2.5">
              <PreferenceSlider weights={customWeights} onChange={setCustomWeights} />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(PRIORITY_DETAILS) as StatedPriority[]).map((p) => {
                const Icon = PRIORITY_DETAILS[p].icon;
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold transition-all cursor-pointer',
                      isSelected
                        ? 'bg-[#4D7C3E]/70 text-white shadow-sm'
                        : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-[#8EE074]' : 'text-white/60')} />
                    {PRIORITY_DETAILS[p].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {baseline.isError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/20 px-2.5 py-1.5 text-[11px] text-red-200 border border-red-500/30">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>{baseline.error.message}</span>
          </div>
        )}

        {/* Find Best Route Submit Button */}
        <button
          type="submit"
          disabled={baseline.isPending || !origin || !destination}
          className="mt-0.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4D7C3E] hover:bg-[#5A8F48] py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-semibold text-white shadow-md active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>{baseline.isPending ? 'Finding Optimal Mode…' : 'Find Best Route'}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
}
