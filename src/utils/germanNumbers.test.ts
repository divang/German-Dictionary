import test from 'node:test';
import assert from 'node:assert/strict';
import { describeGermanNumber, numberToGermanWord } from './germanNumbers';

test('numberToGermanWord handles 0 to 20, reversed 21-99, hundreds, and thousands accurately', () => {
  assert.equal(numberToGermanWord(0), 'null');
  assert.equal(numberToGermanWord(1), 'eins');
  assert.equal(numberToGermanWord(12), 'zwölf');
  assert.equal(numberToGermanWord(16), 'sechzehn');
  assert.equal(numberToGermanWord(17), 'siebzehn');
  assert.equal(numberToGermanWord(21), 'einundzwanzig');
  assert.equal(numberToGermanWord(30), 'dreißig');
  assert.equal(numberToGermanWord(47), 'siebenundvierzig');
  assert.equal(numberToGermanWord(100), 'einhundert');
  assert.equal(numberToGermanWord(147), 'einhundertsiebenundvierzig');
  assert.equal(numberToGermanWord(1000), 'eintausend');
  assert.equal(numberToGermanWord(2026), 'zweitausendsechsundzwanzig');
  assert.equal(numberToGermanWord(-5), '');
  assert.equal(numberToGermanWord(1000000), '');
});

test('describeGermanNumber produces Devanagari, breakdown explanation, and example sentence', () => {
  const info = describeGermanNumber(147);
  assert.ok(info);
  assert.equal(info.german, 'einhundertsiebenundvierzig');
  assert.ok(info.devanagari.length > 0);
  assert.ok(info.breakdownNote.includes('100'));
  assert.ok(info.sentenceGerman.includes('einhundertsiebenundvierzig'));
});
