import { apiFetch, getBaseUrl } from './client';
import type {
  VoiceInterpretRequest,
  VoiceInterpretResponse,
  VoiceNarrationRequest,
  VoiceNarrationResponse,
  VoiceTranscriptionResponse,
} from './types';

// Transcription uploads a recording and waits on ElevenLabs Scribe, so it needs a longer budget
// than apiFetch's default -- a slow connection uploading a few seconds of audio can legitimately
// exceed it, and timing out here loses the utterance entirely.
const TRANSCRIBE_TIMEOUT_MS = 45000;

export const voiceApi = {
  /**
   * Uploads a recorded utterance for speech-to-text.
   *
   * Deliberately does NOT go through apiFetch: that helper sets a JSON Content-Type, and a
   * multipart body needs the boundary parameter that only the runtime can generate. Setting the
   * header by hand here would produce a body FastAPI cannot parse.
   */
  async transcribe(fileUri: string): Promise<VoiceTranscriptionResponse> {
    const base = getBaseUrl();
    const form = new FormData();
    // React Native's FormData takes this {uri, name, type} shape rather than a Blob, and streams
    // the file from disk instead of loading it into JS memory.
    form.append('file', {
      uri: fileUri,
      name: 'utterance.m4a',
      type: 'audio/m4a',
    } as any);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${base}/api/v1/voice/transcribe`, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Transcription timed out. Check your connection and try again.');
      }
      throw new Error(`Could not reach the backend at ${base} to transcribe your voice.`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.message) detail = body.message;
      } catch {
        // Non-JSON error body -- the status line is all we have.
      }
      throw new Error(detail);
    }

    return response.json() as Promise<VoiceTranscriptionResponse>;
  },

  interpret(payload: VoiceInterpretRequest): Promise<VoiceInterpretResponse> {
    return apiFetch<VoiceInterpretResponse>('/api/v1/voice/interpret', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  narrate(payload: VoiceNarrationRequest): Promise<VoiceNarrationResponse> {
    return apiFetch<VoiceNarrationResponse>('/api/v1/voice/narrate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** The narration response carries a server-relative path; the player needs an absolute URL. */
  speechUrl(relativePath: string): string {
    return `${getBaseUrl()}${relativePath}`;
  },
};
