import { History, ArrowRight, Sparkles } from 'lucide-react';
import { useUserHistoryQuery } from '@/features/trip/hooks/useUserHistoryQuery';
import { Link } from 'react-router-dom';

const SAMPLE_JOURNEYS = [
  {
    id: 'sample_1',
    origin: 'Panimalar Engineering College',
    destination: 'Velachery Hub',
    mode: { name: 'Metro Rail', icon: '🚇' },
    timestamp: 'Today, 08:30 AM',
    distanceKm: 18.4,
    avoidedCarbonG: 2450,
    costInr: 180,
    carbonG: 250,
    durationMin: 35,
    routeCoordinates: [] as [number, number][],
  },
  {
    id: 'sample_2',
    origin: 'T. Nagar Central',
    destination: 'Adyar Beach Road',
    mode: { name: 'Electric 2W', icon: '⚡' },
    timestamp: 'Yesterday, 06:15 PM',
    distanceKm: 8.2,
    avoidedCarbonG: 1120,
    costInr: 75,
    carbonG: 120,
    durationMin: 22,
    routeCoordinates: [] as [number, number][],
  },
  {
    id: 'sample_3',
    origin: 'Anna Nagar West',
    destination: 'Guindy Industrial Estate',
    mode: { name: 'Public Bus', icon: '🚌' },
    timestamp: 'Aug 28, 09:10 AM',
    distanceKm: 12.6,
    avoidedCarbonG: 1680,
    costInr: 110,
    carbonG: 180,
    durationMin: 40,
    routeCoordinates: [] as [number, number][],
  },
];

export function RecentImpactJourneys() {
  const { data: userHistory = [] } = useUserHistoryQuery();

  const journeys = userHistory.length > 0 ? userHistory.slice(0, 4) : SAMPLE_JOURNEYS;

  return (
    <div className="dark-glass-pane rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl backdrop-blur-2xl bg-black/40 flex flex-col justify-between gap-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shadow-sm">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Recent Carbon-Conscious Journeys
            </h3>
            <p className="text-xs text-white/60">
              Verified route selections & realized emissions savings
            </p>
          </div>
        </div>

        <Link
          to="/profile"
          className="flex items-center gap-1.5 text-xs font-bold text-[#8EE074] hover:text-[#9DF083] transition-colors"
        >
          <span>View All in Profile</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Journeys List */}
      <div className="flex flex-col gap-3">
        {journeys.map((journey) => (
          <div
            key={journey.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            {/* Left: Mode icon + Route */}
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-black/50 border border-white/15 flex items-center justify-center text-lg shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                {journey.mode.icon}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">
                    {journey.origin}
                  </span>
                  <span className="text-xs text-white/40">→</span>
                  <span className="text-sm font-bold text-white tracking-tight">
                    {journey.destination}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                  <span>{journey.mode.name}</span>
                  <span>•</span>
                  <span>{journey.distanceKm} km</span>
                  <span>•</span>
                  <span>{journey.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Right: Carbon avoided + Savings pill */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074] text-xs font-black">
                <Sparkles className="h-3.5 w-3.5" />
                <span>-{(journey.avoidedCarbonG / 1000).toFixed(1)} kg CO₂</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-amber-300">
                ₹{journey.costInr}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
