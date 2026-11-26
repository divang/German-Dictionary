import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { germanLexicon } from './server/lexiconIndex';
import { buildGermanTtsAttempts } from './server/ttsHelper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const PRONOUNCE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: 'Canonical German word or short phrase with correct capitalization and umlauts.' },
    article: { type: Type.STRING, description: 'German noun gender article: der, die, das, or empty string if not a noun.' },
    partOfSpeech: { type: Type.STRING, description: 'e.g. Masculine noun, Verb, Adjective, Expression' },
    cefr: { type: Type.STRING, description: 'CEFR level: A1, A2, B1, B2, or C1' },
    englishMeaning: { type: Type.STRING, description: 'Concise English translation(s).' },
    hindiMeaning: { type: Type.STRING, description: 'Natural Hindi meaning in Devanagari script.' },
    devanagariFull: { type: Type.STRING, description: 'Full approximate German pronunciation written in Devanagari with hyphens between syllables, using nuqta (ज़, ख़, ग़, फ़) accurately.' },
    romanizedFull: { type: Type.STRING, description: 'Hyphenated Romanized pronunciation with UPPERCASE stressed syllable, e.g. fri-ZÖ-ah.' },
    ipa: { type: Type.STRING, description: 'Standard German IPA transcription enclosed in slashes, e.g. /fʁiˈzøːɐ̯/.' },
    stressSummary: { type: Type.STRING, description: 'Short phrase stating which syllable carries primary stress.' },
    originNote: { type: Type.STRING, description: '1-2 sentences explaining spelling vs. pronunciation quirks, loanword origin, or compound structure.' },
    categories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '1 to 3 matching tags from: umlauts, ch-r, loanwords, everyday',
    },
    syllables: {
      type: Type.ARRAY,
      description: 'Ordered sound-by-sound or syllable-by-syllable breakdown tailored specifically for native Hindi speakers.',
      items: {
        type: Type.OBJECT,
        properties: {
          segment: { type: Type.STRING, description: 'The German spelling chunk, e.g. Fri-, -s-, -eu-, -r.' },
          devanagari: { type: Type.STRING, description: 'Devanagari guide for this chunk, e.g. फ़्री, ज़, यॉ / ओ, अ.' },
          romanized: { type: Type.STRING, description: 'Short Romanized cue for this chunk.' },
          ipa: { type: Type.STRING, description: 'IPA for this chunk enclosed in slashes.' },
          stressed: { type: Type.BOOLEAN, description: 'True if this chunk belongs to the primary stressed syllable.' },
          difficulty: {
            type: Type.STRING,
            description: 'One of: hindi-match, subtle-shift, new-sound',
          },
          explanation: {
            type: Type.STRING,
            description: 'Clear 1-2 sentence coaching specifically for Hindi native speakers referencing familiar Hindi/Urdu words (e.g. ज़मीन, ख़ुश, एक, ओ) or English anchors.',
          },
          mouthSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Optional 2-step lip & tongue physical instructions when the sound does not exist in Hindi (like ö, ü, ich-Laut /ç/). Empty array if straightforward.',
          },
          quickShortcut: {
            type: Type.STRING,
            description: 'Optional forgiving shortcut for Hindi speakers if the exact sound feels unnatural at first.',
          },
          articulation: {
            type: Type.OBJECT,
            properties: {
              lipShape: {
                type: Type.STRING,
                description: 'One of: tight-circle, rounded, spread, neutral, open',
              },
              lipLabel: { type: Type.STRING, description: 'Short label describing lip posture.' },
              tonguePosition: {
                type: Type.STRING,
                description: 'One of: front-high, front-mid, central, back-throat, alveolar-buzz, teeth-lip',
              },
              tongueLabel: { type: Type.STRING, description: 'Short label describing tongue/airflow position.' },
              hindiAnchor: { type: Type.STRING, description: 'Compact Hindi phonetic anchor, e.g. Lips of ओ + tongue of ए.' },
              targetIpa: { type: Type.STRING, description: 'IPA symbol for the key phoneme.' },
            },
            required: ['lipShape', 'lipLabel', 'tonguePosition', 'tongueLabel', 'hindiAnchor', 'targetIpa'],
          },
        },
        required: ['segment', 'devanagari', 'romanized', 'ipa', 'stressed', 'difficulty', 'explanation', 'articulation'],
      },
    },
    example: {
      type: Type.OBJECT,
      properties: {
        german: { type: Type.STRING, description: 'A practical, natural German sentence using the word.' },
        devanagari: { type: Type.STRING, description: 'Full Devanagari pronunciation of the German sentence.' },
        english: { type: Type.STRING, description: 'Natural English translation.' },
        hindi: { type: Type.STRING, description: 'Natural Hindi translation in Devanagari.' },
      },
      required: ['german', 'devanagari', 'english', 'hindi'],
    },
  },
  required: [
    'word',
    'article',
    'partOfSpeech',
    'cefr',
    'englishMeaning',
    'hindiMeaning',
    'devanagariFull',
    'romanizedFull',
    'ipa',
    'stressSummary',
    'originNote',
    'categories',
    'syllables',
    'example',
  ],
};

