import { ArrowRight, Car, IndianRupee, Leaf, RefreshCw, Zap } from 'lucide-react';
import { LocationAutocomplete } from '@/features/map/components/LocationAutocomplete';
import { type LocationPoint } from '@/lib/mockLocations';
import { cn } from '@/lib/cn';

export type StatedPriority = 'speed' | 'cost' | 'carbon' | 'balanced';

const PRIORITY_CHIPS: { id: StatedPriority; label: string; icon: typeof Zap }[] = [
  { id: 'speed', label: 'Speed', icon: Zap },
  { id: 'cost', label: 'Cost', icon: IndianRupee },
  { id: 'carbon', label: 'Carbon', icon: Leaf },
  { id: 'balanced', label: 'Balanced', icon: Car },
];

interface TripPlannerFormProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  onChangeOrigin: (loc: LocationPoint) => void;
  onChangeDestination: (loc: LocationPoint) => void;
  statedPriority: StatedPriority;
  onChangeStatedPriority: (priority: StatedPriority) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function TripPlannerForm({
  origin,
  destination,
  onChangeOrigin,
  onChangeDestination,
  statedPriority,
  onChangeStatedPriority,
  onSubmit,
  isSubmitting,
}: TripPlannerFormProps) {
  const canSubmit = Boolean(origin && destination) && !isSubmitting;

  return (
    <div
      id="plan-route-card"
      className="glass-pane w-full max-w-[340px] rounded-[22px] p-3.5 sm:p-4 transition-all shadow-2xl backdrop-blur-xl border border-white/15"
    >
      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mb-2.5 drop-shadow-sm">
        Plan Your Route
      </h2>

      <div className="flex flex-col gap-2.5">
        {/* Origin & Destination */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="absolute left-2.5 top-4 bottom-4 w-[2px] bg-white/10" />

          {/* Origin */}
          <div className="flex items-center gap-3 relative z-20">
            <div className="w-2 h-2 rounded-full bg-white ml-2 shrink-0 z-10" />
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 focus-within:border-white/30 focus-within:bg-white/10 transition-all">
              <span className="text-white/40 font-medium shrink-0">From</span>
              <LocationAutocomplete
                value={origin}
                onChange={onChangeOrigin}
                placeholder="Select origin..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Destination */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-[#8EE074] ml-2 shrink-0 z-10" />
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 focus-within:border-[#8EE074]/30 focus-within:bg-[#8EE074]/10 transition-all">
              <span className="text-white/40 font-medium shrink-0">To</span>
              <LocationAutocomplete
                value={destination}
                onChange={onChangeDestination}
                placeholder="Select destination..."
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* What Matters Most To You? */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              WHAT MATTERS MOST TO YOU?
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {PRIORITY_CHIPS.map(({ id, label, icon: Icon }) => {
              const active = statedPriority === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeStatedPriority(id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold transition-all cursor-pointer',
                    active
                      ? 'bg-[#4D7C3E]/80 text-white shadow-sm ring-1 ring-[#8EE074]/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', active ? 'text-[#8EE074]' : 'text-white/50')} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Find Best Route */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4D7C3E] hover:bg-[#436B37] py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Computing Route…</span>
            </>
          ) : (
            <>
              <span>Find Best Route</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
