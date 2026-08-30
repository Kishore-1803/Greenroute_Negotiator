import { ArrowRight, Car, IndianRupee, Leaf, Zap } from 'lucide-react';

export function TripPlannerForm() {
  return (
    <div 
      id="plan-route-card" 
      className="glass-pane w-full max-w-[340px] rounded-[22px] p-3.5 sm:p-4 transition-all shadow-2xl backdrop-blur-xl border border-white/15 select-none pointer-events-none cursor-default"
    >
      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mb-2.5 drop-shadow-sm">
        Plan Your Route
      </h2>

      <div className="flex flex-col gap-2.5">
        {/* Origin & Destination Display */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="absolute left-2.5 top-4 bottom-4 w-[2px] bg-white/10" />
          
          {/* Origin Display */}
          <div className="flex items-center gap-3 relative z-20">
            <div className="w-2 h-2 rounded-full bg-white ml-2 shrink-0 z-10" />
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 overflow-hidden">
              <span className="text-white/40 font-medium shrink-0">From</span>
              <span className="text-white/90 font-medium truncate">
                Panimalar Engineering College, EC...
              </span>
            </div>
          </div>

          {/* Destination Display */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-[#8EE074] ml-2 shrink-0 z-10" />
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10 flex items-center gap-2 overflow-hidden">
              <span className="text-white/40 font-medium shrink-0">To</span>
              <span className="text-white/90 font-medium truncate">
                Velachery
              </span>
            </div>
          </div>
        </div>

        {/* What Matters Most To You? Showcase */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              WHAT MATTERS MOST TO YOU?
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {/* Speed */}
            <div className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold bg-white/5 text-white/60">
              <Zap className="h-3.5 w-3.5 text-white/50" />
              Speed
            </div>

            {/* Cost */}
            <div className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold bg-white/5 text-white/60">
              <IndianRupee className="h-3.5 w-3.5 text-white/50" />
              Cost
            </div>

            {/* Carbon */}
            <div className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold bg-white/5 text-white/60">
              <Leaf className="h-3.5 w-3.5 text-white/50" />
              Carbon
            </div>

            {/* Balanced (Active) */}
            <div className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold bg-[#4D7C3E]/80 text-white shadow-sm ring-1 ring-[#8EE074]/30">
              <Car className="h-3.5 w-3.5 text-[#8EE074]" />
              Balanced
            </div>
          </div>
        </div>

        {/* Find Best Route Showcase Button */}
        <div className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4D7C3E] py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-semibold text-white shadow-md">
          <span>Find Best Route</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

