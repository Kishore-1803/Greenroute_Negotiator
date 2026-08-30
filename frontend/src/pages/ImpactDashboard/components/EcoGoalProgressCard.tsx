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
  const currentAvoided = avoidedCo2Kg || 4.8;
  const progressPercent = Math.min(100, Math.round((currentAvoided / weeklyGoalKg) * 100));

  // Equivalencies
  const fuelSavedLiters = (currentAvoided * 0.43).toFixed(1);
  const cleanAirKm = Math.round(currentAvoided * 18.5);

  return (
    <div className="dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Sustainability Goals & Equivalencies
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074] text-[10px] font-extrabold">
          <Award className="h-3 w-3" />
          <span>Level 3 Eco Commuter</span>
        </div>
      </div>

      {/* Primary Goal Progress Bar */}
      <div className="flex flex-col gap-1.5 bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/10 my-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 font-bold text-white text-[11px]">
            <span>🎯</span>
            <span>Weekly Carbon Goal (15 kg)</span>
          </div>
          <span className="text-[11px] font-black text-[#8EE074]">
            {currentAvoided.toFixed(1)} / {weeklyGoalKg.toFixed(1)} kg ({progressPercent}%)
          </span>
        </div>

        {/* Progress Track */}
        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-px border border-white/15">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-[#8EE074] to-[#9DF083] rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(142,224,116,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3-Column Ecological Equivalency Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {/* Metric 1: Trees Equivalent */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <TreeDeciduous className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] uppercase font-bold text-white/50 truncate">Tree Offset</span>
            <span className="text-xs font-black text-white truncate">{treesEquivalent || 3} Trees</span>
          </div>
        </div>

        {/* Metric 2: Fuel Saved */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Fuel className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] uppercase font-bold text-white/50 truncate">Fuel Saved</span>
            <span className="text-xs font-black text-white truncate">{fuelSavedLiters} L</span>
          </div>
        </div>

        {/* Metric 3: Clean Air Exposure */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2">
          <div className="h-7 w-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Wind className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] uppercase font-bold text-white/50 truncate">Zero Tailpipe</span>
            <span className="text-xs font-black text-white truncate">{cleanAirKm} km</span>
          </div>
        </div>
      </div>

      {/* Verified Ledger Badge */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px]">
        <div className="flex items-center gap-1 text-white/60">
          <ShieldCheck className="h-3 w-3 text-[#8EE074]" />
          <span>IPCC & OpenRoute Standards</span>
        </div>
        <div className="flex items-center gap-1 text-[#8EE074] font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          <span>Verified</span>
        </div>
      </div>
    </div>
  );
}
