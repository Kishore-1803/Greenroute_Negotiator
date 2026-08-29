import { Bike, IndianRupee, Leaf, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { MODE_LABEL, type TravelMode } from '@/types/mode';
import { cn } from '@/lib/cn';
import { SpeakButton } from '@/components/ui/SpeakButton';
import type { AgentArgumentDTO, NegotiationResponse } from '@/services/api/types';

const AGENT_META: Record<
  AgentArgumentDTO['agent'],
  { label: string; icon: typeof Zap; color: string }
> = {
  speed: { label: 'Speed Agent', icon: Zap, color: 'text-sky-300 bg-sky-400/15 border-sky-400/30' },
  cost: { label: 'Cost Agent', icon: IndianRupee, color: 'text-amber-300 bg-amber-400/15 border-amber-400/30' },
  carbon: { label: 'Carbon Agent', icon: Leaf, color: 'text-[#8EE074] bg-[#8EE074]/15 border-[#8EE074]/30' },
  weather: { label: 'Weather Agent', icon: Sparkles, color: 'text-indigo-300 bg-indigo-400/15 border-indigo-400/30' },
};

interface AgentNegotiationFeedProps {
  negotiation?: NegotiationResponse;
  status: 'idle' | 'loading' | 'error' | 'success';
  error?: Error;
  onRun: () => void;
}

export function AgentNegotiationFeed({ negotiation, status, error, onRun }: AgentNegotiationFeedProps) {
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-80">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <Sparkles className="h-4 w-4 text-[#8EE074]" />
        </div>
        <h3 className="text-sm font-semibold tracking-wide text-white">Agent Negotiation</h3>
        <p className="px-4 text-xs text-white/70">
          Speed, Cost, Carbon, and Weather agents evaluate route metrics to determine the optimal mode.
        </p>
        <button
          type="button"
          onClick={onRun}
          className="mt-1 flex items-center gap-1.5 rounded-xl bg-[#4D7C3E] px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#5A8F48] active:scale-95"
        >
          Start Negotiation
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-white/70">
        <RefreshCw className="h-4 w-4 animate-spin text-[#8EE074]" />
        <span>Agents are negotiating…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-amber-200">
        <span>{error?.message || 'Negotiation temporarily unavailable.'}</span>
        <button type="button" onClick={onRun} className="font-bold text-white underline">
          Retry
        </button>
      </div>
    );
  }

  if (!negotiation) return null;

  // Use final round arguments (round_2 if present, otherwise round_1)
  const finalArguments = negotiation.round_2 && negotiation.round_2.length > 0 
    ? negotiation.round_2 
    : negotiation.round_1;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-0.5">
      {/* 1. Final Coordinator Decision */}
      <div className="rounded-xl border border-[#8EE074]/40 bg-[#8EE074]/10 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8EE074]">Final Consensus</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase',
              negotiation.coordinator.provider === 'groq'
                ? 'border-[#8EE074]/40 text-[#8EE074]'
                : 'border-white/20 text-white/60'
            )}
          >
            {negotiation.coordinator.provider === 'groq' ? 'AI Mediated' : 'Verified'}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-white">
            <Bike className="h-3.5 w-3.5 text-[#8EE074]" />
            Recommended: {MODE_LABEL[negotiation.coordinator.winner as TravelMode] ?? negotiation.coordinator.winner}
          </p>
          <SpeakButton text={negotiation.coordinator.summary} label="Listen" />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/85">{negotiation.coordinator.summary}</p>
      </div>

      {/* 2. Final Agent Stances */}
      <section className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Agent Final Positions</span>
        {finalArguments.map((arg) => {
          const meta = AGENT_META[arg.agent] || { label: `${arg.agent} Agent`, icon: Zap, color: 'text-white/80 bg-white/10 border-white/20' };
          const Icon = meta.icon;
          return (
            <div key={`${arg.agent}-final`} className={cn('rounded-xl border p-2.5', meta.color)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">{meta.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {arg.stance && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                        arg.stance === 'concede' ? 'bg-white/15 text-white/70' : 'bg-black/30 text-white'
                      )}
                    >
                      {arg.stance}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-white/80">
                    advocating {MODE_LABEL[arg.mode_advocated as TravelMode] ?? arg.mode_advocated}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/85">{arg.message}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
