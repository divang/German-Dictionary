import type {
  CalendarTimeEntry,
  NumberEntry,
  PartOfSpeechGuide,
  PronounEntry,
  PronunciationRuleItem,
  QuestionWordEntry,
} from '../types/basics';

// ============================================================================
// 2. PRONUNCIATION TECHNIQUES & LETTER COMBINATIONS
// ============================================================================
export const PRONUNCIATION_RULES: PronunciationRuleItem[] = [
  {
    id: 'ie',
    pattern: 'ie',
    soundsLike: 'Long E (ई — like "see")',
    devanagari: 'ई',
    ipa: '/iː/',
    category: 'vowels',
    ruleExplanation:
      'Whenever I comes before E, pronounce a clean, long ई (ee). The E is silent and stretches the I.',
    hindiTrick:
      'Golden trick for ie vs ei: Read the SECOND vowel’s English letter name! In i-E, the second letter is E → ई (wie = वी, Bier = बीअ).',
    examples: [
      { word: 'wie', devanagari: 'वी', english: 'how' },
      { word: 'Bier', article: 'das', devanagari: 'बीअ', english: 'beer' },
      { word: 'Liebe', article: 'die', devanagari: 'ली-बे', english: 'love' },
      { word: 'spielen', devanagari: 'श्पी-लन', english: 'to play' },
    ],
    sentenceGerman: 'Wie viel kostet das hier?',
    sentenceEnglish: 'How much does this cost here?',
  },
  {
    id: 'ei-ai',
    pattern: 'ei / ai',
    soundsLike: 'Long I (आइ — like "my")',
    devanagari: 'आइ',
    ipa: '/aɪ̯/',
    category: 'vowels',
    ruleExplanation:
      'Both EI and AI sound like Hindi आइ (like English "eye" or "my"). Never pronounce ei as "ee"!',
    hindiTrick:
      'Second-letter trick: In e-I, the second letter is I → आइ (mein = माइन, eins = आइन्स, Mai = माइ).',
    examples: [
      { word: 'mein', devanagari: 'माइन', english: 'my' },
      { word: 'eins', devanagari: 'आइन्स', english: 'one (1)' },
      { word: 'Zeit', article: 'die', devanagari: 'त्साइट', english: 'time' },
      { word: 'Mai', article: 'der', devanagari: 'माइ', english: 'May' },
    ],
    sentenceGerman: 'Ich habe leider keine Zeit.',
    sentenceEnglish: 'Unfortunately I have no time.',
  },
  {
    id: 'au',
    pattern: 'au',
    soundsLike: 'OW (आउ — like "house")',
    devanagari: 'आउ',
    ipa: '/aʊ̯/',
    category: 'vowels',
    ruleExplanation:
      'AU glides smoothly from open आ into उ — exact match for Hindi आउ (like "out" or "cow").',
    hindiTrick: 'Very natural for Hindi speakers: Haus = हाउस, Auto = आउटो, Frau = फ़्राउ.',
    examples: [
      { word: 'Haus', article: 'das', devanagari: 'हाउस', english: 'house' },
      { word: 'Auto', article: 'das', devanagari: 'आउ-टो', english: 'car' },
      { word: 'Frau', article: 'die', devanagari: 'फ़्राउ', english: 'woman / Mrs.' },
      { word: 'kaufen', devanagari: 'काउ-फ़न', english: 'to buy' },
    ],
    sentenceGerman: 'Die Frau kauft ein kleines Auto.',
    sentenceEnglish: 'The woman buys a small car.',
  },
  {
    id: 'eu-aeu',
    pattern: 'eu / äu',
    soundsLike: 'OY (ऑय — like "boy")',
    devanagari: 'ऑय',
    ipa: '/ɔʏ̯/',
    category: 'vowels',
    ruleExplanation:
      'Both EU and ÄU are pronounced identically as ऑय (like English "toy" or "boy").',
    hindiTrick:
      'Don’t read EU as "yoo" — Deutsch is डॉयच, heute is हॉयटे, and Häuser (plural of Haus) is हॉय-ज़र.',
    examples: [
      { word: 'Deutsch', article: 'das', devanagari: 'डॉयच', english: 'German' },
      { word: 'heute', devanagari: 'हॉय-टे', english: 'today' },
      { word: 'neu', devanagari: 'नॉय', english: 'new' },
      { word: 'Häuser', article: 'die', devanagari: 'हॉय-ज़र', english: 'houses (plural)' },
    ],
    sentenceGerman: 'Heute lernen wir neue Wörter auf Deutsch.',
    sentenceEnglish: 'Today we are learning new words in German.',
  },
  {
    id: 'double-vowels',
    pattern: 'aa / ee / oo',
    soundsLike: 'Extra-long vowel (आआ / एए / ओओ)',
    devanagari: 'आ / ए / ओ (लंबा)',
    ipa: '/aː, eː, oː/',
    category: 'length',
    ruleExplanation:
      'Doubling a vowel NEVER changes its quality — it simply tells you to hold the exact same German vowel longer! Notice: German EE is long ए (NOT English "ee"), and OO is long ओ (NOT English "oo")!',
    hindiTrick:
      'Huge English trap avoided: Tee = टे (not टी), Boot = बोट (not बूट), Kaffee = का-फ़े!',
    examples: [
      { word: 'Staat', article: 'der', devanagari: 'श्टाट', english: 'state / nation' },
      { word: 'Tee', article: 'der', devanagari: 'टे', english: 'tea' },
      { word: 'Kaffee', article: 'der', devanagari: 'का-फ़े', english: 'coffee' },
      { word: 'Boot', article: 'das', devanagari: 'बोट', english: 'boat' },
    ],
    sentenceGerman: 'Ich trinke Kaffee und mein Freund trinkt Tee.',
    sentenceEnglish: 'I drink coffee and my friend drinks tea.',
  },
  {
    id: 'silent-h',
    pattern: 'Vowel + h (ah, eh, ih, oh, uh)',
    soundsLike: 'Silent H — stretches the vowel',
    devanagari: '(मौन ह — स्वर लंबा करें)',
    ipa: '/ː/',
    category: 'length',
    ruleExplanation:
      'When H sits directly after a vowel (Dehnungs-h), you do NOT pronounce the H at all — you just stretch the vowel before it.',
    hindiTrick: 'Bahnhof = बान-होफ़ (first h silent, second h spoken), wohnen = वो-नन, Uhr = ऊअ.',
    examples: [
      { word: 'wohnen', devanagari: 'वो-नन', english: 'to live / reside' },
      { word: 'fahren', devanagari: 'फ़ा-रन', english: 'to drive / travel' },
      { word: 'Uhr', article: 'die', devanagari: 'ऊअ', english: 'clock / o’clock' },
      { word: 'gehen', devanagari: 'गे-एन', english: 'to go' },
    ],
    sentenceGerman: 'Wir wohnen in der Nähe vom Bahnhof.',
    sentenceEnglish: 'We live near the train station.',
  },
  {
    id: 'double-consonant',
    pattern: 'Double Consonants (tt, ll, nn, mm, ck, tz)',
    soundsLike: 'Makes the vowel BEFORE it short & crisp',
    devanagari: '(पहले का स्वर छोटा करें)',
    ipa: '/short vowel/',
    category: 'length',
    ruleExplanation:
      'Two consonants in a row (including ck = kk and tz = zz) are spoken as ONE crisp consonant while cutting the vowel before them short.',
    hindiTrick:
      'Compare: Staat (long आ) vs Stadt (short अ); Miete (long ई) vs Mitte (short इ).',
    examples: [
      { word: 'Mitte', article: 'die', devanagari: 'मि-टे', english: 'middle / center' },
      { word: 'bitte', devanagari: 'बि-टे', english: 'please' },
      { word: 'Zucker', article: 'der', devanagari: 'त्सु-कर', english: 'sugar' },
      { word: 'Platz', article: 'der', devanagari: 'प्लात्स', english: 'place / seat' },
    ],
    sentenceGerman: 'Nehmen Sie bitte hier Platz.',
    sentenceEnglish: 'Please take a seat here.',
  },
  {
    id: 'ch-ich',
    pattern: 'ch (after i, e, ä, ö, ü, ei, eu, r, l, n)',
    soundsLike: 'Soft front breathy ह्य / श्य (ich-Laut)',
    devanagari: 'ह्य / श्य',
    ipa: '/ç/',
    category: 'consonants',
    ruleExplanation:
      'After front vowels (i, e, ä, ö, ü, ei, eu) or consonants (r, l, n), CH is a gentle breath blown over the middle of the tongue — like the airy H at the start of "huge".',
    hindiTrick:
      'Never say "ik" or harsh "ish" — press tongue high like य and blow soft air (ich = इश्य, Milch = मिलश्य).',
    examples: [
      { word: 'ich', devanagari: 'इश्य', english: 'I' },
      { word: 'Milch', article: 'die', devanagari: 'मिलश्य', english: 'milk' },
      { word: 'Küche', article: 'die', devanagari: 'क्यू-श्ये', english: 'kitchen' },
      { word: 'Kirche', article: 'die', devanagari: 'किर-श्ये', english: 'church' },
    ],
    sentenceGerman: 'Ich trinke gern warme Milch in der Küche.',
    sentenceEnglish: 'I like drinking warm milk in the kitchen.',
  },
  {
    id: 'ch-ach',
    pattern: 'ch (after a, o, u, au)',
    soundsLike: 'Throat ख़ (ach-Laut — like Hindi ख़बर)',
    devanagari: 'ख़',
    ipa: '/x/',
    category: 'consonants',
    ruleExplanation:
      'After back vowels (a, o, u, au), CH shifts to the back of the throat — an exact match for Hindi/Urdu ख़!',
    hindiTrick:
      'Native Hindi speakers already master this sound: Buch = बूख़, Nacht = नाख़्ट, kochen = कॉख़न (like ख़बर, ख़ुश).',
    examples: [
      { word: 'Buch', article: 'das', devanagari: 'बूख़', english: 'book' },
      { word: 'Nacht', article: 'die', devanagari: 'नाख़्ट', english: 'night' },
      { word: 'kochen', devanagari: 'कॉ-ख़न', english: 'to cook' },
      { word: 'auch', devanagari: 'आउख़', english: 'also / too' },
    ],
    sentenceGerman: 'Ich koche heute Abend auch Suppe.',
    sentenceEnglish: 'I am also cooking soup tonight.',
  },
  {
    id: 'sch',
    pattern: 'sch',
    soundsLike: 'SH (श — like "shoe")',
    devanagari: 'श',
    ipa: '/ʃ/',
    category: 'consonants',
    ruleExplanation:
      'The three letters S-C-H always blend into a single rounded श sound (never s-k or s-ch).',
    hindiTrick: 'Round your lips slightly forward for a clean श: Schule = शूले, Tisch = टिश.',
    examples: [
      { word: 'Schule', article: 'die', devanagari: 'शू-ले', english: 'school' },
      { word: 'Tisch', article: 'der', devanagari: 'टिश', english: 'table' },
      { word: 'schlafen', devanagari: 'श्ला-फ़न', english: 'to sleep' },
      { word: 'Flasche', article: 'die', devanagari: 'फ़्ला-शे', english: 'bottle' },
    ],
    sentenceGerman: 'Die Flasche steht auf dem Tisch.',
    sentenceEnglish: 'The bottle is on the table.',
  },
  {
    id: 'sp-st',
    pattern: 'sp / st (at start of word or stem)',
    soundsLike: 'SHP / SHT (श्प / श्ट)',
    devanagari: 'श्प / श्ट',
    ipa: '/ʃp, ʃt/',
    category: 'consonants',
    ruleExplanation:
      'At the start of a German word or root syllable, SP sounds like श्प (shp) and ST sounds like श्ट (sht). In the middle or end (ist, Gast), it stays plain स्ट.',
    hindiTrick:
      'Sprechen = श्प्रे-श्यन, Straße = श्ट्रा-से, Stadt = श्टाट — but "ist" is plain इस्ट!',
    examples: [
      { word: 'sprechen', devanagari: 'श्प्रे-श्यन', english: 'to speak' },
      { word: 'Straße', article: 'die', devanagari: 'श्ट्रा-से', english: 'street' },
      { word: 'Sport', article: 'der', devanagari: 'श्पॉर्ट', english: 'sport' },
      { word: 'stehen', devanagari: 'श्टे-एन', english: 'to stand' },
    ],
    sentenceGerman: 'Sprechen Sie ein bisschen Deutsch?',
    sentenceEnglish: 'Do you speak a little German?',
  },
  {
    id: 's-ss-sz',
    pattern: 's (before vowel) vs ss / ß',
    soundsLike: 'Buzzing ज़ vs Sharp स',
    devanagari: 'ज़ बनाम स',
    ipa: '/z/ vs /s/',
    category: 'consonants',
    ruleExplanation:
      'A single S before a vowel buzzes like ज़ (ज़मीन). Double SS or ß is always a sharp, unvoiced hissing स (सड़क).',
    hindiTrick:
      'Sonne = ज़ॉने, sie = ज़ी, sechs = ज़ेक्स — whereas Wasser = वासर and Straße = श्ट्रासे.',
    examples: [
      { word: 'Sonne', article: 'die', devanagari: 'ज़ॉ-ने', english: 'sun' },
      { word: 'sieben', devanagari: 'ज़ी-बन', english: 'seven (7)' },
      { word: 'Wasser', article: 'das', devanagari: 'वा-सर', english: 'water' },
      { word: 'groß', devanagari: 'ग्रोस', english: 'big / tall' },
    ],
    sentenceGerman: 'Die Sonne scheint und das Wasser ist warm.',
    sentenceEnglish: 'The sun is shining and the water is warm.',
  },
  {
    id: 'z-v-w',
    pattern: 'z vs v vs w',
    soundsLike: 'z = त्स · v = फ़ · w = व',
    devanagari: 'त्स · फ़ · व',
    ipa: '/ts, f, v/',
    category: 'consonants',
    ruleExplanation:
      'Three letters that look familiar from English but shift cleanly in German: Z is always त्स (ts), V is usually फ़ (f), and W is always व (v).',
    hindiTrick:
      'Memorize this one trio: Zwei (त्स्वाइ) · Vier (फ़ीअ) · Wasser (वासर). Instantly makes your German sound authentic!',
    examples: [
      { word: 'zwei', devanagari: 'त्स्वाइ', english: 'two (2)' },
      { word: 'Vater', article: 'der', devanagari: 'फ़ा-टर', english: 'father' },
      { word: 'Wasser', article: 'das', devanagari: 'वा-सर', english: 'water' },
      { word: 'Zimmer', article: 'das', devanagari: 'त्सि-मर', english: 'room' },
    ],
    sentenceGerman: 'Mein Vater trinkt zwei Gläser Wasser.',
    sentenceEnglish: 'My father drinks two glasses of water.',
  },
  {
    id: 'final-ig',
    pattern: '-ig (at end of word)',
    soundsLike: 'Soft इश्य (like ich)',
    devanagari: 'इश्य',
    ipa: '/ɪç/',
    category: 'consonants',
    ruleExplanation:
      'In Standard German (Hochdeutsch), -ig at the end of a word (zwanzig, richtig, wichtig) sounds like -ich (इश्य) rather than hard -ik.',
    hindiTrick: 'Zwanzig = त्स्वान-त्सिश्य, wichtig = विश्य-टिश्य, fertig = फ़ेर-टिश्य.',
    examples: [
      { word: 'wichtig', devanagari: 'विश्य-टिश्य', english: 'important' },
      { word: 'richtig', devanagari: 'रिश्य-टिश्य', english: 'correct' },
      { word: 'zwanzig', devanagari: 'त्स्वान-त्सिश्य', english: 'twenty (20)' },
      { word: 'fertig', devanagari: 'फ़ेर-टिश्य', english: 'ready / finished' },
    ],
    sentenceGerman: 'Die Aufgabe ist sehr wichtig und jetzt fertig.',
    sentenceEnglish: 'The task is very important and now finished.',
  },
  {
    id: 'pf-qu',
    pattern: 'pf & qu',
    soundsLike: 'pf = प्फ़ (both letters) · qu = क्व (kv)',
    devanagari: 'प्फ़ · क्व',
    ipa: '/pf, kv/',
    category: 'consonants',
    ruleExplanation:
      'In PF, press your lips for P and immediately release into F (Apfel, Pferd). In QU, always say K + V (never English kw).',
    hindiTrick: 'Say Apfel as अप-फ़ल and Quittung as क्वि-टुंग.',
    examples: [
      { word: 'Apfel', article: 'der', devanagari: 'अप्फ़ल', english: 'apple' },
      { word: 'Pferd', article: 'das', devanagari: 'प्फ़ेअर्ट', english: 'horse' },
      { word: 'Kopf', article: 'der', devanagari: 'कॉप्फ़', english: 'head' },
      { word: 'Quittung', article: 'die', devanagari: 'क्वि-टुंग', english: 'receipt' },
    ],
    sentenceGerman: 'Ich möchte einen Apfel und die Quittung, bitte.',
    sentenceEnglish: 'I would like an apple and the receipt, please.',
  },
];

