import type {
  CollocationItem,
  DictionaryEntry,
  ExampleSentence,
  SyllableBreakdown,
  WordCategory,
} from '../types/dictionary';
import { slugifyWord } from './dictionary';

interface PhonemeToken {
  grapheme: string;
  devanagari: string;
  romanized: string;
  ipa: string;
  isVowel: boolean;
  feature?:
    | 'oe'
    | 'ue'
    | 'ae'
    | 'ich'
    | 'ach'
    | 'uvular-r'
    | 'final-r'
    | 'buzz-s'
    | 'ts-z'
    | 'f-v'
    | 'v-w'
    | 'silent-h'
    | 'sch'
    | 'tsch'
    | 'ei'
    | 'eu'
    | 'ie'
    | 'ng'
    | 'tion'
    | 'sp-st';
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
const BACK_VOWELS = new Set(['a', 'o', 'u']);
const UNSTRESSED_PREFIXES = ['be', 'ge', 'er', 'ver', 'zer', 'ent', 'emp', 'miss'];

function isVowelChar(ch: string | undefined): boolean {
  return Boolean(ch && VOWELS.has(ch.toLowerCase()));
}

/**
 * Tokenizes a single German word into rule-aware grapheme/phoneme units for Hindi speakers.
 */
function tokenizeGermanWord(word: string): PhonemeToken[] {
  const lower = word.toLowerCase();
  const tokens: PhonemeToken[] = [];
  let i = 0;

  while (i < lower.length) {
    const rest = lower.slice(i);
    const prev = i > 0 ? lower[i - 1] : '';
    const next = i + 1 < lower.length ? lower[i + 1] : '';
    const isStart = i === 0;
    const isEnd = i === lower.length - 1;

    // 4-letter clusters
    if (rest.startsWith('tsch')) {
      tokens.push({ grapheme: word.slice(i, i + 4), devanagari: 'च', romanized: 'ch', ipa: 'tʃ', isVowel: false, feature: 'tsch' });
      i += 4;
      continue;
    }
    if (rest.startsWith('tion') && i + 4 >= lower.length - 2) {
      tokens.push({ grapheme: word.slice(i, i + 4), devanagari: 'त्स्योन', romanized: 'tsyohn', ipa: 'tsjoːn', isVowel: true, feature: 'tion' });
      i += 4;
      continue;
    }

    // 3-letter clusters
    if (rest.startsWith('sch')) {
      tokens.push({ grapheme: word.slice(i, i + 3), devanagari: 'श', romanized: 'sh', ipa: 'ʃ', isVowel: false, feature: 'sch' });
      i += 3;
      continue;
    }
    if (rest.startsWith('chs')) {
      tokens.push({ grapheme: word.slice(i, i + 3), devanagari: 'क्स', romanized: 'ks', ipa: 'ks', isVowel: false });
      i += 3;
      continue;
    }
    if (rest === 'ieur' && lower.length > 5) {
      // French loanword ending in German (Ingenieur, Monsieur) -> /iˈøːɐ̯/
      tokens.push({ grapheme: word.slice(i, i + 1), devanagari: 'इ', romanized: 'i', ipa: 'i', isVowel: true });
      tokens.push({ grapheme: word.slice(i + 1, i + 3), devanagari: 'यॉ / ओ', romanized: 'ö', ipa: 'øː', isVowel: true, feature: 'oe' });
      tokens.push({ grapheme: word.slice(i + 3, i + 4), devanagari: 'अ', romanized: 'ah', ipa: 'ɐ̯', isVowel: false, feature: 'final-r' });
      i += 4;
      continue;
    }
    if (rest === 'eur' && lower.length > 4) {
      // French loanword ending in German (Friseur, Masseur, Regisseur) -> /øːɐ̯/
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'यॉ / ओ', romanized: 'ö', ipa: 'øː', isVowel: true, feature: 'oe' });
      tokens.push({ grapheme: word.slice(i + 2, i + 3), devanagari: 'अ', romanized: 'ah', ipa: 'ɐ̯', isVowel: false, feature: 'final-r' });
      i += 3;
      continue;
    }

