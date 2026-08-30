import { useMemo } from 'react';
import { Leaf, TreeDeciduous, Car, TrendingDown, IndianRupee, Sparkles, Award } from 'lucide-react';
import { useUserImpactQuery } from '@/features/trip/hooks/useUserImpactQuery';
import { getOrCreateUserId } from '@/lib/userId';
import { Header } from '@/components/layout/Header';
import { EmissionTrendChart } from './components/EmissionTrendChart';
import { ModalSplitBreakdown } from './components/ModalSplitBreakdown';
import { EcoGoalProgressCard } from './components/EcoGoalProgressCard';
import { RecentImpactJourneys } from './components/RecentImpactJourneys';

export function ImpactDashboardPage() {
  const userId = useMemo(() => getOrCreateUserId(), []);
  const { data } = useUserImpactQuery(userId);

  // Computed / fallback stats
  const carbonSavedKg = data ? Number((data.carbon_saved_g / 1000).toFixed(1)) : 0;
  const costSavedInr = data ? Math.round(data.cost_saved_inr) : 0;
  const greenRate = data && data.total_trips > 0 ? Math.round((data.green_choices / data.total_trips) * 100) : 0;

  return (
    <div className="h-screen w-full flex flex-col text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#11240E] via-black to-black overflow-hidden select-none">
      <Header />

      <main className="flex-1 w-full max-w-[1550px] mx-auto px-3 sm:px-5 py-2 sm:py-2.5 flex flex-col justify-between gap-2 sm:gap-2.5 overflow-hidden">
        
        {/* Compact Page Header Bar */}
        <header className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Climate Impact & Analytics
            </h1>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074]">
              <Sparkles className="h-2.5 w-2.5" />
              <span>Verified Ledger</span>
            </span>
            <span className="hidden md:inline text-[11px] text-white/50 border-l border-white/10 pl-3">
              Real-time urban carbon abatement & multi-modal transit analysis
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[11px] font-bold text-white shadow-xs backdrop-blur-md shrink-0">
            <Award className="h-3.5 w-3.5 text-[#8EE074]" />
            <span>Level 3 Eco Commuter</span>
          </div>
        </header>

        {/* 1. Top Key Impact KPI Cards (5-Metric Slim Row) */}
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 shrink-0">
          
          {/* KPI 1: Carbon Prevented */}
          <div className="dark-glass-pane p-2.5 sm:p-3 rounded-xl border border-white/15 shadow-md flex items-center justify-between relative overflow-hidden bg-black/40 backdrop-blur-xl group">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                Carbon Prevented
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-[#8EE074] tracking-tight">
                  {carbonSavedKg}
                </span>
                <span className="text-[10px] font-bold text-[#8EE074]/80">kg CO₂</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-xl bg-[#8EE074]/10 border border-[#8EE074]/20 flex items-center justify-center text-[#8EE074] shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 2: Money Saved */}
          <div className="dark-glass-pane p-2.5 sm:p-3 rounded-xl border border-white/15 shadow-md flex items-center justify-between relative overflow-hidden bg-black/40 backdrop-blur-xl group">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                Money Saved
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight">
                  ₹{costSavedInr}
                </span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 3: Green Choices Rate */}
          <div className="dark-glass-pane p-2.5 sm:p-3 rounded-xl border border-white/15 shadow-md flex items-center justify-between relative overflow-hidden bg-black/40 backdrop-blur-xl group">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                Green Rate
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {greenRate}%
                </span>
                <span className="text-[10px] text-white/50 font-medium truncate">
                  ({data?.green_choices || 0} trips)
                </span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Leaf className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 4: Tree Equivalent */}
          <div className="dark-glass-pane p-2.5 sm:p-3 rounded-xl border border-white/15 shadow-md flex items-center justify-between relative overflow-hidden bg-black/40 backdrop-blur-xl group">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                Tree Equivalent
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
                  {data?.trees_equivalent || 0}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-bold">trees</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TreeDeciduous className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 5: Cars Off Road */}
          <div className="dark-glass-pane p-2.5 sm:p-3 rounded-xl border border-white/15 shadow-md flex items-center justify-between relative overflow-hidden bg-black/40 backdrop-blur-xl group">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                Cars Avoided
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {data?.vehicle_trips_prevented || 0}
                </span>
                <span className="text-[10px] text-white/60 font-medium">shared</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0">
              <Car className="h-4 w-4" />
            </div>
          </div>

        </div>

        {/* 2. Main High-Density Grid (2 Columns: Left 7 Cols, Right 5 Cols, fits viewport) */}
        <div className="grid grid-cols-12 gap-2 sm:gap-2.5 flex-1 min-h-0 overflow-hidden">
          
          {/* Left Column: Emissions Trajectory + Recent Journeys */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-2 sm:gap-2.5 h-full min-h-0">
            <div className="flex-1 min-h-0">
              <EmissionTrendChart />
            </div>
            <div className="flex-1 min-h-0">
              <RecentImpactJourneys />
            </div>
          </div>

          {/* Right Column: Modal Split + Sustainability Goals */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-2 sm:gap-2.5 h-full min-h-0">
            <div className="flex-1 min-h-0">
              <ModalSplitBreakdown />
            </div>
            <div className="flex-1 min-h-0">
              <EcoGoalProgressCard
                avoidedCo2Kg={carbonSavedKg}
                treesEquivalent={data?.trees_equivalent || 0}
              />
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
