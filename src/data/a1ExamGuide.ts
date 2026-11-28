import type { A1WorkspaceTab } from '../types/a1';

export interface A1ExamSectionBlueprint {
  id: 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';
  germanName: string;
  englishName: string;
  hindiName: string;
  duration: string;
  points: number;
  parts: {
    label: string;
    taskSummary: string;
    tip: string;
  }[];
  hindiStrategy: string;
}

export interface A1StudyRoadmapWeek {
  week: number;
  title: string;
  hindiTitle: string;
  focus: string;
  targetModules: string[];
  targetSkillTab: A1WorkspaceTab;
  actionLabel: string;
  checklist: string[];
}

export interface A1GrammarMasterTopic {
  id: string;
  category: 'articles-cases' | 'verbs' | 'prepositions' | 'structure';
  title: string;
  hindiTitle: string;
  ruleSummary: string;
  hindiBridge: string;
  quickTable?: {
    headers: string[];
    rows: string[][];
  };
  examples: {
    german: string;
    devanagari: string;
    english: string;
    hindi: string;
  }[];
}

export interface A1FormFieldItem {
  german: string;
  english: string;
  hindi: string;
  sampleEntry: string;
}

export interface A1ExamPhraseCard {
  id: string;
  group: 'email-formal' | 'email-informal' | 'speaking-survival';
  purpose: string;
  german: string;
  devanagari: string;
  english: string;
  hindi: string;
}

export const GOETHE_A1_EXAM_FACTS = {
  officialName: 'Goethe-Zertifikat A1: Start Deutsch 1',
  totalPoints: 100,
  passingScore: 60,
  writtenDuration: '65 minutes (Hören + Lesen + Schreiben)',
  oralDuration: '~15 minutes (Sprechen in small group)',
  hindiSummary:
    'गोएथे A1 (Start Deutsch 1) पास करने के लिए चारों भागों (Hören, Lesen, Schreiben, Sprechen) को मिलाकर 100 में से कम से कम 60 अंक (60%) लाने होते हैं। किसी एक भाग में अलग से न्यूनतम सीमा नहीं है — कुल स्कोर 60+ होना चाहिए।',
};