// ============================================================================
// 3. NUMBERS (0–20, TENS, COMPOUND PATTERN, LARGE NUMBERS)
// ============================================================================
export const CORE_NUMBERS: NumberEntry[] = [
  { value: 0, german: 'null', devanagari: 'नुल', group: '0-20', sentenceGerman: 'Es sind heute null Grad draußen.', sentenceEnglish: 'It is zero degrees outside today.' },
  { value: 1, german: 'eins', devanagari: 'आइन्स', group: '0-20', note: 'Use ein/eine before nouns', sentenceGerman: 'Ich nehme eins, bitte.', sentenceEnglish: 'I will take one, please.' },
  { value: 2, german: 'zwei', devanagari: 'त्स्वाइ', group: '0-20', sentenceGerman: 'Ich habe zwei Geschwister.', sentenceEnglish: 'I have two siblings.' },
  { value: 3, german: 'drei', devanagari: 'ड्राइ', group: '0-20', sentenceGerman: 'Der Zug kommt in drei Minuten.', sentenceEnglish: 'The train arrives in three minutes.' },
  { value: 4, german: 'vier', devanagari: 'फ़ीअ', group: '0-20', sentenceGerman: 'Ein Tisch für vier Personen, bitte.', sentenceEnglish: 'A table for four people, please.' },
  { value: 5, german: 'fünf', devanagari: 'फ़्यून्फ़', group: '0-20', sentenceGerman: 'Wir treffen uns um fünf Uhr.', sentenceEnglish: 'We are meeting at five o’clock.' },
  { value: 6, german: 'sechs', devanagari: 'ज़ेक्स', group: '0-20', sentenceGerman: 'Ich stehe um sechs Uhr auf.', sentenceEnglish: 'I get up at six o’clock.' },
  { value: 7, german: 'sieben', devanagari: 'ज़ी-बन', group: '0-20', sentenceGerman: 'Eine Woche hat sieben Tage.', sentenceEnglish: 'One week has seven days.' },
  { value: 8, german: 'acht', devanagari: 'आख़्ट', group: '0-20', sentenceGerman: 'Das Geschäft öffnet um acht Uhr.', sentenceEnglish: 'The shop opens at eight o’clock.' },
  { value: 9, german: 'neun', devanagari: 'नॉयन', group: '0-20', sentenceGerman: 'Mein Kurs beginnt um neun Uhr.', sentenceEnglish: 'My class starts at nine o’clock.' },
  { value: 10, german: 'zehn', devanagari: 'त्सेन', group: '0-20', sentenceGerman: 'Das Buch kostet zehn Euro.', sentenceEnglish: 'The book costs ten euros.' },
  { value: 11, german: 'elf', devanagari: 'एल्फ़', group: '0-20', sentenceGerman: 'Um elf Uhr machen wir eine Pause.', sentenceEnglish: 'At eleven o’clock we take a break.' },
  { value: 12, german: 'zwölf', devanagari: 'त्स्वॉल्फ़', group: '0-20', sentenceGerman: 'Ein Jahr hat zwölf Monate.', sentenceEnglish: 'One year has twelve months.' },
  { value: 13, german: 'dreizehn', devanagari: 'ड्राइ-त्सेन', group: '0-20', sentenceGerman: 'Meine Hausnummer ist dreizehn.', sentenceEnglish: 'My house number is thirteen.' },
  { value: 14, german: 'vierzehn', devanagari: 'फ़ीअ-त्सेन', group: '0-20', sentenceGerman: 'Wir bleiben vierzehn Tage in Berlin.', sentenceEnglish: 'We are staying fourteen days in Berlin.' },
  { value: 15, german: 'fünfzehn', devanagari: 'फ़्यून्फ़-त्सेन', group: '0-20', sentenceGerman: 'Der Bus fährt alle fünfzehn Minuten.', sentenceEnglish: 'The bus runs every fifteen minutes.' },
  { value: 16, german: 'sechzehn', devanagari: 'ज़ेश्य-त्सेन', group: '0-20', note: 'Drops the -s from sechs', sentenceGerman: 'Mein Cousin ist sechzehn Jahre alt.', sentenceEnglish: 'My cousin is sixteen years old.' },
  { value: 17, german: 'siebzehn', devanagari: 'ज़ीप-त्सेन', group: '0-20', note: 'Drops -en from sieben', sentenceGerman: 'Die Jacke kostet siebzehn Euro.', sentenceEnglish: 'The jacket costs seventeen euros.' },
  { value: 18, german: 'achtzehn', devanagari: 'आख़्ट-त्सेन', group: '0-20', sentenceGerman: 'Ab achtzehn Jahren darf man wählen.', sentenceEnglish: 'From eighteen years old you may vote.' },
  { value: 19, german: 'neunzehn', devanagari: 'नॉयन-त्सेन', group: '0-20', sentenceGerman: 'Um neunzehn Uhr essen wir zu Abend.', sentenceEnglish: 'At 7 PM (19:00) we eat dinner.' },
  { value: 20, german: 'zwanzig', devanagari: 'त्स्वान-त्सिश्य', group: '0-20', sentenceGerman: 'Ich lerne zwanzig Minuten pro Tag.', sentenceEnglish: 'I study twenty minutes per day.' },

  // Tens (30–90)
  { value: 30, german: 'dreißig', devanagari: 'ड्राइ-सिश्य', group: 'tens', note: 'Only ten spelled with ß instead of z', sentenceGerman: 'Der April hat dreißig Tage.', sentenceEnglish: 'April has thirty days.' },
  { value: 40, german: 'vierzig', devanagari: 'फ़ीअ-त्सिश्य', group: 'tens', sentenceGerman: 'Die Fahrt dauert vierzig Minuten.', sentenceEnglish: 'The ride takes forty minutes.' },
  { value: 50, german: 'fünfzig', devanagari: 'फ़्यून्फ़-त्सिश्य', group: 'tens', sentenceGerman: 'Das Ticket kostet fünfzig Euro.', sentenceEnglish: 'The ticket costs fifty euros.' },
  { value: 60, german: 'sechzig', devanagari: 'ज़ेश्य-त्सिश्य', group: 'tens', note: 'Drops -s from sechs', sentenceGerman: 'Eine Stunde hat sechzig Minuten.', sentenceEnglish: 'One hour has sixty minutes.' },
  { value: 70, german: 'siebzig', devanagari: 'ज़ीप-त्सिश्य', group: 'tens', note: 'Drops -en from sieben', sentenceGerman: 'Mein Großvater wird siebzig Jahre alt.', sentenceEnglish: 'My grandfather is turning seventy years old.' },
  { value: 80, german: 'achtzig', devanagari: 'आख़्ट-त्सिश्य', group: 'tens', sentenceGerman: 'Die Wohnung ist achtzig Quadratmeter groß.', sentenceEnglish: 'The apartment is eighty square meters big.' },
  { value: 90, german: 'neunzig', devanagari: 'नॉयन-त्सिश्य', group: 'tens', sentenceGerman: 'Ein Fußballspiel dauert neunzig Minuten.', sentenceEnglish: 'A football match lasts ninety minutes.' },

  // Compound 21–99 Pattern (Ones + und + Tens)
  { value: 21, german: 'einundzwanzig', devanagari: 'आइन-उन्ट-त्स्वान-त्सिश्य', group: 'compounds', note: 'ein (1) + und (and) + zwanzig (20) — just like Hindi इक्कीस!', sentenceGerman: 'Ich bin einundzwanzig Jahre alt.', sentenceEnglish: 'I am twenty-one years old.' },
  { value: 35, german: 'fünfunddreißig', devanagari: 'फ़्यून्फ़-उन्ट-ड्राइ-सिश्य', group: 'compounds', note: 'fünf (5) + und + dreißig (30)', sentenceGerman: 'Die Schuhe kosten fünfunddreißig Euro.', sentenceEnglish: 'The shoes cost thirty-five euros.' },
  { value: 47, german: 'siebenundvierzig', devanagari: 'ज़ी-बन-उन्ट-फ़ीअ-त्सिश्य', group: 'compounds', note: 'sieben (7) + und + vierzig (40)', sentenceGerman: 'Der Bus Nummer siebenundvierzig kommt gleich.', sentenceEnglish: 'Bus number forty-seven is coming soon.' },

  // Large Numbers
  { value: 100, german: 'einhundert', devanagari: 'आइन-हुन-डर्ट', group: 'large', sentenceGerman: 'Ein Euro hat einhundert Cent.', sentenceEnglish: 'One euro has one hundred cents.' },
  { value: 500, german: 'fünfhundert', devanagari: 'फ़्यून्फ़-हुन-डर्ट', group: 'large', sentenceGerman: 'Die Miete beträgt fünfhundert Euro.', sentenceEnglish: 'The rent amounts to five hundred euros.' },
  { value: 1000, german: 'eintausend', devanagari: 'आइन-टाउ-ज़न्ट', group: 'large', sentenceGerman: 'Ich kenne schon eintausend Wörter.', sentenceEnglish: 'I already know one thousand words.' },
  { value: 1000000, german: 'eine Million', devanagari: 'आइ-ने मिल-योन', group: 'large', sentenceGerman: 'In München leben über eine Million Menschen.', sentenceEnglish: 'Over one million people live in Munich.' },
];

