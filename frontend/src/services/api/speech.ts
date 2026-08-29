import { apiRequest } from './client';
import { toAppErrorFromException, toAppErrorFromResponse } from './errors';
import { SpeechStatusSchema, type SpeechStatus } from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
const NARRATE_TIMEOUT_MS = 25_000;

/** GET /api/v1/speech/status -- whether voice narration is configured on this server. */
export function getSpeechStatus(): Promise<SpeechStatus> {
  return apiRequest({ method: 'GET', path: '/speech/status', schema: SpeechStatusSchema });
}

/**
 * POST /api/v1/speech/narrate -- text in, an MP3 Blob out. This is the one API call in the app
 * that returns binary rather than JSON, so it does not go through apiRequest (which parses and
 * Zod-validates a JSON body); it reuses the same AppError normalization though.
 */
export async function narrate(text: string): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NARRATE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/speech/narrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (exc) {
    throw toAppErrorFromException(exc);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await toAppErrorFromResponse(response);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('audio/')) {
    throw toAppErrorFromException(new Error('speech endpoint returned a non-audio response'));
  }
  return blob;
}