export const A1_EXAM_SECTIONS: A1ExamSectionBlueprint[] = [
  {
    id: 'hoeren',
    germanName: 'Hören',
    englishName: 'Listening',
    hindiName: 'सुनना',
    duration: '~20 min',
    points: 25,
    parts: [
      {
        label: 'Teil 1 (6 items · played twice)',
        taskSummary: 'Short everyday conversations (café, shop, appointments) — choose a, b, or c.',
        tip: 'Watch for self-corrections ("Nein, nicht 15 Uhr, lieber 16 Uhr!").',
      },
      {
        label: 'Teil 2 (4 items · played ONCE)',
        taskSummary: 'Public announcements at train stations, airports, or supermarkets — Richtig / Falsch.',
        tip: 'Listen specifically for platform numbers (Gleis), prices, and closing times.',
      },
      {
        label: 'Teil 3 (5 items · played twice)',
        taskSummary: 'Voicemail / telephone messages — pick a, b, or c.',
        tip: 'Numbers, phone digits, and German weekdays are tested heavily here.',
      },
    ],
    hindiStrategy:
      'Hören में प्रश्न पहले पढ़ लें। Teil 2 केवल एक बार सुनाया जाता है, इसलिए Gleis (प्लेटफ़ॉर्म), समय (halb/Viertel) और कीमत पर पूरा ध्यान दें।',
  },
  {
    id: 'lesen',
    germanName: 'Lesen',
    englishName: 'Reading',
    hindiName: 'पढ़ना',
    duration: '25 min',
    points: 25,
    parts: [
      {
        label: 'Teil 1 (5 items)',
        taskSummary: 'Two short personal emails or notes — answer Richtig (True) or Falsch (False).',
        tip: 'Watch for negation words like "nicht", "kein", "nichts", and "leider".',
      },
      {
        label: 'Teil 2 (5 items)',
        taskSummary: 'Match a goal with Website / Ad A or B (courses, apartments, travel offers).',
        tip: 'Scan keywords like "inklusive", "nur online", "Sonntag geschlossen", and prices.',
      },
      {
        label: 'Teil 3 (5 items)',
        taskSummary: 'Short public signs (pharmacy, library, bus, clinic) — Richtig / Falsch.',
        tip: 'Focus on "verboten / nicht erlaubt" vs. "geöffnet / kostenlos".',
      },
    ],
    hindiStrategy:
      'हर शब्द समझने की कोशिश न करें — पहले प्रश्न पढ़ें, फिर विज्ञापन या साइन में समय, दिन, कीमत और "nicht erlaubt" जैसे मुख्य शब्द खोजें।',
  },
  {
    id: 'schreiben',
    germanName: 'Schreiben',
    englishName: 'Writing',
    hindiName: 'लिखना',
    duration: '20 min',
    points: 25,
    parts: [
      {
        label: 'Teil 1 (Formular · 5 fields)',
        taskSummary: 'Read a short profile paragraph and fill 5 missing fields in a German registration form.',
        tip: 'Copy spelling and dates cleanly in German format (e.g. 14.05.2026) and check "Bar" vs "Kreditkarte".',
      },
      {
        label: 'Teil 2 (Short Email · ~30 words)',
        taskSummary: 'Write a brief email or note covering all 3 required bullet points + greeting & closing.',
        tip: 'Never skip a bullet point! Even 1 simple, correct sentence per bullet + proper greeting/closing earns top marks.',
      },
    ],
    hindiStrategy:
      'Schreiben Teil 2 में तीनों बिंदुओं (bullet points) पर 1-1 आसान सही वाक्य लिखें। औपचारिक (Sehr geehrte... / Mit freundlichen Grüßen) और अनौपचारिक (Liebe/r... / Viele Grüße) अभिवादन ज़रूर लिखें।',
  },
  {
    id: 'sprechen',
    germanName: 'Sprechen',
    englishName: 'Speaking',
    hindiName: 'बोलना',
    duration: '~15 min',
    points: 25,
    parts: [
      {
        label: 'Teil 1 (Sich vorstellen)',
        taskSummary: 'Introduce yourself (7 points: Name, Alter, Land, Wohnort, Sprachen, Beruf, Hobby) + spell a word + read a phone number.',
        tip: 'Memorize German alphabet letter names (especially J, V, W, Y, Z, Ä, Ö, Ü) so spelling is effortless!',
      },
      {
        label: 'Teil 2 (Um Informationen bitten)',
        taskSummary: 'Pick 2 word cards (e.g. Thema: Essen, Wort: Frühstück), ask your partner a question, and answer theirs.',
        tip: 'Keep questions clean and direct: "Wann frühstücken Sie?" or "Was ist Ihr Lieblingsessen?"',
      },
      {
        label: 'Teil 3 (Bitten formulieren)',
        taskSummary: 'Pick 2 picture/request cards (e.g. window, pen, menu), make a polite request, and react kindly.',
        tip: 'Use "Können Sie bitte ...?" or "Geben Sie mir bitte ...?" and always answer "Ja, sehr gern!"',
      },
    ],
    hindiStrategy:
      'Sprechen में घबराएँ नहीं! अगर कुछ समझ न आए तो "Können Sie das bitte wiederholen?" बोलने पर अंक नहीं कटते, बल्कि आत्मविश्वास दिखता है।',
  },
];

