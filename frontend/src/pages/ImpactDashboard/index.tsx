import { useMemo } from 'react';
import { RefreshCw, Leaf, TreeDeciduous, Car, TrendingDown } from 'lucide-react';
import { useUserImpactQuery } from '@/features/trip/hooks/useUserImpactQuery';
import { getOrCreateUserId } from '@/lib/userId';
import { Header } from '@/components/layout/Header';

export function ImpactDashboardPage() {
  const userId = useMemo(() => getOrCreateUserId(), []);
  const { data, isLoading, isError } = useUserImpactQuery(userId);

  return (
    <div className="flex h-screen flex-col w-full text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#11240E] via-black to-black select-none">
      <Header />
      <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto">
        <header className="flex flex-col gap-2 pt-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Climate Impact</h1>
          <p className="text-sm text-white/60">
            Track your contribution to reducing urban carbon emissions through smart routing and mobility cooperation.
          </p>
        </header>

        {isLoading && (
          <div className="flex items-center gap-2 text-white/50 text-sm mt-8">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading your impact data...</span>
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20 text-sm text-amber-200 mt-4">
            Could not load impact data.
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4">
            
            {/* Total Green Choices */}
            <div className="dark-glass-pane p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-white/5 group-hover:text-white/10 transition-colors">
                <Leaf className="w-32 h-32" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">Green Choices</span>
              <div className="flex items-baseline gap-2 mt-2 relative z-10">
                <span className="text-5xl font-black text-[#8EE074]">{data.green_choices}</span>
                <span className="text-white/60 text-sm font-medium">/ {data.total_trips} trips</span>
              </div>
              <p className="text-xs text-white/50 relative z-10 mt-1">Times you chose eco-friendly modes or cooperated.</p>
            </div>

            {/* CO2 Saved */}
            <div className="dark-glass-pane p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-white/5 group-hover:text-[#8EE074]/10 transition-colors">
                <TrendingDown className="w-32 h-32" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">Carbon Prevented</span>
              <div className="flex items-baseline gap-2 mt-2 relative z-10">
                <span className="text-5xl font-black text-[#8EE074]">{Math.round(data.carbon_saved_g / 1000)}</span>
                <span className="text-white/60 text-sm font-medium">kg</span>
              </div>
              <p className="text-xs text-white/50 relative z-10 mt-1">Total CO₂ emissions saved vs driving solo.</p>
            </div>

            {/* Trees Equivalent */}
            <div className="dark-glass-pane p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-white/5 group-hover:text-[#4D7C3E]/20 transition-colors">
                <TreeDeciduous className="w-32 h-32" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">Tree Equivalent</span>
              <div className="flex items-baseline gap-2 mt-2 relative z-10">
                <span className="text-5xl font-black text-emerald-400">{data.trees_equivalent}</span>
                <span className="text-white/60 text-sm font-medium">trees</span>
              </div>
              <p className="text-xs text-white/50 relative z-10 mt-1">Mature trees needed to absorb this carbon in a year.</p>
            </div>

            {/* Cost Saved */}
            <div className="dark-glass-pane p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col gap-2 col-span-1 md:col-span-2 relative overflow-hidden group">
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">Money Saved</span>
              <div className="flex items-baseline gap-2 mt-2 relative z-10">
                <span className="text-4xl font-black text-amber-300">₹{Math.round(data.cost_saved_inr).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-white/50 relative z-10 mt-1">Estimated fuel & toll savings.</p>
            </div>

            {/* Vehicle Trips Prevented */}
            <div className="dark-glass-pane p-5 rounded-2xl border border-white/20 shadow-xl flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-white/5 group-hover:text-amber-500/10 transition-colors">
                <Car className="w-32 h-32" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">Cars Off The Road</span>
              <div className="flex items-baseline gap-2 mt-2 relative z-10">
                <span className="text-4xl font-black text-white">{data.vehicle_trips_prevented}</span>
              </div>
              <p className="text-xs text-white/50 relative z-10 mt-1">Fewer cars deployed via cooperation.</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
