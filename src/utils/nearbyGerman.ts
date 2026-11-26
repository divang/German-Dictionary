import type {
  MatchConfidence,
  NearbyMode,
  NearbySentenceCandidate,
  NearbySentenceResult,
  NearbyWordCandidate,
  NearbyWordResult,
} from '../types/nearby';
import type { WordByWordItem } from '../types/sentence';
import { stripArticleAndPunctuation } from './sentenceTranslator';

export const MAX_NEARBY_WORD_INPUT = 80;
export const MAX_NEARBY_SENTENCE_INPUT = 240;

const VALID_ARTICLES = new Set(['', 'der', 'die', 'das']);
const VALID_CONFIDENCE = new Set<MatchConfidence>(['high', 'medium', 'possible']);

export const PRESET_NEARBY_WORDS: string[] = [
  'ent shul di gung',
  'free zeur',
  'kranken hows',
  'broet shen',
  'आपो-टेके',
  'tsahn artst',
];

export const PRESET_NEARBY_SENTENCES: string[] = [
  'ish moeshte ain kaffe bitte',
  'wo ist de bahn hof',
  'vee feel kostet das',
  'ish fer shtehe nisht',
  'गूटेन मोर्गन वी गेट्स',
];

export const INITIAL_SAMPLE_NEARBY_WORD: NearbyWordResult = {
  query: 'free zeur',
  detectedAs: 'Phonetic English-style spelling of a spoken German word',
  candidates: [
    {
      germanWord: 'Friseur',
      article: 'der',
      partOfSpeech: 'Masculine noun',
      confidence: 'high',
      devanagari: 'फ़्री-ज़्योअ',
      ipa: '/fʁiˈzøːɐ̯/',
      englishMeaning: 'hairdresser, barber',
      hindiMeaning: 'नाई, हेयरड्रेसर',
      matchReason: 'Matches “free-zeur” — French loanword where “Fri” = फ़्री and “-seur” = ज़्योअ.',
      exampleGerman: 'Ich gehe heute zum Friseur.',
      exampleEnglish: 'I am going to the hairdresser today.',
    },
    {
      germanWord: 'Frisur',
      article: 'die',
      partOfSpeech: 'Feminine noun',
      confidence: 'medium',
      devanagari: 'फ़्री-ज़ूअ',
      ipa: '/fʁiˈzuːɐ̯/',
      englishMeaning: 'hairstyle, haircut',
      hindiMeaning: 'हेयरस्टाइल, केश सज्जा',
      matchReason: 'Very close sound — ends in “-ur” (ज़ूअ) instead of “-eur” (ज़्योअ).',
      exampleGerman: 'Deine neue Frisur sieht gut aus.',
      exampleEnglish: 'Your new hairstyle looks great.',
    },
    {
      germanWord: 'frisieren',
      article: '',
      partOfSpeech: 'Verb',
      confidence: 'possible',
      devanagari: 'फ़्री-ज़ी-रन',
      ipa: '/fʁiˈziːʁən/',
      englishMeaning: 'to style hair, to comb',
      hindiMeaning: 'बाल संवारना',
      matchReason: 'Related verb sharing the same “Fri-s-” sound stem.',
      exampleGerman: 'Sie frisiert sich jeden Morgen.',
      exampleEnglish: 'She styles her hair every morning.',
    },
  ],
};

