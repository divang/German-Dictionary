import type {
  PronunciationCheckFeedback,
  PronunciationCorrectionItem,
  PronunciationRating,
} from '../types/pronunciationCheck';

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
]);

/**
 * Normalizes a browser MediaRecorder MIME string (e.g. "audio/webm;codecs=opus")
 * into a clean base IANA audio MIME type accepted by Gemini inlineData.
 */
export function sanitizeAudioMimeType(rawMime: string | undefined | null): string {
  const base = (rawMime ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (ALLOWED_AUDIO_MIMES.has(base)) {
    return base === 'audio/mp3' ? 'audio/mpeg' : base;
  }
  return 'audio/webm';
}

/**
 * Cleans display annotations like "(Plural)" or slash alternatives before speaking
 * or sending a German target phrase for pronunciation verification.
 */
export function cleanTargetForCheck(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AccuracyTierMeta {
  rating: PronunciationRating;
  label: string;
  hindiLabel: string;
  badgeClass: string;
  barClass: string;
  scoreTextClass: string;
}

export function getAccuracyTier(score: number): AccuracyTierMeta {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
  if (clamped >= 85) {
    return {
      rating: 'excellent',
      label: 'Excellent Pronunciation',
      hindiLabel: 'बहुत बढ़िया उच्चारण',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      barClass: 'bg-emerald-600',
      scoreTextClass: 'text-emerald-700',
    };
  }
  if (clamped >= 70) {
    return {
      rating: 'good',
      label: 'Good — Almost Native',
      hindiLabel: 'अच्छा — लगभग सही',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      barClass: 'bg-blue-700',
      scoreTextClass: 'text-blue-700',
    };
  }
  if (clamped >= 50) {
    return {
      rating: 'fair',
      label: 'Understandable — Needs Tuning',
      hindiLabel: 'समझने योग्य — थोड़ा सुधार चाहिए',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      barClass: 'bg-amber-500',
      scoreTextClass: 'text-amber-700',
    };
  }
  return {
    rating: 'needs-practice',
    label: 'Keep Practicing',
    hindiLabel: 'अभ्यास जारी रखें',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    barClass: 'bg-rose-600',
    scoreTextClass: 'text-rose-700',
  };
}

export function normalizePronunciationFeedback(
  raw: Partial<PronunciationCheckFeedback>,
  targetText: string,
): PronunciationCheckFeedback {
  const rawScore = Number(raw.accuracyScore);
  const accuracyScore = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : 0;
  const tier = getAccuracyTier(accuracyScore);

  const strengths = Array.isArray(raw.strengths)
    ? raw.strengths
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];

  const rawCorrections: unknown[] = Array.isArray(raw.corrections) ? raw.corrections : [];
  const corrections: PronunciationCorrectionItem[] = rawCorrections
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((c) => ({
      segment: typeof c.segment === 'string' ? c.segment.trim() : '',
      issue: typeof c.issue === 'string' ? c.issue.trim() : '',
      howToFix: typeof c.howToFix === 'string' ? c.howToFix.trim() : '',
      hindiTip: typeof c.hindiTip === 'string' ? c.hindiTip.trim() : '',
    }))
    .filter((c) => c.segment || c.issue || c.howToFix)
    .slice(0, 5);

  return {
    targetText: targetText.trim(),
    accuracyScore,
    rating: tier.rating,
    heardText: typeof raw.heardText === 'string' ? raw.heardText.trim() : '',
    heardDevanagari: typeof raw.heardDevanagari === 'string' ? raw.heardDevanagari.trim() : '',
    summaryEnglish:
      typeof raw.summaryEnglish === 'string' && raw.summaryEnglish.trim()
        ? raw.summaryEnglish.trim()
        : 'Listen to the target once more and try again clearly.',
    summaryHindi:
      typeof raw.summaryHindi === 'string' ? raw.summaryHindi.trim() : '',
    strengths,
    corrections,
    retryTip: typeof raw.retryTip === 'string' ? raw.retryTip.trim() : '',
  };
}