// ============================================================================
// 4. WEEKDAYS (WOCHENTAGE)
// ============================================================================
export const WEEKDAYS_LIST: CalendarTimeEntry[] = [
  { german: 'Montag', article: 'der', devanagari: 'मोन-टाक', english: 'Monday', hindi: 'सोमवार', shortForm: 'Mo', group: 'weekday', sentenceGerman: 'Am Montag beginnt die neue Arbeitswoche.', sentenceEnglish: 'On Monday the new work week begins.' },
  { german: 'Dienstag', article: 'der', devanagari: 'डीन्स-टाक', english: 'Tuesday', hindi: 'मंगलवार', shortForm: 'Di', group: 'weekday', sentenceGerman: 'Am Dienstag habe ich abends Deutschkurs.', sentenceEnglish: 'On Tuesday I have German class in the evening.' },
  { german: 'Mittwoch', article: 'der', devanagari: 'मिट-वॉख़', english: 'Wednesday', hindi: 'बुधवार', shortForm: 'Mi', group: 'weekday', sentenceGerman: 'Mittwoch ist genau die Mitte der Woche.', sentenceEnglish: 'Wednesday is right in the middle of the week.' },
  { german: 'Donnerstag', article: 'der', devanagari: 'डॉ-नर्स-टाक', english: 'Thursday', hindi: 'गुरुवार', shortForm: 'Do', group: 'weekday', sentenceGerman: 'Am Donnerstag kaufe ich im Supermarkt ein.', sentenceEnglish: 'On Thursday I shop at the supermarket.' },
  { german: 'Freitag', article: 'der', devanagari: 'फ़्राइ-टाक', english: 'Friday', hindi: 'शुक्रवार', shortForm: 'Fr', group: 'weekday', sentenceGerman: 'Am Freitag gehe ich mit Freunden essen.', sentenceEnglish: 'On Friday I go out to eat with friends.' },
  { german: 'Samstag', article: 'der', devanagari: 'ज़ाम्स-टाक', english: 'Saturday', hindi: 'शनिवार', shortForm: 'Sa', group: 'weekday', sentenceGerman: 'Am Samstag schlafe ich gern lange.', sentenceEnglish: 'On Saturday I like to sleep in late.' },
  { german: 'Sonntag', article: 'der', devanagari: 'ज़ॉन-टाक', english: 'Sunday', hindi: 'रविवार', shortForm: 'So', group: 'weekday', sentenceGerman: 'Am Sonntag sind die meisten Geschäfte geschlossen.', sentenceEnglish: 'On Sunday most shops are closed.' },
  { german: 'Wochenende', 'article': 'das', devanagari: 'वॉ-ख़न-एन-डे', english: 'weekend', hindi: 'सप्ताहांत', group: 'time-word', sentenceGerman: 'Ich wünsche dir ein schönes Wochenende!', sentenceEnglish: 'I wish you a nice weekend!' },
  { german: 'heute', devanagari: 'हॉय-टे', english: 'today', hindi: 'आज', group: 'time-word', sentenceGerman: 'Welcher Tag ist heute?', sentenceEnglish: 'What day is today?' },
  { german: 'morgen', devanagari: 'मॉर-गन', english: 'tomorrow', hindi: 'आने वाला कल', group: 'time-word', sentenceGerman: 'Morgen fahren wir nach Köln.', sentenceEnglish: 'Tomorrow we are going to Cologne.' },
  { german: 'gestern', devanagari: 'गेस्टर्न', english: 'yesterday', hindi: 'बीता हुआ कल', group: 'time-word', sentenceGerman: 'Gestern habe ich ein neues Buch gelesen.', sentenceEnglish: 'Yesterday I read a new book.' },
];

