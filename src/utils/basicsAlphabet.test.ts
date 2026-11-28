import test from 'node:test';
import assert from 'node:assert/strict';
import { GERMAN_ALPHABET } from '../data/basicsAlphabet';

test('all 30 German alphabet entries include both letter name and speaking sound metadata', () => {
  assert.equal(GERMAN_ALPHABET.length, 30);

  for (const entry of GERMAN_ALPHABET) {
    assert.ok(entry.devanagariName.trim().length > 0, `${entry.letter} missing devanagariName`);
    assert.ok(
      entry.speakingSoundHindi.trim().length > 0,
      `${entry.letter} missing speakingSoundHindi`,
    );
    assert.ok(
      entry.speakingSoundRoman.trim().length > 0,
      `${entry.letter} missing speakingSoundRoman`,
    );
    assert.ok(
      entry.speakingSoundIpa.trim().length > 0,
      `${entry.letter} missing speakingSoundIpa`,
    );
    assert.ok(
      entry.spokenSoundPrompt.trim().length > 0,
      `${entry.letter} missing spokenSoundPrompt`,
    );
  }
});

test('tricky letters J, V, W, Y, Z, and ß expose distinct speaking sounds in Hindi and German TTS prompts', () => {
  const byLetter = new Map(GERMAN_ALPHABET.map((item) => [item.letter, item]));

  const expected: Record<string, { soundIncludes: string; ipaIncludes: string }> = {
    J: { soundIncludes: 'य', ipaIncludes: '/j/' },
    V: { soundIncludes: 'फ़', ipaIncludes: '/f/' },
    W: { soundIncludes: 'व', ipaIncludes: '/v/' },
    Y: { soundIncludes: 'यू', ipaIncludes: '/y' },
    Z: { soundIncludes: 'त्स', ipaIncludes: '/ts/' },
    ß: { soundIncludes: 'स', ipaIncludes: '/s/' },
  };

  for (const [letter, check] of Object.entries(expected)) {
    const entry = byLetter.get(letter);
    assert.ok(entry, `Missing entry for ${letter}`);
    assert.equal(entry.nameDiffersFromSound, true, `${letter} should be flagged nameDiffersFromSound`);
    assert.ok(
      entry.speakingSoundHindi.includes(check.soundIncludes),
      `${letter} speakingSoundHindi (${entry.speakingSoundHindi}) should include ${check.soundIncludes}`,
    );
    assert.ok(
      entry.speakingSoundIpa.includes(check.ipaIncludes),
      `${letter} speakingSoundIpa (${entry.speakingSoundIpa}) should include ${check.ipaIncludes}`,
    );
    assert.notEqual(
      entry.spokenSoundPrompt,
      entry.spokenLetterPrompt,
      `${letter} spokenSoundPrompt should demonstrate the spoken sound rather than just repeating the letter name`,
    );
  }
});
