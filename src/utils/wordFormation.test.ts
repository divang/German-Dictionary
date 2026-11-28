import test from 'node:test';
import assert from 'node:assert/strict';
import {
  articleToGenderLabel,
  buildFormationFormula,
  normalizeWordFormation,
} from './wordFormation';

test('buildFormationFormula formats compound parts with meaning and gender cleanly', () => {
  const formula = buildFormationFormula([
    {
      german: 'Wasser',
      article: 'das',
      genderLabel: 'neuter',
      meaning: 'water',
      speakable: true,
    },
    {
      german: 'Flasche',
      article: 'die',
      genderLabel: 'feminine',
      meaning: 'bottle',
      speakable: true,
    },
  ]);

  assert.equal(formula, 'Wasser (water, neuter) + Flasche (bottle, feminine)');
  assert.equal(articleToGenderLabel('der'), 'masculine');
  assert.equal(articleToGenderLabel('die'), 'feminine');
  assert.equal(articleToGenderLabel('das'), 'neuter');
  assert.equal(articleToGenderLabel(''), '');
});

test('normalizeWordFormation strips der/die/das from german word parts and marks linking letters non-speakable', () => {
  const normalized = normalizeWordFormation(
    {
      isCompoundOrDerived: true,
      explanation: 'Last noun Flasche gives the compound its feminine gender (die Wasserflasche).',
      parts: [
        {
          german: 'das Wasser',
          article: 'das',
          meaning: 'water',
          hindiMeaning: 'पानी',
          devanagari: 'वासर',
          speakable: true,
        },
        {
          german: '-s-',
          role: 'linking letter',
          meaning: 'connector',
          speakable: true,
        },
        {
          german: 'die Flasche',
          article: 'die',
          meaning: 'bottle',
          hindiMeaning: 'बोतल',
          devanagari: 'फ़्लाशे',
          speakable: true,
        },
      ],
    },
    'Wasserflasche',
  );

  assert.equal(normalized.isCompoundOrDerived, true);
  assert.equal(normalized.parts.length, 3);
  assert.equal(normalized.parts[0].german, 'Wasser');
  assert.equal(normalized.parts[0].genderLabel, 'neuter');
  assert.equal(normalized.parts[0].speakable, true);
  assert.equal(normalized.parts[1].german, '-s-');
  assert.equal(normalized.parts[1].speakable, false);
  assert.equal(normalized.parts[2].german, 'Flasche');
  assert.equal(normalized.parts[2].genderLabel, 'feminine');
  assert.equal(normalized.parts[2].speakable, true);
});