// ============================================================================
// 5. CALENDAR MONTHS & SEASONS (MONATE & JAHRESZEITEN)
// ============================================================================
export const CALENDAR_LIST: CalendarTimeEntry[] = [
  { german: 'Januar', article: 'der', devanagari: 'या-नु-आर', english: 'January', hindi: 'जनवरी', shortForm: 'Jan', group: 'month', sentenceGerman: 'Im Januar ist es in Deutschland oft sehr kalt.', sentenceEnglish: 'In January it is often very cold in Germany.' },
  { german: 'Februar', article: 'der', devanagari: 'फ़े-ब्रु-आर', english: 'February', hindi: 'फ़रवरी', shortForm: 'Feb', group: 'month', sentenceGerman: 'Der Februar ist der kürzeste Monat im Jahr.', sentenceEnglish: 'February is the shortest month of the year.' },
  { german: 'März', article: 'der', devanagari: 'मेअर्ट्स', english: 'March', hindi: 'मार्च', shortForm: 'Mär', group: 'month', sentenceGerman: 'Im März beginnt langsam der Frühling.', sentenceEnglish: 'In March spring slowly begins.' },
  { german: 'April', article: 'der', devanagari: 'आ-प्रिल', english: 'April', hindi: 'अप्रैल', shortForm: 'Apr', group: 'month', sentenceGerman: 'Im April wechselt das Wetter sehr oft.', sentenceEnglish: 'In April the weather changes very often.' },
  { german: 'Mai', article: 'der', devanagari: 'माइ', english: 'May', hindi: 'मई', shortForm: 'Mai', group: 'month', sentenceGerman: 'Im Mai blühen überall schöne Blumen.', sentenceEnglish: 'In May beautiful flowers bloom everywhere.' },
  { german: 'Juni', article: 'der', devanagari: 'यू-नी', english: 'June', hindi: 'जून', shortForm: 'Jun', group: 'month', sentenceGerman: 'Im Juni sind die Tage sehr lang und hell.', sentenceEnglish: 'In June the days are very long and bright.' },
  { german: 'Juli', article: 'der', devanagari: 'यू-ली', english: 'July', hindi: 'जुलाई', shortForm: 'Jul', group: 'month', sentenceGerman: 'Im Juli machen viele Familien Sommerurlaub.', sentenceEnglish: 'In July many families take summer vacation.' },
  { german: 'August', article: 'der', devanagari: 'आउ-गुस्ट', english: 'August', hindi: 'अगस्त', shortForm: 'Aug', group: 'month', sentenceGerman: 'Im August gehen wir oft im See schwimmen.', sentenceEnglish: 'In August we often go swimming in the lake.' },
  { german: 'September', article: 'der', devanagari: 'ज़ेप-टेम-बर', english: 'September', hindi: 'सितंबर', shortForm: 'Sep', group: 'month', sentenceGerman: 'Im September fängt das neue Schuljahr an.', sentenceEnglish: 'In September the new school year begins.' },
  { german: 'Oktober', article: 'der', devanagari: 'ऑक-टो-बर', english: 'October', hindi: 'अक्टूबर', shortForm: 'Okt', group: 'month', sentenceGerman: 'Im Oktober färben sich die Blätter rot und gelb.', sentenceEnglish: 'In October the leaves turn red and yellow.' },
  { german: 'November', article: 'der', devanagari: 'नो-वेम-बर', english: 'November', hindi: 'नवंबर', shortForm: 'Nov', group: 'month', sentenceGerman: 'Im November wird es schon früh dunkel.', sentenceEnglish: 'In November it gets dark early.' },
  { german: 'Dezember', article: 'der', devanagari: 'डे-त्सेम-बर', english: 'December', hindi: 'दिसंबर', shortForm: 'Dez', group: 'month', sentenceGerman: 'Im Dezember besuchen wir den Weihnachtsmarkt.', sentenceEnglish: 'In December we visit the Christmas market.' },

  // 4 Seasons (all masculine: der!)
  { german: 'Frühling', article: 'der', devanagari: 'फ़्र्यू-लिंग', english: 'spring', hindi: 'वसंत ऋतु', group: 'season', sentenceGerman: 'Im Frühling werden die Tage wieder wärmer.', sentenceEnglish: 'In spring the days become warmer again.' },
  { german: 'Sommer', article: 'der', devanagari: 'ज़ॉ-मर', english: 'summer', hindi: 'गर्मी का मौसम', group: 'season', sentenceGerman: 'Im Sommer esse ich gern kaltes Eis.', sentenceEnglish: 'In summer I like eating cold ice cream.' },
  { german: 'Herbst', article: 'der', devanagari: 'हेरप्स्ट', english: 'autumn / fall', hindi: 'पतझड़', group: 'season', sentenceGerman: 'Im Herbst ist es oft windig und kühl.', sentenceEnglish: 'In autumn it is often windy and cool.' },
  { german: 'Winter', article: 'der', devanagari: 'विन-टर', english: 'winter', hindi: 'सर्दी का मौसम', group: 'season', sentenceGerman: 'Im Winter trage ich eine warme Jacke.', sentenceEnglish: 'In winter I wear a warm jacket.' },
];

