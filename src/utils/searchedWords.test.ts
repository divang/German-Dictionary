import test from 'node:test';
import assert from 'node:assert/strict';
import type { DictionaryEntry, SearchedWordRecord } from '../types/dictionary';
import {
  buildSearchedWordRecord,
  filterSearchedWords,
  mergeSearchedWords,
  needsMeaningEnrichment,
  toSafeWordDocId,
  upsertSearchedWordLocal,
} from './searchedWords';

function makeEntry(overrides: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return {
    id: 'dict-krankenhaus',
    word: 'Krankenhaus',
    article: 'das',
    partOfSpeech: 'Neuter noun',
    cefr: 'A1',
    englishMeaning: 'hospital',
    hindiMeaning: '',
    devanagariFull: 'क्रांकन-हाउस',
    romanizedFull: 'KRANG-ken-hows',
    ipa: '/ˈkʁaŋkənˌhaʊ̯s/',
    stressSummary: 'Primary stress on first syllable',
    originNote: 'Compound of krank + Haus.',
    categories: ['everyday'],
    syllables: [],
    example: {
      german: 'Das Krankenhaus ist in der Nähe.',
      devanagari: 'दास क्रांकन-हाउस इस्ट इन डेअ नै-अ।',
      english: 'The hospital is nearby.',
      hindi: '',
    },
    source: 'dictionary',
    ...overrides,
  };
}

test('toSafeWordDocId converts German umlauts and punctuation into Firestore-safe IDs', () => {
  const pattern = /^[a-zA-Z0-9_-]{1,100}$/;
  assert.equal(toSafeWordDocId('Brötchen'), 'broetchen');
  assert.equal(toSafeWordDocId('Straße'), 'strasse');
  assert.equal(toSafeWordDocId('biologisches Alter'), 'biologisches_alter');
  assert.match(toSafeWordDocId('Übung! (A1)'), pattern);
  assert.match(toSafeWordDocId('अस्पताल'), pattern);
});

test('needsMeaningEnrichment detects missing Hindi meaning or placeholder English meaning', () => {
  assert.equal(needsMeaningEnrichment({ englishMeaning: 'hospital', hindiMeaning: '' }), true);
  assert.equal(
    needsMeaningEnrichment({
      englishMeaning: 'Looked up via phonetic breakdown (not yet in glossary)',
      hindiMeaning: 'अस्पताल',
    }),
    true,
  );
  assert.equal(needsMeaningEnrichment({ englishMeaning: 'hospital', hindiMeaning: 'अस्पताल' }), false);
});

test('buildSearchedWordRecord enforces blueprint size caps and preserves richer meanings on update', () => {
  const initial = buildSearchedWordRecord(
    makeEntry({
      word: 'W'.repeat(150),
      englishMeaning: 'hospital',
      hindiMeaning: 'अस्पताल',
      devanagariFull: 'अ'.repeat(250),
    }),
    undefined,
    { nowMs: 1000 },
  );

  assert.equal(initial.word.length, 100);
  assert.equal(initial.devanagariFull.length, 180);
  assert.equal(initial.searchCount, 1);

  // Re-searching with empty hindiMeaning preserves existing hindiMeaning and increments searchCount
  const updated = buildSearchedWordRecord(
    makeEntry({
      word: initial.word,
      englishMeaning: 'Looked up via phonetic breakdown',
      hindiMeaning: '',
    }),
    initial,
    { incrementCount: true, nowMs: 2000 },
  );

  assert.equal(updated.englishMeaning, 'hospital');
  assert.equal(updated.hindiMeaning, 'अस्पताल');
  assert.equal(updated.searchCount, 2);
  assert.equal(updated.createdAtMs, 1000);
  assert.equal(updated.lastSearchedAtMs, 2000);
});

test('upsertSearchedWordLocal deduplicates and moves latest searched word to the top', () => {
  const first = upsertSearchedWordLocal([], makeEntry({ word: 'Krankenhaus' }), { nowMs: 1000 });
  const second = upsertSearchedWordLocal(first.list, makeEntry({ word: 'Bahnhof', englishMeaning: 'train station' }), {
    nowMs: 2000,
  });
  const third = upsertSearchedWordLocal(
    second.list,
    makeEntry({ word: 'Krankenhaus', hindiMeaning: 'अस्पताल' }),
    { nowMs: 3000 },
  );

  assert.equal(third.list.length, 2);
  assert.equal(third.list[0].word, 'Krankenhaus');
  assert.equal(third.list[0].hindiMeaning, 'अस्पताल');
  assert.equal(third.list[0].searchCount, 2);
});

test('mergeSearchedWords combines laptop and phone histories keeping richest meanings and latest order', () => {
  const laptop: SearchedWordRecord[] = [
    {
      id: 'krankenhaus',
      word: 'Krankenhaus',
      article: 'das',
      partOfSpeech: 'Neuter noun',
      cefr: 'A1',
      englishMeaning: 'hospital',
      hindiMeaning: 'अस्पताल',
      devanagariFull: 'क्रांकन-हाउस',
      ipa: '/ˈkʁaŋkənˌhaʊ̯s/',
      searchCount: 3,
      createdAtMs: 1000,
      lastSearchedAtMs: 5000,
    },
    {
      id: 'bahnhof',
      word: 'Bahnhof',
      article: 'der',
      partOfSpeech: 'Masculine noun',
      cefr: 'A1',
      englishMeaning: 'railway station',
      hindiMeaning: 'रेलवे स्टेशन',
      devanagariFull: 'बान-होफ़',
      ipa: '/ˈbaːnhoːf/',
      searchCount: 1,
      createdAtMs: 2000,
      lastSearchedAtMs: 2000,
    },
  ];

  const phone: SearchedWordRecord[] = [
    {
      id: 'krankenhaus',
      word: 'Krankenhaus',
      article: 'das',
      partOfSpeech: 'Neuter noun',
      cefr: 'A1',
      englishMeaning: 'hospital',
      hindiMeaning: '',
      devanagariFull: 'क्रांकन-हाउस',
      ipa: '/ˈkʁaŋkənˌhaʊ̯s/',
      searchCount: 1,
      createdAtMs: 1500,
      lastSearchedAtMs: 4000,
    },
    {
      id: 'apotheke',
      word: 'Apotheke',
      article: 'die',
      partOfSpeech: 'Feminine noun',
      cefr: 'A1',
      englishMeaning: 'pharmacy',
      hindiMeaning: 'दवा की दुकान',
      devanagariFull: 'आ-पो-टे-क',
      ipa: '/apoˈteːkə/',
      searchCount: 2,
      createdAtMs: 6000,
      lastSearchedAtMs: 6000,
    },
  ];

  const merged = mergeSearchedWords(laptop, phone);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'apotheke');
  assert.equal(merged[1].id, 'krankenhaus');
  assert.equal(merged[1].hindiMeaning, 'अस्पताल');
  assert.equal(merged[1].searchCount, 3);
  assert.equal(merged[1].createdAtMs, 1000);
  assert.equal(merged[2].id, 'bahnhof');

  // Filter matches German, English, or Hindi text
  assert.equal(filterSearchedWords(merged, 'दवा').length, 1);
  assert.equal(filterSearchedWords(merged, 'station').length, 1);
});