export const INITIAL_SAMPLE_NEARBY_SENTENCE: NearbySentenceResult = {
  query: 'ish moeshte ain kaffe bitte',
  detectedAs: 'Phonetic spelling of a spoken German polite request',
  candidates: [
    {
      germanSentence: 'Ich möchte bitte einen Kaffee.',
      confidence: 'high',
      devanagariSentence: 'इश म्यॉश-टे बि-टे आइ-नन का-फ़े।',
      englishMeaning: 'I would like a coffee, please.',
      hindiMeaning: 'मुझे कृपया एक कॉफ़ी चाहिए।',
      matchReason: '“ish” → Ich, “moeshte” → möchte, “ain kaffe” → einen Kaffee (accusative masculine).',
      words: [
        {
          german: 'Ich',
          baseForm: 'ich',
          article: '',
          devanagari: 'इश',
          english: 'I',
          hindi: 'मैं',
          role: 'Pronoun',
        },
        {
          german: 'möchte',
          baseForm: 'mögen',
          article: '',
          devanagari: 'म्यॉश-टे',
          english: 'would like',
          hindi: 'चाहता हूँ / चाहिए',
          role: 'Modal verb',
        },
        {
          german: 'bitte',
          baseForm: 'bitte',
          article: '',
          devanagari: 'बि-टे',
          english: 'please',
          hindi: 'कृपया',
          role: 'Polite adverb',
        },
        {
          german: 'einen',
          baseForm: 'ein',
          article: '',
          devanagari: 'आइ-नन',
          english: 'a (accusative)',
          hindi: 'एक',
          role: 'Indefinite article',
        },
        {
          german: 'Kaffee',
          baseForm: 'Kaffee',
          article: 'der',
          devanagari: 'का-फ़े',
          english: 'coffee',
          hindi: 'कॉफ़ी',
          role: 'Masculine noun',
        },
      ],
    },
    {
      germanSentence: 'Ich möchte eine Tasse Kaffee, bitte.',
      confidence: 'medium',
      devanagariSentence: 'इश म्यॉश-टे आइ-ने ता-से का-फ़े, बि-टे।',
      englishMeaning: 'I would like a cup of coffee, please.',
      hindiMeaning: 'मुझे कृपया एक कप कॉफ़ी चाहिए।',
      matchReason: 'Common café alternative adding “eine Tasse” (a cup).',
      words: [
        {
          german: 'Ich',
          baseForm: 'ich',
          article: '',
          devanagari: 'इश',
          english: 'I',
          hindi: 'मैं',
          role: 'Pronoun',
        },
        {
          german: 'möchte',
          baseForm: 'mögen',
          article: '',
          devanagari: 'म्यॉश-टे',
          english: 'would like',
          hindi: 'चाहता हूँ',
          role: 'Modal verb',
        },
        {
          german: 'eine',
          baseForm: 'ein',
          article: '',
          devanagari: 'आइ-ने',
          english: 'a (feminine)',
          hindi: 'एक',
          role: 'Indefinite article',
        },
        {
          german: 'Tasse',
          baseForm: 'Tasse',
          article: 'die',
          devanagari: 'ता-से',
          english: 'cup',
          hindi: 'कप',
          role: 'Feminine noun',
        },
        {
          german: 'Kaffee',
          baseForm: 'Kaffee',
          article: 'der',
          devanagari: 'का-फ़े',
          english: 'coffee',
          hindi: 'कॉफ़ी',
          role: 'Masculine noun',
        },
        {
          german: 'bitte',
          baseForm: 'bitte',
          article: '',
          devanagari: 'बि-टे',
          english: 'please',
          hindi: 'कृपया',
          role: 'Polite adverb',
        },
      ],
    },
  ],
};

export function validateNearbyInput(raw: string, mode: NearbyMode): string | null {
  const cleaned = raw.trim();
  const maxLen = mode === 'word' ? MAX_NEARBY_WORD_INPUT : MAX_NEARBY_SENTENCE_INPUT;
  if (!cleaned) {
    return mode === 'word'
      ? 'Speak or type the rough spelling of the German word you heard (e.g. "ent shul di gung" or "free zeur").'
      : 'Speak or type the rough German sentence you heard (e.g. "wo ist de bahn hof" or "ish moeshte ain kaffe").';
  }
  if (cleaned.length < 2) {
    return 'Please enter at least 2 characters so we can find probable German matches.';
  }
  if (cleaned.length > maxLen) {
    return `Please keep your input under ${maxLen} characters.`;
  }
  return null;
}

function clamp(raw: unknown, maxLen: number, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  return raw.trim().slice(0, maxLen);
}

function sanitizeArticle(raw: unknown): 'der' | 'die' | 'das' | '' {
  if (typeof raw === 'string' && VALID_ARTICLES.has(raw.trim().toLowerCase())) {
    return raw.trim().toLowerCase() as 'der' | 'die' | 'das' | '';
  }
  return '';
}

function sanitizeConfidence(raw: unknown, index: number): MatchConfidence {
  if (typeof raw === 'string' && VALID_CONFIDENCE.has(raw.trim().toLowerCase() as MatchConfidence)) {
    return raw.trim().toLowerCase() as MatchConfidence;
  }
  if (index === 0) return 'high';
  if (index === 1) return 'medium';
  return 'possible';
}

