import { getBaseUrl } from './client';

export interface SpeechStatus {
  enabled: boolean;
  provider: string | null;
  voice_id: string | null;
}

export async function getSpeechStatus(): Promise<SpeechStatus> {
  const res = await fetch(`${getBaseUrl()}/api/v1/speech/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** POST /api/v1/speech/narrate -- text in, an MP3 data URI out (playable directly by expo-av). */
export async function narrate(text: string): Promise<string> {
  const res = await fetch(`${getBaseUrl()}/api/v1/speech/narrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read narration audio'));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
