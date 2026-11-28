export type WordCategory = 'all' | 'umlauts' | 'ch-r' | 'loanwords' | 'everyday';

export type SoundDifficulty = 'hindi-match' | 'subtle-shift' | 'new-sound';

export type LipShape = 'tight-circle' | 'rounded' | 'spread' | 'neutral' | 'open';

export type TonguePosition =
  | 'front-high'
  | 'front-mid'
  | 'central'
  | 'back-throat'
  | 'alveolar-buzz'
  | 'teeth-lip';

export interface ArticulationGuide {
  lipShape: LipShape;
  lipLabel: string;
  tonguePosition: TonguePosition;
  tongueLabel: string;
  hindiAnchor: string;
  targetIpa: string;
}

export interface SyllableBreakdown {
  id: string;
  segment: string;
  devanagari: string;
  romanized: string;
  ipa: string;
  stressed: boolean;
  difficulty: SoundDifficulty;
  explanation: string;
  mouthSteps?: string[];
  quickShortcut?: string;
  articulation: ArticulationGuide;
}

export interface ExampleSentence {
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
}

export interface CollocationItem {
  german: string;
  devanagari: string;
  english: string;
  article?: string;
}

export interface DictionarySuggestion {
  word: string;
  article: string;
  pos: string;
  english: string;
  devanagariPreview: string;
  isCurated?: boolean;
  curatedId?: string;
}

export interface WordFormationPart {
  german: string;
  article?: 'der' | 'die' | 'das' | '';
  genderLabel?: string;
  meaning: string;
  hindiMeaning?: string;
  devanagari?: string;
  role?: string;
  speakable: boolean;
}

export interface WordFormation {
  isCompoundOrDerived: boolean;
  formulaText: string;
  explanation: string;
  parts: WordFormationPart[];
}

export interface DictionaryEntry {
  id: string;
  word: string;
  article?: 'der' | 'die' | 'das' | '';
  partOfSpeech: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  englishMeaning: string;
  hindiMeaning: string;
  devanagariFull: string;
  romanizedFull: string;
  ipa: string;
  stressSummary: string;
  originNote: string;
  categories: Exclude<WordCategory, 'all'>[];
  syllables: SyllableBreakdown[];
  example: ExampleSentence;
  examples?: ExampleSentence[];
  collocations?: CollocationItem[];
  wordFormation?: WordFormation;
  matchedQuery?: string;
  source?: 'curated' | 'dictionary' | 'live';
}

export interface SoundRule {
  id: string;
  symbol: string;
  title: string;
  ipa: string;
  hindiApprox: string;
  difficulty: SoundDifficulty;
  summary: string;
  steps: string[];
  shortcut: string;
  commonMistake: string;
  exampleWordIds: string[];
}

export interface SearchedWordRecord {
  id: string;
  word: string;
  article: 'der' | 'die' | 'das' | '';
  partOfSpeech: string;
  cefr: string;
  englishMeaning: string;
  hindiMeaning: string;
  devanagariFull: string;
  ipa: string;
  searchCount: number;
  createdAtMs: number;
  lastSearchedAtMs: number;
}