export const A1_STUDY_ROADMAP: A1StudyRoadmapWeek[] = [
  {
    week: 1,
    title: 'Sounds, Alphabet & Self-Introduction',
    hindiTitle: 'अक्षर, उच्चारण और अपना परिचय',
    focus: 'Master German letter names in Hindi (for spelling in Sprechen Teil 1) + greetings, sein, and personal pronouns.',
    targetModules: ['a1-m1'],
    targetSkillTab: 'modules',
    actionLabel: 'Open Modul 1',
    checklist: [
      'Memorize all 30 letters (A–Z + Ä, Ö, Ü, ß) in Basics → Alphabet',
      'Complete Modul 1 (Begrüßung & Vorstellen) + checkpoint',
      'Build & speak your 7-line self-introduction in Sprechen',
    ],
  },
  {
    week: 2,
    title: 'Numbers, Time, Calendar & Family',
    hindiTitle: 'गिनती, समय, कैलेंडर और परिवार',
    focus: 'Train German 24h & halb/Viertel clock times, phone numbers, days/months, articles (der/die/das), and possessives.',
    targetModules: ['a1-m2', 'a1-m3'],
    targetSkillTab: 'modules',
    actionLabel: 'Open Modul 2',
    checklist: [
      'Drill numbers 0–1000 & weekdays in Basics → Numbers / Calendar',
      'Complete Modul 2 (Zahlen & Zeit) and Modul 3 (Familie & Beruf)',
      'Practice speaking your phone number & date of birth aloud',
    ],
  },
  {
    week: 3,
    title: 'Food, Accusative Case & Daily Routine',
    hindiTitle: 'खान-पान, Accusative और दिनचर्या',
    focus: 'Lock in Accusative (den/einen/keinen), polite ordering with möchten, and separable verbs (aufstehen, einkaufen).',
    targetModules: ['a1-m4', 'a1-m5'],
    targetSkillTab: 'modules',
    actionLabel: 'Open Modul 4',
    checklist: [
      'Complete Modul 4 (Essen & Einkaufen) and Modul 5 (Wohnen & Alltag)',
      'Master at least 40 Core A1 Words with Verify Voice check',
      'Practice 2 Hören listening tasks without reading the transcript first',
    ],
  },
  {
    week: 4,
    title: 'Travel, Modal Verbs & Doctor Visits',
    hindiTitle: 'यात्रा, Modal Verbs और डॉक्टर',
    focus: 'Use können, müssen, wollen, dürfen, sollen + formal imperative (Nehmen Sie...) for directions and clinics.',
    targetModules: ['a1-m6', 'a1-m7'],
    targetSkillTab: 'modules',
    actionLabel: 'Open Modul 6',
    checklist: [
      'Complete Modul 6 (Unterwegs & Reisen) and Modul 7 (Gesundheit & Arzt)',
      'Practice station announcements in Hören (Teil 2)',
      'Read public notices & pharmacy signs in Lesen (Teil 3)',
    ],
  },
  {
    week: 5,
    title: 'Past Tense (Perfekt), Hobbies & Shopping',
    hindiTitle: 'भूतकाल (Perfekt), शौक और कपड़े',
    focus: 'Speak about past weekends using haben/sein + ge-... and master nicht vs. kein while shopping for clothes.',
    targetModules: ['a1-m8', 'a1-m9'],
    targetSkillTab: 'modules',
    actionLabel: 'Open Modul 8',
    checklist: [
      'Complete Modul 8 (Freizeit & Perfekt) and Modul 9 (Kleidung & Negation)',
      'Drill 15 high-frequency Perfekt verbs (gemacht, gekauft, gefahren, gegessen)',
      'Complete all 4 Lesen reading tasks with > 80% accuracy',
    ],
  },
  {
    week: 6,
    title: 'Forms, Prepositions & Writing Mastery',
    hindiTitle: 'फ़ॉर्म, प्रीपोज़िशन और ईमेल लेखन',
    focus: 'Master A1 prepositions (mit/aus/nach/zu/bei/von/für/ohne), official form vocabulary, and 30-word emails.',
    targetModules: ['a1-m10'],
    targetSkillTab: 'schreiben',
    actionLabel: 'Practice Schreiben',
    checklist: [
      'Complete Modul 10 (Formulare & Prüfung)',
      'Memorize the 12 Formular fields (Schreiben Teil 1)',
      'Write both A1 emails in Schreiben and check AI Goethe grading',
    ],
  },
  {
    week: 7,
    title: 'Intensive Listening & Speaking Drill',
    hindiTitle: 'सुनने और बोलने का गहन अभ्यास',
    focus: 'Simulate real Goethe Sprechen Teil 1, 2 & 3 cards using Voice Verify until every core sentence scores 75%+.',
    targetModules: ['a1-m10'],
    targetSkillTab: 'sprechen',
    actionLabel: 'Practice Sprechen',
    checklist: [
      'Practice all 8 Sprechen Teil 2 & Teil 3 cards aloud with Verify Voice',
      'Review all 4 Hören listening tasks at normal speed',
      'Revise saved hard words and master 70+ of 80 Core A1 words',
    ],
  },
  {
    week: 8,
    title: 'Full 100-Point Mock Exam & Final Polish',
    hindiTitle: '100 अंक का मॉक टेस्ट और अंतिम तैयारी',
    focus: 'Take the timed 100-point Goethe-Zertifikat A1 Mock Exam, fix any weak section, and aim for 75%+ (60% passes).',
    targetModules: ['a1-m10'],
    targetSkillTab: 'mock-exam',
    actionLabel: 'Take Mock Exam',
    checklist: [
      'Complete the 100-point Goethe A1 Mock Exam cleanly',
      'Review every missed explanation across Hören, Lesen, Schreiben, Sprechen',
      'Reach 75%+ score twice before your official Goethe exam date',
    ],
  },
];

