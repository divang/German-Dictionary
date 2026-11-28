import type {
  ChunkAccuracyStatus,
  ChunkPartRole,
  PronunciationAttemptRecord,
  PronunciationCheckFeedback,
  PronunciationCheckMode,
  PronunciationCorrectionItem,
  PronunciationRating,
  PronunciationWordChunk,
  TeacherStepGuidance,
} from '../types/pronunciationCheck';
import {
  buildDeterministicGermanEntry,
  transliterateGermanToDevanagari,
} from './germanPhonetics';

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

export function normalizeCheckMode(rawMode: unknown): PronunciationCheckMode {
  return rawMode === 'advanced' ? 'advanced' : 'fast';
}

export interface EvaluationModelAttempt {
  model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
  thinkingLevel: 'MINIMAL' | 'LOW';
}

/**
 * Returns the ordered Gemini model plan for voice accuracy evaluation:
 * - 'fast': prioritizes low-latency gemini-3.1-flash-lite (MINIMAL thinking), failing over to gemini-4-hydrogen (LOW)
 * - 'advanced': prioritizes deeper phonetic accuracy on gemini-4-hydrogen (LOW thinking), failing over to gemini-3.1-flash-lite (MINIMAL)
 * Note: gemini-4-hydrogen only supports LOW/MEDIUM/HIGH thinking levels (never MINIMAL).
 */
export function getEvaluationModelPlan(mode: PronunciationCheckMode): EvaluationModelAttempt[] {
  if (mode === 'advanced') {
    return [
      { model: 'gemini-4-hydrogen', thinkingLevel: 'LOW' },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: 'MINIMAL' },
    ];
  }
  return [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: 'MINIMAL' },
    { model: 'gemini-4-hydrogen', thinkingLevel: 'LOW' },
  ];
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

export interface ChunkStatusMeta {
  label: string;
  shortLabel: string;
  tileClass: string;
  badgeClass: string;
}

