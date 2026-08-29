import { Gauge, IndianRupee, Leaf } from 'lucide-react';
import type { CustomWeights } from '@/services/api/types';
import { cn } from '@/lib/cn';

/**
 * Master Plan "PreferenceSlider": a continuous time/cost/carbon weight control, as an advanced
 * alternative to the discrete stated-priority presets in TripPlannerForm. Values are 0-100
 * "importance" sliders per axis; the actual weight vector sent to the backend is always
 * normalized to sum to 1 (custom_weights is renormalized server-side too, but normalizing here
 * keeps the displayed percentages honest as the user drags).
 */

const AXES: Array<{ key: keyof CustomWeights; label: string; icon: typeof Gauge; color: string }> = [
  { key: 'time', label: 'Speed', icon: Gauge, color: 'accent-sky-400' },
  { key: 'cost', label: 'Cost', icon: IndianRupee, color: 'accent-amber-400' },
  { key: 'carbon', label: 'Carbon', icon: Leaf, color: 'accent-[#8EE074]' },
];

export function normalizeWeights(raw: CustomWeights): CustomWeights {
  const total = raw.time + raw.cost + raw.carbon;
  if (total <= 0) return { time: 1 / 3, cost: 1 / 3, carbon: 1 / 3 };
  return { time: raw.time / total, cost: raw.cost / total, carbon: raw.carbon / total };
}

export interface PreferenceSliderProps {
  weights: CustomWeights;
  onChange: (weights: CustomWeights) => void;
}

export function PreferenceSlider({ weights, onChange }: PreferenceSliderProps) {
  const normalized = normalizeWeights(weights);

  function handleAxisChange(key: keyof CustomWeights, value: number) {
    onChange({ ...weights, [key]: value });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {AXES.map(({ key, label, icon: Icon }) => {
        const pct = Math.round(normalized[key] * 100);
        return (
          <div key={key} className="flex items-center gap-2.5">
            <Icon className="h-3.5 w-3.5 text-white/60 shrink-0" />
            <span className="w-11 shrink-0 text-[10px] font-semibold text-white/70">{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[key]}
              onChange={(e) => handleAxisChange(key, Number(e.target.value))}
              className={cn('h-1.5 flex-1 cursor-pointer rounded-full bg-white/10', 'accent-[#8EE074]')}
              aria-label={`${label} importance`}
            />
            <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-white/60">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
