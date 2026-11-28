import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTargetForCheck,
  getAccuracyTier,
  normalizePronunciationFeedback,
  sanitizeAudioMimeType,
} from './pronunciationCheck';

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

test('normalizePronunciationFeedback clamps scores and sanitizes feedback fields', () => {
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
});
