import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEnglishToGermanResult,
  validateEnglishWordInput,
} from './englishToGerman';

test('validateEnglishWordInput enforces non-empty, min length, and max length', () => {
  assert.ok(validateEnglishWordInput(''));
  assert.ok(validateEnglishWordInput('   '));
  assert.ok(validateEnglishWordInput('a'));
  assert.equal(validateEnglishWordInput('bedroom'), null);
  assert.equal(validateEnglishWordInput('water bottle'), null);
  assert.ok(validateEnglishWordInput('x'.repeat(85)));
});

test('normalizeEnglishToGermanResult strips der/die/das from germanWord, deduplicates, and caps at 6', () => {
  const result = normalizeEnglishToGermanResult(
    {
      hindiGloss: 'शयनकक्ष, बेडरूम',
      matches: [
        {
          germanWord: 'das Schlafzimmer',
          article: 'das',
          partOfSpeech: 'Neuter noun',
          cefr: 'A1',
          devanagari: 'श्लाफ़-त्सिमर',
          ipa: '/ˈʃlaːfˌtsɪmɐ/',
          nuance: 'Standard everyday word for bedroom',
          hindiMeaning: 'बेडरूम, शयनकक्ष',
          exampleGerman: 'Das Schlafzimmer ist sehr ruhig.',
          exampleEnglish: 'The bedroom is very quiet.',
        },
        {
          germanWord: 'Schlafzimmer',
          article: 'das',
          nuance: 'Duplicate should be ignored',
        },
        {
          germanWord: 'der Schlafraum',
          article: 'der',
          partOfSpeech: 'Masculine noun',
          cefr: 'B1',
          devanagari: 'श्लाफ़-राउम',
          ipa: '/ˈʃlaːfˌʁaʊ̯m/',
          nuance: 'Sleeping quarters or dormitory room',
          hindiMeaning: 'सोने का कमरा',
          exampleGerman: 'Der Schlafraum hat vier Betten.',
          exampleEnglish: 'The sleeping room has four beds.',
        },
      ],
    },
    'bedroom',
    'ai',
  );

  assert.equal(result.englishQuery, 'bedroom');
  assert.equal(result.matches.length, 2);
  assert.equal(result.matches[0].germanWord, 'Schlafzimmer');
  assert.equal(result.matches[0].article, 'das');
  assert.equal(result.matches[1].germanWord, 'Schlafraum');
  assert.equal(result.matches[1].article, 'der');
});
