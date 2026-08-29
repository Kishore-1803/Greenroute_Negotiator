import { useMemo } from 'react';
import { History, Sparkles } from 'lucide-react';
import { ProfileGlassCard } from './components/ProfileGlassCard';
import { JourneyCard } from './components/JourneyCard';
import { DEFAULT_USER_PROFILE, MOCK_JOURNEYS } from './data/profileData';
import { useUserImpactQuery } from '@/features/trip/hooks/useUserImpactQuery';
import { getOrCreateUserId } from '@/lib/userId';

export function ProfilePage() {
  const userId = useMemo(() => getOrCreateUserId(), []);
  const { data: userImpact } = useUserImpactQuery(userId);

  // Merge live user impact data with profile if user has recorded journeys in the app
  const profile = useMemo(() => {
    if (!userImpact || userImpact.total_trips === 0) {
      return DEFAULT_USER_PROFILE;
    }

    return {
      ...DEFAULT_USER_PROFILE,
      stats: {
        avoidedCo2Kg: Number((userImpact.carbon_saved_g / 1000).toFixed(1)) || DEFAULT_USER_PROFILE.stats.avoidedCo2Kg,
        costSavedInr: Math.round(userImpact.cost_saved_inr) || DEFAULT_USER_PROFILE.stats.costSavedInr,
        lowCarbonRatePercent: userImpact.total_trips > 0
          ? Math.round((userImpact.green_choices / userImpact.total_trips) * 100)
          : DEFAULT_USER_PROFILE.stats.lowCarbonRatePercent,
        totalJourneys: userImpact.total_trips || DEFAULT_USER_PROFILE.stats.totalJourneys,
        greenChoices: userImpact.green_choices ?? DEFAULT_USER_PROFILE.stats.greenChoices,
        treesEquivalent: userImpact.trees_equivalent ?? DEFAULT_USER_PROFILE.stats.treesEquivalent,
        vehicleTripsPrevented: userImpact.vehicle_trips_prevented ?? DEFAULT_USER_PROFILE.stats.vehicleTripsPrevented,
      },
    };
  }, [userImpact]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
      {/* 1. Primary Profile Glass Card (~30% visual height) */}
      <ProfileGlassCard profile={profile} />

      {/* 2. Journey History Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#8EE074]/20 border border-[#8EE074]/35 flex items-center justify-center text-[#8EE074] shadow-sm shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Journey History
            </h2>
            <p className="text-xs sm:text-sm text-white/70">
              Verified GreenRoute mobility decisions and route records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-white/90 shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#8EE074]" />
            <span>{MOCK_JOURNEYS.length} Logged Trips</span>
          </div>
        </div>
      </div>

      {/* 3. 2 × N Responsive Grid of Journey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pb-12">
        {MOCK_JOURNEYS.map((journey) => (
          <JourneyCard key={journey.id} journey={journey} />
        ))}
      </div>
    </div>
  );
}
