import type {
  SentenceTone,
  SentenceTranslationResult,
  WordByWordItem,
} from '../types/sentence';

export const MAX_SENTENCE_INPUT_LENGTH = 260;
export const MAX_SENTENCE_HISTORY = 25;

const VALID_ARTICLES = new Set(['', 'der', 'die', 'das']);

export const PRESET_ENGLISH_SENTENCES: string[] = [
  'Where is the train station?',
  'I would like a cup of coffee, please.',
  'How much does this bread cost?',
  'Can you please speak slowly?',
  'I need to go to the hospital.',
  'My name is Priya and I am learning German.',
];

export const INITIAL_SAMPLE_TRANSLATION: SentenceTranslationResult = {
  id: 'sample-where-is-train-station',
  englishInput: 'Where is the train station?',
  tone: 'polite',
  germanSentence: 'Wo ist der Bahnhof?',
  devanagariSentence: 'वो इस्ट डेअ बान-होफ़?',
  hindiSentence: 'रेलवे स्टेशन कहाँ है?',
  cefr: 'A1',
  grammarTip:
    'Simple German question order: question word (Wo) comes first, the verb (ist) is always in position 2, followed by the noun with its article (der Bahnhof).',
  words: [
    {
      german: 'Wo',
      baseForm: 'wo',
      article: '',
      devanagari: 'वो',
      english: 'where',
      hindi: 'कहाँ',
      role: 'Question word',
    },
    {
      german: 'ist',
      baseForm: 'sein',
      article: '',
      devanagari: 'इस्ट',
      english: 'is',
      hindi: 'है',
      role: 'Verb (3rd person of sein)',
    },
    {
      german: 'der',
      baseForm: 'der',
      article: '',
      devanagari: 'डेअ',
      english: 'the (masculine)',
      hindi: 'यह / वह (पुल्लिंग)',
      role: 'Masculine article',
    },
    {
      german: 'Bahnhof',
      baseForm: 'Bahnhof',
      article: 'der',
      devanagari: 'बान-होफ़',
      english: 'train station',
      hindi: 'रेलवे स्टेशन',
      role: 'Masculine noun',
    },
  ],
  createdAtMs: 1730000000000,
};

export function validateEnglishSentenceInput(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) {
    return 'Please type an English sentence to translate into simple German.';
  }
  if (cleaned.length < 2) {
    return 'Please enter at least a short word or sentence (2+ characters).';
  }
  if (cleaned.length > MAX_SENTENCE_INPUT_LENGTH) {
    return `Please keep your sentence under ${MAX_SENTENCE_INPUT_LENGTH} characters.`;
  }
  return null;
}

/**
 * Strips leading German articles (der/die/das) and surrounding punctuation so individual
 * word audio playback or dictionary lookup always receives the clean bare German word.
 */
export function stripArticleAndPunctuation(raw: string): string {
  return raw
    .trim()
    .replace(/^(der|die|das)\s+/i, '')
    .replace(/^[.,!?;:"'„“()[\]]+|[.,!?;:"'„“()[\]]+$/g, '')
    .trim();
}

function clampText(raw: unknown, maxLen: number, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  return raw.trim().slice(0, maxLen);
}

function sanitizeArticle(raw: unknown): 'der' | 'die' | 'das' | '' {
  if (typeof raw === 'string' && VALID_ARTICLES.has(raw.trim().toLowerCase())) {
    return raw.trim().toLowerCase() as 'der' | 'die' | 'das' | '';
  }
  return '';
}

export function normalizeSentenceTranslation(
  raw: Partial<SentenceTranslationResult> & { words?: Partial<WordByWordItem>[] },
  englishInput: string,
  tone: SentenceTone,
  nowMs = Date.now(),
): SentenceTranslationResult {
  const cleanedInput = englishInput.trim().slice(0, MAX_SENTENCE_INPUT_LENGTH);
  const germanSentence = clampText(raw.germanSentence, 320);
  const devanagariSentence = clampText(raw.devanagariSentence, 380);
  const hindiSentence = clampText(raw.hindiSentence, 320);
  const cefr: 'A1' | 'A2' = raw.cefr === 'A2' ? 'A2' : 'A1';
  const grammarTip = clampText(
    raw.grammarTip,
    360,
    'In simple German statements, the conjugated verb stays in the second position.',
  );

  const rawWords = Array.isArray(raw.words) ? raw.words : [];
  const words: WordByWordItem[] = rawWords
    .map((item): WordByWordItem | null => {
      const german = clampText(item?.german, 80);
      if (!german) return null;
      const cleanBase = stripArticleAndPunctuation(
        clampText(item?.baseForm, 80) || german,
      );
      return {
        german,
        baseForm: cleanBase || german,
        article: sanitizeArticle(item?.article),
        devanagari: clampText(item?.devanagari, 100),
        english: clampText(item?.english, 120),
        hindi: clampText(item?.hindi, 120),
        role: clampText(item?.role, 80, 'Word'),
      };
    })
    .filter((w): w is WordByWordItem => Boolean(w))
    .slice(0, 40);

  const slugKey = cleanedInput
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return {
    id: `sent-${tone}-${slugKey || nowMs}`,
    englishInput: cleanedInput,
    tone,
    germanSentence,
    devanagariSentence,
    hindiSentence,
    cefr,
    grammarTip,
    words,
    createdAtMs: nowMs,
  };
}

export function upsertSentenceHistory(
  list: SentenceTranslationResult[],
  item: SentenceTranslationResult,
  maxItems = MAX_SENTENCE_HISTORY,
): SentenceTranslationResult[] {
  const normalizedKey = `${item.tone}::${item.englishInput.trim().toLowerCase()}`;
  const filtered = list.filter(
    (existing) => `${existing.tone}::${existing.englishInput.trim().toLowerCase()}` !== normalizedKey,
  );
  return [item, ...filtered].slice(0, maxItems);
}
