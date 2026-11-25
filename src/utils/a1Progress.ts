import type {
  A1MockQuestion,
  A1SectionScores,
  A1UserProgress,
  A1WorkspaceTab,
  SelfIntroProfile,
} from '../types/a1';
import { transliterateGermanToDevanagari } from './germanPhonetics';

export const VALID_A1_TABS: readonly A1WorkspaceTab[] = [
  'modules',
  'hoeren',
  'lesen',
  'schreiben',
  'sprechen',
  'mock-exam',
];

export const MAX_COMPLETED_LESSONS = 50;
export const MAX_MASTERED_VOCAB = 200;
export const MAX_SAVED_WORDS = 100;
export const GOETHE_A1_PASS_PERCENT = 60;

export const DEFAULT_A1_PROGRESS: A1UserProgress = {
  completedLessonIds: [],
  masteredVocabIds: [],
  lastActiveModuleId: 'a1-m1',
  lastActiveTab: 'modules',
  bestMockScore: 0,
  totalMockAttempts: 0,
};

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

/**
 * Sanitizes string ID lists to adhere strictly to firebase-blueprint.json bounds.
 */
export function sanitizeIdList(ids: readonly string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed || !SAFE_ID_PATTERN.test(trimmed)) continue;
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}

export function sanitizeModuleId(moduleId: string | undefined): string {
  const trimmed = (moduleId ?? '').trim();
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_A1_PROGRESS.lastActiveModuleId;
}

export function sanitizeA1Tab(tab: string | undefined): A1WorkspaceTab {
  if (tab && (VALID_A1_TABS as readonly string[]).includes(tab)) {
    return tab as A1WorkspaceTab;
  }
  return 'modules';
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Merges local browser progress with cloud Firestore progress cleanly when a learner
 * signs in from a new device so no completed modules, mastered words, or high scores are lost.
 */
export function mergeA1Progress(
  local: A1UserProgress,
  cloud: Partial<A1UserProgress>,
): A1UserProgress {
  const completedLessonIds = sanitizeIdList(
    [...(cloud.completedLessonIds ?? []), ...local.completedLessonIds],
    MAX_COMPLETED_LESSONS,
  );
  const masteredVocabIds = sanitizeIdList(
    [...(cloud.masteredVocabIds ?? []), ...local.masteredVocabIds],
    MAX_MASTERED_VOCAB,
  );

  return {
    completedLessonIds,
    masteredVocabIds,
    lastActiveModuleId: sanitizeModuleId(cloud.lastActiveModuleId || local.lastActiveModuleId),
    lastActiveTab: sanitizeA1Tab(cloud.lastActiveTab || local.lastActiveTab),
    bestMockScore: clampNumber(
      Math.max(local.bestMockScore || 0, cloud.bestMockScore || 0),
      0,
      100,
    ),
    totalMockAttempts: clampNumber(
      Math.max(local.totalMockAttempts || 0, cloud.totalMockAttempts || 0),
      0,
      1000,
    ),
  };
}

export function toggleListId(list: readonly string[], id: string, maxItems: number): string[] {
  if (list.includes(id)) {
    return list.filter((item) => item !== id);
  }
  return sanitizeIdList([...list, id], maxItems);
}

export interface A1ReadinessSummary {
  overallPercent: number;
  modulesCompleted: number;
  totalModules: number;
  vocabMastered: number;
  totalVocab: number;
  bestMockScore: number;
  examReady: boolean;
}

/**
 * Calculates overall Goethe-Zertifikat A1 readiness:
 * 45% modules completed + 35% core A1 vocabulary mastered + 20% best mock exam score.
 */
export function calculateA1Readiness(
  progress: A1UserProgress,
  totalModules: number,
  totalVocab: number,
): A1ReadinessSummary {
  const safeTotalModules = Math.max(1, totalModules);
  const safeTotalVocab = Math.max(1, totalVocab);
  const modulesCompleted = Math.min(progress.completedLessonIds.length, safeTotalModules);
  const vocabMastered = Math.min(progress.masteredVocabIds.length, safeTotalVocab);
  const bestMockScore = clampNumber(progress.bestMockScore, 0, 100);

  const modulePart = (modulesCompleted / safeTotalModules) * 45;
  const vocabPart = (vocabMastered / safeTotalVocab) * 35;
  const mockPart = (bestMockScore / 100) * 20;
  const overallPercent = clampNumber(modulePart + vocabPart + mockPart, 0, 100);

  return {
    overallPercent,
    modulesCompleted,
    totalModules: safeTotalModules,
    vocabMastered,
    totalVocab: safeTotalVocab,
    bestMockScore,
    examReady: bestMockScore >= GOETHE_A1_PASS_PERCENT && modulesCompleted >= Math.ceil(safeTotalModules * 0.75),
  };
}

export interface MockExamGradeResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  sectionScores: A1SectionScores;
  correctCount: number;
  totalQuestions: number;
}

