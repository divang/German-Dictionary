import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackWordChunks,
  buildSpellSoundGuide,
  cleanTargetForCheck,
  detectStuckPattern,
  getAccuracyTier,
  getChunkRoleLabel,
  getChunkStatusMeta,
  getEvaluationModelPlan,
  normalizeCheckMode,
  normalizePronunciationFeedback,
  sanitizeAudioMimeType,
} from './pronunciationCheck';
import type { PronunciationAttemptRecord } from '../types/pronunciationCheck';

test('sanitizeAudioMimeType strips codecs parameters and defaults unsupported types cleanly', () => {
  assert.equal(sanitizeAudioMimeType('audio/webm;codecs=opus'), 'audio/webm');
  assert.equal(sanitizeAudioMimeType('audio/mp4; codecs="mp4a.40.2"'), 'audio/mp4');
  assert.equal(sanitizeAudioMimeType('audio/mp3'), 'audio/mpeg');
  assert.equal(sanitizeAudioMimeType('application/octet-stream'), 'audio/webm');
  assert.equal(sanitizeAudioMimeType(''), 'audio/webm');
});

test('cleanTargetForCheck removes parenthetical labels and formats slash variants', () => {
  assert.equal(cleanTargetForCheck('sie (Plural)'), 'sie');
  assert.equal(cleanTargetForCheck('mein / meine'), 'mein, meine');
  assert.equal(cleanTargetForCheck('  Ich komme aus Indien.  '), 'Ich komme aus Indien.');
});

test('getAccuracyTier maps accuracy scores to expected rating tiers', () => {
  assert.equal(getAccuracyTier(95).rating, 'excellent');
  assert.equal(getAccuracyTier(85).rating, 'excellent');
  assert.equal(getAccuracyTier(74).rating, 'good');
  assert.equal(getAccuracyTier(58).rating, 'fair');
  assert.equal(getAccuracyTier(30).rating, 'needs-practice');
  assert.equal(getAccuracyTier(120).rating, 'excellent');
  assert.equal(getAccuracyTier(-5).rating, 'needs-practice');
});

test('buildFallbackWordChunks breaks Friseur into prefix, infix, and suffix coaching chunks', () => {
  const chunks = buildFallbackWordChunks('Friseur');
  assert.equal(chunks.length, 4);
  assert.deepEqual(
    chunks.map((c) => c.chunk),
    ['Fri-', '-s-', '-eu-', '-r'],
  );
  assert.deepEqual(
    chunks.map((c) => c.role),
    ['prefix', 'infix', 'infix', 'suffix'],
  );
  assert.equal(chunks[0].targetDevanagari, 'फ़्री');
  assert.ok(chunks[1].targetDevanagari.includes('ज़'));
  assert.ok(chunks[2].targetDevanagari.includes('यॉ'));
  assert.ok(chunks[3].targetDevanagari.includes('अ'));
  const guide = buildSpellSoundGuide(chunks);
  assert.ok(guide.includes('Fri-'));
  assert.ok(guide.includes('-eu-'));
});

test('buildFallbackWordChunks splits derived German words and sentences cleanly', () => {
  const entChunks = buildFallbackWordChunks('Entschuldigung');
  assert.ok(entChunks.length >= 3);
  assert.equal(entChunks[0].role, 'prefix');
  assert.equal(entChunks[0].chunk.toLowerCase(), 'ent-');
  assert.equal(entChunks[entChunks.length - 1].role, 'suffix');

  const sentenceChunks = buildFallbackWordChunks('Ich komme aus Indien.');
  assert.equal(sentenceChunks.length, 4);
  assert.ok(sentenceChunks.every((c) => c.role === 'word'));
  assert.equal(sentenceChunks[0].chunk, 'Ich');
});

