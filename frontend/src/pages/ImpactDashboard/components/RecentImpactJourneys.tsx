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

  const journeys = userHistory.length > 0 ? userHistory.slice(0, 3) : SAMPLE_JOURNEYS.slice(0, 3);

  return (
    <div className="dark-glass-pane rounded-2xl p-3 sm:p-4 border border-white/15 shadow-xl backdrop-blur-xl bg-black/40 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shrink-0">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Recent Carbon-Conscious Journeys
            </h3>
          </div>
        </div>

        <Link
          to="/profile"
          className="flex items-center gap-1 text-[10px] font-bold text-[#8EE074] hover:text-[#9DF083] transition-colors"
        >
          <span>View Profile</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Journeys List */}
      <div className="flex flex-col gap-1.5 my-1">
        {journeys.map((journey) => (
          <div
            key={journey.id}
            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
          >
            {/* Left: Mode icon + Route */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-black/50 border border-white/15 flex items-center justify-center text-sm shadow-inner shrink-0">
                {journey.mode.icon}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-bold text-white tracking-tight truncate">
                  <span className="truncate">{journey.origin}</span>
                  <span className="text-white/40">→</span>
                  <span className="truncate">{journey.destination}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9.5px] text-white/50">
                  <span>{journey.mode.name}</span>
                  <span>•</span>
                  <span>{journey.distanceKm} km</span>
                </div>
              </div>
            </div>

            {/* Right: Carbon avoided + Savings pill */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[#8EE074]/15 border border-[#8EE074]/30 text-[#8EE074] text-[10px] font-black">
                <Sparkles className="h-2.5 w-2.5" />
                <span>-{(journey.avoidedCarbonG / 1000).toFixed(1)} kg</span>
              </div>
              <div className="px-1.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[10px] font-bold text-amber-300">
                ₹{journey.costInr}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/50">
        <span>Continuous Emission Tracking</span>
        <span className="text-[#8EE074] font-semibold">Realized Savings</span>
      </div>
    </div>
  );
}
