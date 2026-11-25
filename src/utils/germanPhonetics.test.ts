import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicGermanEntry,
  transliterateGermanToDevanagari,
} from './germanPhonetics';

test('transliterateGermanToDevanagari handles biologisches and sch/ch/z rules accurately', () => {
  const bio = transliterateGermanToDevanagari('biologisches');
  assert.ok(bio.includes('श'), `Expected श in biologisches transliteration, got: ${bio}`);
  assert.ok(bio.includes('ल'), `Expected ल in biologisches transliteration, got: ${bio}`);

  const zug = transliterateGermanToDevanagari('Zug');
  assert.ok(zug.startsWith('त्सु'), `Expected त्सु start for Zug, got: ${zug}`);

  const kuchen = transliterateGermanToDevanagari('Kuchen');
  assert.ok(kuchen.includes('ख़'), `Expected ख़ (ach-Laut) in Kuchen, got: ${kuchen}`);
});

test('buildDeterministicGermanEntry produces mouth steps for umlauts ö and ü', () => {
  const muenchen = buildDeterministicGermanEntry({
    word: 'München',
    partOfSpeech: 'Noun',
    englishMeaning: 'Munich',
  });
  assert.equal(muenchen.word, 'München');
  assert.equal(muenchen.source, 'dictionary');
  const ueSyllable = muenchen.syllables.find((s) => s.difficulty === 'new-sound');
  assert.ok(ueSyllable, 'Expected new-sound syllable for ü in München');
  assert.ok((ueSyllable.mouthSteps?.length ?? 0) >= 2, 'Expected 2 mouth steps for ü');
  assert.ok((muenchen.examples?.length ?? 0) >= 2, 'Expected multiple example sentences');
});

test('buildDeterministicGermanEntry builds Linguee-style collocations and sentences for biologisches', () => {
  const entry = buildDeterministicGermanEntry({
    word: 'biologisches',
    partOfSpeech: 'Adjective',
    englishMeaning: 'biological; organic',
    collocations: [
      {
        german: 'biologisches Alter',
        devanagari: transliterateGermanToDevanagari('biologisches Alter'),
        english: 'biological age',
        article: 'das',
      },
    ],
  });
  assert.equal(entry.word, 'biologisches');
  assert.ok(entry.collocations && entry.collocations.length === 1);
  assert.ok(entry.examples && entry.examples.length >= 2);
  assert.ok(entry.examples.some((ex) => ex.german.includes('biologisches')));
});

test('buildDeterministicGermanEntry applies authentic German stress and phonology rules', () => {
  const biologie = buildDeterministicGermanEntry({
    word: 'Biologie',
    article: 'die',
    partOfSpeech: 'Noun',
    englishMeaning: 'biology',
  });
  const bioLast = biologie.syllables[biologie.syllables.length - 1];
  assert.equal(bioLast.stressed, true, `Expected final -gie stressed in Biologie, got: ${biologie.romanizedFull}`);

  const studieren = buildDeterministicGermanEntry({
    word: 'studieren',
    partOfSpeech: 'Verb',
    englishMeaning: 'to study',
  });
  const dieSyl = studieren.syllables.find((s) => s.segment.includes('die'));
  assert.equal(dieSyl?.stressed, true, `Expected -die- stressed in studieren, got: ${studieren.romanizedFull}`);

  const verstehen = buildDeterministicGermanEntry({
    word: 'verstehen',
    partOfSpeech: 'Verb',
    englishMeaning: 'to understand',
  });
  assert.ok(
    verstehen.devanagariFull.includes('श्ट'),
    `Expected German श्ट (sht) in verstehen, got: ${verstehen.devanagariFull}`,
  );

  const ingenieur = buildDeterministicGermanEntry({
    word: 'Ingenieur',
    article: 'der',
    partOfSpeech: 'Noun',
    englishMeaning: 'engineer',
  });
  const eurSyl = ingenieur.syllables[ingenieur.syllables.length - 1];
  assert.equal(eurSyl.difficulty, 'new-sound', 'Expected French -eur ending to coach ö (/øː/)');

  const chor = buildDeterministicGermanEntry({
    word: 'Chor',
    article: 'der',
    partOfSpeech: 'Noun',
    englishMeaning: 'choir',
  });
  assert.ok(chor.devanagariFull.startsWith('को'), `Expected Chor to start with को (/k/), got: ${chor.devanagariFull}`);
});