export function getChunkStatusMeta(status: ChunkAccuracyStatus): ChunkStatusMeta {
  switch (status) {
    case 'correct':
      return {
        label: 'Clear',
        shortLabel: '✓',
        tileClass: 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100/80',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'close':
      return {
        label: 'Almost',
        shortLabel: '~',
        tileClass: 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/80',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      };
    case 'needs-work':
      return {
        label: 'Fix This',
        shortLabel: '!',
        tileClass: 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100/80',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      };
    default:
      return {
        label: 'Practice',
        shortLabel: '•',
        tileClass: 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export function getChunkRoleLabel(role: ChunkPartRole): string {
  switch (role) {
    case 'prefix':
      return 'Prefix / Start';
    case 'infix':
      return 'Infix / Middle';
    case 'root':
      return 'Root';
    case 'suffix':
      return 'Suffix / Ending';
    case 'word':
      return 'Word';
    default:
      return 'Syllable';
  }
}

const VALID_ROLES = new Set<ChunkPartRole>([
  'prefix',
  'root',
  'infix',
  'suffix',
  'syllable',
  'word',
]);

const VALID_STATUSES = new Set<ChunkAccuracyStatus>([
  'pending',
  'correct',
  'close',
  'needs-work',
]);

const GERMAN_PREFIXES = [
  'zurück',
  'unter',
  'über',
  'durch',
  'gegen',
  'ent',
  'emp',
  'ver',
  'zer',
  'miss',
  'auf',
  'aus',
  'ein',
  'mit',
  'vor',
  'nach',
  'bei',
  'be',
  'ge',
  'er',
  'ab',
  'an',
  'zu',
  'um',
];

const GERMAN_SUFFIXES = [
  'igung',
  'schaft',
  'keit',
  'heit',
  'chen',
  'lein',
  'tion',
  'lich',
  'isch',
  'ung',
  'tät',
  'eur',
  'ier',
  'ig',
];

function stripEdgeDashes(s: string): string {
  return s.replace(/^-+|-+$/g, '').trim();
}

function buildGenericSpellOutCue(rawPart: string, dev: string, role: ChunkPartRole): string {
  const letters = rawPart.split('').join(' · ');
  const roleWord =
    role === 'prefix'
      ? 'start'
      : role === 'suffix'
        ? 'ending'
        : role === 'infix'
          ? 'middle sound'
          : 'part';
  return `Read the ${roleWord} "${rawPart}" (${letters}) aloud slowly as "${dev}".`;
}

/**
 * Deterministically breaks any German word or phrase into pronounceable
 * Prefix / Infix / Root / Suffix (or word) chunks so the Human Teacher Drill
 * works immediately — even before Attempt #1 or if an API response omits chunks.
 */
export function buildFallbackWordChunks(
  targetText: string,
  _devanagariHint?: string,
): PronunciationWordChunk[] {
  const cleaned = cleanTargetForCheck(targetText).replace(/^(der|die|das)\s+/i, '').trim();
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/).filter(Boolean);

  // Multi-word sentence: break into word-by-word chunks
  if (words.length > 1) {
    return words.slice(0, 10).map((w) => {
      const bare = w.replace(/^[^a-zA-ZäöüÄÖÜß0-9]+|[^a-zA-ZäöüÄÖÜß0-9]+$/g, '') || w;
      const dev = transliterateGermanToDevanagari(bare) || bare;
      return {
        chunk: bare,
        speakText: bare,
        role: 'word' as ChunkPartRole,
        status: 'pending' as ChunkAccuracyStatus,
        score: null,
        targetDevanagari: dev,
        heardAs: '',
        teacherHint: `Say "${bare}" clearly on its own first before joining the whole sentence.`,
        hindiCoachCue: `पहले सिर्फ़ "${dev}" को साफ़ और आराम से बोलकर देखें।`,
        spellOutCue: `Say "${bare}" slowly as "${dev}", keeping every vowel steady.`,
      };
    });
  }

  const singleWord = cleaned.replace(/^[^a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+$/g, '') || cleaned;
  const lower = singleWord.toLowerCase();

  // Special high-value breakdown for French-origin -eur words (e.g. Friseur, Masseur, Regisseur)
  // because Hindi speakers frequently struggle with the exact -s- (ज़), -eu- (ö = यॉ/ओ), and -r (अ) infix/suffix!
  if (lower.endsWith('eur') && singleWord.length >= 6) {
    const stemBeforeEur = singleWord.slice(0, -3);
    const endsWithS = /s$/i.test(stemBeforeEur);
    const prefixPart = endsWithS ? stemBeforeEur.slice(0, -1) : stemBeforeEur;
    const sPart = endsWithS ? stemBeforeEur.slice(-1) : '';
    const euPart = singleWord.slice(-3, -1);
    const rPart = singleWord.slice(-1);

    const prefixDev =
      prefixPart.toLowerCase() === 'fri'
        ? 'फ़्री'
        : transliterateGermanToDevanagari(prefixPart) || prefixPart;
    const chunks: PronunciationWordChunk[] = [];

    if (prefixPart) {
      chunks.push({
        chunk: `${prefixPart}-`,
        speakText: prefixPart,
        role: 'prefix',
        status: 'pending',
        score: null,
        targetDevanagari: prefixDev,
        heardAs: '',
        teacherHint: `Start lightly with "${prefixPart}-" — keep the vowel short and unstressed because the stress falls on the ending.`,
        hindiCoachCue: `शुरुआत हल्के से "${prefixDev}" बोलकर करें; ज़्यादा ज़ोर आख़िरी हिस्से पर जाएगा।`,
        spellOutCue: `Say just "${prefixPart}" (${prefixDev}) smoothly — like the start of "free" for Fri-.`,
      });
    }

    if (sPart) {
      chunks.push({
        chunk: `-${sPart}-`,
        speakText: `${sPart}ö`,
        role: 'infix',
        status: 'pending',
        score: null,
        targetDevanagari: 'ज़',
        heardAs: '',
        teacherHint: `The middle "-s-" before a vowel buzzes softly like English "z" (ज़), never a sharp hissing "s" (स).`,
        hindiCoachCue: `बीच का "s" हमेशा हिंदी के नुक्ते वाले "ज़" (ज़मीन जैसा) की तरह गूंजेगा, "स" नहीं।`,
        spellOutCue: `Feel your throat vibrate and hum "ज़ज़ज़" (z), then connect it into the next vowel.`,
      });
    }

    chunks.push({
      chunk: `-${euPart}-`,
      speakText: `${sPart || ''}ö`,
      role: 'infix',
      status: 'pending',
      score: null,
      targetDevanagari: 'यॉ / ओ (ö)',
      heardAs: '',
      teacherHint: `In "-eur" loanwords, "-eu-" is NOT "oy" (ऑय) — it is the long rounded German ö (/øː/).`,
      hindiCoachCue: `होंठों को "ओ" की तरह गोल रखें और अंदर से "ए" बोलने की कोशिश करें — इससे असली ö (यॉ/ओ) निकलता है।`,
      spellOutCue: `Make a tight "O" circle with your lips, freeze them, and say "ए" (eh) → sounds like "ज़्यो" (${sPart ? 'zö' : 'ö'}).`,
    });

    chunks.push({
      chunk: `-${rPart}`,
      speakText: singleWord,
      role: 'suffix',
      status: 'pending',
      score: null,
      targetDevanagari: 'अ (soft)',
      heardAs: '',
      teacherHint: `Do NOT roll the final "-r" like Hindi र. Relax your tongue and drop into a very soft "uh" (अ).`,
      hindiCoachCue: `आख़िरी "r" को "र" मत बोलें — बस हल्का-सा खुला "अ" छोड़कर शब्द ख़त्म करें।`,
      spellOutCue: `Combine "${sPart ? 'ज़्यो' : 'यो'}" + a super soft "अ" → "${prefixDev}-${sPart ? 'ज़्यो' : 'यो'}अ".`,
    });

    return chunks;
  }

  // Try morphological prefix + root/infix + suffix split for derived German words
  const matchedPrefix = GERMAN_PREFIXES.find(
    (p) => lower.startsWith(p) && lower.length >= p.length + 3,
  );
  const matchedSuffix = GERMAN_SUFFIXES.find(
    (s) => lower.endsWith(s) && lower.length >= s.length + 3,
  );

  if (matchedPrefix || matchedSuffix) {
    const startIdx = matchedPrefix ? matchedPrefix.length : 0;
    const endIdx = matchedSuffix ? singleWord.length - matchedSuffix.length : singleWord.length;

    if (endIdx > startIdx) {
      const parts: Array<{ raw: string; role: ChunkPartRole }> = [];
      if (matchedPrefix) {
        parts.push({ raw: singleWord.slice(0, startIdx), role: 'prefix' });
      }
      const middleRaw = singleWord.slice(startIdx, endIdx);
      if (middleRaw) {
        // If middle is long, split middle into syllables so each piece is bite-sized
        const midEntry = buildDeterministicGermanEntry({ word: middleRaw });
        if (midEntry.syllables.length >= 2 && parts.length + midEntry.syllables.length <= 5) {
          midEntry.syllables.forEach((syl, idx) => {
            const cleanSyl = stripEdgeDashes(syl.segment);
            if (cleanSyl) {
              parts.push({
                raw: cleanSyl,
                role: idx === 0 && !matchedPrefix ? 'root' : 'infix',
              });
            }
          });
        } else {
          parts.push({ raw: middleRaw, role: matchedPrefix ? 'root' : 'prefix' });
        }
      }
      if (matchedSuffix) {
        parts.push({ raw: singleWord.slice(endIdx), role: 'suffix' });
      }

      if (parts.length >= 2) {
        return parts.map((p, idx) => {
          const entry = buildDeterministicGermanEntry({ word: p.raw });
          const firstSyl = entry.syllables[0];
          const dev = entry.devanagariFull || p.raw;
          const display =
            idx === 0
              ? `${p.raw}-`
              : idx === parts.length - 1
                ? `-${p.raw}`
                : `-${p.raw}-`;
          return {
            chunk: display,
            speakText: p.raw,
            role: p.role,
            status: 'pending' as ChunkAccuracyStatus,
            score: null,
            targetDevanagari: dev,
            heardAs: '',
            teacherHint:
              firstSyl?.explanation ||
              `Pronounce "${p.raw}" cleanly as "${dev}".`,
            hindiCoachCue: firstSyl?.articulation?.hindiAnchor
              ? `ध्यान दें: ${firstSyl.articulation.hindiAnchor} (${dev})`
              : `इस हिस्से को धीरे से "${dev}" बोलकर अभ्यास करें।`,
            spellOutCue: buildGenericSpellOutCue(p.raw, dev, p.role),
          };
        });
      }
    }
  }

  // Fallback: syllable-based German breakdown from our deterministic phonetics engine
  const entry = buildDeterministicGermanEntry({ word: singleWord });
  if (entry.syllables.length > 0) {
    const total = entry.syllables.length;
    return entry.syllables.map((syl, idx) => {
      const bare = stripEdgeDashes(syl.segment) || singleWord;
      const role: ChunkPartRole =
        total === 1
          ? 'root'
          : idx === 0
            ? 'prefix'
            : idx === total - 1
              ? 'suffix'
              : 'infix';
      return {
        chunk: syl.segment,
        speakText: bare,
        role,
        status: 'pending' as ChunkAccuracyStatus,
        score: null,
        targetDevanagari: syl.devanagari || bare,
        heardAs: '',
        teacherHint: syl.explanation,
        hindiCoachCue: syl.articulation?.hindiAnchor
          ? `${syl.articulation.hindiAnchor} — "${syl.devanagari}"`
          : `इस हिस्से को आराम से "${syl.devanagari}" बोलें।`,
        spellOutCue: buildGenericSpellOutCue(bare, syl.devanagari || bare, role),
      };
    });
  }

  return [
    {
      chunk: singleWord,
      speakText: singleWord,
      role: 'root',
      status: 'pending',
      score: null,
      targetDevanagari: transliterateGermanToDevanagari(singleWord) || singleWord,
      heardAs: '',
      teacherHint: `Say "${singleWord}" clearly and slowly.`,
      hindiCoachCue: `पूरे शब्द को धीरे और साफ़ बोलें।`,
      spellOutCue: `Spell and sound out "${singleWord}" letter by letter.`,
    },
  ];
}

/**
 * Builds a single readable "Spell-Sound" formula line combining every chunk with its Devanagari cue.
 */
export function buildSpellSoundGuide(chunks: readonly PronunciationWordChunk[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map((c) => {
      const dev = c.targetDevanagari ? ` (${c.targetDevanagari})` : '';
      return `${c.chunk}${dev}`;
    })
    .join('  +  ');
}

export interface StuckPatternResult {
  isStuck: boolean;
  attemptCount: number;
  repeatedWeakChunk: PronunciationWordChunk | null;
  recommendedChunkIndex: number;
}

/**
 * Detects when a learner has attempted the full word 2+ times with low or stalled accuracy
 * (like Try #1-#5 stuck at 30-55%) so the UI automatically surfaces Human Teacher Rescue mode.
 */
export function detectStuckPattern(
  attempts: readonly PronunciationAttemptRecord[],
): StuckPatternResult {
  const fullWordAttempts = attempts.filter((a) => !a.practicedChunk);
  const attemptCount = fullWordAttempts.length;
  if (attemptCount === 0) {
    return { isStuck: false, attemptCount: 0, repeatedWeakChunk: null, recommendedChunkIndex: 0 };
  }

  const latest = fullWordAttempts[0];
  const latestScore = latest.feedback.accuracyScore;
  const prevScore = fullWordAttempts[1]?.feedback.accuracyScore ?? null;

  const breakdown = latest.feedback.wordBreakdown ?? [];
  let weakestIdx = 0;
  let weakestScore = Infinity;
  breakdown.forEach((c, idx) => {
    const s = c.score ?? (c.status === 'needs-work' ? 25 : c.status === 'close' ? 60 : 90);
    if (s < weakestScore) {
      weakestScore = s;
      weakestIdx = idx;
    }
  });

  const recommendedChunkIndex =
    latest.feedback.teacherGuidance &&
    latest.feedback.teacherGuidance.recommendedChunkIndex >= 0 &&
    latest.feedback.teacherGuidance.recommendedChunkIndex < breakdown.length
      ? latest.feedback.teacherGuidance.recommendedChunkIndex
      : weakestIdx;

  const repeatedWeakChunk = breakdown[recommendedChunkIndex] ?? null;

  // Stuck if: 2+ tries and latest score < 70, OR 1st try is very low (< 55) and breakdown highlights a weak chunk
  const isStalledOrLow =
    (attemptCount >= 2 && latestScore < 72) ||
    (attemptCount >= 2 && prevScore !== null && latestScore <= prevScore + 3 && latestScore < 80);

  return {
    isStuck: isStalledOrLow,
    attemptCount,
    repeatedWeakChunk,
    recommendedChunkIndex,
  };
}

function normalizeChunkStatus(
  rawStatus: unknown,
  score: number | null,
): ChunkAccuracyStatus {
  if (typeof rawStatus === 'string' && VALID_STATUSES.has(rawStatus as ChunkAccuracyStatus)) {
    return rawStatus as ChunkAccuracyStatus;
  }
  if (score === null) return 'pending';
  if (score >= 78) return 'correct';
  if (score >= 55) return 'close';
  return 'needs-work';
}

function normalizeWordBreakdown(
  rawBreakdown: unknown,
  targetText: string,
  overallScore: number,
): PronunciationWordChunk[] {
  const list: unknown[] = Array.isArray(rawBreakdown) ? rawBreakdown : [];
  const parsed: PronunciationWordChunk[] = list
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const chunkStr = typeof item.chunk === 'string' ? item.chunk.trim() : '';
      const rawScore = Number(item.score);
      const score = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(100, Math.round(rawScore)))
        : null;
      const rawRole = typeof item.role === 'string' ? item.role.trim().toLowerCase() : 'syllable';
      const role: ChunkPartRole = VALID_ROLES.has(rawRole as ChunkPartRole)
        ? (rawRole as ChunkPartRole)
        : 'syllable';
      const status = normalizeChunkStatus(item.status, score);
      const bare = stripEdgeDashes(chunkStr);
      const speakText =
        typeof item.speakText === 'string' && item.speakText.trim()
          ? item.speakText.trim()
          : bare || targetText;
      const targetDevanagari =
        typeof item.targetDevanagari === 'string' && item.targetDevanagari.trim()
          ? item.targetDevanagari.trim()
          : transliterateGermanToDevanagari(bare || chunkStr);

      return {
        chunk: chunkStr,
        speakText,
        role,
        status,
        score,
        targetDevanagari,
        heardAs: typeof item.heardAs === 'string' ? item.heardAs.trim() : '',
        teacherHint: typeof item.teacherHint === 'string' ? item.teacherHint.trim() : '',
        hindiCoachCue: typeof item.hindiCoachCue === 'string' ? item.hindiCoachCue.trim() : '',
        spellOutCue:
          typeof item.spellOutCue === 'string' && item.spellOutCue.trim()
            ? item.spellOutCue.trim()
            : buildGenericSpellOutCue(bare || chunkStr, targetDevanagari || chunkStr, role),
      };
    })
    .filter((item) => item.chunk.length > 0)
    .slice(0, 10);

  if (parsed.length > 0) {
    return parsed;
  }

  // Graceful fallback if the AI response omitted wordBreakdown
  const fallback = buildFallbackWordChunks(targetText);
  const fallbackStatus: ChunkAccuracyStatus =
    overallScore >= 80 ? 'correct' : overallScore >= 55 ? 'close' : 'needs-work';
  return fallback.map((c) => ({
    ...c,
    status: fallbackStatus,
    score: overallScore,
  }));
}

function normalizeTeacherGuidance(
  rawGuidance: unknown,
  wordBreakdown: PronunciationWordChunk[],
  overallScore: number,
): TeacherStepGuidance | undefined {
  const defaultWeakIdx = Math.max(
    0,
    wordBreakdown.findIndex((c) => c.status === 'needs-work' || c.status === 'close'),
  );
  const defaultSpelling = buildSpellSoundGuide(wordBreakdown);

  if (!rawGuidance || typeof rawGuidance !== 'object') {
    if (overallScore < 75 && wordBreakdown.length > 1) {
      const targetChunk = wordBreakdown[defaultWeakIdx];
      return {
        shouldBreakDown: true,
        teacherMessage: `Let's break this word down like a teacher and practice "${targetChunk?.chunk ?? ''}" first before combining the whole word.`,
        teacherMessageHindi: `आइए एक शिक्षक की तरह इस शब्द को टुकड़ों में बाँटें — पहले "${targetChunk?.chunk ?? ''}" का अभ्यास करते हैं, फिर पूरा शब्द जोड़ेंगे।`,
        recommendedChunkIndex: defaultWeakIdx,
        spellingPrompt: defaultSpelling,
      };
    }
    return undefined;
  }

  const g = rawGuidance as Record<string, unknown>;
  const rawIdx = Number(g.recommendedChunkIndex);
  const recommendedChunkIndex =
    Number.isFinite(rawIdx) && rawIdx >= 0 && rawIdx < wordBreakdown.length
      ? Math.floor(rawIdx)
      : defaultWeakIdx;

  const shouldBreakDown =
    typeof g.shouldBreakDown === 'boolean' ? g.shouldBreakDown : overallScore < 75;

  const teacherMessage =
    typeof g.teacherMessage === 'string' && g.teacherMessage.trim()
      ? g.teacherMessage.trim()
      : shouldBreakDown
        ? `Let's isolate "${wordBreakdown[recommendedChunkIndex]?.chunk ?? ''}" first so your mouth locks in the exact sound.`
        : 'Great rhythm! Try one more smooth full-word take to lock it in.';

  const teacherMessageHindi =
    typeof g.teacherMessageHindi === 'string' ? g.teacherMessageHindi.trim() : '';

  const spellingPrompt =
    typeof g.spellingPrompt === 'string' && g.spellingPrompt.trim()
      ? g.spellingPrompt.trim()
      : defaultSpelling;

  return {
    shouldBreakDown,
    teacherMessage,
    teacherMessageHindi,
    recommendedChunkIndex,
    spellingPrompt,
  };
}

export function normalizePronunciationFeedback(
  raw: Partial<PronunciationCheckFeedback> & Record<string, unknown>,
  targetText: string,
  practicedChunk?: string,
  evaluationMode?: PronunciationCheckMode,
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

  const wordBreakdown = normalizeWordBreakdown(raw.wordBreakdown, targetText, accuracyScore);
  const teacherGuidance = normalizeTeacherGuidance(
    raw.teacherGuidance,
    wordBreakdown,
    accuracyScore,
  );

  const resolvedMode: PronunciationCheckMode | undefined =
    evaluationMode ??
    (raw.evaluationMode === 'fast' || raw.evaluationMode === 'advanced'
      ? raw.evaluationMode
      : undefined);

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
    wordBreakdown,
    teacherGuidance,
    practicedChunk,
    evaluationMode: resolvedMode,
  };
}
