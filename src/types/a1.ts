export type A1WorkspaceTab =
  | 'modules'
  | 'hoeren'
  | 'lesen'
  | 'schreiben'
  | 'sprechen'
  | 'mock-exam';

export interface A1VocabItem {
  id: string;
  german: string;
  article?: 'der' | 'die' | 'das' | '';
  devanagari: string;
  ipa: string;
  english: string;
  hindi: string;
  exampleGerman: string;
  exampleHindi: string;
}

export interface A1DialogueLine {
  speaker: string;
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
}

export interface A1QuizQuestion {
  id: string;
  prompt: string;
  hindiHint?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface A1Module {
  id: string;
  number: number;
  germanTitle: string;
  englishTitle: string;
  hindiTitle: string;
  estimatedMinutes: number;
  canDoStatement: string;
  grammarTitle: string;
  grammarExplanation: string;
  hindiComparison: string;
  grammarExamples: {
    german: string;
    devanagari: string;
    english: string;
    hindi: string;
  }[];
  vocabulary: A1VocabItem[];
  dialogueTitle: string;
  dialogue: A1DialogueLine[];
  checkpoint: A1QuizQuestion[];
}

export interface A1ListeningTask {
  id: string;
  partLabel: string;
  title: string;
  situation: string;
  audioScript: string;
  devanagariScript: string;
  hindiTranslation: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface A1ReadingTask {
  id: string;
  partLabel: string;
  title: string;
  textType: string;
  germanText: string;
  hindiSummary: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface A1WritingPrompt {
  id: string;
  title: string;
  scenario: string;
  hindiScenario: string;
  bulletPoints: string[];
  modelAnswer: string;
  modelDevanagari: string;
}

export interface A1WritingEvaluation {
  totalScore: number;
  maxScore: number;
  passed: boolean;
  taskCompletion: number;
  grammarAndVocab: number;
  structure: number;
  correctedGerman: string;
  feedbackEnglish: string;
  feedbackHindi: string;
  strengths: string[];
  improvements: string[];
}

export interface A1SpeakingCard {
  id: string;
  part: 'teil-2' | 'teil-3';
  topic: string;
  keyword: string;
  hindiMeaning: string;
  sampleQuestion: string;
  sampleQuestionDevanagari: string;
  sampleAnswer: string;
  sampleAnswerDevanagari: string;
}

export interface A1MockQuestion {
  id: string;
  section: 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';
  sectionLabel: string;
  points: number;
  audioScript?: string;
  readingPassage?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface A1SectionScores {
  hoeren: number;
  lesen: number;
  schreiben: number;
  sprechen: number;
}

export interface A1ExamAttempt {
  id: string;
  ownerId: string;
  examType: 'mock-full' | 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';
  status: 'completed';
  score: number;
  maxScore: number;
  passed: boolean;
  sectionScores: A1SectionScores;
  createdAtMs: number;
}

export interface A1UserProgress {
  completedLessonIds: string[];
  masteredVocabIds: string[];
  lastActiveModuleId: string;
  lastActiveTab: A1WorkspaceTab;
  bestMockScore: number;
  totalMockAttempts: number;
}

export interface SelfIntroProfile {
  name: string;
  age: string;
  country: string;
  city: string;
  languages: string;
  profession: string;
  hobby: string;
}