export const A1_GRAMMAR_CHEAT_SHEET: A1GrammarMasterTopic[] = [
  {
    id: 'g-articles',
    category: 'articles-cases',
    title: '1. Articles & Cases (Nominative, Accusative, Dative)',
    hindiTitle: 'आर्टिकल और कारक (der / die / das के बदलाव)',
    ruleSummary:
      'Only masculine nouns (der → den) change in Accusative. In Dative (after mit, aus, nach, zu, bei, von), ALL genders change: der/das → dem, die → der, Plural → den + -n.',
    hindiBridge:
      'Accusative (कर्म कारक) में केवल पुल्लिंग (der) बदलकर "den / einen / keinen" होता है। Dative में der/das → dem और die → der बन जाता है।',
    quickTable: {
      headers: ['Case', 'Masculine (der)', 'Feminine (die)', 'Neuter (das)', 'Plural (die)'],
      rows: [
        ['Nominative (Who?)', 'der / ein / kein', 'die / eine / keine', 'das / ein / kein', 'die / — / keine'],
        ['Accusative (Whom?)', 'den / einen / keinen', 'die / eine / keine', 'das / ein / kein', 'die / — / keine'],
        ['Dative (To whom?)', 'dem / einem / keinem', 'der / einer / keiner', 'dem / einem / keinem', 'den (+n) / keinen'],
      ],
    },
    examples: [
      {
        german: 'Ich kaufe einen Apfel für den Lehrer.',
        devanagari: 'इश्य काउफ़े आइनन आप्फ़ेल फ़्यूअ डेन लेर-अ।',
        english: 'I buy an apple for the teacher.',
        hindi: 'मैं शिक्षक के लिए एक सेब खरीदता हूँ।',
      },
      {
        german: 'Ich fahre mit dem Bus zu der Apotheke.',
        devanagari: 'इश्य फ़ारे मिट डेम बुस त्सु डेअ आपो-टेके।',
        english: 'I go by bus to the pharmacy.',
        hindi: 'मैं बस से दवाई की दुकान जाता हूँ।',
      },
    ],
  },
  {
    id: 'g-verb-order',
    category: 'verbs',
    title: '2. Present Tense Conjugation & Verb-Second (V2) Rule',
    hindiTitle: 'वर्तमान काल और क्रिया हमेशा दूसरे स्थान पर',
    ruleSummary:
      'Regular verb endings follow the E-ST-T-EN-T-EN pattern (ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en). In every statement, the conjugated verb MUST stand in Position 2 — even if time or place comes first!',
    hindiBridge:
      'जर्मन वाक्य में अगर समय (Heute, Am Montag) पहले आए, तो भी क्रिया दूसरे स्थान पर ही रहेगी और कर्ता (ich) उसके बाद चला जाएगा।',
    quickTable: {
      headers: ['Pronoun', 'lernen (regular)', 'sein (to be)', 'haben (to have)'],
      rows: [
        ['ich', 'lerne', 'bin', 'habe'],
        ['du', 'lernst', 'bist', 'hast'],
        ['er / sie / es', 'lernt', 'ist', 'hat'],
        ['wir / sie / Sie', 'lernen', 'sind', 'haben'],
        ['ihr', 'lernt', 'seid', 'habt'],
      ],
    },
    examples: [
      {
        german: 'Heute lerne ich zwei Stunden Deutsch.',
        devanagari: 'हॉय-टे लेअ्ने इश्य त्स्वाइ श्टुन्डन डॉयच।',
        english: 'Today I am studying German for two hours.',
        hindi: 'आज मैं दो घंटे जर्मन सीख रहा हूँ।',
      },
    ],
  },
  {
    id: 'g-modals',
    category: 'verbs',
    title: '3. Modal Verbs (können, müssen, möchten, wollen, dürfen, sollen)',
    hindiTitle: 'मॉडल क्रियाएँ (सकना, ज़रूरी होना, चाहना)',
    ruleSummary:
      'Put the conjugated modal verb in Position 2 and push the main action verb (infinitive) to the VERY END of the sentence. Notice ich and er/sie/es share the exact same form (ich kann, er kann)!',
    hindiBridge:
      'मॉडल क्रिया दूसरे स्थान पर और मुख्य क्रिया (infinitive) बिल्कुल अंत में जाती है — जैसे "Ich kann gut schwimmen" (मैं अच्छा तैर सकता हूँ)।',
    quickTable: {
      headers: ['Modal Verb', 'Meaning', 'ich / er / sie', 'wir / Sie'],
      rows: [
        ['können', 'can / be able to', 'kann', 'können'],
        ['müssen', 'must / have to', 'muss', 'müssen'],
        ['möchten', 'would like', 'möchte', 'möchten'],
        ['wollen', 'want to', 'will', 'wollen'],
        ['dürfen', 'may / be allowed', 'darf', 'dürfen'],
        ['sollen', 'should (advice)', 'soll', 'sollen'],
      ],
    },
    examples: [
      {
        german: 'Ich muss morgen früh arbeiten, aber am Sonntag kann ich schlafen.',
        devanagari: 'इश्य मुस मॉअ्गन फ़्र्यू आअ्बाइटन, आब-अ आम ज़ॉन-टाक कान इश्य श्लाफ़न।',
        english: 'I have to work early tomorrow, but on Sunday I can sleep.',
        hindi: 'मुझे कल जल्दी काम करना है, लेकिन रविवार को मैं सो सकता हूँ।',
      },
    ],
  },
  {
    id: 'g-separable',
    category: 'verbs',
    title: '4. Separable Verbs (Trennbare Verben)',
    hindiTitle: 'टूटने वाली क्रियाएँ (aufstehen, einkaufen, anrufen)',
    ruleSummary:
      'Common A1 prefixes (ab-, an-, auf-, aus-, ein-, mit-, vor-, zurück-) split off and jump to the very end of a simple present sentence. With a modal verb, they stay joined at the end!',
    hindiBridge:
      'सीधे वाक्य में उपसर्ग (auf, ein, an) अलग होकर वाक्य के अंत में जाता है: "Ich stehe um 7 Uhr auf" (मैं 7 बजे उठता हूँ)।',
    examples: [
      {
        german: 'Der Zug kommt um 14 Uhr in Berlin an.',
        devanagari: 'डेअ त्सूक कॉम्ट उम फ़ीअ्त्सेन ऊअ इन बेअलीन आन।',
        english: 'The train arrives in Berlin at 2 PM.',
        hindi: 'ट्रेन दोपहर 2 बजे बर्लिन पहुँचती है।',
      },
      {
        german: 'Ich rufe dich heute Abend an.',
        devanagari: 'इश्य रूफ़े डिश्य हॉय-टे आबेन्ट आन।',
        english: 'I will call you this evening.',
        hindi: 'मैं तुम्हें आज शाम कॉल करूँगा।',
      },
    ],
  },
  {
    id: 'g-perfekt',
    category: 'verbs',
    title: '5. Spoken Past Tense (Perfekt: haben / sein + ge-...)',
    hindiTitle: 'बोलचाल का भूतकाल (Perfekt)',
    ruleSummary:
      'Use haben (most verbs) or sein (movement A→B like gehen, fahren, fliegen, kommen, bleiben) in Position 2 + past participle at the end. Verbs ending in -ieren (studieren → studiert) or starting with be-/ver- (besuchen → besucht) take NO "ge-".',
    hindiBridge:
      'ज़्यादातर क्रियाओं के साथ "haben" और एक जगह से दूसरी जगह जाने (gehen/fahren/fliegen) के लिए "sein" लगता है।',
    quickTable: {
      headers: ['Infinitive', 'Auxiliary', 'Past Participle', 'Meaning'],
      rows: [
        ['machen / kaufen', 'haben', 'gemacht / gekauft', 'did / bought'],
        ['essen / trinken', 'haben', 'gegessen / getrunken', 'ate / drank'],
        ['gehen / fahren', 'sein', 'gegangen / gefahren', 'went / travelled'],
        ['einkaufen (separable)', 'haben', 'eingekauft', 'shopped'],
        ['besuchen / studieren', 'haben', 'besucht / studiert', 'visited / studied'],
      ],
    },
    examples: [
      {
        german: 'Gestern habe ich eingekauft und bin ins Kino gegangen.',
        devanagari: 'गेस्टअ्न हाबे इश्य आइन-गे-काउफ़्ट उन्ट बिन इन्स कीनो गे-गांगन।',
        english: 'Yesterday I went shopping and went to the cinema.',
        hindi: 'कल मैंने खरीदारी की और सिनेमा गया।',
      },
    ],
  },
  {
    id: 'g-prepositions',
    category: 'prepositions',
    title: '6. Essential A1 Prepositions (Time & Place)',
    hindiTitle: 'समय और स्थान के प्रीपोज़िशन (um, am, im, mit, nach, zu)',
    ruleSummary:
      'Time trio: um + clock time (um 8 Uhr), am + days/parts of day (am Montag, am Abend), im + months/seasons (im Mai, im Sommer). Transport/Origin: mit dem Bus, aus Indien, nach Berlin, zu Hause (at home) vs. nach Hause (going home).',
    hindiBridge:
      'समय के लिए आसान नियम: घड़ी का समय = um, दिन/तारीख़ = am, महीना/मौसम = im। "घर पर" = zu Hause, "घर जाना" = nach Hause।',
    examples: [
      {
        german: 'Am Samstag um 10 Uhr fahre ich nach München.',
        devanagari: 'आम ज़ाम्स-टाक उम त्सेन ऊअ फ़ारे इश्य नाख़ म्यून-श्यन।',
        english: 'On Saturday at 10 AM I am travelling to Munich.',
        hindi: 'शनिवार को सुबह 10 बजे मैं म्यूनिख जा रहा हूँ।',
      },
      {
        german: 'Im Winter bleibe ich gern zu Hause.',
        devanagari: 'इम विन्ट-अ ब्लाइबे इश्य गेअ्न त्सु हाउज़े।',
        english: 'In winter I like to stay at home.',
        hindi: 'सर्दियों में मुझे घर पर रहना पसंद है।',
      },
    ],
  },
  {
    id: 'g-negation',
    category: 'structure',
    title: '7. Negation: nicht vs. kein',
    hindiTitle: 'नकारात्मक वाक्य (nicht और kein का सही प्रयोग)',
    ruleSummary:
      'Negate nouns that have "ein / eine" or NO article using kein/keine/keinen. Negate verbs, adjectives, adverbs, and definite nouns (der/die/das/mein) using nicht.',
    hindiBridge:
      'जहाँ अंग्रेज़ी में "not a / no + noun" हो वहाँ "kein/keine" लगाएँ। बाकी सभी जगह (क्रिया, विशेषण, स्थान) "nicht" लगाएँ।',
    examples: [
      {
        german: 'Ich habe leider keine Zeit und kann heute nicht kommen.',
        devanagari: 'इश्य हाबे लाइड-अ काइने त्साइट उन्ट कान हॉय-टे निश्य्ट कॉमन।',
        english: 'Unfortunately I have no time and cannot come today.',
        hindi: 'अफ़सोस मेरे पास समय नहीं है और मैं आज नहीं आ सकता।',
      },
    ],
  },
  {
    id: 'g-questions-imperative',
    category: 'structure',
    title: '8. W-Questions, Yes/No Questions & Polite Imperative',
    hindiTitle: 'प्रश्न पूछना और विनम्र निवेदन (Imperative)',
    ruleSummary:
      'W-Questions: W-word (1) + Verb (2) + Subject (3). Yes/No Questions: Verb starts in Position 1! Formal Imperative (requests/instructions): Infinitive Verb + Sie ("Sprechen Sie bitte langsamer!").',
    hindiBridge:
      'हाँ/ना प्रश्न हमेशा क्रिया से शुरू होते हैं ("Haben Sie Zeit?"), और विनम्र निवेदन के लिए "क्रिया + Sie + bitte" का प्रयोग होता है।',
    examples: [
      {
        german: 'Wann beginnt der Deutschkurs? Haben Sie das Buch dabei?',
        devanagari: 'वान बे-गिन्ट डेअ डॉयच-कुअ्स? हाबन ज़ी दास बूख़ डाबाई?',
        english: 'When does the German course start? Do you have the book with you?',
        hindi: 'जर्मन कोर्स कब शुरू होता है? क्या आपके पास किताब है?',
      },
      {
        german: 'Bitte sprechen Sie etwas langsamer!',
        devanagari: 'बिटे श्प्रेश्यन ज़ी एटवास लांग-ज़ाम-अ!',
        english: 'Please speak a little more slowly!',
        hindi: 'कृपया थोड़ा धीरे बोलिए!',
      },
    ],
  },
];

