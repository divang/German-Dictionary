export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

const HIGH_QUALITY_GERMAN_VOICE_PATTERNS = [
  /google\s+deutsch/i,
  /natural/i,
  /neural/i,
  /online/i,
];

const PREFERRED_GERMAN_VOICE_NAMES = [
  /katja/i,
  /conrad/i,
  /amala/i,
  /killian/i,
  /anna/i,
  /helena/i,
  /petra/i,
  /markus/i,
  /viktor/i,
  /hedda/i,
  /stefan/i,
  /vicki/i,
  /marlene/i,
  /hans/i,
];

const LOW_QUALITY_VOICE_PATTERNS = [/espeak/i, /compact/i];

/**
 * Strictly selects the best authentic German voice from a browser voice list.
 * Returns null if no German voice exists (never falls back to an English voice).
 */
export function selectBestGermanVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const germanVoices = voices.filter((voice) => /^de([-_]|$)/i.test(voice.lang.trim()));
  if (germanVoices.length === 0) {
    return null;
  }

  let bestVoice = germanVoices[0];
  let bestScore = -Infinity;

  for (const voice of germanVoices) {
    let score = 0;
    const lang = voice.lang.trim().toLowerCase().replace('_', '-');
    const name = voice.name.trim();

    if (lang === 'de-de') {
      score += 50;
    } else if (lang === 'de') {
      score += 35;
    } else {
      // de-AT, de-CH
      score += 20;
    }

    if (HIGH_QUALITY_GERMAN_VOICE_PATTERNS.some((re) => re.test(name))) {
      score += 35;
    }
    if (PREFERRED_GERMAN_VOICE_NAMES.some((re) => re.test(name))) {
      score += 25;
    }
    if (LOW_QUALITY_VOICE_PATTERNS.some((re) => re.test(name))) {
      score -= 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

/**
 * Resolves the best German text to speak when the user clicks "Hear" on a syllable row.
 * Tiny fragments (<= 2 letters, like "-s-", "-r", "-eu-") are spoken inside the full German
 * word slowly so TTS never reads them as isolated English letter names ("ess", "arr", "you").
 */
export function resolveSyllableAudioTarget(params: {
  segment: string;
  word: string;
  ipa?: string;
  wordIpa?: string;
}): { text: string; ipa?: string; forceSlow: boolean } {
  const cleanSegment = params.segment.replace(/^-+|-+$/g, '').trim();
  const fullWord = params.word.trim().replace(/^(der|die|das)\s+/i, '');

  // Short fragments (<= 2 chars) or isolated vowels/consonants sound unnatural or English-like
  // when sent standalone to TTS; speak the full German word slowly instead.
  if (cleanSegment.length <= 2 || !/[aeiouäöüy]/i.test(cleanSegment)) {
    return {
      text: fullWord,
      ipa: params.wordIpa,
      forceSlow: true,
    };
  }

  // If the segment's spelling mismatches standard German rules (e.g. loanword "-eu-" / "-seur"),
  // speaking the whole German word slowly preserves the authentic pronunciation.
  if (params.ipa && /[øœyʏ]/.test(params.ipa) && !/[öü]/i.test(cleanSegment)) {
    return {
      text: fullWord,
      ipa: params.wordIpa,
      forceSlow: true,
    };
  }

  return {
    text: cleanSegment,
    ipa: params.ipa,
    forceSlow: false,
  };
}
