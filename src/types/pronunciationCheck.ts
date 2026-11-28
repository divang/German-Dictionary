export type PronunciationRating = 'excellent' | 'good' | 'fair' | 'needs-practice';

export type ChunkPartRole = 'prefix' | 'root' | 'infix' | 'suffix' | 'syllable' | 'word';

export type ChunkAccuracyStatus = 'pending' | 'correct' | 'close' | 'needs-work';

export interface PronunciationCorrectionItem {
  segment: string;
  issue: string;
  howToFix: string;
  hindiTip: string;
}

export interface PronunciationWordChunk {
  /** Display chunk text, e.g. "Fri-", "-s-", "-eu-", "-r" */
  chunk: string;
  /** Clean pronounceable German text for TTS & chunk evaluation */
  speakText: string;
  /** Morphological or phonetic position label */
  role: ChunkPartRole;
  /** Accuracy status for this exact piece */
  status: ChunkAccuracyStatus;
  /** Per-chunk accuracy 0-100 (null before evaluation) */
  score: number | null;
  /** Target sound in Devanagari for Hindi speakers */
  targetDevanagari: string;
  /** What the coach actually heard for this chunk */
  heardAs: string;
  /** Concrete teacher coaching hint in English */
  teacherHint: string;
  /** Practical Hindi sound/mouth coaching cue */
  hindiCoachCue: string;
  /** Explicit phonetic / letter-by-letter spell-out prompt when stuck */
  spellOutCue: string;
}

export interface TeacherStepGuidance {
  /** True when the teacher recommends breaking the word down and drilling a chunk */
  shouldBreakDown: boolean;
  /** Warm human-teacher coaching message acknowledging attempts & progress */
  teacherMessage: string;
  /** Natural Hindi teacher encouragement & direction */
  teacherMessageHindi: string;
  /** 0-based index into wordBreakdown for the highest-priority chunk to drill first */
  recommendedChunkIndex: number;
  /** Explicit step-by-step phonetic spelling cue (e.g. "Fri (फ़्री) + s (ज़) + eu (यॉ/ओ) + r (अ)") */
  spellingPrompt: string;
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
  wordBreakdown: PronunciationWordChunk[];
  teacherGuidance?: TeacherStepGuidance;
  /** Set when this evaluation was for an isolated prefix/infix/suffix chunk */
  practicedChunk?: string;
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
  /** Null for full-word attempts, or chunk string when drilling a single part */
  practicedChunk?: string | null;
}
