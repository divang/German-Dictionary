import { selectBestGermanVoice } from './voiceSelection';

const audioDataCache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;

export interface PlayResult {
  usedFallback: boolean;
  error?: string;
}

export interface PlayGermanAudioOptions {
  slow?: boolean;
  ipa?: string;
}

export function stopCurrentAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Chrome/Safari/Edge populate speechSynthesis.getVoices() asynchronously.
 * Wait briefly for `voiceschanged` so we find Google Deutsch / de-DE voices
 * instead of accidentally speaking with the system's default English voice.
 */
function loadSpeechVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) {
      resolve(immediate);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    const onVoicesChanged = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        finish();
      }
    };

    window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged);
    window.setTimeout(finish, timeoutMs);
  });
}

async function playWithWebSpeech(
  text: string,
  slow: boolean,
): Promise<{ ok: boolean; noGermanVoice?: boolean }> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false };
  }

  const voices = await loadSpeechVoices();
  const germanVoice = selectBestGermanVoice(voices);
  if (!germanVoice) {
    // Refuse to read German text using an English default voice
    return { ok: false, noGermanVoice: true };
  }

  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = germanVoice;
      utterance.lang = germanVoice.lang || 'de-DE';
      utterance.rate = slow ? 0.65 : 0.96;
      utterance.onend = () => resolve({ ok: true });
      utterance.onerror = () => resolve({ ok: false });
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve({ ok: false });
    }
  });
}

function playDataUrl(dataUrl: string, slow: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    stopCurrentAudio();
    const audio = new Audio(dataUrl);
    if ('preservesPitch' in audio) {
      audio.preservesPitch = true;
    }
    // Gemini already articulates slower in slow mode; apply a gentle 0.88x rate without distortion
    audio.playbackRate = slow ? 0.88 : 1.0;
    activeAudio = audio;
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      reject(new Error('Audio playback failed.'));
    };
    audio.play().catch((err) => {
      if (activeAudio === audio) activeAudio = null;
      reject(err);
    });
  });
}

export async function playGermanAudio(
  text: string,
  slowOrOptions: boolean | PlayGermanAudioOptions = false,
): Promise<PlayResult> {
  const cleanText = text.trim();
  if (!cleanText) return { usedFallback: false };

  const slow = typeof slowOrOptions === 'boolean' ? slowOrOptions : Boolean(slowOrOptions.slow);
  const ipa = typeof slowOrOptions === 'boolean' ? undefined : slowOrOptions.ipa;

  const key = `de-v2::${slow ? 'slow' : 'normal'}::${cleanText.toLowerCase()}::${ipa ?? ''}`;
  const cachedDataUrl = audioDataCache.get(key);

  if (cachedDataUrl) {
    try {
      await playDataUrl(cachedDataUrl, slow);
      return { usedFallback: false };
    } catch {
      // Fall through to German Web Speech if browser blocks audio element playback
    }
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, slow, ipa }),
    });

    if (response.ok) {
      const payload = (await response.json()) as { audioBase64?: string; mimeType?: string };
      if (payload.audioBase64) {
        const dataUrl = `data:${payload.mimeType || 'audio/wav'};base64,${payload.audioBase64}`;
        audioDataCache.set(key, dataUrl);
        await playDataUrl(dataUrl, slow);
        return { usedFallback: false };
      }
    }
  } catch {
    // Graceful fallback to authentic German browser voice only
  }

  const webSpeechResult = await playWithWebSpeech(cleanText, slow);
  if (webSpeechResult.ok) {
    return { usedFallback: true };
  }
  if (webSpeechResult.noGermanVoice) {
    return {
      usedFallback: true,
      error:
        'Native German audio is temporarily unavailable, and no German (de-DE) voice is installed in this browser. We skipped the English voice so you do not hear an inaccurate accent.',
    };
  }
  return {
    usedFallback: true,
    error: 'German audio playback is currently unavailable in this browser.',
  };
}
