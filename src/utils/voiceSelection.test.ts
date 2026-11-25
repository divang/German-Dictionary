import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSyllableAudioTarget,
  selectBestGermanVoice,
  type VoiceLike,
} from './voiceSelection';
import {
  buildGermanSpeechStyle,
  buildGermanTtsAttempts,
} from '../../server/ttsHelper';

test('selectBestGermanVoice never picks an English voice when no German voice is available', () => {
  const englishOnly: VoiceLike[] = [
    { name: 'Google US English', lang: 'en-US', default: true },
    { name: 'Microsoft Ravi - English (India)', lang: 'en-IN' },
    { name: 'Samantha', lang: 'en-US' },
  ];
  assert.equal(selectBestGermanVoice(englishOnly), null);
});

test('selectBestGermanVoice prefers high-quality de-DE voices over regional or robotic German voices', () => {
  const voices: VoiceLike[] = [
    { name: 'Google US English', lang: 'en-US', default: true },
    { name: 'eSpeak German', lang: 'de-DE' },
    { name: 'Austrian German', lang: 'de-AT' },
    { name: 'Google Deutsch', lang: 'de-DE' },
  ];
  const picked = selectBestGermanVoice(voices);
  assert.equal(picked?.name, 'Google Deutsch');
  assert.equal(picked?.lang, 'de-DE');
});

test('resolveSyllableAudioTarget speaks bare German word slowly without der/die/das for tiny or loanword fragments', () => {
  const singleLetter = resolveSyllableAudioTarget({
    segment: '-s-',
    word: 'Friseur',
    ipa: '/z/',
    wordIpa: '/fʁiˈzøːɐ̯/',
  });
  assert.equal(singleLetter.text, 'Friseur');
  assert.equal(singleLetter.forceSlow, true);
  assert.equal(singleLetter.ipa, '/fʁiˈzøːɐ̯/');

  const frenchVowel = resolveSyllableAudioTarget({
    segment: '-eu-',
    word: 'der Friseur',
    ipa: '/øː/',
    wordIpa: '/fʁiˈzøːɐ̯/',
  });
  assert.equal(frenchVowel.text, 'Friseur');
  assert.equal(frenchVowel.forceSlow, true);

  const fullSyllable = resolveSyllableAudioTarget({
    segment: '-gisch',
    word: 'biologisch',
    ipa: '/ɡɪʃ/',
    wordIpa: '/bioˈloːɡɪʃ/',
  });
  assert.equal(fullSyllable.text, 'gisch');
  assert.equal(fullSyllable.forceSlow, false);
});

test('buildGermanTtsAttempts locks languageCode to de-DE and keeps pure German text without English prompt leaks', () => {
  const style = buildGermanSpeechStyle(true, '/bioˈloːɡɪʃ/');
  assert.ok(style.includes('Hochdeutsch'));
  assert.ok(style.includes('/bioˈloːɡɪʃ/'));
  assert.ok(!style.includes('Speak very slowly'));

  const attempts = buildGermanTtsAttempts({
    text: 'biologisches',
    slow: true,
    ipa: '/bioˈloːɡɪʃəs/',
  });
  assert.equal(attempts[0].model, 'gemini-3.8-flash-lite-tts');
  assert.equal(attempts[0].languageCode, 'de-DE');
  assert.equal(attempts[0].text, 'biologisches');
  // Every fallback attempt must preserve the clean German text with zero English instructions
  for (const attempt of attempts) {
    assert.equal(attempt.text, 'biologisches');
    assert.ok(attempt.style.includes('Hochdeutsch'));
  }
});
