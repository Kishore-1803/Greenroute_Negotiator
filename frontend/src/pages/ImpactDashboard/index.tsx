import { useMemo } from 'react';
import { RefreshCw, Leaf, TreeDeciduous, Car, TrendingDown, IndianRupee, Sparkles, Award } from 'lucide-react';
import { useUserImpactQuery } from '@/features/trip/hooks/useUserImpactQuery';
import { getOrCreateUserId } from '@/lib/userId';
import { Header } from '@/components/layout/Header';
import { EmissionTrendChart } from './components/EmissionTrendChart';
import { ModalSplitBreakdown } from './components/ModalSplitBreakdown';
import { EcoGoalProgressCard } from './components/EcoGoalProgressCard';
import { RecentImpactJourneys } from './components/RecentImpactJourneys';

export function ImpactDashboardPage() {
  const userId = useMemo(() => getOrCreateUserId(), []);
  const { data, isLoading, isError } = useUserImpactQuery(userId);

  // Computed / fallback stats
  const carbonSavedKg = data ? Number((data.carbon_saved_g / 1000).toFixed(1)) : 0;
  const costSavedInr = data ? Math.round(data.cost_saved_inr) : 0;
  const greenRate = data && data.total_trips > 0 ? Math.round((data.green_choices / data.total_trips) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col w-full text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#11240E] via-black to-black select-none">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-16">
        
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Climate Impact & Analytics
              </h1>
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074]">
                <Sparkles className="h-3 w-3" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
              Real-time quantification of urban carbon abatement, fuel conservation, and collective transit cooperation.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              <Award className="h-4 w-4 text-[#8EE074]" />
              <span>Climate Ledger Active</span>
            </div>
          </div>
        </header>

        {isLoading && (
          <div className="flex items-center justify-center p-12 text-white/60 text-sm">
            <RefreshCw className="h-5 w-5 animate-spin text-[#8EE074] mr-2.5" />
            <span>Calculating real-time climate ledger...</span>
          </div>
        )}

        {isError && (
          <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-sm text-amber-200">
            Could not load remote impact data. Displaying standard verified model metrics.
          </div>
        )}

        {/* 1. Top Key Impact KPI Cards (5-Metric Responsive Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
          
          {/* KPI 1: Carbon Prevented */}
          <div className="dark-glass-pane p-4 sm:p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-between relative overflow-hidden group bg-black/40 backdrop-blur-xl">
            <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-[#8EE074]/10 transition-colors">
              <TrendingDown className="w-24 h-24" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/50 relative z-10">
              Carbon Prevented
            </span>
            <div className="flex items-baseline gap-1.5 mt-2 relative z-10">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#8EE074] tracking-tight">
                {carbonSavedKg}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#8EE074]/80">kg CO₂</span>
            </div>
            <p className="text-[11px] text-white/50 relative z-10 mt-1">vs. single-occupant car</p>
          </div>

          {/* KPI 2: Money Saved */}
          <div className="dark-glass-pane p-4 sm:p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-between relative overflow-hidden group bg-black/40 backdrop-blur-xl">
            <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-amber-400/10 transition-colors">
              <IndianRupee className="w-24 h-24" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/50 relative z-10">
              Money Saved
            </span>
            <div className="flex items-baseline gap-1 mt-2 relative z-10">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-300 tracking-tight">
                ₹{costSavedInr}
              </span>
            </div>
            <p className="text-[11px] text-white/50 relative z-10 mt-1">Fuel, tolls & parking</p>
          </div>

          {/* KPI 3: Green Choices Rate */}
          <div className="dark-glass-pane p-4 sm:p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-between relative overflow-hidden group bg-black/40 backdrop-blur-xl">
            <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-emerald-400/10 transition-colors">
              <Leaf className="w-24 h-24" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/50 relative z-10">
              Green Choice Rate
            </span>
            <div className="flex items-baseline gap-1 mt-2 relative z-10">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {greenRate}%
              </span>
            </div>
            <p className="text-[11px] text-white/50 relative z-10 mt-1">
              {data?.green_choices || 0} / {data?.total_trips || 0} eco journeys
            </p>
          </div>

          {/* KPI 4: Tree Equivalent */}
          <div className="dark-glass-pane p-4 sm:p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-between relative overflow-hidden group bg-black/40 backdrop-blur-xl">
            <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-emerald-400/10 transition-colors">
              <TreeDeciduous className="w-24 h-24" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/50 relative z-10">
              Tree Equivalent
            </span>
            <div className="flex items-baseline gap-1 mt-2 relative z-10">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 tracking-tight">
                {data?.trees_equivalent || 0}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400/80">trees</span>
            </div>
            <p className="text-[11px] text-white/50 relative z-10 mt-1">Annual tree absorption</p>
          </div>

          {/* KPI 5: Cars Off Road */}
          <div className="dark-glass-pane p-4 sm:p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-between col-span-2 sm:col-span-1 relative overflow-hidden group bg-black/40 backdrop-blur-xl">
            <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-sky-400/10 transition-colors">
              <Car className="w-24 h-24" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/50 relative z-10">
              Cars Off Road
            </span>
            <div className="flex items-baseline gap-1 mt-2 relative z-10">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {data?.vehicle_trips_prevented || 0}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white/70">vehicles</span>
            </div>
            <p className="text-[11px] text-white/50 relative z-10 mt-1">Via pooling & relays</p>
          </div>

        </div>

        {/* 2. Main Analytics Row: Emissions Trajectory Chart + Modal Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Emissions Trajectory Area/Line Graph (7 Columns) */}
          <div className="lg:col-span-7 flex">
            <div className="w-full">
              <EmissionTrendChart />
            </div>
          </div>

          {/* Modal Split Donut & Efficiency Breakdown (5 Columns) */}
          <div className="lg:col-span-5 flex">
            <div className="w-full">
              <ModalSplitBreakdown />
            </div>
          </div>
        </div>

        {/* 3. Secondary Analytics Row: Eco Goals & Equivalency + Recent Verified Journeys */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Sustainability Goal Progress & Equivalencies (6 Columns) */}
          <div className="lg:col-span-6 flex">
            <div className="w-full">
              <EcoGoalProgressCard
                avoidedCo2Kg={carbonSavedKg}
                treesEquivalent={data?.trees_equivalent || 0}
              />
            </div>
          </div>

          {/* Recent Carbon-Conscious Journeys Ledger (6 Columns) */}
          <div className="lg:col-span-6 flex">
            <div className="w-full">
              <RecentImpactJourneys />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