test('detectStuckPattern identifies repeated low scores and recommends weakest chunk', () => {
  const lowFeedback = normalizePronunciationFeedback(
    {
      accuracyScore: 42,
      wordBreakdown: [
        {
          chunk: 'Fri-',
          speakText: 'Fri',
          role: 'prefix',
          status: 'correct',
          score: 85,
          targetDevanagari: 'फ़्री',
          heardAs: 'Fri',
          teacherHint: 'Nice start',
          hindiCoachCue: 'बढ़िया',
          spellOutCue: 'Fri',
        },
        {
          chunk: '-eu-',
          speakText: 'sö',
          role: 'infix',
          status: 'needs-work',
          score: 30,
          targetDevanagari: 'यॉ / ओ',
          heardAs: 'oo',
          teacherHint: 'Round lips like o while saying e',
          hindiCoachCue: 'ओ की तरह होंठ गोल रखें',
          spellOutCue: 'zö',
        },
      ],
    },
    'Friseur',
  );

  const singleTry: PronunciationAttemptRecord[] = [
    { id: '1', timestampMs: 1, feedback: lowFeedback, audioUrl: null },
  ];
  assert.equal(detectStuckPattern(singleTry).isStuck, false);

  const repeatedTries: PronunciationAttemptRecord[] = [
    { id: '2', timestampMs: 2, feedback: lowFeedback, audioUrl: null },
    { id: '1', timestampMs: 1, feedback: lowFeedback, audioUrl: null },
  ];
  const stuck = detectStuckPattern(repeatedTries);
  assert.equal(stuck.isStuck, true);
  assert.equal(stuck.attemptCount, 2);
  assert.equal(stuck.recommendedChunkIndex, 1);
  assert.equal(stuck.repeatedWeakChunk?.chunk, '-eu-');
});

test('getChunkStatusMeta and getChunkRoleLabel return readable UI labels', () => {
  assert.equal(getChunkStatusMeta('correct').label, 'Clear');
  assert.equal(getChunkStatusMeta('close').label, 'Almost');
  assert.equal(getChunkStatusMeta('needs-work').label, 'Fix This');
  assert.equal(getChunkRoleLabel('prefix'), 'Prefix / Start');
  assert.equal(getChunkRoleLabel('infix'), 'Infix / Middle');
  assert.equal(getChunkRoleLabel('suffix'), 'Suffix / Ending');
});

test('normalizePronunciationFeedback clamps scores, normalizes wordBreakdown, and populates teacherGuidance', () => {
  const result = normalizePronunciationFeedback(
    {
      accuracyScore: 108,
      heardText: '  Freesor  ',
      heardDevanagari: 'फ़्री-सोर',
      summaryEnglish: 'Very close, round the ö vowel slightly more.',
      summaryHindi: 'बहुत अच्छा, बस ö को थोड़ा और गोल बोलें।',
      strengths: ['Clear Fri- start', '', 'Good word stress'],
      corrections: [
        {
          segment: '-eu- (ö)',
          issue: 'Sounded like plain o',
          howToFix: 'Round lips like o and say e with your tongue',
          hindiTip: 'होंठ ओ की तरह गोल रखें और अंदर से ए बोलें',
        },
        { segment: '', issue: '', howToFix: '', hindiTip: '' },
      ],
      retryTip: 'Hold lips tight on -seur.',
    },
    'Friseur',
  );

  assert.equal(result.accuracyScore, 100);
  assert.equal(result.rating, 'excellent');
  assert.equal(result.heardText, 'Freesor');
  assert.deepEqual(result.strengths, ['Clear Fri- start', 'Good word stress']);
  assert.equal(result.corrections.length, 1);
  assert.equal(result.corrections[0].segment, '-eu- (ö)');
  // Falls back to deterministic breakdown for Friseur if omitted
  assert.equal(result.wordBreakdown.length, 4);
  assert.equal(result.wordBreakdown[0].chunk, 'Fri-');
});

test('normalizeCheckMode and getEvaluationModelPlan route fast vs advanced modes safely', () => {
  assert.equal(normalizeCheckMode('fast'), 'fast');
  assert.equal(normalizeCheckMode('advanced'), 'advanced');
  assert.equal(normalizeCheckMode('unknown'), 'fast');
  assert.equal(normalizeCheckMode(undefined), 'fast');

  const fastPlan = getEvaluationModelPlan('fast');
  assert.equal(fastPlan[0].model, 'gemini-3.1-flash-lite');
  assert.equal(fastPlan[0].thinkingLevel, 'MINIMAL');
  assert.equal(fastPlan[1].model, 'gemini-4-hydrogen');
  assert.equal(fastPlan[1].thinkingLevel, 'LOW');

  const advPlan = getEvaluationModelPlan('advanced');
  assert.equal(advPlan[0].model, 'gemini-4-hydrogen');
  assert.equal(advPlan[0].thinkingLevel, 'LOW');
  assert.equal(advPlan[1].model, 'gemini-3.1-flash-lite');
  assert.equal(advPlan[1].thinkingLevel, 'MINIMAL');

  const withMode = normalizePronunciationFeedback({ accuracyScore: 82 }, 'Friseur', undefined, 'advanced');
  assert.equal(withMode.evaluationMode, 'advanced');
});