export const A1_FORM_VOCABULARY: A1FormFieldItem[] = [
  { german: 'Familienname / Nachname', english: 'Surname / Last name', hindi: 'उपनाम / सरनेम', sampleEntry: 'Sharma' },
  { german: 'Vorname', english: 'First name', hindi: 'पहला नाम', sampleEntry: 'Rohan' },
  { german: 'Geburtsdatum', english: 'Date of birth', hindi: 'जन्म तिथि', sampleEntry: '14.05.1996' },
  { german: 'Geburtsort', english: 'Place of birth', hindi: 'जन्म स्थान', sampleEntry: 'Jaipur' },
  { german: 'Staatsangehörigkeit', english: 'Nationality', hindi: 'राष्ट्रीयता', sampleEntry: 'indisch' },
  { german: 'Straße / Hausnummer', english: 'Street & house number', hindi: 'सड़क और मकान नंबर', sampleEntry: 'Bahnhofstraße 12' },
  { german: 'Postleitzahl (PLZ)', english: 'Postal / PIN code', hindi: 'पिन कोड', sampleEntry: '10115' },
  { german: 'Wohnort / Stadt', english: 'City of residence', hindi: 'शहर', sampleEntry: 'Berlin' },
  { german: 'Familienstand', english: 'Marital status', hindi: 'वैवाहिक स्थिति', sampleEntry: 'ledig / verheiratet' },
  { german: 'Telefonnummer / Handy', english: 'Phone / Mobile number', hindi: 'फ़ोन नंबर', sampleEntry: '0176 4589 2210' },
  { german: 'Zahlungsart', english: 'Payment method', hindi: 'भुगतान का तरीका', sampleEntry: 'Bar / Kreditkarte / Überweisung' },
  { german: 'Datum & Unterschrift', english: 'Date & Signature', hindi: 'तारीख़ और हस्ताक्षर', sampleEntry: '10.06.2026 · R. Sharma' },
];

