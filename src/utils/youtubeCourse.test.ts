import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_A1_LESSON_COUNT,
  YOUTUBE_A1_LESSONS,
  YOUTUBE_COURSE_STAGES,
} from '../data/youtubeA1';
import {
  MAX_PERSONAL_NOTES_LENGTH,
  MAX_PRACTICE_COUNT,
  buildYoutubeEmbedUrl,
  buildYoutubeThumbnailUrl,
  buildYoutubeWatchUrl,
  filterYoutubeLessons,
  formatLessonNotebookExport,
  gradeLessonExercises,
  isExerciseAnswerCorrect,
  mergeYoutubeProgressMaps,
  normalizeGeneratedExercises,
  normalizeGermanAnswer,
  sanitizeLessonProgressRecord,
} from './youtubeCourse';

test('all 64 core A1 lessons + 2 bonus playlist videos are present, unique, and fully populated', () => {
  assert.equal(YOUTUBE_A1_LESSONS.length, 66);
  assert.equal(CORE_A1_LESSON_COUNT, 64);
  assert.equal(YOUTUBE_COURSE_STAGES.length, 8);

  const coreLessons = YOUTUBE_A1_LESSONS.filter((l) => !l.isBonus);
  const bonusLessons = YOUTUBE_A1_LESSONS.filter((l) => l.isBonus);
  assert.equal(coreLessons.length, 64);
  assert.equal(bonusLessons.length, 2);

  const stageIds = new Set(YOUTUBE_COURSE_STAGES.map((s) => s.id));
  const seenIds = new Set<string>();
  const seenVideoIds = new Set<string>();

  YOUTUBE_A1_LESSONS.forEach((lesson, idx) => {
    assert.equal(lesson.lessonNumber, idx + 1, `Lesson order mismatch at index ${idx}`);
    assert.ok(!seenIds.has(lesson.id), `Duplicate lesson id: ${lesson.id}`);
    seenIds.add(lesson.id);

    assert.match(lesson.videoId, /^[a-zA-Z0-9_-]{11}$/, `Invalid videoId on lesson ${lesson.lessonNumber}`);
    assert.ok(!seenVideoIds.has(lesson.videoId), `Duplicate videoId on lesson ${lesson.lessonNumber}`);
    seenVideoIds.add(lesson.videoId);

    assert.ok(stageIds.has(lesson.stageId), `Invalid stageId ${lesson.stageId} on lesson ${lesson.lessonNumber}`);
    assert.ok(lesson.shortTitle.trim().length > 2, `Missing shortTitle on lesson ${lesson.lessonNumber}`);
    assert.ok(lesson.keyFormula.trim().length > 5, `Missing keyFormula on lesson ${lesson.lessonNumber}`);
    assert.ok(lesson.notes.length >= 3, `Expected >= 3 notes on lesson ${lesson.lessonNumber}`);
    assert.ok(lesson.vocabulary.length >= 6, `Expected >= 6 vocab items on lesson ${lesson.lessonNumber}`);
    assert.ok(lesson.practiceDialogue.length >= 4, `Expected >= 4 dialogue lines on lesson ${lesson.lessonNumber}`);
    assert.ok(lesson.exercises.length >= 4, `Expected >= 4 exercises on lesson ${lesson.lessonNumber}`);

    for (const q of lesson.exercises) {
      if (q.type === 'mcq') {
        assert.ok(
          Array.isArray(q.options) && q.options.length >= 3,
          `MCQ ${q.id} must have at least 3 options`,
        );
        assert.ok(
          q.options.includes(q.correctAnswer),
          `MCQ ${q.id} correctAnswer "${q.correctAnswer}" must be in options`,
        );
      }
      assert.ok(
        isExerciseAnswerCorrect(q, q.correctAnswer),
        `Exercise ${q.id} failed self-check on correctAnswer`,
      );
    }
  });
});