const PRONOUNCE_SYSTEM_INSTRUCTION = `You are a German phonetics coach writing a crystal-clear pronunciation dictionary entry specifically for native Hindi speakers.

Follow this exact linguistic coaching style:
- Write accurate Devanagari approximations using proper nuqta dots where helpful: ज़ (/z/ as in ज़मीन), ख़ (/x/ as in ख़बर), ग़ (soft uvular /ʁ/), फ़ (/f/ as in फ़ोन).
- Never confuse German s before a vowel (/z/ -> ज़) with German z (/ts/ -> त्स).
- Clearly distinguish German ich-Laut (/ç/, soft front breathy ह्य/श्य after i, e, ä, ö, ü, ei, eu, r, l, n) from ach-Laut (/x/, exact Hindi/Urdu throat ख़ after a, o, u, au).
- Explain vocalized final -r (/ɐ̯/ -> soft अ) vs. initial/prevocalic uvular r (/ʁ/ -> very soft ख़/ग़ in the back of the throat, not rolled Hindi र).
- For vowels that do not exist in Hindi like ö (/øː/, /œ/) and ü (/yː/, /ʏ/), always include clear 2-step mouthSteps (e.g., lips shaped like ओ/ऊ + tongue saying ए/ई) and a reassuring quickShortcut.
- If the user types an English or Hindi word (like "hospital" or "धन्यवाद"), translate it to the standard German equivalent first and break down that German word.
- If the user types a German word without umlauts (like "Munchen" or "Entschuldigung"), normalize to the proper German spelling ("München", "Entschuldigung").
- Keep explanations crisp, warm, human, and free of filler.`;

const ttsCache = new Map<string, string>();
const MAX_TTS_CACHE = 60;

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('DEADLINE_EXCEEDED')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generatePronunciationWithFailover(
  ai: GoogleGenAI,
  rawQuery: string,
): Promise<string> {
  const attempts: { model: string; useThinking: boolean; waitBeforeMs: number }[] = [
    { model: 'gemini-4-hydrogen', useThinking: true, waitBeforeMs: 0 },
    { model: 'gemini-4-hydrogen', useThinking: true, waitBeforeMs: 700 },
    { model: 'gemini-3.1-flash-lite', useThinking: false, waitBeforeMs: 250 },
    { model: 'gemini-3.1-flash-lite', useThinking: false, waitBeforeMs: 900 },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    if (attempt.waitBeforeMs > 0) {
      await delay(attempt.waitBeforeMs);
    }
    try {
      const config = attempt.useThinking
        ? {
            systemInstruction: PRONOUNCE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PRONOUNCE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          }
        : {
            systemInstruction: PRONOUNCE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PRONOUNCE_SCHEMA,
          };

      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: `Provide a complete German pronunciation dictionary entry for native Hindi speakers for the query: "${rawQuery}".`,
        config,
      });

      const rawText = (response.text ?? '').trim();
      if (rawText) {
        return rawText;
      }
      lastError = new Error(`Empty response from ${attempt.model}`);
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) {
        // Still allow failover from gemini-4-hydrogen to gemini-3.1-flash-lite once
        if (attempt.model === 'gemini-3.1-flash-lite') {
          throw err;
        }
      }
    }
  }
  throw lastError ?? new Error('Unable to generate pronunciation breakdown.');
}

