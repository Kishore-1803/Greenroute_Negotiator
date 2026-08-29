import { History, Sparkles } from 'lucide-react';
import { ProfileGlassCard } from './components/ProfileGlassCard';
import { JourneyCard } from './components/JourneyCard';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserHistoryQuery } from '@/features/trip/hooks/useUserHistoryQuery';

export function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: userHistory = [] } = useUserHistoryQuery();

  if (isLoading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-white/70">Loading profile...</div>;
  }

  if (!isAuthenticated || !user) {
    return null; // Should be handled by ProtectedRoute
  }

  const profile = user;

  // user stats are already mapped inside AuthProvider using impact endpoints

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
            <span>{userHistory.length} Logged Trips</span>
          </div>
        </div>
      </div>

      {/* 3. 2 × N Responsive Grid of Journey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pb-12">
        {userHistory.map((journey) => (
          <JourneyCard key={journey.id} journey={journey} />
        ))}
      </div>
    </div>
  );
}
