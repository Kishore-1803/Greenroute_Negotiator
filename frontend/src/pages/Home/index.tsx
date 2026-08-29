import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Fuel, Leaf, MessageSquareText, ArrowRight, Car, Scale } from 'lucide-react';
import { TripPlannerForm } from './TripPlannerForm';
import { useBaselineMutation } from '@/features/trip/hooks/useBaselineMutation';
import { FIXED_TRIP } from '@/lib/fixedTrip';
import { getOrCreateUserId } from '@/lib/userId';

export function HomePage() {
  const navigate = useNavigate();
  const baseline = useBaselineMutation();
  const userId = useMemo(() => getOrCreateUserId(), []);

  function handleQuickPopularRoute() {
    baseline.mutate(
      {
        origin_lon: FIXED_TRIP.originLon,
        origin_lat: FIXED_TRIP.originLat,
        dest_lon: FIXED_TRIP.destLon,
        dest_lat: FIXED_TRIP.destLat,
        current_mode: 'car',
        user_id: userId,
      },
      {
        onSuccess: (data) => {
          navigate(`/trip/${data.trip_id}`, { state: { baseline: data } });
        },
      },
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6 lg:py-8">
      {/* 2-Column Edge-Anchored Layout */}
      <div className="flex flex-col lg:flex-row w-full items-center lg:items-end justify-between gap-10 lg:gap-8 flex-1 my-auto">
        
        {/* Left Column: Hero Title + Form + Impact Stats Bar */}
        <div className="flex flex-col justify-center lg:justify-end max-w-lg py-1 w-full">
          {/* Hero Heading */}
          <div className="flex flex-col mb-3">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] xl:text-[3.75rem] font-extrabold tracking-[0.03em] text-white leading-[1.08] drop-shadow-sm">
              Smarter Routes
            </h1>
            <span className="text-4xl sm:text-5xl lg:text-[3.35rem] xl:text-[3.75rem] font-extrabold tracking-[0.03em] text-[#8EE074] leading-[1.08] drop-shadow-sm">
              Greener Future
            </span>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 tracking-[0.01em] leading-relaxed max-w-md">
              Find the most efficient and eco-friendly ways to travel. For you. For everyone. For tomorrow.
            </p>
          </div>

          {/* Plan Your Route Glass Card */}
          <TripPlannerForm />

          {/* Capability Chips (Bottom-Left with 50px gap) -- factual system capabilities, not
              fabricated usage statistics. Every trip actually exercises all four. */}
          <div className="glass-pane w-full max-w-[370px] rounded-[20px] p-2.5 sm:p-3 mt-8 lg:mt-[50px]">
            <div className="grid grid-cols-4 gap-1">
              <div className="flex flex-col items-center text-center p-0.5">
                <Car className="h-3.5 w-3.5 text-[#8EE074] mb-0.5" />
                <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">3</span>
                <span className="text-[9px] sm:text-[10px] text-white/70 mt-0.5 leading-tight">Modes Compared</span>
              </div>

              <div className="flex flex-col items-center text-center p-0.5">
                <MessageSquareText className="h-3.5 w-3.5 text-[#8EE074] mb-0.5" />
                <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">3</span>
                <span className="text-[9px] sm:text-[10px] text-white/70 mt-0.5 leading-tight">Decision Agents</span>
              </div>

              <div className="flex flex-col items-center text-center p-0.5">
                <Scale className="h-3.5 w-3.5 text-[#8EE074] mb-0.5" />
                <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">2</span>
                <span className="text-[9px] sm:text-[10px] text-white/70 mt-0.5 leading-tight">Negotiation Rounds</span>
              </div>

              <div className="flex flex-col items-center text-center p-0.5">
                <Leaf className="h-3.5 w-3.5 text-[#8EE074] mb-0.5" />
                <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">Learns</span>
                <span className="text-[9px] sm:text-[10px] text-white/70 mt-0.5 leading-tight">Your Preference</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Why GreenRoute Card + Popular Route Card with 50px gap */}
        <div className="hidden lg:flex flex-col gap-8 lg:gap-[50px] items-end justify-end py-1">
          {/* Why GreenRoute Card */}
          <div className="glass-pane w-[320px] sm:w-[330px] rounded-[26px] p-5 sm:p-5.5 flex flex-col justify-between gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">Why GreenRoute?</h3>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Feature 1: Time */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8EE074]/20 text-[#8EE074] ring-1 ring-[#8EE074]/30 shadow-xs">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">Save Travel Time</h4>
                  <p className="text-[11px] text-white/75 leading-relaxed mt-0.5">
                    Real-time surge monitoring & multi-modal routing to beat traffic bottlenecks.
                  </p>
                </div>
              </div>

              {/* Feature 2: Fuel */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8EE074]/20 text-[#8EE074] ring-1 ring-[#8EE074]/30 shadow-xs">
                  <Fuel className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">Cut Fuel & Costs</h4>
                  <p className="text-[11px] text-white/75 leading-relaxed mt-0.5">
                    Optimized route physics and transparent direct operating costs across modes.
                  </p>
                </div>
              </div>

              {/* Feature 3: Planet */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8EE074]/20 text-[#8EE074] ring-1 ring-[#8EE074]/30 shadow-xs">
                  <Leaf className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">Lower Emissions</h4>
                  <p className="text-[11px] text-white/75 leading-relaxed mt-0.5">
                    Granular CO₂ calculations comparing cycling, two-wheelers, and cars.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Route Card - Matching Width. Copy matches FIXED_TRIP exactly -- this button
              launches that Coimbatore corridor, not an aspirational long-distance route. */}
          <div className="glass-pane w-[320px] sm:w-[330px] rounded-[24px] p-4 sm:p-4.5 shrink-0 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/70">Try the Demo Route</span>
              {/* Sparkline elevation wave graphic */}
              <svg className="h-3.5 w-12 text-[#8EE074]" viewBox="0 0 64 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 15 Q 16 5, 28 12 T 48 6 T 62 14" />
              </svg>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5 tracking-tight">
              {FIXED_TRIP.originLabel} → {FIXED_TRIP.destinationLabel}
            </h4>

            <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-white/85 mt-1">
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3 text-white/70" />
                <span>~2 km, 3 modes</span>
              </div>
              <div className="flex items-center gap-1 text-[#8EE074]">
                <Leaf className="h-3 w-3" />
                <span>Full negotiation + surge demo</span>
              </div>
            </div>

            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={handleQuickPopularRoute}
                disabled={baseline.isPending}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#8EE074] hover:text-[#a0f088] transition-colors cursor-pointer"
              >
                <span>{baseline.isPending ? 'Loading…' : 'View Route'}</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