// ============================================================================
// 6. ALL PRONOUNS (PRONOMEN)
// ============================================================================
export const ALL_PRONOUNS: PronounEntry[] = [
  // Nominative (Subject — who is doing the action)
  { german: 'ich', devanagari: 'इश्य', english: 'I', hindi: 'मैं', category: 'nominative', note: '1st person singular (not capitalized mid-sentence)', sentenceGerman: 'Ich lerne jeden Tag ein bisschen Deutsch.', sentenceEnglish: 'I learn a little German every day.', sentenceHindi: 'मैं हर दिन थोड़ा जर्मन सीखता हूँ।' },
  { german: 'du', devanagari: 'डू', english: 'you (informal singular)', hindi: 'तुम / तू', category: 'nominative', note: 'Used with friends, family, children', sentenceGerman: 'Woher kommst du?', sentenceEnglish: 'Where do you come from?', sentenceHindi: 'तुम कहाँ से हो?' },
  { german: 'er', devanagari: 'एअ', english: 'he / it (masculine)', hindi: 'वह (पुल्लिंग)', category: 'nominative', note: 'Used for males AND masculine der-nouns', sentenceGerman: 'Er arbeitet als Ingenieur in Stuttgart.', sentenceEnglish: 'He works as an engineer in Stuttgart.', sentenceHindi: 'वह स्टटगार्ट में इंजीनियर के रूप में काम करता है।' },
  { german: 'sie', devanagari: 'ज़ी', english: 'she / it (feminine)', hindi: 'वह (स्त्रीलिंग)', category: 'nominative', note: 'Used for females AND feminine die-nouns', sentenceGerman: 'Sie spricht sehr gut Deutsch und Hindi.', sentenceEnglish: 'She speaks German and Hindi very well.', sentenceHindi: 'वह बहुत अच्छी जर्मन और हिंदी बोलती है।' },
  { german: 'es', devanagari: 'एस', english: 'it (neuter)', hindi: 'यह / वह (नपुंसकलिंग)', category: 'nominative', note: 'Used for das-nouns & weather/time', sentenceGerman: 'Es regnet heute leider stark.', sentenceEnglish: 'Unfortunately it is raining heavily today.', sentenceHindi: 'आज दुर्भाग्य से तेज़ बारिश हो रही है।' },
  { german: 'wir', devanagari: 'वीअ', english: 'we', hindi: 'हम', category: 'nominative', note: '1st person plural', sentenceGerman: 'Wir fahren am Wochenende nach München.', sentenceEnglish: 'We are going to Munich on the weekend.', sentenceHindi: 'हम सप्ताहांत पर म्यूनिख जा रहे हैं।' },
  { german: 'ihr', devanagari: 'ईअ', english: 'you all (informal plural)', hindi: 'तुम सब / तुम लोग', category: 'nominative', note: 'Used when speaking to 2+ friends', sentenceGerman: 'Habt ihr heute Abend Zeit?', sentenceEnglish: 'Do you all have time tonight?', sentenceHindi: 'क्या तुम सबके पास आज शाम समय है?' },
  { german: 'sie (Plural)', devanagari: 'ज़ी', english: 'they', hindi: 'वे / वे लोग', category: 'nominative', note: '3rd person plural (verb ends in -en)', sentenceGerman: 'Sie wohnen seit zwei Jahren in Berlin.', sentenceEnglish: 'They have lived in Berlin for two years.', sentenceHindi: 'वे दो साल से बर्लिन में रह रहे हैं।' },
  { german: 'Sie', devanagari: 'ज़ी', english: 'you (formal, singular & plural)', hindi: 'आप', category: 'nominative', note: 'Always capitalized! Used with strangers, bosses, elders', sentenceGerman: 'Wie heißen Sie, bitte?', sentenceEnglish: 'What is your name, please?', sentenceHindi: 'कृपया आपका नाम क्या है?' },

  // Accusative (Direct Object — whom/what?)
  { german: 'mich', devanagari: 'मिश्य', english: 'me', hindi: 'मुझे / मुझको', category: 'accusative', note: 'Direct object form of ich', sentenceGerman: 'Kannst du mich gut hören?', sentenceEnglish: 'Can you hear me well?', sentenceHindi: 'क्या तुम मुझे अच्छे से सुन सकते हो?' },
  { german: 'dich', devanagari: 'डिश्य', english: 'you (informal)', hindi: 'तुम्हें / तुमको', category: 'accusative', note: 'Direct object form of du', sentenceGerman: 'Ich sehe dich morgen im Büro.', sentenceEnglish: 'I will see you tomorrow at the office.', sentenceHindi: 'मैं तुम्हें कल ऑफिस में देखूँगा।' },
  { german: 'ihn', devanagari: 'ईन', english: 'him / it (masc.)', hindi: 'उसे / उसको', category: 'accusative', note: 'Direct object form of er', sentenceGerman: 'Ich kenne ihn schon lange.', sentenceEnglish: 'I have known him for a long time.', sentenceHindi: 'मैं उसे बहुत समय से जानता हूँ।' },
  { german: 'sie', devanagari: 'ज़ी', english: 'her / them', hindi: 'उसे (स्त्री.) / उन्हें', category: 'accusative', note: 'Same spelling as nominative sie', sentenceGerman: 'Ich rufe sie heute Abend an.', sentenceEnglish: 'I will call her tonight.', sentenceHindi: 'मैं उसे आज शाम फोन करूँगा।' },
  { german: 'uns', devanagari: 'उन्स', english: 'us', hindi: 'हमें / हमको', category: 'accusative', note: 'Direct object form of wir', sentenceGerman: 'Unsere Freunde besuchen uns am Sonntag.', sentenceEnglish: 'Our friends are visiting us on Sunday.', sentenceHindi: 'हमारे दोस्त रविवार को हमसे मिलने आ रहे हैं।' },
  { german: 'euch', devanagari: 'ऑयश्य', english: 'you all (informal)', hindi: 'तुम सबको', category: 'accusative', note: 'Direct object form of ihr', sentenceGerman: 'Ich lade euch zum Abendessen ein.', sentenceEnglish: 'I invite you all for dinner.', sentenceHindi: 'मैं तुम सबको रात के खाने पर बुलाता हूँ।' },
  { german: 'Sie', devanagari: 'ज़ी', english: 'you (formal)', hindi: 'आपको', category: 'accusative', note: 'Always capitalized', sentenceGerman: 'Ich verstehe Sie sehr gut.', sentenceEnglish: 'I understand you very well.', sentenceHindi: 'मैं आपको बहुत अच्छे से समझता हूँ।' },

  // Dative (Indirect Object — to/for whom?)
  { german: 'mir', devanagari: 'मीअ', english: 'to me / for me', hindi: 'मुझे / मेरे लिए', category: 'dative', note: 'Used with helfen, gefallen, danken, gehen (Wie geht es mir?)', sentenceGerman: 'Es geht mir heute sehr gut.', sentenceEnglish: 'I am doing very well today.', sentenceHindi: 'मैं आज बहुत अच्छा हूँ।' },
  { german: 'dir', devanagari: 'डीअ', english: 'to you (informal)', hindi: 'तुम्हें / तुम्हारे लिए', category: 'dative', note: 'Used with Wie geht es dir?, Ich helfe dir', sentenceGerman: 'Ich helfe dir gern bei den Hausaufgaben.', sentenceEnglish: 'I gladly help you with the homework.', sentenceHindi: 'मैं होमवर्क में तुम्हारी खुशी से मदद करूँगा।' },
  { german: 'ihm', devanagari: 'ईम', english: 'to him / to it', hindi: 'उसे / उसके लिए', category: 'dative', note: 'Dative of both er and es', sentenceGerman: 'Das neue Buch gefällt ihm sehr.', sentenceEnglish: 'He likes the new book very much.', sentenceHindi: 'उसे नई किताब बहुत पसंद है।' },
  { german: 'ihr', devanagari: 'ईअ', english: 'to her', hindi: 'उसे (स्त्री.)', category: 'dative', note: 'Dative of sie (she)', sentenceGerman: 'Ich gebe ihr morgen den Schlüssel.', sentenceEnglish: 'I will give her the key tomorrow.', sentenceHindi: 'मैं उसे कल चाबी दूँगा।' },
  { german: 'uns', devanagari: 'उन्स', english: 'to us', hindi: 'हमें', category: 'dative', note: 'Same in accusative & dative', sentenceGerman: 'Der Lehrer erklärt uns die Grammatik.', sentenceEnglish: 'The teacher explains the grammar to us.', sentenceHindi: 'शिक्षक हमें व्याकरण समझाते हैं।' },
  { german: 'ihnen', devanagari: 'ई-नन', english: 'to them', hindi: 'उन्हें', category: 'dative', note: 'Lowercase i = to them', sentenceGerman: 'Wir schicken ihnen eine E-Mail.', sentenceEnglish: 'We are sending them an email.', sentenceHindi: 'हम उन्हें एक ईमेल भेज रहे हैं।' },
  { german: 'Ihnen', devanagari: 'ई-नन', english: 'to you (formal)', hindi: 'आपको', category: 'dative', note: 'Capital I = formal to you (Danke Ihnen!)', sentenceGerman: 'Wie geht es Ihnen heute?', sentenceEnglish: 'How are you (formal) today?', sentenceHindi: 'आज आप कैसे हैं?' },

  // Possessive (Ownership)
  { german: 'mein / meine', devanagari: 'माइन / माइ-ने', english: 'my', hindi: 'मेरा / मेरी', category: 'possessive', note: 'Add -e before feminine & plural nouns (meine Mutter)', sentenceGerman: 'Das ist mein Haus und das ist meine Familie.', sentenceEnglish: 'That is my house and that is my family.', sentenceHindi: 'यह मेरा घर है और यह मेरा परिवार है।' },
  { german: 'dein / deine', devanagari: 'डाइन / डाइ-ने', english: 'your (informal)', hindi: 'तुम्हारा / तुम्हारी', category: 'possessive', note: 'Matches gender of the owned noun', sentenceGerman: 'Wo ist deine Tasche?', sentenceEnglish: 'Where is your bag?', sentenceHindi: 'तुम्हारा बैग कहाँ है?' },
  { german: 'sein / seine', devanagari: 'ज़ाइन / ज़ाइ-ने', english: 'his / its', hindi: 'उसका / उसकी (पुल्लिंग)', category: 'possessive', note: 'Owner is masculine or neuter', sentenceGerman: 'Sein Auto ist neu.', sentenceEnglish: 'His car is new.', sentenceHindi: 'उसकी कार नई है।' },
  { german: 'ihr / ihre', devanagari: 'ईअ / ई-रे', english: 'her / their', hindi: 'उसका (स्त्री.) / उनका', category: 'possessive', note: 'Owner is feminine or plural', sentenceGerman: 'Ihre Wohnung liegt im Zentrum.', sentenceEnglish: 'Her apartment is in the city center.', sentenceHindi: 'उसका फ़्लैट शहर के बीच में है।' },
  { german: 'unser / unsere', devanagari: 'उन-ज़र / उन-ज़े-रे', english: 'our', hindi: 'हमारा / हमारी', category: 'possessive', note: '1st person plural possessive', sentenceGerman: 'Unser Deutschkurs macht viel Spaß.', sentenceEnglish: 'Our German course is a lot of fun.', sentenceHindi: 'हमारे जर्मन कोर्स में बहुत मज़ा आता है।' },
  { german: 'euer / eure', devanagari: 'ऑय-अर / ऑय-रे', english: 'your (plural informal)', hindi: 'तुम सबका', category: 'possessive', note: 'Drops inner e when adding -e: eure', sentenceGerman: 'Ist das euer Lehrer?', sentenceEnglish: 'Is that your teacher?', sentenceHindi: 'क्या वह तुम सबके शिक्षक हैं?' },
  { german: 'Ihr / Ihre', devanagari: 'ईअ / ई-रे', english: 'your (formal)', hindi: 'आपका / आपकी', category: 'possessive', note: 'Always capitalized', sentenceGerman: 'Wie ist Ihre Telefonnummer?', sentenceEnglish: 'What is your phone number?', sentenceHindi: 'आपका फ़ोन नंबर क्या है?' },

  // Reflexive & Indefinite
  { german: 'sich', devanagari: 'ज़िश्य', english: 'himself / herself / themselves / yourself (formal)', hindi: 'खुद को / अपने आप को', category: 'other', note: 'Used with reflexive verbs like sich freuen, sich treffen', sentenceGerman: 'Er freut sich sehr über das Geschenk.', sentenceEnglish: 'He is very happy about the gift.', sentenceHindi: 'वह उपहार पाकर बहुत खुश है।' },
  { german: 'man', devanagari: 'मान', english: 'one / people in general / you', hindi: 'कोई भी / लोग', category: 'other', note: 'Always singular 3rd-person verb (man spricht = people speak)', sentenceGerman: 'Hier spricht man Deutsch.', sentenceEnglish: 'German is spoken here.', sentenceHindi: 'यहाँ जर्मन बोली जाती है।' },
  { german: 'jemand / niemand', devanagari: 'ये-मान्ट / नी-मान्ट', english: 'someone / no one', hindi: 'कोई / कोई नहीं', category: 'other', note: 'Takes singular verb', sentenceGerman: 'Ist jemand zu Hause? Nein, niemand ist da.', sentenceEnglish: 'Is someone at home? No, nobody is here.', sentenceHindi: 'क्या घर पर कोई है? नहीं, कोई नहीं है।' },
  { german: 'alles / nichts', devanagari: 'आ-लेस / निश्य्ट्स', english: 'everything / nothing', hindi: 'सब कुछ / कुछ नहीं', category: 'other', note: 'Super common everyday pair', sentenceGerman: 'Alles klar! Nichts zu danken.', sentenceEnglish: 'All clear! Nothing to thank for (You’re welcome).', sentenceHindi: 'सब ठीक है! धन्यवाद की कोई बात नहीं।' },
];

