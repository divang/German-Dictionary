import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SAMPLE_TRANSLATION,
  MAX_SENTENCE_INPUT_LENGTH,
  normalizeSentenceTranslation,
  stripArticleAndPunctuation,
  upsertSentenceHistory,
  validateEnglishSentenceInput,
} from './sentenceTranslator';

test('validateEnglishSentenceInput rejects empty, tiny, or overly long input and accepts valid sentences', () => {
  assert.ok(validateEnglishSentenceInput('') !== null);
  assert.ok(validateEnglishSentenceInput('   ') !== null);
  assert.ok(validateEnglishSentenceInput('a') !== null);
  assert.ok(validateEnglishSentenceInput('x'.repeat(MAX_SENTENCE_INPUT_LENGTH + 1)) !== null);
  assert.equal(validateEnglishSentenceInput('Where is the train station?'), null);
});

test('stripArticleAndPunctuation removes der/die/das and trailing punctuation for clean lookup and audio', () => {
  assert.equal(stripArticleAndPunctuation('der Bahnhof?'), 'Bahnhof');
  assert.equal(stripArticleAndPunctuation('die Küche!'), 'Küche');
  assert.equal(stripArticleAndPunctuation('das Brötchen,'), 'Brötchen');
  assert.equal(stripArticleAndPunctuation('möchte.'), 'möchte');
});

test('normalizeSentenceTranslation sanitizes server response and preserves ordered word-by-word meanings', () => {
  const result = normalizeSentenceTranslation(
    {
      germanSentence: 'Ich möchte einen Kaffee, bitte.',
      devanagariSentence: 'इश म्यॉश-टे आइ-नन का-फ़े, बि-टे।',
      hindiSentence: 'मुझे कृपया एक कॉफ़ी चाहिए।',
      cefr: 'A1',
      grammarTip: 'Use "Ich möchte" for a polite A1 request.',
      words: [
        {
          german: 'Ich',
          baseForm: 'ich',
          article: '',
          devanagari: 'इश',
          english: 'I',
          hindi: 'मैं',
          role: 'Pronoun',
        },
        {
          german: 'Kaffee',
          baseForm: 'der Kaffee',
          article: 'der',
          devanagari: 'का-फ़े',
          english: 'coffee',
          hindi: 'कॉफ़ी',
          role: 'Masculine noun',
        },
      ],
    },
    'I would like a coffee, please.',
    'polite',
    5000,
  );

  assert.equal(result.germanSentence, 'Ich möchte einen Kaffee, bitte.');
  assert.equal(result.words.length, 2);
  assert.equal(result.words[1].baseForm, 'Kaffee');
  assert.equal(result.words[1].article, 'der');
  assert.equal(result.createdAtMs, 5000);
});

test('upsertSentenceHistory deduplicates by normalized English input + tone and caps length', () => {
  const first = normalizeSentenceTranslation(
    { germanSentence: 'Guten Morgen!', words: [] },
    'Good morning!',
    'polite',
    1000,
  );
  const second = normalizeSentenceTranslation(
    { germanSentence: 'Wie geht es Ihnen?', words: [] },
    'How are you?',
    'polite',
    2000,
  );
  const updatedFirst = normalizeSentenceTranslation(
    { germanSentence: 'Guten Morgen!', words: [] },
    '  good morning!  ',
    'polite',
    3000,
  );

  let history = upsertSentenceHistory([INITIAL_SAMPLE_TRANSLATION], first, 3);
  history = upsertSentenceHistory(history, second, 3);
  history = upsertSentenceHistory(history, updatedFirst, 3);

  assert.equal(history.length, 3);
  assert.equal(history[0].englishInput, 'good morning!');
  assert.equal(history[0].createdAtMs, 3000);
  assert.equal(history[1].englishInput, 'How are you?');
});
