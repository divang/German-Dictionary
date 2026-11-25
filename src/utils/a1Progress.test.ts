import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_A1_PROGRESS,
  GOETHE_A1_PASS_PERCENT,
  buildSelfIntroScript,
  calculateA1Readiness,
  gradeA1MockExam,
  mergeA1Progress,
  sanitizeIdList,
} from './a1Progress';
import { A1_MOCK_EXAM_QUESTIONS, A1_MODULES, TOTAL_A1_VOCAB_COUNT } from '../data/a1Curriculum';

test('sanitizeIdList enforces blueprint ID regex and maxItems ceiling', () => {
  const dirty = ['a1-m1', 'a1-m1', 'bad$id!', '', '   ', 'a1-m2', 'a1-m3'];
  assert.deepEqual(sanitizeIdList(dirty, 2), ['a1-m1', 'a1-m2']);
});

test('mergeA1Progress unions completed modules and vocab across devices without losing high scores', () => {
  const local = {
    ...DEFAULT_A1_PROGRESS,
    completedLessonIds: ['a1-m1', 'a1-m2'],
    masteredVocabIds: ['v1-guten-tag', 'v2-uhr'],
    bestMockScore: 72,
    totalMockAttempts: 2,
  };
  const cloud = {
    completedLessonIds: ['a1-m2', 'a1-m3'],
    masteredVocabIds: ['v3-familie'],
    lastActiveModuleId: 'a1-m3',
    lastActiveTab: 'hoeren' as const,
    bestMockScore: 64,
    totalMockAttempts: 3,
  };
  const merged = mergeA1Progress(local, cloud);
  assert.deepEqual(merged.completedLessonIds, ['a1-m2', 'a1-m3', 'a1-m1']);
  assert.deepEqual(merged.masteredVocabIds, ['v3-familie', 'v1-guten-tag', 'v2-uhr']);
  assert.equal(merged.bestMockScore, 72);
  assert.equal(merged.totalMockAttempts, 3);
  assert.equal(merged.lastActiveModuleId, 'a1-m3');
  assert.equal(merged.lastActiveTab, 'hoeren');
});

test('calculateA1Readiness computes weighted readiness and examReady threshold accurately', () => {
  const empty = calculateA1Readiness(DEFAULT_A1_PROGRESS, A1_MODULES.length, TOTAL_A1_VOCAB_COUNT);
  assert.equal(empty.overallPercent, 0);
  assert.equal(empty.examReady, false);

  const ready = calculateA1Readiness(
    {
      ...DEFAULT_A1_PROGRESS,
      completedLessonIds: ['a1-m1', 'a1-m2', 'a1-m3', 'a1-m4', 'a1-m5', 'a1-m6'],
      masteredVocabIds: A1_MODULES.flatMap((m) => m.vocabulary.map((v) => v.id)),
      bestMockScore: 80,
      totalMockAttempts: 2,
    },
    A1_MODULES.length,
    TOTAL_A1_VOCAB_COUNT,
  );
  assert.equal(ready.examReady, true);
  assert.ok(ready.overallPercent >= 80);
});

test('gradeA1MockExam sums to 100 points and enforces official Goethe 60% pass mark', () => {
  const totalPts = A1_MOCK_EXAM_QUESTIONS.reduce((sum, q) => sum + q.points, 0);
  assert.equal(totalPts, 100, 'Expected mock exam total points to equal 100');

  const allRight: Record<string, number> = {};
  for (const q of A1_MOCK_EXAM_QUESTIONS) {
    allRight[q.id] = q.correctIndex;
  }
  const perfect = gradeA1MockExam(A1_MOCK_EXAM_QUESTIONS, allRight);
  assert.equal(perfect.score, 100);
  assert.equal(perfect.percent, 100);
  assert.equal(perfect.passed, true);
  assert.equal(perfect.sectionScores.hoeren, 25);
  assert.equal(perfect.sectionScores.lesen, 25);
  assert.equal(perfect.sectionScores.schreiben, 25);
  assert.equal(perfect.sectionScores.sprechen, 25);

  const failed = gradeA1MockExam(A1_MOCK_EXAM_QUESTIONS, {
    [A1_MOCK_EXAM_QUESTIONS[0].id]: A1_MOCK_EXAM_QUESTIONS[0].correctIndex,
  });
  assert.equal(failed.passed, false);
  assert.ok(failed.percent < GOETHE_A1_PASS_PERCENT);
});

test('buildSelfIntroScript generates 7 Goethe Sprechen Teil 1 lines with Devanagari cues', () => {
  const lines = buildSelfIntroScript({
    name: 'Divang',
    age: '28',
    country: 'Indien',
    city: 'Bengaluru',
    languages: 'Hindi, Englisch und Deutsch',
    profession: 'Ingenieur',
    hobby: 'Musik hören',
  });
  assert.equal(lines.length, 7);
  assert.ok(lines[0].german.includes('Divang'));
  assert.ok(lines[0].devanagari.length > 0);
  assert.ok(lines[5].german.includes('Ingenieur'));
});