// ============================================================================
// 7. PARTS OF SPEECH & GRAMMAR TECHNIQUES (WORTARTEN)
// ============================================================================
export const PARTS_OF_SPEECH_GUIDES: PartOfSpeechGuide[] = [
  {
    id: 'nouns',
    nameEnglish: 'Nouns',
    nameGerman: 'Nomen / Substantive',
    devanagari: 'नो-मन (संज्ञा)',
    summary:
      'Every German noun is ALWAYS capitalized (even mid-sentence!) and has one of three genders: der (masculine), die (feminine), or das (neuter).',
    keyTechniques: [
      'Always learn a noun WITH its article (der Tisch, die Lampe, das Buch) — never just the bare noun.',
      'Instant gender shortcuts: -ung, -heit, -keit, -schaft, -tion are ALWAYS feminine (die); -chen and -lein are ALWAYS neuter (das); days, months, seasons are ALWAYS masculine (der).',
      'Compound noun trick: The LAST word decides the gender (Wasser + die Flasche = die Wasserflasche).',
    ],
    examples: [
      { german: 'Wohnung', article: 'die', devanagari: 'वो-नुंग', english: 'apartment (-ung → always die)', hindi: 'फ़्लैट', sentenceGerman: 'Die Wohnung hat drei helle Zimmer.', sentenceEnglish: 'The apartment has three bright rooms.' },
      { german: 'Brötchen', article: 'das', devanagari: 'ब्यॉअट-श्यन', english: 'bread roll (-chen → always das)', hindi: 'ब्रेड रोल', sentenceGerman: 'Ich kaufe morgens frische Brötchen.', sentenceEnglish: 'I buy fresh bread rolls in the morning.' },
      { german: 'Lehrer', article: 'der', devanagari: 'ले-रर', english: 'teacher (-er male → der)', hindi: 'शिक्षक', sentenceGerman: 'Der Lehrer erklärt das neue Thema.', sentenceEnglish: 'The teacher explains the new topic.' },
    ],
  },
  {
    id: 'verbs',
    nameEnglish: 'Verbs',
    nameGerman: 'Verben',
    devanagari: 'वेर-बन (क्रिया)',
    summary:
      'German verbs usually end in -en (lernen, spielen, wohnen). In a normal statement, the conjugated verb ALWAYS sits in Position 2 (the V2 rule!).',
    keyTechniques: [
      'Present tense formula (take off -en, add): ich -e · du -st · er/sie/es -t · wir -en · ihr -t · sie/Sie -en.',
      'V2 Rule: Even if time comes first, the verb stays #2 — "Heute lerne ich Deutsch" (NOT "Heute ich lerne").',
      'Separable verbs (aufstehen, einkaufen): The prefix jumps to the VERY END of the sentence — "Ich stehe um sieben Uhr auf."',
      'Modal verbs (können, müssen, möchten, wollen): Modal sits at Position 2, main verb goes to the END in -en form — "Ich möchte Kaffee trinken."',
    ],
    examples: [
      { german: 'lernen', devanagari: 'लेर-नन', english: 'to learn (regular verb)', hindi: 'सीखना', sentenceGerman: 'Heute lerne ich zwanzig neue Wörter.', sentenceEnglish: 'Today I am learning twenty new words.' },
      { german: 'aufstehen', devanagari: 'आउफ़-श्टे-एन', english: 'to get up (separable verb)', hindi: 'उठना', sentenceGerman: 'Ich stehe jeden Morgen um sechs Uhr auf.', sentenceEnglish: 'I get up every morning at six o’clock.' },
      { german: 'möchten', devanagari: 'म्यॉश्य-टन', english: 'would like (modal verb)', hindi: 'चाहना', sentenceGerman: 'Ich möchte bitte ein Glas Wasser trinken.', sentenceEnglish: 'I would like to drink a glass of water, please.' },
    ],
  },
  {
    id: 'adjectives',
    nameEnglish: 'Adjectives',
    nameGerman: 'Adjektive',
    devanagari: 'आड-येक-टी-वे (विशेषण)',
    summary:
      'Adjectives describe nouns. After "sein" (is/are) they stay clean with NO ending; right before a noun they take a gender ending (-e, -er, -es, -en).',
    keyTechniques: [
      'After the verb (easiest!): No ending needed — "Das Haus ist groß", "Der Kaffee ist heiß".',
      'Before a noun: Match the noun’s gender — "ein großes Haus" (das), "ein heißer Kaffee" (der), "eine schöne Stadt" (die).',
      'Comparison shortcut: Add -er for "more" and "am ...-sten" for "most" — schnell → schneller → am schnellsten.',
    ],
    examples: [
      { german: 'groß', devanagari: 'ग्रोस', english: 'big / tall', hindi: 'बड़ा', sentenceGerman: 'Das Haus ist groß, aber das Zimmer ist klein.', sentenceEnglish: 'The house is big, but the room is small.' },
      { german: 'schnell', devanagari: 'श्नेल', english: 'fast (schneller, am schnellsten)', hindi: 'तेज़', sentenceGerman: 'Der Zug ist schneller als der Bus.', sentenceEnglish: 'The train is faster than the bus.' },
      { german: 'freundlich', devanagari: 'फ़्रॉयन्ट-लिश्य', english: 'friendly', hindi: 'मिलनसार', sentenceGerman: 'Sie ist eine sehr freundliche Nachbarin.', sentenceEnglish: 'She is a very friendly neighbor.' },
    ],
  },
  {
    id: 'adverbs',
    nameEnglish: 'Adverbs',
    nameGerman: 'Adverbien',
    devanagari: 'आड-वेर-बि-एन (क्रिया विशेषण)',
    summary:
      'Adverbs describe when, how, why, or where an action happens — and the best news: German adverbs NEVER change their spelling or take endings!',
    keyTechniques: [
      'Zero endings to memorize: heute, immer, oft, gern, sehr, hier, dort never change.',
      'TeKaMoLo word-order rule when using multiple adverbs: Time (Wann) → Cause (Warum) → Manner (Wie) → Place (Wo/Wohin).',
      'Use "gern" right after a verb to say "like doing something" — "Ich koche gern" (I like cooking).',
    ],
    examples: [
      { german: 'gern', devanagari: 'गेर्न', english: 'gladly / like to', hindi: 'शौक से / पसंद करना', sentenceGerman: 'Ich trinke morgens gern heißen Tee.', sentenceEnglish: 'I like drinking hot tea in the morning.' },
      { german: 'oft', devanagari: 'ऑफ़्ट', english: 'often', hindi: 'अक्सर', sentenceGerman: 'Wir gehen oft zusammen spazieren.', sentenceEnglish: 'We often go for walks together.' },
      { german: 'hier', devanagari: 'हीअ', english: 'here', hindi: 'यहाँ', sentenceGerman: 'Ich arbeite seit einem Jahr hier.', sentenceEnglish: 'I have been working here for one year.' },
    ],
  },
  {
    id: 'articles',
    nameEnglish: 'Articles & Negation',
    nameGerman: 'Artikel',
    devanagari: 'आर-टी-कल',
    summary:
      'German has definite articles (der/die/das = the), indefinite articles (ein/eine = a/an), and negative articles (kein/keine = no/not a).',
    keyTechniques: [
      'Nominative (Subject): der / ein (masc.), die / eine (fem.), das / ein (neuter), die (plural).',
      'Accusative (Direct Object) shortcut: ONLY masculine changes! der → den, ein → einen, kein → keinen. Feminine, neuter, and plural stay identical!',
      'Use "kein/keine" to negate nouns ("Ich habe keine Zeit") and "nicht" to negate verbs/adjectives ("Ich komme nicht").',
    ],
    examples: [
      { german: 'einen', devanagari: 'आइ-नन', english: 'a (masculine accusative)', hindi: 'एक (पुल्लिंग कर्म)', sentenceGerman: 'Ich kaufe einen neuen Tisch.', sentenceEnglish: 'I am buying a new table.' },
      { german: 'keine', devanagari: 'काइ-ने', english: 'no / not any (fem./plural)', hindi: 'कोई नहीं', sentenceGerman: 'Ich habe heute leider keine Zeit.', sentenceEnglish: 'Unfortunately I have no time today.' },
      { german: 'nicht', devanagari: 'निश्य्ट', english: 'not (negates verb/adjective)', hindi: 'नहीं', sentenceGerman: 'Das Wasser ist heute nicht kalt.', sentenceEnglish: 'The water is not cold today.' },
    ],
  },
  {
    id: 'prepositions',
    nameEnglish: 'Prepositions',
    nameGerman: 'Präpositionen',
    devanagari: 'प्रे-पो-ज़ि-त्स्यो-नन (पूर्वसर्ग)',
    summary:
      'Prepositions show location, time, or direction — and each preposition controls whether the following noun uses Accusative or Dative.',
    keyTechniques: [
      'Always Accusative (FUDGO): für (for), um (around/at), durch (through), gegen (against), ohne (without).',
      'Always Dative (mit-nach-aus-zu-von-bei-seit): mit dem Bus, nach Hause, aus Indien, zum Bahnhof.',
      'Two-way prepositions (in, auf, an, unter): Asking "Wo?" (staying in place) → Dative; asking "Wohin?" (moving toward) → Accusative.',
    ],
    examples: [
      { german: 'mit', devanagari: 'मिट', english: 'with / by (always Dative)', hindi: 'के साथ / से', sentenceGerman: 'Ich fahre jeden Tag mit dem Zug.', sentenceEnglish: 'I travel by train every day.' },
      { german: 'für', devanagari: 'फ़्यूअ', english: 'for (always Accusative)', hindi: 'के लिए', sentenceGerman: 'Dieses Geschenk ist für meinen Freund.', sentenceEnglish: 'This gift is for my friend.' },
      { german: 'aus', devanagari: 'आउस', english: 'from / out of (always Dative)', hindi: 'से (मूल स्थान)', sentenceGerman: 'Meine Familie kommt aus Indien.', sentenceEnglish: 'My family comes from India.' },
    ],
  },
  {
    id: 'conjunctions',
    nameEnglish: 'Conjunctions (Connectors)',
    nameGerman: 'Konjunktionen',
    devanagari: 'कॉन-युंक-त्स्यो-नन (समुच्चयबोधक)',
    summary:
      'Connectors join two ideas together. Group 1 keeps normal word order; Group 2 kicks the conjugated verb to the VERY END of the clause!',
    keyTechniques: [
      'Position-0 Connectors (ADUSO — normal word order!): aber (but), denn (because), und (and), sondern (rather), oder (or).',
      'Verb-at-the-End Connectors (kick verb to final spot!): weil (because), dass (that), wenn (if/when), obwohl (although).',
      'Compare: "Ich lerne Deutsch, denn es macht Spaß" vs "Ich lerne Deutsch, weil es Spaß macht."',
    ],
    examples: [
      { german: 'und / aber', devanagari: 'उन्ट / आ-बर', english: 'and / but (normal word order)', hindi: 'और / लेकिन', sentenceGerman: 'Es ist kalt, aber die Sonne scheint.', sentenceEnglish: 'It is cold, but the sun is shining.' },
      { german: 'weil', devanagari: 'वाइल', english: 'because (sends verb to end!)', hindi: 'क्योंकि', sentenceGerman: 'Ich lerne Deutsch, weil ich in Deutschland arbeite.', sentenceEnglish: 'I am learning German because I work in Germany.' },
      { german: 'wenn', devanagari: 'वेन', english: 'if / whenever (sends verb to end!)', hindi: 'अगर / जब', sentenceGerman: 'Ich rufe dich an, wenn ich zu Hause bin.', sentenceEnglish: 'I will call you when I am at home.' },
    ],
  },
];