    // 2-letter clusters
    if (rest.startsWith('ch')) {
      const prev2 = i >= 2 ? lower.slice(i - 2, i) : '';
      const afterCh = lower[i + 2] ?? '';
      const isBack = (BACK_VOWELS.has(prev) && prev2 !== 'eu' && prev2 !== 'äu') || prev2 === 'au';
      if (isStart && /[aorlu]/.test(afterCh)) {
        // Initial ch before a/o/r/l/u in Greek/Latin loanwords (Chor, Charakter, Christ, Chaos) -> /k/
        tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'क', romanized: 'k', ipa: 'k', isVowel: false });
      } else if (isBack) {
        tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'ख़', romanized: 'kh', ipa: 'x', isVowel: false, feature: 'ach' });
      } else {
        tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'श्य', romanized: 'ch', ipa: 'ç', isVowel: false, feature: 'ich' });
      }
      i += 2;
      continue;
    }
    if (rest.startsWith('ei') || rest.startsWith('ai')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'आइ', romanized: 'ai', ipa: 'aɪ̯', isVowel: true, feature: 'ei' });
      i += 2;
      continue;
    }
    if (rest.startsWith('eu') || rest.startsWith('äu')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'ऑय', romanized: 'oy', ipa: 'ɔʏ̯', isVowel: true, feature: 'eu' });
      i += 2;
      continue;
    }
    if (rest.startsWith('au')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'आउ', romanized: 'au', ipa: 'aʊ̯', isVowel: true });
      i += 2;
      continue;
    }
    if (rest.startsWith('ie')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'ई', romanized: 'ee', ipa: 'iː', isVowel: true, feature: 'ie' });
      i += 2;
      continue;
    }
    if (rest.startsWith('ng')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'ंग', romanized: 'ng', ipa: 'ŋ', isVowel: false, feature: 'ng' });
      i += 2;
      continue;
    }
    if (rest.startsWith('ck')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'क', romanized: 'k', ipa: 'k', isVowel: false });
      i += 2;
      continue;
    }
    if (rest.startsWith('tz')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'त्स', romanized: 'ts', ipa: 'ts', isVowel: false, feature: 'ts-z' });
      i += 2;
      continue;
    }
    if (rest.startsWith('pf')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'प्फ़', romanized: 'pf', ipa: 'pf', isVowel: false });
      i += 2;
      continue;
    }
    if (rest.startsWith('ph')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'फ़', romanized: 'f', ipa: 'f', isVowel: false });
      i += 2;
      continue;
    }
    if (rest.startsWith('qu')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'क्व', romanized: 'kv', ipa: 'kv', isVowel: false });
      i += 2;
      continue;
    }
    if (rest.startsWith('th')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'ट', romanized: 't', ipa: 't', isVowel: false, feature: 'silent-h' });
      i += 2;
      continue;
    }
    const prefixBefore = lower.slice(0, i);
    const afterPrefixBoundary =
      isStart ||
      ['be', 'ge', 'er', 'ver', 'zer', 'ent', 'emp', 'auf', 'aus', 'ein', 'an', 'ab', 'zu', 'mit', 'vor', 'nach', 'um', 'bei'].includes(
        prefixBefore,
      );
    if (afterPrefixBoundary && (rest.startsWith('sp') || rest.startsWith('st'))) {
      const c2 = lower[i + 1];
      tokens.push({
        grapheme: word.slice(i, i + 2),
        devanagari: c2 === 'p' ? 'श्प' : 'श्ट',
        romanized: c2 === 'p' ? 'shp' : 'sht',
        ipa: c2 === 'p' ? 'ʃp' : 'ʃt',
        isVowel: false,
        feature: 'sp-st',
      });
      i += 2;
      continue;
    }
    if (rest.startsWith('ss')) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'स', romanized: 's', ipa: 's', isVowel: false });
      i += 2;
      continue;
    }
    if (rest === 'er' && lower.length > 2) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'अ', romanized: 'ah', ipa: 'ɐ', isVowel: true, feature: 'final-r' });
      i += 2;
      continue;
    }
    if (rest === 'ig' && lower.length > 3) {
      tokens.push({ grapheme: word.slice(i, i + 2), devanagari: 'इश्य', romanized: 'ish', ipa: 'ɪç', isVowel: true, feature: 'ich' });
      i += 2;
      continue;
    }

    // Silent stretching h after a vowel (Dehnungs-h)
    if (lower[i] === 'h' && isVowelChar(prev) && !isVowelChar(next)) {
      tokens.push({ grapheme: word.slice(i, i + 1), devanagari: '', romanized: '', ipa: 'ː', isVowel: false, feature: 'silent-h' });
      i += 1;
      continue;
    }

    // Doubled consonants collapse to a single crisp sound
    if (!isVowelChar(lower[i]) && lower[i] === next && /[bcdfgklmnprt]/.test(lower[i])) {
      i += 1;
      continue;
    }

    // Single letters
    const ch = lower[i];
    const orig = word[i];
    switch (ch) {
      case 'a':
        tokens.push({ grapheme: orig, devanagari: 'आ', romanized: 'ah', ipa: next === 'h' ? 'aː' : 'a', isVowel: true });
        break;
      case 'e':
        tokens.push({
          grapheme: orig,
          devanagari: isEnd ? 'ए' : 'ए',
          romanized: isEnd ? 'e' : 'eh',
          ipa: isEnd ? 'ə' : 'e',
          isVowel: true,
        });
        break;
      case 'i':
        tokens.push({ grapheme: orig, devanagari: isVowelChar(next) ? 'इ' : 'इ', romanized: 'i', ipa: 'ɪ', isVowel: true });
        break;
      case 'o':
        tokens.push({ grapheme: orig, devanagari: 'ओ', romanized: 'oh', ipa: 'o', isVowel: true });
        break;
      case 'u':
        tokens.push({ grapheme: orig, devanagari: 'उ', romanized: 'oo', ipa: 'u', isVowel: true });
        break;
      case 'ä':
        tokens.push({ grapheme: orig, devanagari: 'ऐ', romanized: 'ae', ipa: 'ɛ', isVowel: true, feature: 'ae' });
        break;
      case 'ö':
        tokens.push({ grapheme: orig, devanagari: 'यॉ / ओ', romanized: 'ö', ipa: 'øː', isVowel: true, feature: 'oe' });
        break;
      case 'ü':
        tokens.push({ grapheme: orig, devanagari: 'यू / इउ', romanized: 'ü', ipa: 'yː', isVowel: true, feature: 'ue' });
        break;
      case 'y':
        tokens.push({ grapheme: orig, devanagari: 'इ', romanized: 'i', ipa: 'ʏ', isVowel: true });
        break;
      case 'b':
        tokens.push({ grapheme: orig, devanagari: isEnd ? 'प' : 'ब', romanized: isEnd ? 'p' : 'b', ipa: isEnd ? 'p' : 'b', isVowel: false });
        break;
      case 'c':
        tokens.push({ grapheme: orig, devanagari: /[eiyäö]/.test(next) ? 'त्स' : 'क', romanized: /[eiyäö]/.test(next) ? 'ts' : 'k', ipa: /[eiyäö]/.test(next) ? 'ts' : 'k', isVowel: false });
        break;
      case 'd':
        tokens.push({ grapheme: orig, devanagari: isEnd ? 'ट' : 'ड', romanized: isEnd ? 't' : 'd', ipa: isEnd ? 't' : 'd', isVowel: false });
        break;
      case 'f':
        tokens.push({ grapheme: orig, devanagari: 'फ़', romanized: 'f', ipa: 'f', isVowel: false });
        break;
      case 'g':
        tokens.push({ grapheme: orig, devanagari: isEnd ? 'क' : 'ग', romanized: isEnd ? 'k' : 'g', ipa: isEnd ? 'k' : 'ɡ', isVowel: false });
        break;
      case 'h':
        tokens.push({ grapheme: orig, devanagari: 'ह', romanized: 'h', ipa: 'h', isVowel: false });
        break;
      case 'j':
        tokens.push({ grapheme: orig, devanagari: 'य', romanized: 'y', ipa: 'j', isVowel: false });
        break;
      case 'k':
        tokens.push({ grapheme: orig, devanagari: 'क', romanized: 'k', ipa: 'k', isVowel: false });
        break;
      case 'l':
        tokens.push({ grapheme: orig, devanagari: 'ल', romanized: 'l', ipa: 'l', isVowel: false });
        break;
      case 'm':
        tokens.push({ grapheme: orig, devanagari: 'म', romanized: 'm', ipa: 'm', isVowel: false });
        break;
      case 'n':
        tokens.push({ grapheme: orig, devanagari: 'न', romanized: 'n', ipa: 'n', isVowel: false });
        break;
      case 'p':
        tokens.push({ grapheme: orig, devanagari: 'प', romanized: 'p', ipa: 'p', isVowel: false });
        break;
      case 'r':
        if (isEnd || !isVowelChar(next)) {
          tokens.push({ grapheme: orig, devanagari: 'अ', romanized: 'ah', ipa: 'ɐ̯', isVowel: false, feature: 'final-r' });
        } else {
          tokens.push({ grapheme: orig, devanagari: 'र', romanized: 'r', ipa: 'ʁ', isVowel: false, feature: 'uvular-r' });
        }
        break;
      case 's':
        if (isVowelChar(next) && (isStart || isVowelChar(prev) || /[lmnr]/.test(prev))) {
          tokens.push({ grapheme: orig, devanagari: 'ज़', romanized: 'z', ipa: 'z', isVowel: false, feature: 'buzz-s' });
        } else {
          tokens.push({ grapheme: orig, devanagari: 'स', romanized: 's', ipa: 's', isVowel: false });
        }
        break;
      case 'ß':
        tokens.push({ grapheme: orig, devanagari: 'स', romanized: 'ss', ipa: 's', isVowel: false });
        break;
      case 't':
        tokens.push({ grapheme: orig, devanagari: 'ट', romanized: 't', ipa: 't', isVowel: false });
        break;
      case 'v':
        tokens.push({ grapheme: orig, devanagari: 'फ़', romanized: 'f', ipa: 'f', isVowel: false, feature: 'f-v' });
        break;
      case 'w':
        tokens.push({ grapheme: orig, devanagari: 'व', romanized: 'v', ipa: 'v', isVowel: false, feature: 'v-w' });
        break;
      case 'x':
        tokens.push({ grapheme: orig, devanagari: 'क्स', romanized: 'ks', ipa: 'ks', isVowel: false });
        break;
      case 'z':
        tokens.push({ grapheme: orig, devanagari: 'त्स', romanized: 'ts', ipa: 'ts', isVowel: false, feature: 'ts-z' });
        break;
      default:
        break;
    }
    i += 1;
  }

  return tokens;
}