test('URL builders generate safe watch, nocookie embed, and thumbnail URLs', () => {
  assert.match(buildYoutubeWatchUrl('RuGmc662HDg'), /^https:\/\/www\.youtube\.com\/watch\?v=RuGmc662HDg&list=PLF9mJC4RrjIhS4MMm0x72-qWEn1LRvPuW$/);
  assert.match(buildYoutubeEmbedUrl('RuGmc662HDg'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/RuGmc662HDg\?list=PLF9mJC4RrjIhS4MMm0x72-qWEn1LRvPuW&rel=0$/);
  assert.equal(buildYoutubeThumbnailUrl('RuGmc662HDg'), 'https://i.ytimg.com/vi/RuGmc662HDg/hqdefault.jpg');
});

test('gradeLessonExercises handles case, punctuation, accepted answers, and umlaut folding for fill-in questions', () => {
  assert.equal(normalizeGermanAnswer('  Guten Tag!  '), 'guten tag');
  assert.equal(normalizeGermanAnswer('Möchten Straße', true), 'moechten strasse');

  const sampleLesson = YOUTUBE_A1_LESSONS[0];
  const perfectAnswers: Record<string, string> = {};
  for (const q of sampleLesson.exercises) {
    perfectAnswers[q.id] = q.correctAnswer;
  }
  const perfect = gradeLessonExercises(sampleLesson.exercises, perfectAnswers);
  assert.equal(perfect.correctCount, sampleLesson.exercises.length);
  assert.equal(perfect.percentage, 100);
  assert.equal(perfect.passed, true);

  // Verify umlaut folding on fill question (e.g. "moechte" accepted for "möchte")
  const fillQuestion = {
    id: 'test-fill',
    type: 'fill' as const,
    prompt: 'Ich ____ einen Kaffee.',
    correctAnswer: 'möchte',
    explanation: 'möchte takes no -e change.',
  };
  assert.equal(isExerciseAnswerCorrect(fillQuestion, 'moechte'), true);
  assert.equal(isExerciseAnswerCorrect(fillQuestion, 'MÖCHTE!'), true);
  assert.equal(isExerciseAnswerCorrect(fillQuestion, 'trinke'), false);
});

test('filterYoutubeLessons filters by search query, stage, core-64, completion, and personal notes', () => {
  const progressMap = {
    'yt-a1-01': sanitizeLessonProgressRecord('yt-a1-01', 1, {
      completed: true,
      personalNotes: 'Remember formal Guten Tag after 11 AM',
      bestExerciseScore: 100,
      practiceCount: 2,
      updatedAtMs: 1000,
    }),
    'yt-a1-64': sanitizeLessonProgressRecord('yt-a1-64', 64, {
      completed: false,
      personalNotes: 'Warmmiete includes Nebenkosten',
      bestExerciseScore: 75,
      practiceCount: 1,
      updatedAtMs: 2000,
    }),
  };

  const wohnungResults = filterYoutubeLessons(YOUTUBE_A1_LESSONS, {
    query: 'Wohnungssuche',
    stageId: 'all',
    mode: 'all',
    progressMap,
  });
  assert.ok(wohnungResults.some((l) => l.lessonNumber === 64));

  const coreOnly = filterYoutubeLessons(YOUTUBE_A1_LESSONS, {
    query: '',
    stageId: 'all',
    mode: 'core-64',
    progressMap,
  });
  assert.equal(coreOnly.length, 64);

  const completedOnly = filterYoutubeLessons(YOUTUBE_A1_LESSONS, {
    query: '',
    stageId: 'all',
    mode: 'completed',
    progressMap,
  });
  assert.deepEqual(completedOnly.map((l) => l.id), ['yt-a1-01']);

  const withNotesOnly = filterYoutubeLessons(YOUTUBE_A1_LESSONS, {
    query: '',
    stageId: 'all',
    mode: 'with-notes',
    progressMap,
  });
  assert.deepEqual(withNotesOnly.map((l) => l.id), ['yt-a1-01', 'yt-a1-64']);
});

test('sanitizeLessonProgressRecord and mergeYoutubeProgressMaps enforce bounds and keep best progress', () => {
  const clamped = sanitizeLessonProgressRecord('bad id!!', 150, {
    completed: true,
    personalNotes: 'a'.repeat(MAX_PERSONAL_NOTES_LENGTH + 500),
    bestExerciseScore: 150,
    practiceCount: MAX_PRACTICE_COUNT + 99,
  });
  assert.equal(clamped.lessonId, 'lesson-150');
  assert.equal(clamped.lessonNumber, 100);
  assert.equal(clamped.personalNotes.length, MAX_PERSONAL_NOTES_LENGTH);
  assert.equal(clamped.bestExerciseScore, 100);
  assert.equal(clamped.practiceCount, MAX_PRACTICE_COUNT);

  const merged = mergeYoutubeProgressMaps(
    {
      'yt-a1-01': sanitizeLessonProgressRecord('yt-a1-01', 1, {
        completed: true,
        personalNotes: 'Local older note',
        bestExerciseScore: 75,
        practiceCount: 3,
        updatedAtMs: 1000,
      }),
    },
    {
      'yt-a1-01': sanitizeLessonProgressRecord('yt-a1-01', 1, {
        completed: false,
        personalNotes: 'Cloud newer note',
        bestExerciseScore: 100,
        practiceCount: 1,
        updatedAtMs: 5000,
      }),
    },
  );
  assert.equal(merged['yt-a1-01'].completed, true);
  assert.equal(merged['yt-a1-01'].personalNotes, 'Cloud newer note');
  assert.equal(merged['yt-a1-01'].bestExerciseScore, 100);
  assert.equal(merged['yt-a1-01'].practiceCount, 3);
});

test('formatLessonNotebookExport includes lesson summary, notes, vocabulary, dialogue, and personal notes', () => {
  const lesson = YOUTUBE_A1_LESSONS[0];
  const exported = formatLessonNotebookExport(
    lesson,
    sanitizeLessonProgressRecord(lesson.id, lesson.lessonNumber, {
      personalNotes: 'Review Tschüss vs Auf Wiedersehen',
    }),
  );
  assert.ok(exported.includes('Lesson 1:'));
  assert.ok(exported.includes('KEY FORMULA:'));
  assert.ok(exported.includes('KEY VOCABULARY & PHRASES:'));
  assert.ok(exported.includes('MY PERSONAL NOTES:'));
  assert.ok(exported.includes('Review Tschüss vs Auf Wiedersehen'));
});

test('normalizeGeneratedExercises sanitizes AI questions, enforces MCQ option integrity, and assigns unique set IDs', () => {
  const normalized = normalizeGeneratedExercises(
    [
      {
        type: 'mcq',
        prompt: 'Which German greeting is best at 8:00 AM?',
        options: ['Guten Morgen', 'Guten Abend', 'Gute Nacht', 'Guten Morgen'],
        correctAnswer: 'guten morgen',
        explanation: 'Use Guten Morgen in the morning until around 11 AM.',
      },
      {
        type: 'mcq',
        prompt: 'Broken MCQ with only 1 option should be skipped',
        options: ['Only one'],
        correctAnswer: 'Only one',
        explanation: 'Invalid question.',
      },
      {
        type: 'fill',
        prompt: 'Complete the formal goodbye: Auf ____!',
        hint: 'Means "see again"',
        correctAnswer: 'Wiedersehen',
        acceptedAnswers: ['wiedersehen', 'Wiedersehen!'],
        explanation: 'Auf Wiedersehen is the polite formal goodbye.',
      },
    ],
    'yt-a1-01',
    3,
  );

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].id, 'yt-a1-01-gen3-q1');
  assert.equal(normalized[0].correctAnswer, 'Guten Morgen');
  assert.deepEqual(normalized[0].options, ['Guten Morgen', 'Guten Abend', 'Gute Nacht']);
  assert.equal(isExerciseAnswerCorrect(normalized[0], 'Guten Morgen'), true);

  assert.equal(normalized[1].id, 'yt-a1-01-gen3-q2');
  assert.equal(normalized[1].type, 'fill');
  assert.equal(isExerciseAnswerCorrect(normalized[1], 'Wiedersehen'), true);
});

