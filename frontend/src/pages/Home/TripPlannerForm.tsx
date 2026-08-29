import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Car, IndianRupee, Leaf, MapPin, Zap } from 'lucide-react';
import { MOCK_LOCATIONS } from '@/lib/mockLocations';
import { getOrCreateUserId } from '@/lib/userId';
import type { StatedPriority } from '@/services/api/types';
import { useBaselineMutation } from '@/features/trip/hooks/useBaselineMutation';
import { cn } from '@/lib/cn';

const PRIORITY_DETAILS: Record<StatedPriority, { label: string; icon: typeof Zap }> = {
  speed: { label: 'Speed', icon: Zap },
  cost: { label: 'Cost', icon: IndianRupee },
  carbon: { label: 'Carbon', icon: Leaf },
  balanced: { label: 'Balanced', icon: Car },
};

export function TripPlannerForm() {
  const navigate = useNavigate();
  const priority: StatedPriority = 'balanced';

  // Typewriter automated typing states
  const [originIndex, setOriginIndex] = useState(5); // Start with T. Nagar
  const [destIndex, setDestIndex] = useState(11);    // Start with Adyar
  const [originDisplay, setOriginDisplay] = useState('');
  const [destDisplay, setDestDisplay] = useState('');
  const [activeTypingField, setActiveTypingField] = useState<'origin' | 'dest' | 'idle'>('origin');

  const baseline = useBaselineMutation();
  const userId = useMemo(() => getOrCreateUserId(), []);

  // References to track current indices and pairs
  const currentOrigin = MOCK_LOCATIONS[originIndex] ?? MOCK_LOCATIONS[0];
  const currentDest = MOCK_LOCATIONS[destIndex] ?? MOCK_LOCATIONS[1];

  const originTarget = currentOrigin.label;
  const destTarget = currentDest.label;

  // Helper to get a random destination different from origin
  const getNextPair = (prevOrigIdx: number) => {
    const nextOrigIdx = (prevOrigIdx + 1) % MOCK_LOCATIONS.length;
    let nextDestIdx = Math.floor(Math.random() * MOCK_LOCATIONS.length);
    while (nextDestIdx === nextOrigIdx) {
      nextDestIdx = Math.floor(Math.random() * MOCK_LOCATIONS.length);
    }
    return { nextOrigIdx, nextDestIdx };
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (activeTypingField === 'origin') {
      if (originDisplay.length < originTarget.length) {
        timeoutId = setTimeout(() => {
          setOriginDisplay(originTarget.slice(0, originDisplay.length + 1));
        }, 55);
      } else {
        // Finished typing first text field, switch to second
        timeoutId = setTimeout(() => {
          setActiveTypingField('dest');
        }, 200);
      }
    } else if (activeTypingField === 'dest') {
      if (destDisplay.length < destTarget.length) {
        timeoutId = setTimeout(() => {
          setDestDisplay(destTarget.slice(0, destDisplay.length + 1));
        }, 55);
      } else {
        // Finished typing second text field -> wait for 1 second, then clear both simultaneously
        setActiveTypingField('idle');
        timeoutId = setTimeout(() => {
          setOriginDisplay('');
          setDestDisplay('');
          const { nextOrigIdx, nextDestIdx } = getNextPair(originIndex);
          setOriginIndex(nextOrigIdx);
          setDestIndex(nextDestIdx);
          setActiveTypingField('origin');
        }, 1000);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [activeTypingField, originDisplay, destDisplay, originTarget, destTarget, originIndex]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const originPoint = currentOrigin;
    const destPoint = currentDest;

    baseline.mutate(
      {
        origin_lon: originPoint.lon,
        origin_lat: originPoint.lat,
        dest_lon: destPoint.lon,
        dest_lat: destPoint.lat,
        user_id: userId,
        willing_to_carpool: true,
        stated_priority: priority,
      },
      {
        onSuccess: (data) => {
          navigate(`/trip/${data.trip_id}`, { state: { baseline: data, willingToCarpool: true } });
        },
      },
    );
  }

  return (
    <div id="plan-route-card" className="glass-pane w-full max-w-[340px] rounded-[22px] p-3.5 sm:p-4 transition-all shadow-2xl backdrop-blur-xl border border-white/15">
      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mb-2.5 drop-shadow-sm">Plan Your Route</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {/* Origin Location Input (Typewriter automated) */}
        <div className="glass-input-box relative flex items-center justify-between rounded-xl px-3 py-2.5 border border-white/10 bg-white/5 transition-all">
          <div className="flex items-center gap-2.5 w-full min-w-0">
            <MapPin className="h-4 w-4 text-[#8EE074] shrink-0" />
            <div className="relative w-full flex items-center text-xs font-medium text-white truncate">
              <span className="truncate">{originDisplay || <span className="text-white/35">Origin</span>}</span>
              {activeTypingField === 'origin' && (
                <span className="inline-block w-1.5 h-3.5 bg-[#8EE074] ml-0.5 animate-pulse rounded-xs shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Destination Input (Typewriter automated) */}
        <div className="glass-input-box flex items-center gap-2.5 rounded-xl px-3 py-2.5 border border-white/10 bg-white/5 transition-all">
          <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="relative w-full flex items-center text-xs font-medium text-white truncate">
            <span className="truncate">{destDisplay || <span className="text-white/35">Destination</span>}</span>
            {activeTypingField === 'dest' && (
              <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse rounded-xs shrink-0" />
            )}
          </div>
        </div>

        {/* What Matters Most To You? (Static non-clickable display) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              What matters most to you?
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 select-none pointer-events-none">
            {(Object.keys(PRIORITY_DETAILS) as StatedPriority[]).map((p) => {
              const Icon = PRIORITY_DETAILS[p].icon;
              const isSelected = priority === p;
              return (
                <div
                  key={p}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold transition-all',
                    isSelected
                      ? 'bg-[#4D7C3E]/70 text-white shadow-sm'
                      : 'bg-white/5 text-white/60'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-[#8EE074]' : 'text-white/50')} />
                  {PRIORITY_DETAILS[p].label}
                </div>
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
          disabled={baseline.isPending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4D7C3E] hover:bg-[#5A8F48] py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-semibold text-white shadow-md active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>{baseline.isPending ? 'Finding Optimal Mode…' : 'Find Best Route'}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
}