const MATRA_MAP: Record<string, string> = {
  'आ': 'ा',
  'इ': 'ि',
  'ई': 'ी',
  'उ': 'ु',
  'ऊ': 'ू',
  'ए': 'े',
  'ऐ': 'ै',
  'ओ': 'ो',
  'ऑ': 'ॉ',
  'अ': '',
};

/**
 * Joins consonant + vowel Devanagari tokens naturally using matras (e.g. ब + इ -> बि, ल + ओ -> लो).
 */
function combineDevanagariTokens(tokens: PhonemeToken[]): string {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok.devanagari) continue;

    // Handle multi-char vowel approximations cleanly
    if (tok.feature === 'oe') {
      if (out && !tokens[i - 1]?.isVowel && !/[ािीुूेैोॉं्]$/.test(out)) {
        out += '्यॉ';
      } else {
        out += 'यॉ';
      }
      continue;
    }
    if (tok.feature === 'ue') {
      if (out && !tokens[i - 1]?.isVowel && !/[ािीुूेैोॉं्]$/.test(out)) {
        out += '्यू';
      } else {
        out += 'यू';
      }
      continue;
    }
    if (tok.feature === 'ei') {
      if (out && !tokens[i - 1]?.isVowel && !/[ािीुूेैोॉं्]$/.test(out)) {
        out += 'ाइ';
      } else {
        out += 'आइ';
      }
      continue;
    }
    if (tok.feature === 'eu') {
      if (out && !tokens[i - 1]?.isVowel && !/[ािीुूेैोॉं्]$/.test(out)) {
        out += 'ॉय';
      } else {
        out += 'ऑय';
      }
      continue;
    }
    if (tok.grapheme.toLowerCase() === 'au') {
      if (out && !tokens[i - 1]?.isVowel && !/[ािीुूेैोॉं्]$/.test(out)) {
        out += 'ाउ';
      } else {
        out += 'आउ';
      }
      continue;
    }

    if (tok.isVowel && tok.devanagari in MATRA_MAP && out && !tokens[i - 1]?.isVowel && !/[ािीुूेैोॉं्]$/.test(out)) {
      out += MATRA_MAP[tok.devanagari];
    } else if (
      !tok.isVowel &&
      tokens[i + 1] &&
      !tokens[i + 1].isVowel &&
      tokens[i + 1].devanagari &&
      tok.devanagari.length === 1 &&
      tok.feature !== 'ng' &&
      tok.feature !== 'final-r'
    ) {
      // Half-consonant cluster (e.g. प्र, ब्र, श्ट)
      out += tok.devanagari + '्';
    } else {
      out += tok.devanagari;
    }
  }
  return out;
}

