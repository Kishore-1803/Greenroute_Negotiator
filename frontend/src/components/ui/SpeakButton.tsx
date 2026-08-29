import { AudioLines, Loader2, Volume2 } from 'lucide-react';
import { useNarration } from '@/features/trip/hooks/useNarration';
import { cn } from '@/lib/cn';

interface SpeakButtonProps {
  /** The text to narrate -- a backend-produced string (Coordinator summary, grounded
   * explanation), never free user input. */
  text: string | undefined | null;
  /** Optional visible label next to the icon. Icon-only when omitted. */
  label?: string;
  className?: string;
}

/**
 * Small "listen" control. Renders nothing when the server has no speech provider configured
 * (GET /speech/status -> {enabled:false}), so callers can drop it in unconditionally.
 */
export function SpeakButton({ text, label, className }: SpeakButtonProps) {
  const narration = useNarration();
  const cleaned = text?.trim();

  if (!narration.available || !cleaned) return null;

  const isThis = narration.activeText === cleaned;
  const loading = isThis && narration.isLoading;
  const playing = isThis && narration.isPlaying;
  const errored = isThis && narration.state === 'error';

  return (
    <button
      type="button"
      onClick={() => narration.speak(cleaned)}
      disabled={loading}
      aria-label={playing ? 'Stop narration' : 'Listen to this'}
      title={
        errored
          ? narration.error ?? 'Narration failed'
          : playing
            ? 'Stop'
            : `Listen${narration.voiceId ? '' : ''}`
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer disabled:cursor-wait',
        playing
          ? 'border-[#8EE074]/60 bg-[#8EE074]/15 text-[#8EE074]'
          : errored
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
            : 'border-white/20 bg-white/5 text-white/70 hover:border-white/35 hover:text-white',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : playing ? (
        <AudioLines className="h-3 w-3 animate-pulse" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      {label && <span>{loading ? 'Loading' : playing ? 'Stop' : errored ? 'Retry' : label}</span>}
    </button>
  );
}