export function gradeA1MockExam(
  questions: readonly A1MockQuestion[],
  answers: Record<string, number>,
): MockExamGradeResult {
  const sectionScores: A1SectionScores = {
    hoeren: 0,
    lesen: 0,
    schreiben: 0,
    sprechen: 0,
  };
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const q of questions) {
    maxScore += q.points;
    if (answers[q.id] === q.correctIndex) {
      score += q.points;
      correctCount += 1;
      sectionScores[q.section] = clampNumber(sectionScores[q.section] + q.points, 0, 25);
    }
  }

  const safeMax = Math.max(1, maxScore);
  const percent = clampNumber((score / safeMax) * 100, 0, 100);

  return {
    score: clampNumber(score, 0, 100),
    maxScore: clampNumber(safeMax, 1, 100),
    percent,
    passed: percent >= GOETHE_A1_PASS_PERCENT,
    sectionScores,
    correctCount,
    totalQuestions: questions.length,
  };
}

export interface SelfIntroLine {
  label: string;
  german: string;
  devanagari: string;
  hindi: string;
}

/**
 * Generates an authentic Goethe-Zertifikat A1 Sprechen Teil 1 ("Sich vorstellen") script
 * tailored to the learner's profile with Devanagari pronunciation cues.
 */
export function buildSelfIntroScript(profile: SelfIntroProfile): SelfIntroLine[] {
  const name = profile.name.trim() || 'Aarav Sharma';
  const age = profile.age.trim() || '26';
  const country = profile.country.trim() || 'Indien';
  const city = profile.city.trim() || 'Delhi';
  const languages = profile.languages.trim() || 'Hindi, Englisch und ein bisschen Deutsch';
  const profession = profile.profession.trim() || 'Softwareentwickler';
  const hobby = profile.hobby.trim() || 'Musik hören und reisen';

  const rawLines: { label: string; german: string; hindi: string }[] = [
    {
      label: 'Name',
      german: `Hallo, ich heiße ${name}.`,
      hindi: `नमस्ते, मेरा नाम ${name} है।`,
    },
    {
      label: 'Alter (Age)',
      german: `Ich bin ${age} Jahre alt.`,
      hindi: `मेरी उम्र ${age} साल है।`,
    },
    {
      label: 'Land (Country)',
      german: `Ich komme aus ${country}.`,
      hindi: `मैं ${country} से हूँ।`,
    },
    {
      label: 'Wohnort (City)',
      german: `Ich wohne in ${city}.`,
      hindi: `मैं ${city} में रहता/रहती हूँ।`,
    },
    {
      label: 'Sprachen (Languages)',
      german: `Ich spreche ${languages}.`,
      hindi: `मैं ${languages} बोलता/बोलती हूँ।`,
    },
    {
      label: 'Beruf (Profession)',
      german: `Von Beruf bin ich ${profession}.`,
      hindi: `पेशे से मैं ${profession} हूँ।`,
    },
    {
      label: 'Hobbys (Hobbies)',
      german: `Meine Hobbys sind ${hobby}.`,
      hindi: `मेरे शौक ${hobby} हैं।`,
    },
  ];

  return rawLines.map((line) => ({
    ...line,
    devanagari: transliterateGermanToDevanagari(line.german),
  }));
}