/**
 * Splits tokenized German phonemes into readable syllable chunks around vowel nuclei.
 */
function groupIntoSyllables(tokens: PhonemeToken[]): PhonemeToken[][] {
  const vowelIndices = tokens
    .map((t, idx) => (t.isVowel ? idx : -1))
    .filter((idx) => idx >= 0);

  if (vowelIndices.length <= 1) {
    return tokens.length > 0 ? [tokens] : [];
  }

  const syllables: PhonemeToken[][] = [];
  let start = 0;

  for (let v = 0; v < vowelIndices.length - 1; v++) {
    const currVowel = vowelIndices[v];
    const nextVowel = vowelIndices[v + 1];
    const betweenCount = nextVowel - currVowel - 1;

    let splitAt: number;
    if (betweenCount <= 0) {
      splitAt = currVowel + 1;
    } else if (betweenCount === 1) {
      // Single consonant starts the next syllable (unless it's silent-h or final-r)
      const mid = tokens[currVowel + 1];
      splitAt = mid.feature === 'silent-h' || mid.feature === 'final-r' ? currVowel + 2 : currVowel + 1;
    } else {
      // 2+ consonants split between them (keep first coda consonant with current syllable)
      splitAt = currVowel + 2;
    }

    syllables.push(tokens.slice(start, splitAt));
    start = splitAt;
  }

  if (start < tokens.length) {
    syllables.push(tokens.slice(start));
  }

  return syllables.filter((chunk) => chunk.length > 0);
}

function detectStressedSyllableIndex(word: string, syllableCount: number): number {
  if (syllableCount <= 1) return 0;
  const lower = word.toLowerCase();
  if (lower.endsWith('ieren') || lower.endsWith('iert') || lower.endsWith('ierte')) {
    return Math.max(0, syllableCount - 2);
  }
  if (
    lower.endsWith('tion') ||
    lower.endsWith('ei') ||
    lower.endsWith('eur') ||
    lower.endsWith('tät') ||
    lower.endsWith('ik') ||
    (lower.endsWith('ie') && !['familie', 'linie', 'aktie', 'ferie', 'serie'].includes(lower))
  ) {
    return syllableCount - 1;
  }
  if (/isch(e|es|er|en|em)?$/.test(lower) && syllableCount >= 2) {
    const inflected = /isch(e|es|er|en|em)$/.test(lower);
    return Math.max(0, syllableCount - (inflected ? 3 : 2));
  }
  if (UNSTRESSED_PREFIXES.some((p) => lower.startsWith(p) && lower.length > p.length + 2)) {
    return 1;
  }
  return 0;
}

