import test from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_WORDS } from '../data/curatedWords';
import {
  filterEntries,
  findExactWordMatch,
  getDifficultyMeta,
  getLipDimensions,
  getTongueCoordinates,
  normalizeGeneratedEntry,
  normalizeGermanQuery,
  toggleSavedWordId,
  upsertRecentEntry,
} from './dictionary';

test('normalizeGermanQuery handles umlauts and eszett consistently', () => {
  assert.equal(normalizeGermanQuery('Brötchen'), 'broetchen');
  assert.equal(normalizeGermanQuery('Tschüss'), 'tschuess');
  assert.equal(normalizeGermanQuery('Mädchen'), 'maedchen');
  assert.equal(normalizeGermanQuery('Straße'), 'strasse');
});

test('filterEntries matches umlaut words via plain ASCII, German, English, and Hindi queries', () => {
  const byPlainAscii = filterEntries(CURATED_WORDS, 'broetchen', 'all');
  assert.equal(byPlainAscii.length, 1);
  assert.equal(byPlainAscii[0].id, 'broetchen');

  const byStripped = filterEntries(CURATED_WORDS, 'kuche', 'all');
  assert.ok(byStripped.some((w) => w.id === 'kueche'));

  const byEnglish = filterEntries(CURATED_WORDS, 'barber', 'all');
  assert.equal(byEnglish[0]?.id, 'friseur');

  const byHindi = filterEntries(CURATED_WORDS, 'गिलहरी', 'all');
  assert.equal(byHindi[0]?.id, 'eichhoernchen');
});

test('filterEntries respects category tabs', () => {
  const loanwords = filterEntries(CURATED_WORDS, '', 'loanwords');
  assert.ok(loanwords.length >= 4);
  assert.ok(loanwords.every((w) => w.categories.includes('loanwords')));
  assert.ok(loanwords.some((w) => w.id === 'friseur'));
});

test('findExactWordMatch resolves Friseur with or without article', () => {
  assert.equal(findExactWordMatch(CURATED_WORDS, 'Friseur')?.id, 'friseur');
  assert.equal(findExactWordMatch(CURATED_WORDS, 'der friseur')?.id, 'friseur');
  assert.equal(findExactWordMatch(CURATED_WORDS, 'tschuess')?.id, 'tschuess');
  assert.equal(findExactWordMatch(CURATED_WORDS, 'Schmetterling'), undefined);
});

test('toggleSavedWordId adds and removes cleanly without duplicates', () => {
  const added = toggleSavedWordId(['friseur'], 'kueche');
  assert.deepEqual(added, ['kueche', 'friseur']);
  const removed = toggleSavedWordId(added, 'friseur');
  assert.deepEqual(removed, ['kueche']);
});

test('upsertRecentEntry moves existing entry to top and enforces max limit', () => {
  const first = CURATED_WORDS[0];
  const second = CURATED_WORDS[1];
  const third = CURATED_WORDS[2];
  let recent = upsertRecentEntry([], first, 2);
  recent = upsertRecentEntry(recent, second, 2);
  recent = upsertRecentEntry(recent, first, 2);
  assert.deepEqual(
    recent.map((e) => e.id),
    [first.id, second.id],
  );
  recent = upsertRecentEntry(recent, third, 2);
  assert.deepEqual(
    recent.map((e) => e.id),
    [third.id, first.id],
  );
});

test('normalizeGeneratedEntry safely defaults missing or invalid fields from live AI lookup', () => {
  const entry = normalizeGeneratedEntry(
    {
      word: 'Schmetterling',
      article: 'der',
      englishMeaning: 'butterfly',
      hindiMeaning: 'तितली',
      devanagariFull: 'श्मे-टर-लिंग',
      romanizedFull: 'SHME-ter-ling',
      ipa: '/ˈʃmɛtɐlɪŋ/',
      syllables: [
        {
          id: 'ignored',
          segment: 'Schme-',
          devanagari: 'श्मे',
          romanized: 'SHME',
          ipa: '/ʃmɛ/',
          stressed: true,
          difficulty: 'hindi-match',
          explanation: 'Sch is Hindi श plus म and short ए.',
          articulation: {
            lipShape: 'rounded',
            lipLabel: 'Rounded lips for श',
            tonguePosition: 'front-mid',
            tongueLabel: 'Mid-front tongue',
            hindiAnchor: 'श्मे',
            targetIpa: '/ʃmɛ/',
          },
        },
      ],
    },
    'Schmetterling',
  );

  assert.equal(entry.id, 'schmetterling');
  assert.equal(entry.source, 'live');
  assert.equal(entry.syllables.length, 1);
  assert.equal(entry.syllables[0].id, 'schmetterling-syl-0');
  assert.ok(entry.example.german.includes('Schmetterling'));
});

test('articulation geometry helpers return valid coordinates and dimensions', () => {
  const coords = getTongueCoordinates('front-high');
  assert.ok(coords.cx > 0 && coords.cy > 0);
  const lips = getLipDimensions('tight-circle');
  assert.equal(lips.rx, lips.ry);
  const meta = getDifficultyMeta('new-sound');
  assert.ok(meta.label.includes('Hindi'));
});
