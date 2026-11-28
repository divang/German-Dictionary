export type PronunciationRating = 'excellent' | 'good' | 'fair' | 'needs-practice';

export interface PronunciationCorrectionItem {
  segment: string;
  issue: string;
  howToFix: string;
  hindiTip: string;
}

export interface PronunciationCheckFeedback {
  targetText: string;
  accuracyScore: number; // 0 - 100
  rating: PronunciationRating;
  heardText: string;
  heardDevanagari: string;
  summaryEnglish: string;
  summaryHindi: string;
  strengths: string[];
  corrections: PronunciationCorrectionItem[];
  retryTip: string;
}

export interface PronunciationCheckTarget {
  text: string;
  displayLabel?: string;
  devanagari?: string;
  ipa?: string;
}

export interface PronunciationAttemptRecord {
  id: string;
  timestampMs: number;
  feedback: PronunciationCheckFeedback;
  audioUrl: string | null;
}