function buildSyllableCoaching(
  chunk: PhonemeToken[],
  index: number,
  total: number,
  stressed: boolean,
  idPrefix: string,
): SyllableBreakdown {
  const rawSeg = chunk.map((t) => t.grapheme).join('');
  const segment =
    total === 1
      ? rawSeg
      : index === 0
        ? `${rawSeg}-`
        : index === total - 1
          ? `-${rawSeg}`
          : `-${rawSeg}-`;

  const devanagari = combineDevanagariTokens(chunk) || rawSeg;
  const romanRaw = chunk.map((t) => t.romanized).join('');
  const romanized = stressed ? romanRaw.toUpperCase() : romanRaw;
  const ipa = `/${chunk.map((t) => t.ipa).join('')}/`;

  const features = new Set(chunk.map((t) => t.feature).filter(Boolean));

  if (features.has('oe')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'new-sound',
      explanation:
        'Contains the rounded German ö vowel (/øː/ or /œ/), which does not exist natively in Hindi.',
      mouthSteps: [
        'Shape your lips in a tight circle as if you are about to say ओ (o).',
        'Without moving your lips, try to say ए (e as in एक) with your tongue.',
      ],
      quickShortcut: 'A slightly rounded यॉ or tight ओ will still be understood naturally.',
      articulation: {
        lipShape: 'tight-circle',
        lipLabel: 'Tight circle like Hindi ओ',
        tonguePosition: 'front-mid',
        tongueLabel: 'Forward and mid-high like Hindi ए (एक)',
        hindiAnchor: 'Lips of ओ + tongue of ए',
        targetIpa: '/øː/',
      },
    };
  }

  if (features.has('ue')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'new-sound',
      explanation:
        'Contains the rounded German ü vowel (/yː/ or /ʏ/)—never pronounce it as plain Hindi उ.',
      mouthSteps: [
        'Purse your lips tightly as if whistling or saying ऊ (oo).',
        'Keep your lips frozen in that circle and say ई (ee as in कील) with your tongue.',
      ],
      quickShortcut: 'A crisp, tight-lipped यू gets you very close while practicing.',
      articulation: {
        lipShape: 'tight-circle',
        lipLabel: 'Tight whistle circle like ऊ',
        tonguePosition: 'front-high',
        tongueLabel: 'High forward tongue like ई',
        hindiAnchor: 'Lips of ऊ + tongue of ई',
        targetIpa: '/yː/',
      },
    };
  }

  if (features.has('ich')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'new-sound',
      explanation:
        'Uses the soft front German ich-Laut (/ç/), an airy whisper between ह्य and light श—never harsh throat ख़ or heavy क.',
      mouthSteps: [
        'Keep your lips flat and relaxed (do not pucker them like Hindi श).',
        'Blow gentle air across the middle of your tongue, like the start of English "huge" (ह्यूज).',
      ],
      quickShortcut: 'A very light, flat-lipped श्य / ह्य is naturally understood.',
      articulation: {
        lipShape: 'spread',
        lipLabel: 'Flat unrounded lips',
        tonguePosition: 'front-high',
        tongueLabel: 'Middle tongue lifted close to hard palate',
        hindiAnchor: 'Whispery ह्य (as in "huge")',
        targetIpa: '/ç/',
      },
    };
  }

  if (features.has('ach')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'hindi-match',
      explanation:
        'After a, o, u, or au, German ch is the deep throat ach-Laut (/x/)—an exact match to the Hindi/Urdu nuqta ख़ (as in ख़बर or ख़ुश)!',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Relaxed neutral lips',
        tonguePosition: 'back-throat',
        tongueLabel: 'Gentle back-of-throat friction',
        hindiAnchor: 'Exact Hindi ख़ (ख़बर, ख़ुश)',
        targetIpa: '/x/',
      },
    };
  }

  if (features.has('buzz-s')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'hindi-match',
      explanation:
        'In German, s before a vowel buzzes like Hindi ज़ (with a nuqta, as in ज़मीन)—never a hissing स.',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Relaxed parted lips',
        tonguePosition: 'alveolar-buzz',
        tongueLabel: 'Voiced buzz behind upper front teeth',
        hindiAnchor: 'Hindi ज़ as in ज़मीन',
        targetIpa: '/z/',
      },
    };
  }

  if (features.has('ts-z')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'subtle-shift',
      explanation:
        'German z / tz is NEVER a buzzing ज़—it is always a crisp त्स snap (like the "ts" in English "cats").',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Neutral lips',
        tonguePosition: 'alveolar-buzz',
        tongueLabel: 'Quick voiceless त + स release',
        hindiAnchor: 'त्स (like "cats")',
        targetIpa: '/ts/',
      },
    };
  }

  if (features.has('final-r')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'subtle-shift',
      explanation:
        'At the end of a syllable or word, German -r / -er is not rolled; it relaxes into a short, soft अ (uh) sound.',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Relaxed lips',
        tonguePosition: 'central',
        tongueLabel: 'Tongue drops to a soft central rest',
        hindiAnchor: 'Very light, unstressed Hindi अ',
        targetIpa: '/ɐ̯/',
      },
    };
  }

  if (features.has('uvular-r')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'subtle-shift',
      explanation:
        'Standard German r is produced softly in the back of the throat (like a very light ग़ / ख़) rather than rolling the tip of your tongue like Hindi र.',
      quickShortcut: 'A gentle, single-tap Hindi र is also widely understood across Germany and Austria.',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Neutral lips',
        tonguePosition: 'back-throat',
        tongueLabel: 'Back of tongue grazes uvula softly',
        hindiAnchor: 'Soft throat ग़ / ख़ + vowel',
        targetIpa: '/ʁ/',
      },
    };
  }

  if (features.has('silent-h')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'subtle-shift',
      explanation:
        'The h here is silent (Dehnungs-h or th)—do not pronounce ह; instead hold the vowel cleanly and smoothly.',
      articulation: {
        lipShape: 'open',
        lipLabel: 'Clear held vowel posture',
        tonguePosition: 'central',
        tongueLabel: 'Steady vowel without breathing ह',
        hindiAnchor: 'Skip the h and stretch the vowel cleanly',
        targetIpa: ipa,
      },
    };
  }

  if (features.has('f-v')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'subtle-shift',
      explanation:
        'In native German words, the letter v is pronounced like a clean फ़ (f, as in फ़ोन), not व.',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Upper teeth lightly touch lower lip',
        tonguePosition: 'teeth-lip',
        tongueLabel: 'Steady air stream between teeth and lower lip',
        hindiAnchor: 'Nuqta फ़ (as in फ़ोन)',
        targetIpa: '/f/',
      },
    };
  }

  if (features.has('v-w')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'hindi-match',
      explanation:
        'German w always sounds like a crisp Hindi व (as in वक्त) with upper teeth lightly brushing the lower lip.',
      articulation: {
        lipShape: 'neutral',
        lipLabel: 'Upper teeth lightly brush lower lip',
        tonguePosition: 'teeth-lip',
        tongueLabel: 'Voiced labiodental व',
        hindiAnchor: 'Crisp Hindi व (वक्त)',
        targetIpa: '/v/',
      },
    };
  }

  if (features.has('sch') || features.has('sp-st')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'hindi-match',
      explanation:
        features.has('sp-st')
          ? 'At the start of a German word/root, sp and st are pronounced श्प (shp) and श्ट (sht), not स्प/स्ट.'
          : 'German sch always produces a full, rounded Hindi श sound (as in शाम).',
      articulation: {
        lipShape: 'rounded',
        lipLabel: 'Lips slightly pushed forward for श',
        tonguePosition: 'alveolar-buzz',
        tongueLabel: 'Tongue blade lifted behind ridge',
        hindiAnchor: `Hindi ${devanagari}`,
        targetIpa: ipa,
      },
    };
  }

  if (features.has('ei')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'hindi-match',
      explanation:
        'German ei / ai is always pronounced like Hindi आइ (as in आईना / English "eye").',
      articulation: {
        lipShape: 'open',
        lipLabel: 'Opens for आ then narrows for इ',
        tonguePosition: 'central',
        tongueLabel: 'Glides smoothly from low आ to front इ',
        hindiAnchor: 'Exact Hindi आइ (आईना)',
        targetIpa: '/aɪ̯/',
      },
    };
  }

  if (features.has('eu')) {
    return {
      id: `${idPrefix}-syl-${index}`,
      segment,
      devanagari,
      romanized,
      ipa,
      stressed,
      difficulty: 'hindi-match',
      explanation:
        'In native German spelling, eu / äu is pronounced ऑय (like English "boy" / Hindi ऑय).',
      articulation: {
        lipShape: 'rounded',
        lipLabel: 'Rounded lips gliding to spread इ',
        tonguePosition: 'central',
        tongueLabel: 'Glides from back ऑ to front इ',
        hindiAnchor: 'Like "boy" → ऑय',
        targetIpa: '/ɔʏ̯/',
      },
    };
  }

  return {
    id: `${idPrefix}-syl-${index}`,
    segment,
    devanagari,
    romanized,
    ipa,
    stressed,
    difficulty: 'hindi-match',
    explanation: stressed
      ? `Primary stressed syllable — pronounce clearly as "${devanagari}" with steady, pure German vowel quality.`
      : `Pronounce cleanly and lightly as "${devanagari}" keeping vowels crisp and un-slurred.`,
    articulation: {
      lipShape: /[ओउऊ]/.test(devanagari) ? 'rounded' : /[ईइ]/.test(devanagari) ? 'spread' : 'neutral',
      lipLabel: /[ओउऊ]/.test(devanagari)
        ? 'Clean rounded lips'
        : /[ईइ]/.test(devanagari)
          ? 'Slightly spread lips'
          : 'Relaxed neutral lips',
      tonguePosition: /[ईइएऐ]/.test(devanagari) ? 'front-mid' : 'central',
      tongueLabel: /[ईइएऐ]/.test(devanagari)
        ? 'Front tongue for pure vowel'
        : 'Relaxed central tongue position',
      hindiAnchor: `Clear Hindi ${devanagari}`,
      targetIpa: ipa,
    },
  };
}

