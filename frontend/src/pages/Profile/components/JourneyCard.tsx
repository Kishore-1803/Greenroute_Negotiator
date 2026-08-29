import { useState } from 'react';
import { Share2, Clock, IndianRupee, Leaf, Check, ArrowRight } from 'lucide-react';
import { JourneyMiniMap } from './JourneyMiniMap';
import type { JourneyRecord } from '../data/profileData';

interface JourneyCardProps {
  journey: JourneyRecord;
}

export function JourneyCard({ journey }: JourneyCardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const shareText = `GreenRoute Journey: ${journey.origin} → ${journey.destination} via ${journey.mode.name} (${journey.durationMin} min, saved ${journey.avoidedCarbonG}g CO₂!)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isBus = journey.mode.name.toLowerCase().includes('bus');
  const isEV = journey.mode.name.toLowerCase().includes('two-wheeler') || journey.mode.name.toLowerCase().includes('electric');
  const isBike = journey.mode.name.toLowerCase().includes('bicycle') || journey.mode.name.toLowerCase().includes('cycle');

  return (
    <div className="dark-glass-pane rounded-[26px] p-3.5 sm:p-4 shadow-xl border border-white/20 flex flex-col justify-between gap-3.5 transition-all duration-300 hover:border-white/35 hover:shadow-2xl bg-black/40">
      {/* Top: Compact Route Map Container */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden rounded-[20px] border border-white/15 shadow-inner">
        <JourneyMiniMap coordinates={journey.routeCoordinates} className="h-full w-full" />

        {/* Map Top-Left: Share Button */}
        <div className="absolute top-3 left-3 z-10">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white border border-white/25 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#8EE074]" /> : <Share2 className="h-3.5 w-3.5 text-white/90" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>

        {/* Map Top-Right: Distance Badge */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center rounded-full bg-black/75 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white border border-white/25 shadow-lg">
            <span>{journey.distanceKm} km</span>
          </div>
        </div>
      </div>

      {/* Middle: Route & Mode Information */}
      <div className="flex flex-col gap-2 px-1">
        {/* Mode Tag & Timestamp */}
        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs border ${
              isBus
                ? 'bg-blue-900/60 text-blue-200 border-blue-400/30'
                : isEV
                ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400/30'
                : isBike
                ? 'bg-teal-900/60 text-teal-200 border-teal-400/30'
                : 'bg-white/15 text-white border-white/20'
            }`}
          >
            <span>{journey.mode.icon}</span>
            <span>{journey.mode.name}</span>
          </span>

          <span className="text-xs font-medium text-white/70">{journey.timestamp}</span>
        </div>

        {/* Origin -> Destination title */}
        <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug flex items-baseline flex-wrap gap-1 mt-0.5">
          <span>{journey.origin}</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#8EE074] shrink-0 inline self-center mx-0.5" />
          <span className="text-[#8EE074]">{journey.destination}</span>
        </h3>
      </div>

      {/* Bottom: Trip Metrics Bar */}
      <div className="rounded-[18px] bg-black/60 backdrop-blur-md p-2.5 sm:p-3 border border-white/10 shadow-inner">
        <div className="grid grid-cols-4 gap-1 text-center items-center">
          {/* Metric 1: Time */}
          <div className="flex flex-col items-center justify-center p-0.5">
            <span className="text-[10px] uppercase font-semibold text-white/50 flex items-center gap-1 leading-none mb-1">
              <Clock className="h-3 w-3 text-white/60" /> Time
            </span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              {journey.durationMin} min
            </span>
          </div>

          {/* Metric 2: Cost */}
          <div className="flex flex-col items-center justify-center p-0.5 border-l border-white/10">
            <span className="text-[10px] uppercase font-semibold text-white/50 flex items-center gap-0.5 leading-none mb-1">
              <IndianRupee className="h-3 w-3 text-white/60" /> Cost
            </span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              ₹{journey.costInr}
            </span>
          </div>

          {/* Metric 3: CO2 emitted */}
          <div className="flex flex-col items-center justify-center p-0.5 border-l border-white/10">
            <span className="text-[10px] uppercase font-semibold text-white/50 flex items-center gap-1 leading-none mb-1">
              <Leaf className="h-3 w-3 text-white/60" /> CO₂
            </span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              {journey.carbonG}g
            </span>
          </div>

          {/* Metric 4: Avoided CO2 */}
          <div className="flex flex-col items-center justify-center p-0.5 border-l border-white/10">
            <span className="text-[10px] uppercase font-semibold text-[#8EE074] flex items-center gap-1 leading-none mb-1">
              <Leaf className="h-3 w-3 text-[#8EE074]" /> Avoided
            </span>
            <span className="text-xs sm:text-sm font-black text-[#8EE074] tracking-tight">
              -{journey.avoidedCarbonG}g
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