async function generateTtsWithRetry(
  ai: GoogleGenAI,
  text: string,
  slow: boolean,
  ipa?: string,
): Promise<string | undefined> {
  const attempts = buildGermanTtsAttempts({ text, slow, ipa });

  let lastError: unknown;
  for (const attempt of attempts) {
    if (attempt.waitBeforeMs > 0) {
      await delay(attempt.waitBeforeMs);
    }
    try {
      const speechConfig: {
        languageCode?: string;
        voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
      } = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      };
      if (attempt.languageCode) {
        speechConfig.languageCode = attempt.languageCode;
      }

      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: attempt.text,
                speechMetadata: { style: attempt.style },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig,
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) return base64Audio;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      // Stop early only on hard auth/permission errors; otherwise continue failover ladder
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
        throw err;
      }
    }
  }
  if (lastError) throw lastError;
  return undefined;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // Pre-warm the 382k-word in-repo German dictionary asynchronously
  void germanLexicon.ensureLoaded();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, dictionaryEntries: germanLexicon.totalEntries });
  });

  app.get('/api/dictionary/stats', async (_req, res) => {
    await germanLexicon.ensureLoaded();
    res.json({
      totalEntries: germanLexicon.totalEntries,
      ready: germanLexicon.isReady,
    });
  });

  app.get('/api/suggest', async (req, res) => {
    await germanLexicon.ensureLoaded();
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 10;
    if (!q) {
      res.json({ suggestions: [], totalEntries: germanLexicon.totalEntries });
      return;
    }
    const suggestions = germanLexicon.suggest(q, limit);
    res.json({ suggestions, totalEntries: germanLexicon.totalEntries });
  });

  app.get('/api/lookup', async (req, res) => {
    await germanLexicon.ensureLoaded();
    const word = typeof req.query.word === 'string' ? req.query.word.trim() : '';
    if (!word) {
      res.status(400).json({ error: 'Please provide a German word to look up.' });
      return;
    }
    if (word.length > 80) {
      res.status(400).json({ error: 'Word or phrase must be under 80 characters.' });
      return;
    }
    const entry = germanLexicon.lookupWord(word);
    if (!entry) {
      res.status(404).json({ error: 'No entry found.' });
      return;
    }
    res.json({ entry });
  });

  const MEANING_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      englishMeaning: {
        type: Type.STRING,
        description: 'Concise, clear English translation(s) of the German word (1 to 4 short senses separated by commas, under 120 characters).',
      },
      hindiMeaning: {
        type: Type.STRING,
        description: 'Accurate, everyday Hindi meaning in Devanagari script (1 to 3 natural Hindi equivalents separated by commas, under 120 characters).',
      },
      exampleHindi: {
        type: Type.STRING,
        description: 'Natural Hindi translation in Devanagari of the supplied German example sentence, or empty string if none supplied.',
      },
    },
    required: ['englishMeaning', 'hindiMeaning', 'exampleHindi'],
  };

  const meaningCache = new Map<
    string,
    { englishMeaning: string; hindiMeaning: string; exampleHindi: string }
  >();
  const MAX_MEANING_CACHE = 400;

  app.post('/api/translate-meaning', async (req, res) => {
    const word = typeof req.body?.word === 'string' ? req.body.word.trim().slice(0, 100) : '';
    const article = typeof req.body?.article === 'string' ? req.body.article.trim().slice(0, 10) : '';
    const partOfSpeech =
      typeof req.body?.partOfSpeech === 'string' ? req.body.partOfSpeech.trim().slice(0, 60) : '';
    const englishHint =
      typeof req.body?.englishHint === 'string' ? req.body.englishHint.trim().slice(0, 200) : '';
    const exampleGerman =
      typeof req.body?.exampleGerman === 'string' ? req.body.exampleGerman.trim().slice(0, 220) : '';

    if (!word) {
      res.status(400).json({ error: 'Please provide a German word to translate.' });
      return;
    }

    const cacheKey = `${word.toLowerCase()}::${partOfSpeech.toLowerCase()}::${exampleGerman.toLowerCase()}`;
    const cached = meaningCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Translation service is unavailable because the Gemini API key is not configured.',
      });
      return;
    }

    const hasUsableHint =
      englishHint.length > 0 && !englishHint.toLowerCase().includes('looked up via phonetic breakdown');

    const promptLines = [
      `Translate the German word "${article ? `${article} ` : ''}${word}"${partOfSpeech ? ` (${partOfSpeech})` : ''} for a native Hindi speaker learning German.`,
      hasUsableHint ? `Dictionary English gloss hint: "${englishHint}". Keep or refine this concise English meaning.` : 'Provide a concise, accurate English meaning.',
      'Provide the most natural everyday Hindi meaning in Devanagari script (e.g., for "Krankenhaus" -> "अस्पताल"; for "biologisch" -> "जैविक, प्राकृतिक"; for "Entschuldigung" -> "माफ़ कीजिए, क्षमा").',
      exampleGerman
        ? `Also translate this German example sentence into natural Devanagari Hindi: "${exampleGerman}"`
        : 'Leave exampleHindi as an empty string.',
    ].join('\n');

    const attempts: { model: string; waitBeforeMs: number }[] = [
      { model: 'gemini-3.1-flash-lite', waitBeforeMs: 0 },
      { model: 'gemini-4-hydrogen', waitBeforeMs: 250 },
    ];

    let lastErr: unknown;
    for (const attempt of attempts) {
      if (attempt.waitBeforeMs > 0) await delay(attempt.waitBeforeMs);
      try {
        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: promptLines,
          config: {
            systemInstruction:
              'You are a precise German–English–Hindi lexicographer. Return concise, accurate English and Devanagari Hindi meanings with zero filler.',
            responseMimeType: 'application/json',
            responseSchema: MEANING_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (rawText) {
          const parsed = JSON.parse(rawText) as {
            englishMeaning?: string;
            hindiMeaning?: string;
            exampleHindi?: string;
          };
          const englishMeaning = String(parsed.englishMeaning ?? (hasUsableHint ? englishHint : ''))
            .trim()
            .slice(0, 240);
          const hindiMeaning = String(parsed.hindiMeaning ?? '').trim().slice(0, 240);
          const exampleHindi = String(parsed.exampleHindi ?? '').trim().slice(0, 280);

          if (englishMeaning || hindiMeaning) {
            if (meaningCache.size >= MAX_MEANING_CACHE) {
              const oldest = meaningCache.keys().next().value;
              if (oldest) meaningCache.delete(oldest);
            }
            const value = { englishMeaning, hindiMeaning, exampleHindi };
            meaningCache.set(cacheKey, value);
            res.json({ ...value, cached: false });
            return;
          }
        }
      } catch (err) {
        lastErr = err;
      }
    }

    console.error('[api/translate-meaning] Error:', lastErr instanceof Error ? lastErr.message : String(lastErr));
    res.status(502).json({ error: 'Could not translate meaning right now.' });
  });

  const SENTENCE_TRANSLATION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      germanSentence: {
        type: Type.STRING,
        description: 'Natural, simple everyday German translation (CEFR A1/A2 level, short and clear).',
      },
      devanagariSentence: {
        type: Type.STRING,
        description: 'Full German pronunciation written in Hindi Devanagari with hyphens between syllables and accurate nuqta dots (ज़, ख़, ग़, फ़).',
      },
      hindiSentence: {
        type: Type.STRING,
        description: 'Natural everyday Hindi translation of the full sentence in Devanagari script.',
      },
      cefr: {
        type: Type.STRING,
        description: 'CEFR difficulty of the simple German sentence: either A1 or A2.',
      },
      grammarTip: {
        type: Type.STRING,
        description: '1 to 2 concise sentences explaining the simple German word order or structure for an English/Hindi speaker.',
      },
      words: {
        type: Type.ARRAY,
        description: 'Exact ordered word-by-word breakdown of every word in germanSentence (excluding standalone punctuation).',
        items: {
          type: Type.OBJECT,
          properties: {
            german: { type: Type.STRING, description: 'Exact word as it appears in the German sentence (without trailing punctuation).' },
            baseForm: { type: Type.STRING, description: 'Dictionary base form without der/die/das (e.g. infinitive for verbs, singular noun without article).' },
            article: { type: Type.STRING, description: 'For German nouns only: der, die, or das. Empty string for non-nouns.' },
            devanagari: { type: Type.STRING, description: 'Hindi Devanagari pronunciation for this word.' },
            english: { type: Type.STRING, description: 'Concise English meaning of this word in the sentence.' },
            hindi: { type: Type.STRING, description: 'Concise Hindi meaning in Devanagari for this word.' },
            role: { type: Type.STRING, description: 'Short learner-friendly grammar role (e.g. Verb, Masculine noun, Pronoun, Preposition, Article).' },
          },
          required: ['german', 'baseForm', 'article', 'devanagari', 'english', 'hindi', 'role'],
        },
      },
    },
    required: ['germanSentence', 'devanagariSentence', 'hindiSentence', 'cefr', 'grammarTip', 'words'],
  };

  const sentenceCache = new Map<string, Record<string, unknown>>();
  const MAX_SENTENCE_CACHE = 200;

  app.post('/api/translate-sentence', async (req, res) => {
    const english = typeof req.body?.english === 'string' ? req.body.english.trim() : '';
    const tone = req.body?.tone === 'casual' ? 'casual' : 'polite';

    if (!english || english.length < 2) {
      res.status(400).json({ error: 'Please enter an English sentence (at least 2 characters).' });
      return;
    }
    if (english.length > 260) {
      res.status(400).json({ error: 'Please keep the English sentence under 260 characters.' });
      return;
    }

    const cacheKey = `${tone}::${english.toLowerCase()}`;
    const cached = sentenceCache.get(cacheKey);
    if (cached) {
      res.json({ translation: cached, cached: true });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Sentence translator is unavailable right now because the Gemini API key is not configured.',
      });
      return;
    }

    const toneInstruction =
      tone === 'casual'
        ? 'Use simple, friendly informal German ("du" form if addressing someone).'
        : 'Use simple, polite everyday German ("Sie" form if addressing someone, ideal for Goethe A1/A2).';

    const promptContent = [
      `Convert this English sentence into a simple, natural everyday German sentence (A1/A2 level): "${english}"`,
      toneInstruction,
      'Provide:',
      '1. The simple German sentence.',
      '2. Full Devanagari pronunciation for Hindi native speakers (use nuqta dots ज़, ख़, ग़, फ़ accurately).',
      '3. Natural Hindi sentence meaning in Devanagari.',
      '4. A complete ordered word-by-word breakdown covering EVERY word in the German sentence with its dictionary baseForm, noun gender article (der/die/das or ""), Devanagari pronunciation, English meaning, Hindi meaning, and short grammar role.',
      '5. A 1-2 sentence beginner-friendly grammar tip explaining the German word order.',
    ].join('\n');

    const attempts: { model: string; useThinking: boolean; waitBeforeMs: number }[] = [
      { model: 'gemini-3.1-flash-lite', useThinking: false, waitBeforeMs: 0 },
      { model: 'gemini-4-hydrogen', useThinking: true, waitBeforeMs: 250 },
    ];

    let lastErr: unknown;
    for (const attempt of attempts) {
      if (attempt.waitBeforeMs > 0) await delay(attempt.waitBeforeMs);
      try {
        const config = attempt.useThinking
          ? {
              systemInstruction:
                'You are a friendly German A1/A2 teacher coaching native Hindi speakers. Produce simple, natural, grammatically accurate German sentences with exact word-by-word English & Devanagari Hindi meanings and accurate Devanagari pronunciation.',
              responseMimeType: 'application/json',
              responseSchema: SENTENCE_TRANSLATION_SCHEMA,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            }
          : {
              systemInstruction:
                'You are a friendly German A1/A2 teacher coaching native Hindi speakers. Produce simple, natural, grammatically accurate German sentences with exact word-by-word English & Devanagari Hindi meanings and accurate Devanagari pronunciation.',
              responseMimeType: 'application/json',
              responseSchema: SENTENCE_TRANSLATION_SCHEMA,
            };

        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: promptContent,
          config,
        });

        const rawText = (response.text ?? '').trim();
        if (rawText) {
          const parsed = JSON.parse(rawText) as Record<string, unknown>;
          if (typeof parsed.germanSentence === 'string' && parsed.germanSentence.trim()) {
            if (sentenceCache.size >= MAX_SENTENCE_CACHE) {
              const oldest = sentenceCache.keys().next().value;
              if (oldest) sentenceCache.delete(oldest);
            }
            sentenceCache.set(cacheKey, parsed);
            res.json({ translation: parsed, cached: false });
            return;
          }
        }
      } catch (err) {
        lastErr = err;
      }
    }

    console.error(
      '[api/translate-sentence] Error:',
      lastErr instanceof Error ? lastErr.message : String(lastErr),
    );
    res.status(502).json({
      error: 'Could not translate your sentence right now. Please try again in a moment.',
    });
  });

  const NEARBY_WORD_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      detectedAs: {
        type: Type.STRING,
        description: 'Short description of how the input was interpreted (e.g. "Phonetic English spelling", "Hindi Devanagari pronunciation", "Approximate German spelling").',
      },
      candidates: {
        type: Type.ARRAY,
        description: '3 to 5 most probable real German words ranked from highest to lowest likelihood.',
        items: {
          type: Type.OBJECT,
          properties: {
            germanWord: { type: Type.STRING, description: 'Exact canonical German word WITHOUT der/die/das article.' },
            article: { type: Type.STRING, description: 'Noun gender article: der, die, das, or empty string if not a noun.' },
            partOfSpeech: { type: Type.STRING, description: 'e.g. Masculine noun, Feminine noun, Neuter noun, Verb, Adjective' },
            confidence: { type: Type.STRING, description: 'One of: high, medium, possible' },
            devanagari: { type: Type.STRING, description: 'Accurate Devanagari pronunciation using nuqta dots (ज़, ख़, ग़, फ़).' },
            ipa: { type: Type.STRING, description: 'Standard German IPA enclosed in slashes.' },
            englishMeaning: { type: Type.STRING, description: 'Concise English meaning.' },
            hindiMeaning: { type: Type.STRING, description: 'Natural everyday Hindi meaning in Devanagari.' },
            matchReason: { type: Type.STRING, description: '1 concise sentence explaining why this German word sounds like or resembles the user input.' },
            exampleGerman: { type: Type.STRING, description: 'Short natural A1/A2 German sentence using this word.' },
            exampleEnglish: { type: Type.STRING, description: 'Natural English translation of exampleGerman.' },
          },
          required: [
            'germanWord',
            'article',
            'partOfSpeech',
            'confidence',
            'devanagari',
            'ipa',
            'englishMeaning',
            'hindiMeaning',
            'matchReason',
            'exampleGerman',
            'exampleEnglish',
          ],
        },
      },
    },
    required: ['detectedAs', 'candidates'],
  };

  const NEARBY_SENTENCE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      detectedAs: {
        type: Type.STRING,
        description: 'Short description of how the rough sentence input was interpreted.',
      },
      candidates: {
        type: Type.ARRAY,
        description: '2 to 3 most probable real everyday German sentences matching the user rough spelling or spoken sounds, ranked best first.',
        items: {
          type: Type.OBJECT,
          properties: {
            germanSentence: { type: Type.STRING, description: 'Natural, grammatically correct everyday German sentence.' },
            confidence: { type: Type.STRING, description: 'One of: high, medium, possible' },
            devanagariSentence: { type: Type.STRING, description: 'Full German pronunciation written in Hindi Devanagari with accurate nuqta dots.' },
            englishMeaning: { type: Type.STRING, description: 'Clear English meaning of the German sentence.' },
            hindiMeaning: { type: Type.STRING, description: 'Natural Hindi meaning in Devanagari.' },
            matchReason: { type: Type.STRING, description: '1 concise sentence explaining how the rough input maps to the real German words.' },
            words: {
              type: Type.ARRAY,
              description: 'Ordered word-by-word breakdown of every word in germanSentence (omitting standalone punctuation).',
              items: {
                type: Type.OBJECT,
                properties: {
                  german: { type: Type.STRING },
                  baseForm: { type: Type.STRING },
                  article: { type: Type.STRING },
                  devanagari: { type: Type.STRING },
                  english: { type: Type.STRING },
                  hindi: { type: Type.STRING },
                  role: { type: Type.STRING },
                },
                required: ['german', 'baseForm', 'article', 'devanagari', 'english', 'hindi', 'role'],
              },
            },
          },
          required: [
            'germanSentence',
            'confidence',
            'devanagariSentence',
            'englishMeaning',
            'hindiMeaning',
            'matchReason',
            'words',
          ],
        },
      },
    },
    required: ['detectedAs', 'candidates'],
  };

  const nearbyCache = new Map<string, Record<string, unknown>>();
  const MAX_NEARBY_CACHE = 250;

  app.post('/api/nearby-german', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const mode = req.body?.mode === 'sentence' ? 'sentence' : 'word';
    const maxLen = mode === 'word' ? 80 : 240;

    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Please speak or type at least 2 characters.' });
      return;
    }
    if (query.length > maxLen) {
      res.status(400).json({ error: `Input must be under ${maxLen} characters.` });
      return;
    }

    const cacheKey = `${mode}::${query.toLowerCase()}`;
    const cached = nearbyCache.get(cacheKey);
    if (cached) {
      res.json({ result: cached, cached: true });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Nearby German finder is unavailable right now because the Gemini API key is not configured.',
      });
      return;
    }

    // For word mode, check local 382k FreeDict corpus for close orthographic candidates as extra hints
    let corpusHints = '';
    if (mode === 'word') {
      try {
        await germanLexicon.ensureLoaded();
        const suggestions = germanLexicon.suggest(query, 6);
        if (suggestions.length > 0) {
          corpusHints = `Close spelling hints from our local German dictionary (only use if phonetically plausible): ${suggestions
            .map((s) => `${s.article ? `${s.article} ` : ''}${s.word} (${s.english})`)
            .join('; ')}.`;
        }
      } catch {
        // Ignore lexicon hint errors
      }
    }

    const promptContent =
      mode === 'word'
        ? [
            `A native Hindi speaker heard or tried to speak a German word and wrote/spoke this rough approximation: "${query}".`,
            'The input may be:',
            '- Phonetic English spelling (e.g. "ent shul di gung" -> Entschuldigung, "free zeur" -> Friseur, "kranken hows" -> Krankenhaus)',
            '- Misspelled German without umlauts or with swapped letters (e.g. "broet shen" -> Brötchen, "tsahn artst" -> Zahnarzt)',
            '- Hindi Devanagari phonetic transcription of a German sound (e.g. "आपो-टेके" -> Apotheke, "बानहोफ़" -> Bahnhof)',
            corpusHints,
            'ALWAYS return at least 3 (and up to 5) distinct real German words ranked from most likely to least likely: put the strongest phonetic match first, followed by 2 to 4 phonetically similar, compound-related, or commonly confused nearby German words so the learner can compare. Include exact German spelling (no der/die/das inside germanWord), gender article, Devanagari pronunciation, IPA, English meaning, Devanagari Hindi meaning, and a clear 1-sentence matchReason.',
          ]
            .filter(Boolean)
            .join('\n')
        : [
            `A native Hindi speaker heard or tried to speak a German sentence and wrote/spoke this rough approximation: "${query}".`,
            'The input may be rough phonetic English spelling (e.g. "ish moeshte ain kaffe bitte", "wo ist de bahn hof", "vee feel kostet das"), broken/misspelled German, or Hindi Devanagari phonetic script.',
            'ALWAYS reconstruct 2 to 3 distinct, natural everyday German sentences that sound like or closely match this input (put the closest match first, followed by 1 to 2 close everyday variations or similar-sounding alternatives).',
            'For each candidate provide: exact germanSentence, confidence (high/medium/possible), Devanagari pronunciation, English meaning, Devanagari Hindi meaning, concise matchReason, and an exact ordered word-by-word breakdown (words array).',
          ].join('\n');

    const schema = mode === 'word' ? NEARBY_WORD_SCHEMA : NEARBY_SENTENCE_SCHEMA;
    const attempts: { model: string; useThinking: boolean; waitBeforeMs: number }[] = [
      { model: 'gemini-3.1-flash-lite', useThinking: false, waitBeforeMs: 0 },
      { model: 'gemini-4-hydrogen', useThinking: true, waitBeforeMs: 250 },
    ];

    let lastErr: unknown;
    for (const attempt of attempts) {
      if (attempt.waitBeforeMs > 0) await delay(attempt.waitBeforeMs);
      try {
        const config = attempt.useThinking
          ? {
              systemInstruction:
                'You are an expert German phonetics & speech-decoding coach for native Hindi speakers. Decode approximate spoken or phonetically-spelled German words and sentences into the most probable real German spelling with crisp Devanagari pronunciation, English & Hindi meanings.',
              responseMimeType: 'application/json',
              responseSchema: schema,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            }
          : {
              systemInstruction:
                'You are an expert German phonetics & speech-decoding coach for native Hindi speakers. Decode approximate spoken or phonetically-spelled German words and sentences into the most probable real German spelling with crisp Devanagari pronunciation, English & Hindi meanings.',
              responseMimeType: 'application/json',
              responseSchema: schema,
            };

        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: promptContent,
          config,
        });

        const rawText = (response.text ?? '').trim();
        if (rawText) {
          const parsed = JSON.parse(rawText) as Record<string, unknown>;
          if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
            if (nearbyCache.size >= MAX_NEARBY_CACHE) {
              const oldest = nearbyCache.keys().next().value;
              if (oldest) nearbyCache.delete(oldest);
            }
            nearbyCache.set(cacheKey, parsed);
            res.json({ result: parsed, cached: false });
            return;
          }
        }
      } catch (err) {
        lastErr = err;
      }
    }

    console.error(
      '[api/nearby-german] Error:',
      lastErr instanceof Error ? lastErr.message : String(lastErr),
    );
    res.status(502).json({
      error: 'Could not find probable German matches right now. Please try again in a moment.',
    });
  });

  app.post('/api/transcribe-audio', async (req, res) => {
    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim().slice(0, 60) : 'audio/webm';
    const mode = req.body?.mode === 'sentence' ? 'sentence' : 'word';

    if (!audioBase64) {
      res.status(400).json({ error: 'Missing recorded audio data.' });
      return;
    }
    if (audioBase64.length > 5_500_000) {
      res.status(400).json({ error: 'Audio clip is too long. Please record a short word or sentence.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Audio transcription is unavailable right now because the Gemini API key is not configured.',
      });
      return;
    }

    try {
      const promptText =
        mode === 'word'
          ? 'Transcribe the spoken German word (or rough German pronunciation spoken by a learner) accurately as plain text with no commentary.'
          : 'Transcribe the spoken German sentence (or rough German phrase spoken by a learner) accurately as plain text with no commentary.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            { text: promptText },
          ],
        },
      });

      const transcript = (response.text ?? '').trim().replace(/^["'“„]+|["'”]+$/g, '');
      if (!transcript) {
        res.status(422).json({ error: 'Could not hear clear speech. Please try speaking again.' });
        return;
      }
      res.json({ transcript });
    } catch (err) {
      console.error(
        '[api/transcribe-audio] Error:',
        err instanceof Error ? err.message : String(err),
      );
      res.status(502).json({
        error: 'Could not transcribe voice recording right now. You can type the rough spelling instead.',
      });
    }
  });

  app.post('/api/pronounce', async (req, res) => {
    const rawQuery = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!rawQuery) {
      res.status(400).json({ error: 'Please enter a German word or phrase to break down.' });
      return;
    }
    if (rawQuery.length > 80) {
      res.status(400).json({ error: 'Please enter a single German word or short phrase (under 80 characters).' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Live pronunciation lookup is unavailable right now because the Gemini API key is not configured.',
      });
      return;
    }

    try {
      const rawText = await generatePronunciationWithFailover(ai, rawQuery);
      const parsed = JSON.parse(rawText);
      res.json({ entry: parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate pronunciation breakdown right now.';
      console.error('[api/pronounce] Error:', message);
      res.status(502).json({
        error: 'Could not reach the pronunciation service right now. You can retry or browse the built-in lexicon.',
      });
    }
  });

  app.post('/api/tts', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const slow = Boolean(req.body?.slow);
    const ipa = typeof req.body?.ipa === 'string' ? req.body.ipa.trim().slice(0, 80) : undefined;

    if (!text) {
      res.status(400).json({ error: 'Missing text to pronounce.' });
      return;
    }
    if (text.length > 220) {
      res.status(400).json({ error: 'Text is too long for audio playback.' });
      return;
    }

    const cacheKey = `de-v2::${slow ? 'slow' : 'normal'}::${text.toLowerCase()}::${ipa ?? ''}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ audioBase64: cached, mimeType: 'audio/wav', cached: true });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Audio service is unavailable because the API key is not configured.' });
      return;
    }

    try {
      const base64Audio = await generateTtsWithRetry(ai, text, slow, ipa);
      if (!base64Audio) {
        res.status(502).json({ error: 'Audio could not be generated for this word.' });
        return;
      }

      if (ttsCache.size >= MAX_TTS_CACHE) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) ttsCache.delete(oldestKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', cached: false });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'TTS generation failed.';
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : undefined;
      console.error('[api/tts] Error:', status ?? '', rawMsg);

      let userError = 'Unable to synthesize native German audio right now.';
      let errorCode = 'TTS_UPSTREAM_ERROR';
      if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED') || status === 403) {
        userError = 'Native German TTS requires a valid Gemini API key in Settings > Secrets.';
        errorCode = 'API_KEY_OR_PERMISSION';
      } else if (status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        userError = 'Audio service is temporarily busy (rate limit). Please try again in a moment.';
        errorCode = 'RATE_LIMITED';
      } else if (status === 404 || rawMsg.includes('NOT_FOUND')) {
        userError = 'The configured German audio model was not found.';
        errorCode = 'MODEL_NOT_FOUND';
      } else if (status === 400 || rawMsg.includes('INVALID_ARGUMENT')) {
        userError = 'Audio request parameters were rejected by the speech service.';
        errorCode = 'INVALID_ARGUMENT';
      }

      res.status(502).json({
        error: userError,
        errorCode,
      });
    }
  });

  const A1_WRITING_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      totalScore: { type: Type.INTEGER, description: 'Total score out of 25 (sum of taskCompletion + grammarAndVocab + structure).' },
      maxScore: { type: Type.INTEGER, description: 'Always 25.' },
      passed: { type: Type.BOOLEAN, description: 'True if totalScore >= 15 (Goethe A1 60% pass mark).' },
      taskCompletion: { type: Type.INTEGER, description: 'Score 0 to 10 for addressing all 3 required prompt bullet points.' },
      grammarAndVocab: { type: Type.INTEGER, description: 'Score 0 to 10 for A1-level German grammar, V2 word order, articles, and spelling.' },
      structure: { type: Type.INTEGER, description: 'Score 0 to 5 for appropriate German salutation (Anrede) and sign-off (Grußformel).' },
      correctedGerman: { type: Type.STRING, description: 'Polished, natural Goethe A1 German version of the learner email.' },
      feedbackEnglish: { type: Type.STRING, description: 'Encouraging, concise 2-sentence examiner feedback in English.' },
      feedbackHindi: { type: Type.STRING, description: 'Encouraging, concise 2-sentence examiner feedback in natural Hindi (Devanagari).' },
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '1 to 3 specific things the learner did well.',
      },
      improvements: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '1 to 3 concrete tips to score higher on Goethe-Zertifikat A1 Schreiben.',
      },
    },
    required: [
      'totalScore',
      'maxScore',
      'passed',
      'taskCompletion',
      'grammarAndVocab',
      'structure',
      'correctedGerman',
      'feedbackEnglish',
      'feedbackHindi',
      'strengths',
      'improvements',
    ],
  };

  app.post('/api/a1/grade-writing', async (req, res) => {
    const promptTitle = typeof req.body?.promptTitle === 'string' ? req.body.promptTitle.trim().slice(0, 140) : '';
    const rawBullets = Array.isArray(req.body?.bulletPoints) ? req.body.bulletPoints : [];
    const bulletPoints: string[] = rawBullets
      .filter((b: unknown): b is string => typeof b === 'string' && b.trim().length > 0)
      .slice(0, 5)
      .map((b: string) => b.trim().slice(0, 160));
    const learnerText = typeof req.body?.learnerText === 'string' ? req.body.learnerText.trim() : '';

    if (learnerText.length < 10) {
      res.status(400).json({ error: 'Please write at least a short German message (10+ characters) before evaluating.' });
      return;
    }
    if (learnerText.length > 1500) {
      res.status(400).json({ error: 'Please keep your A1 practice email under 1500 characters.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI Writing Coach is unavailable right now because the Gemini API key is not configured.',
      });
      return;
    }

    const gradingAttempts: { model: string; useThinking: boolean; waitBeforeMs: number }[] = [
      { model: 'gemini-4-hydrogen', useThinking: true, waitBeforeMs: 0 },
      { model: 'gemini-3.1-flash-lite', useThinking: false, waitBeforeMs: 250 },
    ];

    const promptContent = [
      `Evaluate this Goethe-Zertifikat A1 (Start Deutsch 1) Schreiben Teil 2 email written by a native Hindi speaker.`,
      promptTitle ? `Task: ${promptTitle}` : '',
      bulletPoints.length > 0 ? `Required bullet points:\n${bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n')}` : '',
      `Learner's German submission:\n"""\n${learnerText}\n"""`,
      `Grade strictly on the 25-point Goethe A1 scale (10 pts task completion, 10 pts A1 grammar & vocabulary, 5 pts greeting/closing structure). Pass mark is 15/25 (60%).`,
    ]
      .filter(Boolean)
      .join('\n\n');

    let lastErr: unknown;
    for (const attempt of gradingAttempts) {
      if (attempt.waitBeforeMs > 0) await delay(attempt.waitBeforeMs);
      try {
        const config = attempt.useThinking
          ? {
              systemInstruction:
                'You are a certified Goethe-Zertifikat A1 examiner coaching native Hindi speakers. Be accurate, fair to CEFR A1 expectations, and encouraging in both English and Devanagari Hindi.',
              responseMimeType: 'application/json',
              responseSchema: A1_WRITING_SCHEMA,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            }
          : {
              systemInstruction:
                'You are a certified Goethe-Zertifikat A1 examiner coaching native Hindi speakers. Be accurate, fair to CEFR A1 expectations, and encouraging in both English and Devanagari Hindi.',
              responseMimeType: 'application/json',
              responseSchema: A1_WRITING_SCHEMA,
            };

        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: promptContent,
          config,
        });
        const rawText = (response.text ?? '').trim();
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const taskCompletion = Math.min(10, Math.max(0, Math.round(Number(parsed.taskCompletion) || 0)));
          const grammarAndVocab = Math.min(10, Math.max(0, Math.round(Number(parsed.grammarAndVocab) || 0)));
          const structure = Math.min(5, Math.max(0, Math.round(Number(parsed.structure) || 0)));
          const totalScore = Math.min(25, Math.max(0, taskCompletion + grammarAndVocab + structure));

          res.json({
            evaluation: {
              totalScore,
              maxScore: 25,
              passed: totalScore >= 15,
              taskCompletion,
              grammarAndVocab,
              structure,
              correctedGerman: String(parsed.correctedGerman || ''),
              feedbackEnglish: String(parsed.feedbackEnglish || ''),
              feedbackHindi: String(parsed.feedbackHindi || ''),
              strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
              improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4).map(String) : [],
            },
          });
          return;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    console.error('[api/a1/grade-writing] Error:', lastErr instanceof Error ? lastErr.message : String(lastErr));
    res.status(502).json({
      error: 'Could not reach the AI Writing Coach right now. Compare your draft with the model answer below or retry in a moment.',
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Application bundle not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LautBhasha server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
