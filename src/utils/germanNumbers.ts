import { transliterateGermanToDevanagari } from './germanPhonetics';

const ONES = [
  'null',
  'eins',
  'zwei',
  'drei',
  'vier',
  'fünf',
  'sechs',
  'sieben',
  'acht',
  'neun',
  'zehn',
  'elf',
  'zwölf',
  'dreizehn',
  'vierzehn',
  'fünfzehn',
  'sechzehn',
  'siebzehn',
  'achtzehn',
  'neunzehn',
];

const TENS = [
  '',
  '',
  'zwanzig',
  'dreißig',
  'vierzig',
  'fünfzig',
  'sechzig',
  'siebzig',
  'achtzig',
  'neunzig',
];

function underHundredToGerman(n: number, isCompoundTail = false): string {
  if (n < 20) {
    if (n === 1 && isCompoundTail) return 'eins';
    return ONES[n];
  }
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (unit === 0) return TENS[ten];
  const unitWord = unit === 1 ? 'ein' : ONES[unit];
  return `${unitWord}und${TENS[ten]}`;
}

function underThousandToGerman(n: number): string {
  if (n < 100) return underHundredToGerman(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const hundredPrefix = hundred === 1 ? 'einhundert' : `${ONES[hundred]}hundert`;
  if (rest === 0) return hundredPrefix;
  return `${hundredPrefix}${underHundredToGerman(rest, true)}`;
}

/**
 * Converts any integer from 0 to 999,999 into its exact standard German spelling.
 */
export function numberToGermanWord(input: number): string {
  if (!Number.isFinite(input) || !Number.isInteger(input) || input < 0 || input > 999999) {
    return '';
  }
  if (input === 0) return 'null';
  if (input < 1000) return underThousandToGerman(input);

  const thousands = Math.floor(input / 1000);
  const rest = input % 1000;
  const thousandPrefix =
    thousands === 1
      ? 'eintausend'
      : `${underThousandToGerman(thousands).replace(/eins$/, 'ein')}tausend`;

  if (rest === 0) return thousandPrefix;
  return `${thousandPrefix}${underThousandToGerman(rest)}`;
}

export interface GeneratedGermanNumber {
  value: number;
  german: string;
  devanagari: string;
  breakdownNote: string;
  sentenceGerman: string;
  sentenceEnglish: string;
}

export function describeGermanNumber(input: number): GeneratedGermanNumber | null {
  const german = numberToGermanWord(input);
  if (!german) return null;

  const devanagari = transliterateGermanToDevanagari(german);

  let breakdownNote = 'Basic German number.';
  if (input >= 21 && input <= 99 && input % 10 !== 0) {
    const unit = input % 10;
    const ten = Math.floor(input / 10) * 10;
    breakdownNote = `German reads the ones digit first: ${unit === 1 ? 'ein' : ONES[unit]} (${unit}) + und (and) + ${TENS[ten / 10]} (${ten}).`;
  } else if (input >= 100 && input < 1000) {
    const h = Math.floor(input / 100);
    const rest = input % 100;
    breakdownNote =
      rest === 0
        ? `${h === 1 ? 'ein' : ONES[h]} (${h}) + hundert (100).`
        : `${h === 1 ? 'ein' : ONES[h]}hundert (${h * 100}) + ${underHundredToGerman(rest, true)} (${rest}).`;
  } else if (input >= 1000) {
    const t = Math.floor(input / 1000);
    const rest = input % 1000;
    breakdownNote =
      rest === 0
        ? `${numberToGermanWord(t)} (${t}) + tausend (1,000).`
        : `${t === 1 ? 'ein' : numberToGermanWord(t)}tausend (${(t * 1000).toLocaleString()}) + ${underThousandToGerman(rest)} (${rest}).`;
  }

  let sentenceGerman = `Das kostet ${german} Euro.`;
  let sentenceEnglish = `That costs ${input.toLocaleString()} euros.`;

  if (input === 0) {
    sentenceGerman = 'Heute haben wir null Grad.';
    sentenceEnglish = 'Today it is zero degrees.';
  } else if (input === 1) {
    sentenceGerman = 'Ich trinke eine Tasse Kaffee.';
    sentenceEnglish = 'I am drinking one cup of coffee.';
  } else if (input >= 1900 && input <= 2099) {
    sentenceGerman = `Im Jahr ${german} lerne ich Deutsch.`;
    sentenceEnglish = `In the year ${input}, I am learning German.`;
  } else if (input > 10000) {
    sentenceGerman = `In dieser Stadt leben ${german} Menschen.`;
    sentenceEnglish = `${input.toLocaleString()} people live in this city.`;
  }

  return {
    value: input,
    german,
    devanagari,
    breakdownNote,
    sentenceGerman,
    sentenceEnglish,
  };
}
