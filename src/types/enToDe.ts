export interface EnglishToGermanMatch {
  germanWord: string;
  article: 'der' | 'die' | 'das' | '';
  partOfSpeech: string;
  cefr: string;
  devanagari: string;
  ipa: string;
  nuance: string;
  hindiMeaning: string;
  exampleGerman: string;
  exampleEnglish: string;
}

export interface EnglishToGermanResult {
  englishQuery: string;
  hindiGloss: string;
  source: 'ai' | 'dictionary' | 'sample';
  matches: EnglishToGermanMatch[];
}

export interface EnglishSuggestItem {
  english: string;
  topGerman: string;
  article: string;
  devanagariPreview: string;
}