// ============================================================================
// 8. ALL QUESTION WORDS (W-FRAGEN)
// ============================================================================
export const QUESTION_WORDS: QuestionWordEntry[] = [
  { german: 'Wer', devanagari: 'वेअ', english: 'Who? (subject)', hindi: 'कौन?', usageTip: 'Always asks about a person (Nominative).', sentenceGerman: 'Wer ist dein Deutschlehrer?', sentenceEnglish: 'Who is your German teacher?', sentenceHindi: 'तुम्हारे जर्मन शिक्षक कौन हैं?' },
  { german: 'Was', devanagari: 'वास', english: 'What?', hindi: 'क्या?', usageTip: 'Asks about things, actions, or professions.', sentenceGerman: 'Was machst du am Wochenende?', sentenceEnglish: 'What are you doing on the weekend?', sentenceHindi: 'तुम सप्ताहांत पर क्या कर रहे हो?' },
  { german: 'Wo', devanagari: 'वो', english: 'Where? (location)', hindi: 'कहाँ?', usageTip: 'Static position — no movement (answered with in/an/auf + Dative).', sentenceGerman: 'Wo ist der Bahnhof, bitte?', sentenceEnglish: 'Where is the train station, please?', sentenceHindi: 'कृपया रेलवे स्टेशन कहाँ है?' },
  { german: 'Woher', devanagari: 'वो-हेअ', english: 'Where from? (origin)', hindi: 'कहाँ से?', usageTip: 'Asks origin or hometown (answered with "aus ...").', sentenceGerman: 'Woher kommen Sie?', sentenceEnglish: 'Where do you come from?', sentenceHindi: 'आप कहाँ से हैं?' },
  { german: 'Wohin', devanagari: 'वो-हिन', english: 'Where to? (direction)', hindi: 'किधर / कहाँ को?', usageTip: 'Movement toward a destination (answered with "nach / in ...").', sentenceGerman: 'Wohin fährst du im Urlaub?', sentenceEnglish: 'Where are you traveling to on vacation?', sentenceHindi: 'तुम छुट्टी में कहाँ जा रहे हो?' },
  { german: 'Wann', devanagari: 'वान', english: 'When?', hindi: 'कब?', usageTip: 'Asks for time, date, day, or month.', sentenceGerman: 'Wann fährt der nächste Zug ab?', sentenceEnglish: 'When does the next train depart?', sentenceHindi: 'अगली ट्रेन कब रवाना होगी?' },
  { german: 'Warum', devanagari: 'वा-रुम', english: 'Why?', hindi: 'क्यों?', usageTip: 'Asks for a reason (often answered with "weil ...").', sentenceGerman: 'Warum lernst du Deutsch?', sentenceEnglish: 'Why are you learning German?', sentenceHindi: 'तुम जर्मन क्यों सीख रहे हो?' },
  { german: 'Wie', devanagari: 'वी', english: 'How?', hindi: 'कैसे?', usageTip: 'Asks manner, name (Wie heißen Sie?), or well-being (Wie geht es dir?).', sentenceGerman: 'Wie geht es dir heute?', sentenceEnglish: 'How are you today?', sentenceHindi: 'आज तुम कैसे हो?' },
  { german: 'Wie viel', devanagari: 'वी फ़ील', english: 'How much? (uncountable)', hindi: 'कितना?', usageTip: 'Used for price, time (Wie viel Uhr?), water, money.', sentenceGerman: 'Wie viel kostet dieser Kaffee?', sentenceEnglish: 'How much does this coffee cost?', sentenceHindi: 'इस कॉफ़ी की कीमत कितनी है?' },
  { german: 'Wie viele', devanagari: 'वी फ़ी-ले', english: 'How many? (countable plural)', hindi: 'कितने?', usageTip: 'Always followed by a plural noun.', sentenceGerman: 'Wie viele Zimmer hat die Wohnung?', sentenceEnglish: 'How many rooms does the apartment have?', sentenceHindi: 'फ़्लैट में कितने कमरे हैं?' },
  { german: 'Wie lange', devanagari: 'वी लां-गे', english: 'How long? (duration)', hindi: 'कितनी देर / कब तक?', usageTip: 'Asks length of time.', sentenceGerman: 'Wie lange dauert der Flug nach Frankfurt?', sentenceEnglish: 'How long does the flight to Frankfurt take?', sentenceHindi: 'फ़्रैंकफ़र्ट की उड़ान में कितना समय लगता है?' },
  { german: 'Wie oft', devanagari: 'वी ऑफ़्ट', english: 'How often?', hindi: 'कितनी बार?', usageTip: 'Asks frequency (jeden Tag, zweimal pro Woche).', sentenceGerman: 'Wie oft gehst du zum Sport?', sentenceEnglish: 'How often do you go for sports/exercise?', sentenceHindi: 'तुम कितनी बार व्यायाम करने जाते हो?' },
  { german: 'Welcher / Welche / Welches', devanagari: 'वेल-श्यर / वेल-श्ये / वेल-श्येस', english: 'Which?', hindi: 'कौन सा / कौन सी?', usageTip: 'Ending matches noun gender: welcher Bus (der), welche Farbe (die), welches Buch (das).', sentenceGerman: 'Welcher Zug fährt nach Berlin?', sentenceEnglish: 'Which train goes to Berlin?', sentenceHindi: 'कौन सी ट्रेन बर्लिन जाती है?' },
  { german: 'Wen', devanagari: 'वेन', english: 'Whom? (direct object)', hindi: 'किसे / किसको?', usageTip: 'Accusative form of Wer (person receiving action).', sentenceGerman: 'Wen besuchst du am Sonntag?', sentenceEnglish: 'Whom are you visiting on Sunday?', sentenceHindi: 'तुम रविवार को किससे मिलने जा रहे हो?' },
  { german: 'Wem', devanagari: 'वेम', english: 'To whom? (indirect object)', hindi: 'किसको / किसके लिए?', usageTip: 'Dative form of Wer (used with helfen, gehören, geben).', sentenceGerman: 'Wem gehört diese Wasserflasche?', sentenceEnglish: 'To whom does this water bottle belong?', sentenceHindi: 'यह पानी की बोतल किसकी है?' },
  { german: 'Wessen', devanagari: 'वे-सन', english: 'Whose?', hindi: 'किसका / किसकी?', usageTip: 'Genitive possession question (no ending change!).', sentenceGerman: 'Wessen Schlüssel liegt hier auf dem Tisch?', sentenceEnglish: 'Whose key is lying here on the table?', sentenceHindi: 'यहाँ मेज़ पर किसकी चाबी रखी है?' },
];
