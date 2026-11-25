import type {
  ArticulationGuide,
  DictionaryEntry,
  LipShape,
  SoundDifficulty,
  SyllableBreakdown,
  TonguePosition,
  WordCategory,
} from '../types/dictionary';

/**
 * Normalizes German text so users typing without umlauts (e.g. "broetchen", "kuche", "tschuess")
 * still match authentic German words ("Brötchen", "Küche", "Tschüss").
 */
export function normalizeGermanQuery(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Strips umlauts to plain base vowels (ä -> a, ö -> o, ü -> u) so learners typing
 * "kuche" or "broetchen" or "brotchen" all find their target word effortlessly.
 */
export function stripUmlautsSimple(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}

export function slugifyWord(word: string): string {
  return normalizeGermanQuery(word).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word';
}

export function matchesEntry(entry: DictionaryEntry, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const qNorm = normalizeGermanQuery(q);
  const qSimple = stripUmlautsSimple(q);

  const candidates = [
    entry.word,
    entry.englishMeaning,
    entry.hindiMeaning,
    entry.devanagariFull,
    entry.romanizedFull,
    entry.article ? `${entry.article} ${entry.word}` : '',
  ];

  return candidates.some((field) => {
    const lower = field.toLowerCase();
    if (lower.includes(q)) return true;
    if (normalizeGermanQuery(field).includes(qNorm)) return true;
    if (stripUmlautsSimple(field).includes(qSimple)) return true;
    return false;
  });
}

export function filterEntries(
  entries: DictionaryEntry[],
  query: string,
  category: WordCategory,
): DictionaryEntry[] {
  return entries.filter((entry) => {
    const categoryOk = category === 'all' || entry.categories.includes(category);
    if (!categoryOk) return false;
    return matchesEntry(entry, query);
  });
}

export function findExactWordMatch(
  entries: DictionaryEntry[],
  rawQuery: string,
): DictionaryEntry | undefined {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return undefined;
  const qNorm = normalizeGermanQuery(q);
  const qSimple = stripUmlautsSimple(q);

  return entries.find((entry) => {
    const wLower = entry.word.toLowerCase();
    return (
      wLower === q ||
      normalizeGermanQuery(entry.word) === qNorm ||
      stripUmlautsSimple(entry.word) === qSimple ||
      (entry.article && `${entry.article} ${wLower}` === q)
    );
  });
}

export function toggleSavedWordId(savedIds: string[], wordId: string): string[] {
  if (savedIds.includes(wordId)) {
    return savedIds.filter((id) => id !== wordId);
  }
  return [wordId, ...savedIds];
}

export function upsertRecentEntry(
  recent: DictionaryEntry[],
  entry: DictionaryEntry,
  maxItems = 12,
): DictionaryEntry[] {
  const filtered = recent.filter((item) => item.id !== entry.id);
  return [entry, ...filtered].slice(0, maxItems);
}

const VALID_DIFFICULTIES: SoundDifficulty[] = ['hindi-match', 'subtle-shift', 'new-sound'];
const VALID_LIP_SHAPES: LipShape[] = ['tight-circle', 'rounded', 'spread', 'neutral', 'open'];
const VALID_TONGUE_POSITIONS: TonguePosition[] = [
  'front-high',
  'front-mid',
  'central',
  'back-throat',
  'alveolar-buzz',
  'teeth-lip',
];

function sanitizeArticulation(raw: Partial<ArticulationGuide> | undefined, fallbackIpa: string): ArticulationGuide {
  const lipShape = raw?.lipShape && VALID_LIP_SHAPES.includes(raw.lipShape) ? raw.lipShape : 'neutral';
  const tonguePosition =
    raw?.tonguePosition && VALID_TONGUE_POSITIONS.includes(raw.tonguePosition)
      ? raw.tonguePosition
      : 'central';

  return {
    lipShape,
    lipLabel: raw?.lipLabel?.trim() || 'Relaxed neutral lips',
    tonguePosition,
    tongueLabel: raw?.tongueLabel?.trim() || 'Relaxed central tongue',
    hindiAnchor: raw?.hindiAnchor?.trim() || 'Close to standard Hindi pronunciation',
    targetIpa: raw?.targetIpa?.trim() || fallbackIpa,
  };
}

/**
 * Validates and normalizes an AI-generated pronunciation entry so UI rendering
 * never crashes on missing or slightly malformed fields.
 */
export function normalizeGeneratedEntry(raw: Partial<DictionaryEntry>, fallbackWord: string): DictionaryEntry {
  const word = (raw.word || fallbackWord).trim();
  const id = slugifyWord(word);

  const rawSyllables: unknown[] = Array.isArray(raw.syllables) ? raw.syllables : [];
  const syllables: SyllableBreakdown[] = rawSyllables
    .filter((s): s is Partial<SyllableBreakdown> => Boolean(s && typeof s === 'object'))
    .map((s, idx) => {
      const difficulty =
        s.difficulty && VALID_DIFFICULTIES.includes(s.difficulty) ? s.difficulty : 'subtle-shift';
      const ipa = (s.ipa || '').trim();
      const mouthSteps = Array.isArray(s.mouthSteps)
        ? s.mouthSteps.map((step) => String(step).trim()).filter(Boolean)
        : undefined;

      return {
        id: `${id}-syl-${idx}`,
        segment: (s.segment || word).trim(),
        devanagari: (s.devanagari || '').trim(),
        romanized: (s.romanized || '').trim(),
        ipa,
        stressed: Boolean(s.stressed),
        difficulty,
        explanation: (s.explanation || 'Pronounce clearly with steady breath.').trim(),
        mouthSteps: mouthSteps && mouthSteps.length > 0 ? mouthSteps : undefined,
        quickShortcut: s.quickShortcut?.trim() || undefined,
        articulation: sanitizeArticulation(s.articulation, ipa),
      };
    });

  const validArticle =
    raw.article === 'der' || raw.article === 'die' || raw.article === 'das' ? raw.article : '';
  const validCefr =
    raw.cefr === 'A1' || raw.cefr === 'A2' || raw.cefr === 'B1' || raw.cefr === 'B2' || raw.cefr === 'C1'
      ? raw.cefr
      : 'A2';

  const validCategories = (Array.isArray(raw.categories) ? raw.categories : []).filter(
    (c): c is Exclude<WordCategory, 'all'> =>
      c === 'umlauts' || c === 'ch-r' || c === 'loanwords' || c === 'everyday',
  );

  return {
    id,
    word,
    article: validArticle,
    partOfSpeech: (raw.partOfSpeech || 'German word').trim(),
    cefr: validCefr,
    englishMeaning: (raw.englishMeaning || 'Translation unavailable').trim(),
    hindiMeaning: (raw.hindiMeaning || '').trim(),
    devanagariFull: (raw.devanagariFull || '').trim(),
    romanizedFull: (raw.romanizedFull || word).trim(),
    ipa: (raw.ipa || `/${word.toLowerCase()}/`).trim(),
    stressSummary: (raw.stressSummary || 'Check highlighted syllable for primary stress.').trim(),
    originNote: (raw.originNote || 'Follows standard modern German pronunciation patterns.').trim(),
    categories: validCategories.length > 0 ? validCategories : ['everyday'],
    syllables:
      syllables.length > 0
        ? syllables
        : [
            {
              id: `${id}-syl-0`,
              segment: word,
              devanagari: raw.devanagariFull || word,
              romanized: raw.romanizedFull || word,
              ipa: raw.ipa || `/${word}/`,
              stressed: true,
              difficulty: 'subtle-shift',
              explanation: 'Listen carefully to the audio and notice the vowel length and stress.',
              articulation: sanitizeArticulation(undefined, raw.ipa || ''),
            },
          ],
    example: {
      german: raw.example?.german?.trim() || `Das Wort ist „${word}“.`,
      devanagari: raw.example?.devanagari?.trim() || `दास वोर्ट इस्ट "${raw.devanagariFull || word}".`,
      english: raw.example?.english?.trim() || `The word is "${word}".`,
      hindi: raw.example?.hindi?.trim() || `यह शब्द "${word}" है।`,
    },
    examples:
      Array.isArray(raw.examples) && raw.examples.length > 0
        ? raw.examples
        : raw.example?.german
          ? [
              {
                german: raw.example.german.trim(),
                devanagari: raw.example.devanagari?.trim() || '',
                english: raw.example.english?.trim() || '',
                hindi: raw.example.hindi?.trim() || '',
              },
            ]
          : undefined,
    collocations:
      Array.isArray(raw.collocations) && raw.collocations.length > 0
        ? raw.collocations
        : undefined,
    source: 'live',
  };
}

export function getDifficultyMeta(difficulty: SoundDifficulty): {
  label: string;
  symbol: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
} {
  switch (difficulty) {
    case 'new-sound':
      return {
        label: 'New sound for Hindi speakers',
        symbol: '▲',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-200',
        bgClass: 'bg-amber-50/70',
      };
    case 'subtle-shift':
      return {
        label: 'Subtle shift from Hindi',
        symbol: '◆',
        textClass: 'text-blue-800',
        borderClass: 'border-blue-200',
        bgClass: 'bg-blue-50/60',
      };
    case 'hindi-match':
    default:
      return {
        label: 'Familiar Hindi sound',
        symbol: '●',
        textClass: 'text-emerald-800',
        borderClass: 'border-emerald-200',
        bgClass: 'bg-emerald-50/60',
      };
  }
}

export function getTongueCoordinates(position: TonguePosition): { cx: number; cy: number } {
  switch (position) {
    case 'front-high':
      return { cx: 74, cy: 52 };
    case 'front-mid':
      return { cx: 82, cy: 70 };
    case 'alveolar-buzz':
      return { cx: 60, cy: 58 };
    case 'teeth-lip':
      return { cx: 46, cy: 74 };
    case 'back-throat':
      return { cx: 136, cy: 62 };
    case 'central':
    default:
      return { cx: 102, cy: 76 };
  }
}

export function getLipDimensions(shape: LipShape): { rx: number; ry: number } {
  switch (shape) {
    case 'tight-circle':
      return { rx: 11, ry: 11 };
    case 'rounded':
      return { rx: 16, ry: 14 };
    case 'spread':
      return { rx: 32, ry: 9 };
    case 'open':
      return { rx: 24, ry: 20 };
    case 'neutral':
    default:
      return { rx: 23, ry: 12 };
  }
}
