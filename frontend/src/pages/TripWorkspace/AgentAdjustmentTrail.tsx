import { useState } from 'react';
import { ChevronDown, Sparkles, TriangleAlert, Wind } from 'lucide-react';
import { MODE_LABEL, type TravelMode } from '@/types/mode';
import type { AdjustmentOutcome } from '@/services/api/types';
import { cn } from '@/lib/cn';

const CHANNEL_META: Record<string, { label: string; unit: string; agent: string }> = {
  duration_min: { label: 'Time', unit: 'min', agent: 'Speed' },
  estimated_cost_inr: { label: 'Cost', unit: '\u20b9', agent: 'Cost' },
  estimated_carbon_g: { label: 'CO\u2082', unit: 'g', agent: 'Carbon' },
};

const AGENT_LABEL: Record<string, string> = { speed: 'Speed', cost: 'Cost', carbon: 'Carbon' };

interface Props {
  adjustments: AdjustmentOutcome;
  /** Each resolved row already carries `baseline_value` (the pre-adjustment number), so the
   * raw ModeMetrics list is not needed here. */
  aqi?: number | null;
}

function fmt(value: number, channel: string): string {
  if (channel === 'estimated_carbon_g') return value.toFixed(0);
  if (channel === 'duration_min') return value.toFixed(1);
  return value.toFixed(1);
}

export function AgentAdjustmentTrail({ adjustments, aqi }: Props) {
  const [open, setOpen] = useState(false);

  const active = adjustments.agents_active;
  const resolved = adjustments.resolved;
  if (active.length === 0 && resolved.length === 0) return null;

  const reasonFor = (mode: string, channel: string) =>
    adjustments.proposals.find((p) => p.mode === mode && p.channel === channel)?.reason;

  const byMode = (['car', 'two_wheeler', 'cycling'] as TravelMode[])
    .map((mode) => ({
      mode,
      rows: resolved.filter((r) => r.mode === mode),
    }))
    .filter((g) => g.rows.length > 0);

  const clampedCount = resolved.filter((r) => r.was_clamped).length;

  return (
    <section className="flex flex-col gap-2 pt-3 border-t border-white/10 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 text-left cursor-pointer group"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 group-hover:text-white/70">
          <Sparkles className="h-3 w-3 text-[#8EE074]" />
          Agent Adjustments
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-white/45">
          {resolved.length} value{resolved.length === 1 ? '' : 's'} changed
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      <p className="text-[11px] leading-relaxed text-white/60">
        The {active.map((a) => AGENT_LABEL[a] ?? a).join(', ')} agent
        {active.length === 1 ? '' : 's'} adjusted the raw route data
        {' '}<span className="text-white/75">before</span> the utility formula scored it. Delete an
        agent and these numbers change &mdash; and the recommendation can change with them.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {(['speed', 'cost', 'carbon'] as const).map((a) => (
          <span
            key={a}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
              active.includes(a)
                ? 'border-[#8EE074]/40 bg-[#8EE074]/10 text-[#8EE074]'
                : 'border-white/15 bg-white/5 text-white/35 line-through',
            )}
          >
            {AGENT_LABEL[a]}
          </span>
        ))}
        {aqi != null && (
          <span className="flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-200">
            <Wind className="h-2.5 w-2.5" />
            AQI {Math.round(aqi)}
          </span>
        )}
        {clampedCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
            <TriangleAlert className="h-2.5 w-2.5" />
            {clampedCount} clamped
          </span>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2 pt-1">
          {byMode.map(({ mode, rows }) => (
            <div key={mode} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="text-[11px] font-bold text-white">{MODE_LABEL[mode]}</span>
              <div className="mt-1 flex flex-col gap-1">
                {rows.map((r) => {
                  const meta = CHANNEL_META[r.channel];
                  const reason = reasonFor(r.mode, r.channel);
                  const up = r.applied_delta > 0;
                  return (
                    <div key={r.channel} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-white/55 w-10 shrink-0">{meta?.label ?? r.channel}</span>
                        <span className="flex-1 text-white/75 tabular-nums">
                          {fmt(r.baseline_value, r.channel)}
                          <span className="text-white/35 mx-1">&rarr;</span>
                          <span className="text-white font-semibold">{fmt(r.adjusted_value, r.channel)}</span>
                          <span className="text-white/35 ml-1">{meta?.unit}</span>
                        </span>
                        <span
                          className={cn(
                            'tabular-nums font-bold shrink-0',
                            up ? 'text-amber-300' : 'text-[#8EE074]',
                          )}
                        >
                          {up ? '+' : ''}
                          {fmt(r.applied_delta, r.channel)}
                        </span>
                        {r.was_clamped && (
                          <span
                            title={`Proposed ${fmt(r.proposed_delta, r.channel)}; clamped to the per-channel bound`}
                            className="rounded bg-amber-400/15 px-1 text-[8px] font-bold uppercase text-amber-300 shrink-0"
                          >
                            clamped
                          </span>
                        )}
                      </div>
                      {reason && <p className="text-[9px] leading-snug text-white/40 pl-10">{reason}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
