import type {
  ExerciseGradeResult,
  LessonExerciseQuestion,
  LessonQuizSummary,
  YoutubeA1Lesson,
  YoutubeCourseStageId,
  YoutubeLessonProgressRecord,
} from '../types/youtubeCourse';

export const YOUTUBE_A1_PLAYLIST_ID = 'PLF9mJC4RrjIhS4MMm0x72-qWEn1LRvPuW';
export const YOUTUBE_A1_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${YOUTUBE_A1_PLAYLIST_ID}`;
export const MAX_PERSONAL_NOTES_LENGTH = 4000;
export const MAX_PRACTICE_COUNT = 1000;

export type YoutubeLessonFilterMode =
  | 'all'
  | 'core-64'
  | 'incomplete'
  | 'completed'
  | 'with-notes';

export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&list=${YOUTUBE_A1_PLAYLIST_ID}`;
}

export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?list=${YOUTUBE_A1_PLAYLIST_ID}&rel=0`;
}

export function buildYoutubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function sanitizeLessonProgressRecord(
  lessonId: string,
  lessonNumber: number,
  raw: Partial<YoutubeLessonProgressRecord> | undefined,
): YoutubeLessonProgressRecord {
  const safeId = /^[a-zA-Z0-9_-]{1,64}$/.test(lessonId) ? lessonId : `lesson-${lessonNumber}`;
  const safeLessonNum = Math.max(1, Math.min(100, Math.round(lessonNumber || 1)));
  const rawScore = typeof raw?.bestExerciseScore === 'number' && Number.isFinite(raw.bestExerciseScore)
    ? raw.bestExerciseScore
    : 0;
  const rawPractice = typeof raw?.practiceCount === 'number' && Number.isFinite(raw.practiceCount)
    ? raw.practiceCount
    : 0;
  const rawNotes = typeof raw?.personalNotes === 'string' ? raw.personalNotes : '';
  const updatedAtMs =
    typeof raw?.updatedAtMs === 'number' && Number.isFinite(raw.updatedAtMs)
      ? raw.updatedAtMs
      : Date.now();

  return {
    lessonId: safeId,
    lessonNumber: safeLessonNum,
    completed: Boolean(raw?.completed),
    personalNotes: rawNotes.slice(0, MAX_PERSONAL_NOTES_LENGTH),
    bestExerciseScore: Math.max(0, Math.min(100, Math.round(rawScore))),
    practiceCount: Math.max(0, Math.min(MAX_PRACTICE_COUNT, Math.round(rawPractice))),
    updatedAtMs,
  };
}

export function mergeYoutubeProgressMaps(
  localMap: Record<string, YoutubeLessonProgressRecord>,
  cloudMap: Record<string, YoutubeLessonProgressRecord>,
): Record<string, YoutubeLessonProgressRecord> {
  const merged: Record<string, YoutubeLessonProgressRecord> = {};
  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(cloudMap)]);

  for (const key of allKeys) {
    const local = localMap[key];
    const cloud = cloudMap[key];
    if (local && !cloud) {
      merged[key] = sanitizeLessonProgressRecord(key, local.lessonNumber, local);
    } else if (cloud && !local) {
      merged[key] = sanitizeLessonProgressRecord(key, cloud.lessonNumber, cloud);
    } else if (local && cloud) {
      const preferCloudNotes =
        cloud.personalNotes.trim().length > 0 &&
        (cloud.updatedAtMs >= local.updatedAtMs || local.personalNotes.trim().length === 0);
      merged[key] = sanitizeLessonProgressRecord(key, Math.max(local.lessonNumber, cloud.lessonNumber), {
        completed: local.completed || cloud.completed,
        personalNotes: preferCloudNotes ? cloud.personalNotes : local.personalNotes,
        bestExerciseScore: Math.max(local.bestExerciseScore, cloud.bestExerciseScore),
        practiceCount: Math.max(local.practiceCount, cloud.practiceCount),
        updatedAtMs: Math.max(local.updatedAtMs, cloud.updatedAtMs),
      });
    }
  }

  return merged;
}

/**
 * Normalizes a learner's typed German answer so minor spacing, punctuation, or
 * ae/oe/ue/ss substitutions are tolerated cleanly during A1 exercises.
 */
export function normalizeGermanAnswer(input: string, foldUmlauts = false): string {
  let text = input
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'„“”()]/g, '')
    .replace(/\s+/g, ' ');

  if (foldUmlauts) {
    text = text
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  }

  return text;
}

export function isExerciseAnswerCorrect(
  question: LessonExerciseQuestion,
  rawUserAnswer: string,
): boolean {
  const userNorm = normalizeGermanAnswer(rawUserAnswer, false);
  if (!userNorm) return false;

  const validTargets = [question.correctAnswer, ...(question.acceptedAnswers ?? [])];
  for (const target of validTargets) {
    if (userNorm === normalizeGermanAnswer(target, false)) {
      return true;
    }
    if (question.type === 'fill') {
      if (normalizeGermanAnswer(rawUserAnswer, true) === normalizeGermanAnswer(target, true)) {
        return true;
      }
    }
  }
  return false;
}

export function gradeLessonExercises(
  questions: LessonExerciseQuestion[],
  answers: Record<string, string>,
): LessonQuizSummary {
  const results: ExerciseGradeResult[] = questions.map((q) => {
    const userAnswer = answers[q.id] ?? '';
    return {
      questionId: q.id,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect: isExerciseAnswerCorrect(q, userAnswer),
      explanation: q.explanation,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = questions.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return {
    correctCount,
    totalCount,
    percentage,
    passed: percentage >= 60,
    results,
  };
}

export function filterYoutubeLessons(
  lessons: YoutubeA1Lesson[],
  options: {
    query: string;
    stageId: YoutubeCourseStageId | 'all';
    mode: YoutubeLessonFilterMode;
    progressMap: Record<string, YoutubeLessonProgressRecord>;
  },
): YoutubeA1Lesson[] {
  const q = options.query.trim().toLowerCase();

  return lessons.filter((lesson) => {
    if (options.stageId !== 'all' && lesson.stageId !== options.stageId) {
      return false;
    }

    const prog = options.progressMap[lesson.id];
    if (options.mode === 'core-64' && lesson.isBonus) return false;
    if (options.mode === 'completed' && !prog?.completed) return false;
    if (options.mode === 'incomplete' && prog?.completed) return false;
    if (options.mode === 'with-notes' && !(prog?.personalNotes && prog.personalNotes.trim().length > 0)) {
      return false;
    }

    if (!q) return true;

    const lessonNumStr = String(lesson.lessonNumber);
    const haystack = [
      lessonNumStr,
      `lesson ${lessonNumStr}`,
      lesson.shortTitle,
      lesson.germanTopic,
      lesson.youtubeTitle,
      lesson.summary,
      lesson.keyFormula,
      ...lesson.vocabulary.map((v) => `${v.german} ${v.english} ${v.hindi}`),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function formatLessonNotebookExport(
  lesson: YoutubeA1Lesson,
  progress?: YoutubeLessonProgressRecord,
): string {
  const lines: string[] = [
    `Learn German A1 — Lesson ${lesson.lessonNumber}: ${lesson.shortTitle} (${lesson.germanTopic})`,
    `Video: ${buildYoutubeWatchUrl(lesson.videoId)} (${lesson.duration})`,
    '',
    `SUMMARY: ${lesson.summary}`,
    `KEY FORMULA: ${lesson.keyFormula}`,
    '',
    'NOTES:',
    ...lesson.notes.map((n, idx) =>
      `${idx + 1}. ${n.heading}: ${n.explanation}${n.hindiTip ? ` [Hindi Tip: ${n.hindiTip}]` : ''}`,
    ),
    '',
    'KEY VOCABULARY & PHRASES:',
    ...lesson.vocabulary.map(
      (v) => `• ${v.german} (${v.devanagari}) = ${v.english} | ${v.hindi}${v.note ? ` — ${v.note}` : ''}`,
    ),
    '',
    `COMMON MISTAKE TO AVOID: ${lesson.commonMistake}`,
    '',
    'PRACTICE DIALOGUE:',
    ...lesson.practiceDialogue.map(
      (d) => `${d.speaker}: ${d.german} (${d.devanagari}) — ${d.english} / ${d.hindi}`,
    ),
  ];

  if (progress?.personalNotes?.trim()) {
    lines.push('', 'MY PERSONAL NOTES:', progress.personalNotes.trim());
  }

  return lines.join('\n');
}
