import type { EnglishToGermanMatch, EnglishToGermanResult } from '../types/enToDe';
import { stripArticleAndPunctuation } from './sentenceTranslator';

export const MAX_EN_TO_DE_INPUT = 80;

export function validateEnglishWordInput(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) {
    return 'Enter an English word or short phrase first (e.g. "water bottle", "bedroom", or "thank you").';
  }
  if (cleaned.length < 2) {
    return 'Type at least 2 letters so we can find the best German word matches.';
  }
  if (cleaned.length > MAX_EN_TO_DE_INPUT) {
    return `Keep the English lookup under ${MAX_EN_TO_DE_INPUT} characters (for full sentences, use the Sentences tab).`;
  }
  return null;
}

const VALID_ARTICLES = new Set(['der', 'die', 'das']);

export function normalizeEnglishToGermanResult(
  raw: Omit<Partial<EnglishToGermanResult>, 'matches'> & {
    matches?: Partial<EnglishToGermanMatch>[];
  },
  englishQuery: string,
  source: 'ai' | 'dictionary' | 'sample' = 'ai',
): EnglishToGermanResult {
  const seen = new Set<string>();
  const matches: EnglishToGermanMatch[] = [];

  for (const item of Array.isArray(raw.matches) ? raw.matches : []) {
    const rawWord = String(item?.germanWord ?? '').trim();
    const bareWord = (stripArticleAndPunctuation(rawWord) || rawWord).slice(0, 80);
    if (!bareWord) continue;

    const dedupeKey = bareWord.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rawArt = String(item?.article ?? '')
      .trim()
      .toLowerCase();
    const article = VALID_ARTICLES.has(rawArt) ? (rawArt as 'der' | 'die' | 'das') : '';

    matches.push({
      germanWord: bareWord,
      article,
      partOfSpeech: String(item?.partOfSpeech ?? (article ? 'Noun' : 'German word'))
        .trim()
        .slice(0, 48),
      cefr: String(item?.cefr ?? 'A1')
        .trim()
        .slice(0, 8),
      devanagari: String(item?.devanagari ?? '')
        .trim()
        .slice(0, 100),
      ipa: String(item?.ipa ?? '')
        .trim()
        .slice(0, 80),
      nuance: String(item?.nuance ?? 'Everyday German translation')
        .trim()
        .slice(0, 180),
      hindiMeaning: String(item?.hindiMeaning ?? '')
        .trim()
        .slice(0, 140),
      exampleGerman: String(item?.exampleGerman ?? '')
        .trim()
        .slice(0, 220),
      exampleEnglish: String(item?.exampleEnglish ?? '')
        .trim()
        .slice(0, 220),
    });

    if (matches.length >= 6) break;
  }

  return {
    englishQuery: englishQuery.trim(),
    hindiGloss: String(raw.hindiGloss ?? '')
      .trim()
      .slice(0, 140),
    source,
    matches,
  };
}

export const PRESET_ENGLISH_WORDS: string[] = [
  'water bottle',
  'bedroom',
  'hospital',
  'train station',
  'pharmacy',
  'to sleep',
  'breakfast',
  'thank you',
];

export const INITIAL_SAMPLE_EN_TO_DE: EnglishToGermanResult = {
  englishQuery: 'water bottle',
  hindiGloss: 'पानी की बोतल',
  source: 'sample',
  matches: [
    {
      germanWord: 'Wasserflasche',
      article: 'die',
      partOfSpeech: 'Feminine noun',
      cefr: 'A1',
      devanagari: 'वासर-फ़्लाशे',
      ipa: '/ˈvasɐˌflaʃə/',
      nuance: 'Most common everyday word (compound: Wasser + Flasche)',
      hindiMeaning: 'पानी की बोतल',
      exampleGerman: 'Ich habe meine Wasserflasche dabei.',
      exampleEnglish: 'I have my water bottle with me.',
    },
    {
      germanWord: 'Trinkflasche',
      article: 'die',
      partOfSpeech: 'Feminine noun',
      cefr: 'A2',
      devanagari: 'ट्रिंक-फ़्लाशे',
      ipa: '/ˈtʁɪŋkˌflaʃə/',
      nuance: 'Reusable sports or school drinking bottle (trinken + Flasche)',
      hindiMeaning: 'पीने की बोतल, स्पोर्ट्स बॉटल',
      exampleGerman: 'Die Kinder nehmen eine Trinkflasche mit in die Schule.',
      exampleEnglish: 'The children take a drinking bottle to school.',
    },
    {
      germanWord: 'Flasche Wasser',
      article: '',
      partOfSpeech: 'Everyday phrase',
      cefr: 'A1',
      devanagari: 'फ़्लाशे वासर',
      ipa: '/ˈflaʃə ˈvasɐ/',
      nuance: 'Used when ordering a bottle of water at a restaurant or shop',
      hindiMeaning: 'एक बोतल पानी',
      exampleGerman: 'Eine Flasche Wasser, bitte.',
      exampleEnglish: 'A bottle of water, please.',
    },
  ],
};
