export interface GermanTtsAttempt {
  model: 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts';
  languageCode?: 'de-DE' | 'de';
  style: string;
  text: string;
  waitBeforeMs: number;
}

export interface GermanTtsRequestInput {
  text: string;
  slow: boolean;
  ipa?: string;
}

/**
 * Builds a pure-German speech style direction so Gemini TTS strictly uses
 * authentic Standard German (Hochdeutsch, de-DE) phonology rather than English.
 */
export function buildGermanSpeechStyle(slow: boolean, ipa?: string): string {
  const cleanIpa = ipa?.trim().replace(/\s+/g, ' ');
  const ipaCue = cleanIpa ? ` Zielaussprache (IPA): ${cleanIpa}.` : '';

  if (slow) {
    return (
      'Muttersprachlicher deutscher Sprecher aus Deutschland (Hochdeutsch, de-DE). ' +
      'Sprich den folgenden deutschen Text sehr langsam, bedächtig, deutlich und Silbe für Silbe ausschließlich auf Standarddeutsch aus — ' +
      'mit authentischer deutscher Aussprache (deutsche Vokale, Umlaute ä/ö/ü, deutsches ch und r), niemals mit englischem Akzent.' +
      ipaCue
    );
  }

  return (
    'Muttersprachlicher deutscher Sprecher aus Deutschland (Hochdeutsch, de-DE). ' +
    'Sprich den folgenden deutschen Text natürlich, klar und ausschließlich auf Standarddeutsch aus — ' +
    'mit authentischer deutscher Aussprache (deutsche Vokale, Umlaute ä/ö/ü, deutsches ch und r), niemals mit englischem Akzent.' +
    ipaCue
  );
}

/**
 * Returns the ordered failover ladder for native German TTS synthesis.
 * Never injects English prompt text into the spoken text payload.
 */
export function buildGermanTtsAttempts(input: GermanTtsRequestInput): GermanTtsAttempt[] {
  const cleanText = input.text.trim();
  const style = buildGermanSpeechStyle(input.slow, input.ipa);

  return [
    {
      model: 'gemini-3.8-flash-lite-tts',
      languageCode: 'de-DE',
      style,
      text: cleanText,
      waitBeforeMs: 0,
    },
    {
      model: 'gemini-3.8-flash-lite-tts',
      languageCode: 'de',
      style,
      text: cleanText,
      waitBeforeMs: 200,
    },
    {
      model: 'gemini-3.8-flash-lite-tts',
      languageCode: undefined,
      style,
      text: cleanText,
      waitBeforeMs: 350,
    },
    {
      model: 'gemini-3.8-flash-tts',
      languageCode: 'de-DE',
      style,
      text: cleanText,
      waitBeforeMs: 400,
    },
    {
      model: 'gemini-3.8-flash-tts',
      languageCode: undefined,
      style,
      text: cleanText,
      waitBeforeMs: 600,
    },
  ];
}
