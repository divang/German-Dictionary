export type SentenceTone = 'polite' | 'casual';

export interface WordByWordItem {
  german: string;
  baseForm: string;
  article: 'der' | 'die' | 'das' | '';
  devanagari: string;
  english: string;
  hindi: string;
  role: string;
}

export interface SentenceTranslationResult {
  id: string;
  englishInput: string;
  tone: SentenceTone;
  germanSentence: string;
  devanagariSentence: string;
  hindiSentence: string;
  cefr: 'A1' | 'A2';
  grammarTip: string;
  words: WordByWordItem[];
  createdAtMs: number;
}
