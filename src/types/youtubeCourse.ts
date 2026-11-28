export type YoutubeCourseStageId =
  | 'stage-1'
  | 'stage-2'
  | 'stage-3'
  | 'stage-4'
  | 'stage-5'
  | 'stage-6'
  | 'stage-7'
  | 'stage-8';

export interface YoutubeCourseStage {
  id: YoutubeCourseStageId;
  title: string;
  subtitle: string;
  lessonRange: string;
}

export interface LessonNotePoint {
  heading: string;
  explanation: string;
  hindiTip?: string;
}

export interface LessonVocabItem {
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
  note?: string;
}

export interface LessonPracticeLine {
  speaker: string;
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
}

export interface LessonExerciseQuestion {
  id: string;
  type: 'mcq' | 'fill';
  prompt: string;
  hint?: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
}

export interface YoutubeA1Lesson {
  id: string;
  lessonNumber: number;
  isBonus?: boolean;
  stageId: YoutubeCourseStageId;
  videoId: string;
  duration: string;
  youtubeTitle: string;
  shortTitle: string;
  germanTopic: string;
  summary: string;
  keyFormula: string;
  notes: LessonNotePoint[];
  vocabulary: LessonVocabItem[];
  commonMistake: string;
  practiceDialogue: LessonPracticeLine[];
  exercises: LessonExerciseQuestion[];
}

export interface YoutubeLessonProgressRecord {
  lessonId: string;
  lessonNumber: number;
  completed: boolean;
  personalNotes: string;
  bestExerciseScore: number;
  practiceCount: number;
  updatedAtMs: number;
}

export interface ExerciseGradeResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface LessonQuizSummary {
  correctCount: number;
  totalCount: number;
  percentage: number;
  passed: boolean;
  results: ExerciseGradeResult[];
}
