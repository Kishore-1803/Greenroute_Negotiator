import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Car, IndianRupee, Leaf, Zap } from 'lucide-react';
import { getOrCreateUserId } from '@/lib/userId';
import type { StatedPriority } from '@/services/api/types';
import { useBaselineMutation } from '@/features/trip/hooks/useBaselineMutation';
import { cn } from '@/lib/cn';
import { LocationAutocomplete, reverseGeocodeLocation } from '@/features/map/components/LocationAutocomplete';
import { type LocationPoint } from '@/lib/mockLocations';
import { useTypewriter } from '@/hooks/useTypewriter';

const PRIORITY_DETAILS: Record<StatedPriority, { label: string; icon: typeof Zap }> = {
  speed: { label: 'Speed', icon: Zap },
  cost: { label: 'Cost', icon: IndianRupee },
  carbon: { label: 'Carbon', icon: Leaf },
  balanced: { label: 'Balanced', icon: Car },
};

export function TripPlannerForm() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [priority, setPriority] = useState<StatedPriority>('balanced');

  const originPlaceholder = useTypewriter(['T. Nagar, Chennai', 'Central Station', 'Anna Nagar, Chennai', 'Airport']);
  const destinationPlaceholder = useTypewriter(['Adyar, Chennai', 'Guindy, Chennai', 'Velachery', 'Marina Beach']);

  const baseline = useBaselineMutation();
  const userId = useMemo(() => getOrCreateUserId(), []);

  // Auto-detect user's location on mount if origin is empty
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = await reverseGeocodeLocation(latitude, longitude);
        if (loc) {
          // Use functional update so it only sets if the user hasn't already typed/selected something else
          setOrigin((prev) => prev || loc);
        }
      },
      (error) => {
        console.warn('Geolocation auto-detect failed:', error);
      }
    );
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!origin || !destination) return;

    baseline.mutate(
      {
        origin_lon: origin.lon,
        origin_lat: origin.lat,
        dest_lon: destination.lon,
        dest_lat: destination.lat,
        user_id: userId,
        willing_to_carpool: true,
        stated_priority: priority,
      },
      {
        onSuccess: (data) => {
          navigate(`/trip/${data.trip_id}`, { state: { baseline: data, willingToCarpool: true, origin: origin, destination: destination } });
        },
      },
    );
  }

  return (
    <div id="plan-route-card" className="glass-pane w-full max-w-[340px] rounded-[22px] p-3.5 sm:p-4 transition-all shadow-2xl backdrop-blur-xl border border-white/15">
      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mb-2.5 drop-shadow-sm">Plan Your Route</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {/* Origin Location Input */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="absolute left-2.5 top-4 bottom-4 w-[2px] bg-white/10" />
          <div className="flex items-center gap-3 relative z-20">
            <div className="w-2 h-2 rounded-full bg-white ml-2 shrink-0 z-10" />
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 focus-within:border-white/30 focus-within:bg-white/10 transition-all">
              <span className="text-white/40 font-medium shrink-0">From</span>
              <LocationAutocomplete
                value={origin}
                onChange={setOrigin}
                placeholder={origin ? '' : originPlaceholder}
                disabled={baseline.isPending}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-[#8EE074] ml-2 shrink-0 z-10" />
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 focus-within:border-[#8EE074]/30 focus-within:bg-[#8EE074]/10 transition-all">
              <span className="text-white/40 font-medium shrink-0">To</span>
              <LocationAutocomplete
                value={destination}
                onChange={setDestination}
                placeholder={destination ? '' : destinationPlaceholder}
                disabled={baseline.isPending}
              />
            </div>
          </div>
        </div>

        {/* What Matters Most To You? (Static non-clickable display) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              What matters most to you?
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(PRIORITY_DETAILS) as StatedPriority[]).map((p) => {
              const Icon = PRIORITY_DETAILS[p].icon;
              const isSelected = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  disabled={baseline.isPending}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold transition-all cursor-pointer',
                    isSelected
                      ? 'bg-[#4D7C3E]/70 text-white shadow-sm'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-[#8EE074]' : 'text-white/50')} />
                  {PRIORITY_DETAILS[p].label}
                </button>
              );
            })}
          </div>
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
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4D7C3E] hover:bg-[#5A8F48] py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-semibold text-white shadow-md active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>{baseline.isPending ? 'Finding Optimal Mode…' : 'Find Best Route'}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
}