/**
 * Generates a fast Devanagari pronunciation preview for any German word or phrase.
 */
export function transliterateGermanToDevanagari(text: string): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((rawWord) => {
      const clean = rawWord.replace(/^[^a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+$/g, '');
      if (!clean) return rawWord;
      const tokens = tokenizeGermanWord(clean);
      const syllables = groupIntoSyllables(tokens);
      if (syllables.length === 0) return clean;
      return syllables.map((s) => combineDevanagariTokens(s)).filter(Boolean).join('-');
    })
    .join(' ');
}

function buildNaturalSampleSentences(
  word: string,
  article: string,
  pos: string,
  englishMeaning: string,
  collocations: CollocationItem[],
): ExampleSentence[] {
  const firstMeaning = englishMeaning.split(';')[0]?.split(',')[0]?.trim() || word;
  const sentences: ExampleSentence[] = [];
  const lowerPos = pos.toLowerCase();

  if (lowerPos.includes('noun') && article) {
    const g1 = `Wo finde ich hier ${article === 'der' ? 'den' : article} ${word}?`;
    const g2 = `Wir sprechen heute über ${article === 'der' ? 'das Thema' : ''} ${article} ${word}.`.replace(/\s+/g, ' ');
    sentences.push({
      german: g1,
      devanagari: `${transliterateGermanToDevanagari(g1)}?`,
      english: `Where can I find the ${firstMeaning} here?`,
      hindi: `यहाँ मुझे "${firstMeaning}" कहाँ मिलेगा?`,
    });
    sentences.push({
      german: `${article.charAt(0).toUpperCase() + article.slice(1)} ${word} ist im Alltag sehr wichtig.`,
      devanagari: `${transliterateGermanToDevanagari(`${article} ${word} ist im Alltag sehr wichtig`)}.`,
      english: `The ${firstMeaning} is very important in everyday life.`,
      hindi: `दैनिक जीवन में "${firstMeaning}" बहुत महत्वपूर्ण है।`,
    });
    void g2;
  } else if (lowerPos.includes('verb')) {
    const g1 = `Ich möchte dieses Wort im Satz „${word}“ richtig aussprechen.`;
    const g2 = `Wir können das heute zusammen ${word}.`;
    sentences.push({
      german: g2,
      devanagari: `${transliterateGermanToDevanagari(g2)}.`,
      english: `We can ${firstMeaning.replace(/^to\s+/i, '')} that together today.`,
      hindi: `हम आज इसे साथ मिलकर कर सकते हैं (${firstMeaning})।`,
    });
    sentences.push({
      german: g1,
      devanagari: `${transliterateGermanToDevanagari(`Ich möchte ${word} richtig aussprechen`)}.`,
      english: `I would like to pronounce "${word}" (${firstMeaning}) accurately.`,
      hindi: `मैं "${word}" का सही उच्चारण करना चाहता हूँ।`,
    });
  } else if (lowerPos.includes('adj')) {
    const base = word.replace(/(es|er|en|em|e)$/i, '');
    const stem = base.length >= 4 && word.toLowerCase() !== base.toLowerCase() ? word : `${word}e`;
    const g1 = `Das ist ein sehr ${word.toLowerCase().endsWith('es') ? word : `${word}es`} Beispiel.`;
    const g2 = `Im Alltag begegnet man oft dem Wort „${word}“.`;
    sentences.push({
      german: g1,
      devanagari: `${transliterateGermanToDevanagari(g1)}.`,
      english: `That is a very ${firstMeaning} example.`,
      hindi: `यह एक बहुत ही "${firstMeaning}" उदाहरण है।`,
    });
    if (collocations.length > 0) {
      const col = collocations[0];
      const gCol = `Dieses Thema betrifft ${col.article ? `${col.article} ` : ''}${col.german}.`;
      sentences.push({
        german: gCol,
        devanagari: `${transliterateGermanToDevanagari(gCol)}.`,
        english: `This topic concerns ${col.english}.`,
        hindi: `यह विषय "${col.english}" से संबंधित है।`,
      });
    } else {
      sentences.push({
        german: g2,
        devanagari: `${transliterateGermanToDevanagari(`Im Alltag begegnet man oft ${stem}`)}.`,
        english: `You often encounter the word "${word}" (${firstMeaning}) in daily German.`,
        hindi: `रोज़मर्रा की जर्मन में "${word}" शब्द अक्सर सुनने को मिलता है।`,
      });
    }
  } else {
    const g1 = `Wie spricht man „${word}“ auf Deutsch aus?`;
    const g2 = `Ich benutze „${word}“ jeden Tag im Gespräch.`;
    sentences.push({
      german: g1,
      devanagari: `${transliterateGermanToDevanagari(`Wie spricht man ${word} auf Deutsch aus`)}?`,
      english: `How do you pronounce "${word}" (${firstMeaning}) in German?`,
      hindi: `जर्मन में "${word}" का उच्चारण कैसे करते हैं?`,
    });
    sentences.push({
      german: g2,
      devanagari: `${transliterateGermanToDevanagari(`Ich benutze ${word} jeden Tag im Gespräch`)}.`,
      english: `I use "${word}" (${firstMeaning}) every day in conversation.`,
      hindi: `मैं बातचीत में रोज़ "${word}" का इस्तेमाल करता हूँ।`,
    });
  }

  return sentences;
}

