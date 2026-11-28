export type BasicsSubTab =
  | 'alphabet'
  | 'pronunciation'
  | 'numbers'
  | 'weekdays'
  | 'calendar'
  | 'pronouns'
  | 'pos'
  | 'questions';

export interface BasicsExampleWord {
  word: string;
  article?: 'der' | 'die' | 'das' | '';
  devanagari: string;
  english: string;
  hindi?: string;
  sentenceGerman: string;
  sentenceEnglish: string;
  source?: 'curated' | 'corpus';
}

export interface AlphabetLetterEntry {
  letter: string;
  displayPair: string; // e.g. "A a" or "ß"
  nameGerman: string; // e.g. "Ah", "Fau", "Eszett"
  spokenLetterPrompt: string; // German text for clean letter-name TTS
  devanagariName: string;
  ipa: string;
  soundSummary: string;
  hindiTip: string;
  examples: BasicsExampleWord[];
}

export interface PronunciationRuleItem {
  id: string;
  pattern: string; // e.g. "ie", "ei / ai", "au", "eu / äu"
  soundsLike: string; // e.g. "Long E (ई)"
  devanagari: string;
  ipa: string;
  category: 'vowels' | 'consonants' | 'length';
  ruleExplanation: string;
  hindiTrick: string;
  examples: {
    word: string;
    article?: 'der' | 'die' | 'das' | '';
    devanagari: string;
    english: string;
  }[];
  sentenceGerman: string;
  sentenceEnglish: string;
}

export interface NumberEntry {
  value: number;
  german: string;
  devanagari: string;
  hindiNumeral?: string;
  group: '0-20' | 'tens' | 'compounds' | 'large';
  note?: string;
  sentenceGerman: string;
  sentenceEnglish: string;
}

export interface CalendarTimeEntry {
  german: string;
  article?: 'der' | 'die' | 'das' | '';
  devanagari: string;
  english: string;
  hindi: string;
  shortForm?: string;
  group?: 'month' | 'season' | 'weekday' | 'time-word';
  sentenceGerman: string;
  sentenceEnglish: string;
}

export type PronounCategory =
  | 'nominative'
  | 'accusative'
  | 'dative'
  | 'possessive'
  | 'other';

export interface PronounEntry {
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
  category: PronounCategory;
  note: string;
  sentenceGerman: string;
  sentenceEnglish: string;
  sentenceHindi: string;
}

export interface PartOfSpeechGuide {
  id: string;
  nameEnglish: string;
  nameGerman: string;
  devanagari: string;
  summary: string;
  keyTechniques: string[];
  examples: {
    german: string;
    article?: 'der' | 'die' | 'das' | '';
    devanagari: string;
    english: string;
    hindi: string;
    sentenceGerman: string;
    sentenceEnglish: string;
  }[];
}

export interface QuestionWordEntry {
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
  usageTip: string;
  sentenceGerman: string;
  sentenceEnglish: string;
  sentenceHindi: string;
}
