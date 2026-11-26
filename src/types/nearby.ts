import type { WordByWordItem } from './sentence';

export type NearbyMode = 'word' | 'sentence';
export type MatchConfidence = 'high' | 'medium' | 'possible';

export interface NearbyWordCandidate {
  germanWord: string;
  article: 'der' | 'die' | 'das' | '';
  partOfSpeech: string;
  confidence: MatchConfidence;
  devanagari: string;
  ipa: string;
  englishMeaning: string;
  hindiMeaning: string;
  matchReason: string;
  exampleGerman: string;
  exampleEnglish: string;
}

export interface NearbySentenceCandidate {
  germanSentence: string;
  confidence: MatchConfidence;
  devanagariSentence: string;
  englishMeaning: string;
  hindiMeaning: string;
  matchReason: string;
  words: WordByWordItem[];
}

export interface NearbyWordResult {
  query: string;
  detectedAs: string;
  candidates: NearbyWordCandidate[];
}

export interface NearbySentenceResult {
  query: string;
  detectedAs: string;
  candidates: NearbySentenceCandidate[];
}
