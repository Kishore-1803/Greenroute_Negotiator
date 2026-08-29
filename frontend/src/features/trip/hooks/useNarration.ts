import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSpeechStatus, narrate } from '@/services/api/speech';
import { AppError } from '@/services/api/errors';

type NarrationState = 'idle' | 'loading' | 'playing' | 'error';

/**
 * Voice narration for a piece of already-produced backend text (a Coordinator summary, a
 * grounded explanation). One <audio> element per hook instance; fetched MP3 blobs are cached
 * by their exact text so replaying the same line is instant and costs no ElevenLabs quota.
 *
 * `available` comes from GET /speech/status -- when the server has no ELEVENLABS_API_KEY the
 * caller should hide its listen control rather than render a button that always 503s.
 */
export function useNarration() {
  const status = useQuery({
    queryKey: ['speech', 'status'],
    queryFn: getSpeechStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCacheRef = useRef<Map<string, string>>(new Map());
  const [state, setState] = useState<NarrationState>('idle');
  const [error, setError] = useState<string>();
  const [activeText, setActiveText] = useState<string>();

  // Create the <audio> element on mount, not during render (a ref must not be read/written
  // while rendering). Every handler below guards on audioRef.current being set.
  useEffect(() => {
    if (audioRef.current === null && typeof Audio !== 'undefined') {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setState('idle');
    const onError = () => {
      setState('error');
      setError('Could not play the narration audio.');
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Revoke every cached object URL on unmount.
  useEffect(() => {
    const cache = urlCacheRef.current;
    return () => {
      audioRef.current?.pause();
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState('idle');
  }, []);

  const speak = useCallback(async (text: string) => {
    const audio = audioRef.current;
    const cleaned = text?.trim();
    if (!audio || !cleaned) return;

    // Clicking the button while this exact line is playing acts as a stop toggle.
    if (state === 'playing' && activeText === cleaned) {
      stop();
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setActiveText(cleaned);
    setError(undefined);

    try {
      let url = urlCacheRef.current.get(cleaned);
      if (!url) {
        setState('loading');
        const blob = await narrate(cleaned);
        url = URL.createObjectURL(blob);
        urlCacheRef.current.set(cleaned, url);
      }
      audio.src = url;
      await audio.play();
      setState('playing');
    } catch (exc) {
      setState('error');
      setError(exc instanceof AppError ? exc.message : 'Voice narration failed.');
    }
  }, [state, activeText, stop]);

  return useMemo(
    () => ({
      available: status.data?.enabled ?? false,
      voiceId: status.data?.voice_id ?? null,
      state,
      error,
      activeText,
      speak,
      stop,
      isLoading: state === 'loading',
      isPlaying: state === 'playing',
    }),
    [status.data, state, error, activeText, speak, stop],
  );
}