/**
 * Deterministically generates a full, structured Hindi-native pronunciation DictionaryEntry
 * for ANY German word from the 382,641-word in-repo lexicon.
 */
export function buildDeterministicGermanEntry(params: {
  word: string;
  article?: string;
  partOfSpeech?: string;
  englishMeaning?: string;
  ipa?: string;
  collocations?: CollocationItem[];
  matchedQuery?: string;
}): DictionaryEntry {
  const cleanWord = params.word.trim();
  const id = slugifyWord(cleanWord);
  const words = cleanWord.split(/\s+/).filter(Boolean);
  const primaryWord = words[0] || cleanWord;

  const allSyllables: SyllableBreakdown[] = [];
  const devParts: string[] = [];
  const romParts: string[] = [];
  const ipaParts: string[] = [];

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const tokenWord = words[wIdx].replace(/^[^a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+$/g, '') || words[wIdx];
    const tokens = tokenizeGermanWord(tokenWord);
    const grouped = groupIntoSyllables(tokens);
    const stressIdx = detectStressedSyllableIndex(tokenWord, grouped.length);

    const wordDev: string[] = [];
    const wordRom: string[] = [];
    const wordIpa: string[] = [];

    grouped.forEach((chunk, idx) => {
      const stressed = wIdx === 0 && idx === stressIdx;
      const coaching = buildSyllableCoaching(chunk, idx, grouped.length, stressed, `${id}-w${wIdx}`);
      allSyllables.push(coaching);
      wordDev.push(coaching.devanagari);
      wordRom.push(coaching.romanized);
      wordIpa.push((stressed ? 'ˈ' : '') + coaching.ipa.replace(/^\/|\/$/g, ''));
    });

    devParts.push(wordDev.join('-'));
    romParts.push(wordRom.join('-'));
    ipaParts.push(wordIpa.join(''));
  }

  const lower = cleanWord.toLowerCase();
  const categories: Exclude<WordCategory, 'all'>[] = [];
  if (/[äöü]/.test(lower)) categories.push('umlauts');
  if (lower.includes('ch') || lower.includes('r')) categories.push('ch-r');
  if (lower.endsWith('eur') || lower.endsWith('tion') || lower.includes('ph') || lower.includes('th')) {
    categories.push('loanwords');
  }
  if (categories.length === 0) categories.push('everyday');

  const stressedSyl = allSyllables.find((s) => s.stressed) ?? allSyllables[0];
  const stressedPos = Math.max(1, allSyllables.findIndex((s) => s.stressed) + 1);
  const ordinal =
    stressedPos === 1 ? 'first' : stressedPos === 2 ? 'second' : stressedPos === 3 ? 'third' : `${stressedPos}th`;

  const validArticle =
    params.article === 'der' || params.article === 'die' || params.article === 'das'
      ? params.article
      : '';

  const collocations = params.collocations ?? [];
  const englishMeaning = params.englishMeaning?.trim() || 'German dictionary entry';
  const partOfSpeech = params.partOfSpeech?.trim() || (validArticle ? 'Noun' : 'German word');

  const examples = buildNaturalSampleSentences(
    cleanWord,
    validArticle,
    partOfSpeech,
    englishMeaning,
    collocations,
  );

  const notes: string[] = [];
  if (/[öü]/.test(lower)) {
    notes.push('Keep your lips tightly rounded on ö/ü while holding the front vowel tongue position.');
  }
  if (lower.includes('ch')) {
    notes.push('Watch the ch sound: soft front ह्य/श्य after front vowels or consonants, throat ख़ after a/o/u.');
  }
  if (lower.includes('z')) {
    notes.push('Remember that German z snaps as त्स (ts), never buzzing ज़.');
  }
  if (notes.length === 0) {
    notes.push('Follows standard German phonetic spelling—pronounce each syllable cleanly with crisp consonants.');
  }

  return {
    id,
    word: cleanWord,
    article: validArticle,
    partOfSpeech,
    cefr: primaryWord.length <= 7 ? 'A2' : primaryWord.length <= 12 ? 'B1' : 'B2',
    englishMeaning,
    hindiMeaning: '',
    devanagariFull: devParts.join(' '),
    romanizedFull: romParts.join(' '),
    ipa: params.ipa?.trim() ? `/${params.ipa.replace(/^\/|\/$/g, '')}/` : `/${ipaParts.join(' ')}/`,
    stressSummary:
      allSyllables.length === 1
        ? 'Single stressed syllable'
        : `Primary stress on the ${ordinal} syllable (${stressedSyl?.segment ?? ''})`,
    originNote: notes.join(' '),
    categories,
    syllables: allSyllables,
    example: examples[0],
    examples,
    collocations: collocations.length > 0 ? collocations : undefined,
    matchedQuery: params.matchedQuery,
    source: 'dictionary',
  };
}
