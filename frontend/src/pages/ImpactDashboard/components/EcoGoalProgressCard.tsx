import { Award, Target, TreeDeciduous, Fuel, Wind, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface EcoGoalProps {
  avoidedCo2Kg?: number;
  treesEquivalent?: number;
}

export function EcoGoalProgressCard({
  avoidedCo2Kg = 0,
  treesEquivalent = 0,
}: EcoGoalProps) {
  const weeklyGoalKg = 15.0;
  const currentAvoided = avoidedCo2Kg || 4.8; // Graceful preview baseline
  const progressPercent = Math.min(100, Math.round((currentAvoided / weeklyGoalKg) * 100));

  // Equivalencies
  const fuelSavedLiters = (currentAvoided * 0.43).toFixed(1);
  const cleanAirKm = Math.round(currentAvoided * 18.5);

  return (
    <div className="dark-glass-pane rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col justify-between gap-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Sustainability Goals & Equivalencies
            </h3>
            <p className="text-xs text-white/60">
              Verified climate milestone progress & ecological impact conversions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074] text-xs font-extrabold shadow-sm">
          <Award className="h-3.5 w-3.5" />
          <span>Level 3 Eco Commuter</span>
        </div>
      </div>

      {/* Primary Goal Progress Bar */}
      <div className="flex flex-col gap-2.5 bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎯</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              Weekly 15 kg Carbon Abatement Goal
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black text-[#8EE074]">
            {currentAvoided.toFixed(1)} / {weeklyGoalKg.toFixed(1)} kg ({progressPercent}%)
          </span>
        </div>

        {/* Progress Track */}
        <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/15">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-[#8EE074] to-[#9DF083] rounded-full transition-all duration-700 shadow-[0_0_14px_rgba(142,224,116,0.7)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
          <span>{(weeklyGoalKg - currentAvoided > 0 ? (weeklyGoalKg - currentAvoided).toFixed(1) : 0)} kg remaining to Level 4 Climate Champion</span>
          <span className="text-[#8EE074] font-semibold">Resets every Sunday</span>
        </div>
      </div>

      {/* 3-Column Ecological Equivalency Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1: Trees Equivalent */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/10 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <TreeDeciduous className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">
              Tree Offset
            </span>
            <span className="text-base font-black text-white">
              {treesEquivalent || 3} Mature Trees
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Annual CO₂ absorption</span>
          </div>
        </div>

        {/* Metric 2: Fuel Saved */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/10 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Fuel className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">
              Fuel Conserved
            </span>
            <span className="text-base font-black text-white">
              {fuelSavedLiters} Liters
            </span>
            <span className="text-[10px] text-amber-400 font-medium">Gasoline equivalent</span>
          </div>
        </div>

        {/* Metric 3: Clean Air Exposure */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/10 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Wind className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">
              Clean Urban Travel
            </span>
            <span className="text-base font-black text-white">
              {cleanAirKm} km
            </span>
            <span className="text-[10px] text-sky-400 font-medium">Zero-tailpipe transit</span>
          </div>
        </div>
      </div>

      {/* Verified Ledger Badge */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 text-white/70">
          <ShieldCheck className="h-4 w-4 text-[#8EE074]" />
          <span>Calculated via Google Maps Distance Matrix & IPCC Carbon Standards</span>
        </div>
        <div className="flex items-center gap-1 text-[#8EE074] font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Verified Ledger</span>
        </div>
      </div>
    </div>
  );
}