export function getConfidenceLabel(confidence: MatchConfidence): {
  label: string;
  textClass: string;
} {
  switch (confidence) {
    case 'high':
      return { label: 'Most likely match', textClass: 'text-emerald-700' };
    case 'medium':
      return { label: 'Close alternative', textClass: 'text-blue-700' };
    default:
      return { label: 'Also possible', textClass: 'text-slate-500' };
  }
}

export function normalizeNearbyWordResult(
  raw: Omit<Partial<NearbyWordResult>, 'candidates'> & {
    candidates?: Partial<NearbyWordCandidate>[];
  },
  query: string,
): NearbyWordResult {
  const rawCandidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  const seen = new Set<string>();
  const candidates: NearbyWordCandidate[] = [];

  for (let i = 0; i < rawCandidates.length; i += 1) {
    const item = rawCandidates[i];
    const cleanWord = stripArticleAndPunctuation(clamp(item?.germanWord, 80));
    if (!cleanWord) continue;
    const dedupeKey = cleanWord.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    candidates.push({
      germanWord: cleanWord,
      article: sanitizeArticle(item?.article),
      partOfSpeech: clamp(item?.partOfSpeech, 60, 'German word'),
      confidence: sanitizeConfidence(item?.confidence, candidates.length),
      devanagari: clamp(item?.devanagari, 120),
      ipa: clamp(item?.ipa, 90),
      englishMeaning: clamp(item?.englishMeaning, 180),
      hindiMeaning: clamp(item?.hindiMeaning, 180),
      matchReason: clamp(item?.matchReason, 220),
      exampleGerman: clamp(item?.exampleGerman, 200),
      exampleEnglish: clamp(item?.exampleEnglish, 200),
    });

    if (candidates.length >= 5) break;
  }

  return {
    query: query.trim().slice(0, MAX_NEARBY_WORD_INPUT),
    detectedAs: clamp(raw.detectedAs, 140, 'Phonetic or approximate spelling'),
    candidates,
  };
}

export function normalizeNearbySentenceResult(
  raw: Omit<Partial<NearbySentenceResult>, 'candidates'> & {
    candidates?: (Omit<Partial<NearbySentenceCandidate>, 'words'> & {
      words?: Partial<WordByWordItem>[];
    })[];
  },
  query: string,
): NearbySentenceResult {
  const rawCandidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  const seen = new Set<string>();
  const candidates: NearbySentenceCandidate[] = [];

  for (let i = 0; i < rawCandidates.length; i += 1) {
    const item = rawCandidates[i];
    const germanSentence = clamp(item?.germanSentence, 280);
    if (!germanSentence) continue;
    const dedupeKey = germanSentence.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rawWords = Array.isArray(item?.words) ? item.words : [];
    const words: WordByWordItem[] = rawWords
      .map((w): WordByWordItem | null => {
        const german = clamp(w?.german, 80);
        if (!german) return null;
        const cleanBase = stripArticleAndPunctuation(clamp(w?.baseForm, 80) || german);
        return {
          german,
          baseForm: cleanBase || german,
          article: sanitizeArticle(w?.article),
          devanagari: clamp(w?.devanagari, 100),
          english: clamp(w?.english, 120),
          hindi: clamp(w?.hindi, 120),
          role: clamp(w?.role, 80, 'Word'),
        };
      })
      .filter((w): w is WordByWordItem => Boolean(w))
      .slice(0, 35);

    candidates.push({
      germanSentence,
      confidence: sanitizeConfidence(item?.confidence, candidates.length),
      devanagariSentence: clamp(item?.devanagariSentence, 340),
      englishMeaning: clamp(item?.englishMeaning, 240),
      hindiMeaning: clamp(item?.hindiMeaning, 240),
      matchReason: clamp(item?.matchReason, 240),
      words,
    });

    if (candidates.length >= 3) break;
  }

  return {
    query: query.trim().slice(0, MAX_NEARBY_SENTENCE_INPUT),
    detectedAs: clamp(raw.detectedAs, 140, 'Approximate spoken or spelled German sentence'),
    candidates,
  };
}