export const A1_EXAM_PHRASE_CARDS: A1ExamPhraseCard[] = [
  // Formal Email (Schreiben Teil 2)
  {
    id: 'ef-1',
    group: 'email-formal',
    purpose: 'Formal Greeting (Unknown person / Hotel / Office)',
    german: 'Sehr geehrte Damen und Herren,',
    devanagari: 'ज़ेअ गे-एअ्टे डामन उन्ट हेरन,',
    english: 'Dear Sir or Madam,',
    hindi: 'आदरणीय महोदय/महोदया,',
  },
  {
    id: 'ef-2',
    group: 'email-formal',
    purpose: 'Formal Greeting (Named Person)',
    german: 'Sehr geehrte Frau Müller, / Sehr geehrter Herr Weber,',
    devanagari: 'ज़ेअ गे-एअ्टे फ़्राउ म्यूल-अ / ज़ेअ गे-एअ्ट-अ हेअ वेब-अ,',
    english: 'Dear Ms. Müller, / Dear Mr. Weber,',
    hindi: 'आदरणीय श्रीमती म्यूलर / आदरणीय श्री वेबर,',
  },
  {
    id: 'ef-3',
    group: 'email-formal',
    purpose: 'Polite Request / Asking for Information',
    german: 'Ich möchte mich für den Kurs anmelden. Können Sie mir bitte Informationen schicken?',
    devanagari: 'इश्य म्यॉश्य-टे मिश्य फ़्यूअ डेन कुअ्स आन-मेल्डन। क्यॉनन ज़ी मीअ बिटे इन्फ़ॉअ्मा-त्स्योनन शिकन?',
    english: 'I would like to register for the course. Could you please send me information?',
    hindi: 'मैं कोर्स के लिए पंजीकरण कराना चाहता हूँ। क्या आप कृपया मुझे जानकारी भेज सकते हैं?',
  },
  {
    id: 'ef-4',
    group: 'email-formal',
    purpose: 'Formal Closing (Always use for Sie emails)',
    german: 'Vielen Dank im Voraus! Mit freundlichen Grüßen',
    devanagari: 'फ़ीलन डांक इम फ़ॉअ-आउस! मिट फ़्रॉयन्ट-लिश्यन ग्र्यूसन',
    english: 'Thank you very much in advance! Kind regards,',
    hindi: 'अग्रिम धन्यवाद! सादर,',
  },

  // Informal Email (Schreiben Teil 2)
  {
    id: 'ei-1',
    group: 'email-informal',
    purpose: 'Informal Greeting (Friend)',
    german: 'Liebe Anna, / Lieber Lukas,',
    devanagari: 'लीबे आना, / लीब-अ लूकास,',
    english: 'Dear Anna, / Dear Lukas,',
    hindi: 'प्रिय अन्ना / प्रिय लूकास,',
  },
  {
    id: 'ei-2',
    group: 'email-informal',
    purpose: 'Thanking & Accepting / Apologizing',
    german: 'Vielen Dank für deine Einladung! Ich komme sehr gern am Samstag.',
    devanagari: 'फ़ीलन डांक फ़्यूअ डाइने आइन-लाडुंग! इश्य कॉमे ज़ेअ गेअ्न आम ज़ाम्स-टाक।',
    english: 'Many thanks for your invitation! I will gladly come on Saturday.',
    hindi: 'तुम्हारे निमंत्रण के लिए बहुत धन्यवाद! मैं शनिवार को खुशी से आऊँगा।',
  },
  {
    id: 'ei-3',
    group: 'email-informal',
    purpose: 'Informal Closing (For du emails)',
    german: 'Ich freue mich auf dich! Viele Grüße',
    devanagari: 'इश्य फ़्रॉय-ए मिश्य आउफ़ डिश्य! फ़ीले ग्र्यूसे',
    english: 'I look forward to seeing you! Best wishes,',
    hindi: 'तुमसे मिलने का इंतज़ार है! ढेर सारी शुभकामनाएँ,',
  },

  // Sprechen Survival Kit (Teil 1-3)
  {
    id: 'ss-1',
    group: 'speaking-survival',
    purpose: 'Ask Examiner to Repeat Politely',
    german: 'Entschuldigung, können Sie das bitte noch einmal wiederholen?',
    devanagari: 'एन्ट-शुल-डि-गुंग, क्यॉनन ज़ी दास बिटे नॉख़ आइन-माल वीड-अ-होलन?',
    english: 'Excuse me, could you please repeat that one more time?',
    hindi: 'माफ़ कीजिए, क्या आप इसे एक बार फिर दोहरा सकते हैं?',
  },
  {
    id: 'ss-2',
    group: 'speaking-survival',
    purpose: 'Ask to Speak Slowly',
    german: 'Sprechen Sie bitte etwas langsamer? Ich habe es nicht verstanden.',
    devanagari: 'श्प्रेश्यन ज़ी बिटे एटवास लांग-ज़ाम-अ? इश्य हाबे एस निश्य्ट फ़ेअ-श्टान्डन।',
    english: 'Could you please speak a little slower? I did not understand it.',
    hindi: 'कृपया थोड़ा धीरे बोलिए? मैं समझ नहीं पाया।',
  },
  {
    id: 'ss-3',
    group: 'speaking-survival',
    purpose: 'Teil 3 Universal Polite Request Frame',
    german: 'Können Sie mir bitte helfen? / Geben Sie mir bitte das Buch?',
    devanagari: 'क्यॉनन ज़ी मीअ बिटे हेल्फ़न? / गेबन ज़ी मीअ बिटे दास बूख़?',
    english: 'Could you please help me? / Could you please pass me the book?',
    hindi: 'क्या आप कृपया मेरी मदद कर सकते हैं? / क्या आप कृपया मुझे किताब देंगे?',
  },
  {
    id: 'ss-4',
    group: 'speaking-survival',
    purpose: 'Teil 3 Polite Positive & Negative Reactions',
    german: 'Ja, natürlich! Sehr gern! / Tut mir leid, das geht leider nicht.',
    devanagari: 'या, ना-ट्यूअ-लिश्य! ज़ेअ गेअ्न! / टूट मीअ लाइट, दास गेट लाइड-अ निश्य्ट।',
    english: 'Yes, of course! Gladly! / I am sorry, unfortunately that is not possible.',
    hindi: 'हाँ, बिल्कुल! बहुत खुशी से! / मुझे खेद है, यह संभव नहीं है।',
  },
];
