import type { SoundRule } from '../types/dictionary';

export const SOUND_RULES: SoundRule[] = [
  {
    id: 'rule-oe',
    symbol: 'ö / eu (French)',
    title: 'The Rounded Ö Vowel',
    ipa: '/øː/ · /œ/',
    hindiApprox: 'यॉ / ओ (rounded ए)',
    difficulty: 'new-sound',
    summary:
      'Hindi has ओ (rounded back) and ए (unrounded front), but never combines both at once. German ö puts them together.',
    steps: [
      'Shape your lips in a tight circle as if you are about to say ओ (o).',
      'Freeze your lips in that circle and try to say ए (e as in एक) with your tongue.',
    ],
    shortcut: 'A slightly rounded यॉ or tight ओ will still be understood in daily conversation.',
    commonMistake: 'Saying a plain open ओ turns schön (beautiful) into schon (already).',
    exampleWordIds: ['friseur', 'broetchen', 'zwoelf'],
  },
  {
    id: 'rule-ue',
    symbol: 'ü',
    title: 'The Whistled Ü Vowel',
    ipa: '/yː/ · /ʏ/',
    hindiApprox: 'यू / इउ (rounded ई)',
    difficulty: 'new-sound',
    summary:
      'Just like ö pairs ओ + ए, German ü pairs ऊ lips with ई tongue. It is crucial for separating everyday words like Küche (kitchen) and Kuchen (cake).',
    steps: [
      'Purse your lips tightly as if whistling or saying ऊ (oo).',
      'Without moving your lips, say ई (ee as in कील) inside your mouth.',
    ],
    shortcut: 'A crisp, tight-lipped यू gets close while your muscle memory builds.',
    commonMistake: 'Dropping the lip rounding turns über into ईबर or ऊबर.',
    exampleWordIds: ['kueche', 'tschuess', 'gemuetlichkeit'],
  },
  {
    id: 'rule-ich',
    symbol: 'ch (front: ich-Laut)',
    title: 'The Soft Palatal CH',
    ipa: '/ç/',
    hindiApprox: 'ह्य / soft श्य',
    difficulty: 'new-sound',
    summary:
      'After i, e, ä, ö, ü, ei, eu, l, r, or n (and always in -chen / -lich), German ch is a quiet, airy hiss in the middle of the mouth—never a hard क or heavy श.',
    steps: [
      'Keep your lips flat and relaxed (do not pucker them like Hindi श).',
      'Say the start of English "huge" (ह्यूज) and stretch that quiet breathy h-y air stream.',
    ],
    shortcut: 'A very light, flat-lipped श्य / ह्य is naturally understood.',
    commonMistake: 'Using heavy श confuses Kirche (church) with Kirsche (cherry).',
    exampleWordIds: ['broetchen', 'eichhoernchen', 'kirche', 'maedchen'],
  },
  {
    id: 'rule-ach',
    symbol: 'ch (back: ach-Laut)',
    title: 'The Throat CH (Exact Hindi ख़)',
    ipa: '/x/',
    hindiApprox: 'ख़ (as in ख़ुश, अख़बार)',
    difficulty: 'hindi-match',
    summary:
      'After back vowels a, o, u, and au, German ch is a breeze for Hindi/Urdu speakers—it is the exact nuqta ख़ sound in the back of the throat.',
    steps: [
      'Raise the back of your tongue gently toward the soft palate.',
      'Pronounce the exact ख़ from Hindi ख़बर or ख़ुशी.',
    ],
    shortcut: 'You already know this sound natively as ख़!',
    commonMistake: 'Do not soften it into plain Hindi ख (aspirated k)—keep the airflow continuous.',
    exampleWordIds: ['kuchen'],
  },
  {
    id: 'rule-r-throat',
    symbol: 'r- (initial / before vowel)',
    title: 'The Soft Throat R',
    ipa: '/ʁ/',
    hindiApprox: 'Very soft ख़ / ग़',
    difficulty: 'subtle-shift',
    summary:
      'Standard German does not roll the tip of the tongue like Hindi र. Instead, r happens gently in the back of the throat, like a whisper-soft ग़.',
    steps: [
      'Keep the tip of your tongue resting behind your lower teeth.',
      'Make a very light, relaxed ग़ vibration at the back of your throat.',
    ],
    shortcut: 'A gentle single tap of Hindi र is still completely understood (and even natural in southern Germany/Austria).',
    commonMistake: 'Over-gargling too harshly—native German r is light and relaxed.',
    exampleWordIds: ['friseur', 'restaurant', 'baeckerei'],
  },
  {
    id: 'rule-r-final',
    symbol: '-r / -er (word ending)',
    title: 'The Vanishing Final -R',
    ipa: '/ɐ̯/ · /ɐ/',
    hindiApprox: 'अ (soft uh)',
    difficulty: 'subtle-shift',
    summary:
      'At the end of a German syllable or word (Friseur, Bruder, Wasser, der), the r stops being a consonant and melts into a short, relaxed अ sound.',
    steps: [
      'Finish the main vowel cleanly.',
      'Relax your tongue completely into a quick, soft अ—do not curl your tongue tip.',
    ],
    shortcut: 'Read final -er simply as अ (e.g., Wasser → वास-अ, Friseur → फ़्री-ज़्योअ).',
    commonMistake: 'Rolling a strong Hindi र at the end of words immediately sounds foreign.',
    exampleWordIds: ['friseur', 'kirche'],
  },
  {
    id: 'rule-s-z',
    symbol: 's (before vowel) vs. z',
    title: 'The S / Z Swap (ज़ vs. त्स)',
    ipa: '/z/ · /ts/',
    hindiApprox: 's → ज़ (ज़मीन) · z → त्स',
    difficulty: 'subtle-shift',
    summary:
      'Two classic spelling surprises: an s before a vowel buzzes like Hindi ज़, while the letter z is NEVER ज़—it is always a sharp त्स.',
    steps: [
      'When you see s + vowel (Friseur, Gesund, Sonne), vibrate your throat for ज़.',
      'When you see z (Zahnarzt, zwölf, Zug), snap त + स together as त्स.',
    ],
    shortcut: 'Remember: S buzzes (ज़), Z snaps (त्स).',
    commonMistake: 'Reading Zahnarzt as ज़ानआर्ज़्ट instead of त्सान-आर्ट्स्ट.',
    exampleWordIds: ['friseur', 'gesundheit', 'zahnarzt', 'zwoelf'],
  },
  {
    id: 'rule-silent-h',
    symbol: 'ah / eh / oh / uh / th',
    title: 'The Silent Stretching H',
    ipa: '/ː/ (vowel length)',
    hindiApprox: 'Silent (stretches vowel)',
    difficulty: 'subtle-shift',
    summary:
      'Inside a syllable after a vowel (Bahnhof, Zahnarzt) or after t (Apotheke), German h is completely silent—it simply tells you to hold the vowel longer.',
    steps: [
      'Ignore the h sound whenever it sits after a vowel or after t.',
      'Hold the vowel twice as long (e.g., Bahn → बान, not बहन).',
    ],
    shortcut: 'Only pronounce h as ह when it begins a syllable (as in -hof or -heit).',
    commonMistake: 'Pronouncing Bahnhof as बहन-होफ़ or Apotheke as अपो-थेके.',
    exampleWordIds: ['bahnhof', 'zahnarzt', 'apotheke'],
  },
];
