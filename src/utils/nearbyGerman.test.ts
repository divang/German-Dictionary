import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_NEARBY_SENTENCE_INPUT,
  MAX_NEARBY_WORD_INPUT,
  getConfidenceLabel,
  normalizeNearbySentenceResult,
  normalizeNearbyWordResult,
  validateNearbyInput,
} from './nearbyGerman';

test('validateNearbyInput enforces non-empty, min length, and mode-specific max lengths', () => {
  assert.ok(validateNearbyInput('', 'word') !== null);
  assert.ok(validateNearbyInput('a', 'word') !== null);
  assert.ok(validateNearbyInput('x'.repeat(MAX_NEARBY_WORD_INPUT + 1), 'word') !== null);
  assert.equal(validateNearbyInput('ent shul di gung', 'word'), null);

  assert.ok(validateNearbyInput('   ', 'sentence') !== null);
  assert.ok(validateNearbyInput('x'.repeat(MAX_NEARBY_SENTENCE_INPUT + 1), 'sentence') !== null);
  assert.equal(validateNearbyInput('wo ist de bahn hof', 'sentence'), null);
});

test('normalizeNearbyWordResult strips der/die/das from germanWord, deduplicates, and caps at 5', () => {
  const res = normalizeNearbyWordResult(
    {
      detectedAs: 'English phonetic approximation',
      candidates: [
        {
          germanWord: 'der Bahnhof',
          article: 'der',
          partOfSpeech: 'Masculine noun',
          confidence: 'high',
          devanagari: 'बान-होफ़',
          ipa: '/ˈbaːnhoːf/',
          englishMeaning: 'train station',
          hindiMeaning: 'रेलवे स्टेशन',
          matchReason: 'Sounds like bahn-hof.',
          exampleGerman: 'Der Bahnhof ist groß.',
          exampleEnglish: 'The train station is big.',
        },
        {
          germanWord: 'Bahnhof',
          article: 'der',
          confidence: 'medium',
          englishMeaning: 'duplicate should be dropped',
        },
        {
          germanWord: 'Bauernhof',
          article: 'der',
          partOfSpeech: 'Masculine noun',
          confidence: 'medium',
          devanagari: 'बाउ-अर्न-होफ़',
          englishMeaning: 'farm',
          hindiMeaning: 'खेत, फ़ार्म',
        },
      ],
    },
    'bahn hoff',
  );

  assert.equal(res.candidates.length, 2);
  assert.equal(res.candidates[0].germanWord, 'Bahnhof');
  assert.equal(res.candidates[0].article, 'der');
  assert.equal(res.candidates[1].germanWord, 'Bauernhof');
  assert.equal(getConfidenceLabel(res.candidates[0].confidence).label, 'Most likely match');
});

test('normalizeNearbySentenceResult preserves ranked sentences and sanitizes word-by-word entries', () => {
  const res = normalizeNearbySentenceResult(
    {
      detectedAs: 'Phonetic spoken German',
      candidates: [
        {
          germanSentence: 'Wo ist der Bahnhof?',
          confidence: 'high',
          devanagariSentence: 'वो इस्ट डेअ बान-होफ़?',
          englishMeaning: 'Where is the train station?',
          hindiMeaning: 'रेलवे स्टेशन कहाँ है?',
          matchReason: 'Matched phonetic spelling.',
          words: [
            {
              german: 'Bahnhof',
              baseForm: 'der Bahnhof?',
              article: 'der',
              devanagari: 'बान-होफ़',
              english: 'train station',
              hindi: 'रेलवे स्टेशन',
              role: 'Masculine noun',
            },
          ],
        },
      ],
    },
    'wo ist de bahn hof',
  );

  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].words[0].baseForm, 'Bahnhof');
  assert.equal(res.candidates[0].words[0].article, 'der');
});
