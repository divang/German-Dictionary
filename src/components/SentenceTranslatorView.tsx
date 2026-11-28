import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  History,
  Languages,
  Loader2,
  Trash2,
  Turtle,
  Volume2,
  X,
} from 'lucide-react';
import type { SentenceTone, SentenceTranslationResult } from '../types/sentence';
import { playGermanAudio } from '../utils/audioPlayer';
import {
  INITIAL_SAMPLE_TRANSLATION,
  MAX_SENTENCE_INPUT_LENGTH,
  PRESET_ENGLISH_SENTENCES,
  normalizeSentenceTranslation,
  stripArticleAndPunctuation,
  upsertSentenceHistory,
  validateEnglishSentenceInput,
} from '../utils/sentenceTranslator';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';

interface SentenceTranslatorViewProps {
  history: SentenceTranslationResult[];
  onHistoryChange: (next: SentenceTranslationResult[]) => void;
  onLookupWordInDictionary: (word: string) => void;
}

export function SentenceTranslatorView({
  history,
  onHistoryChange,
  onLookupWordInDictionary,
}: SentenceTranslatorViewProps) {
  const [englishInput, setEnglishInput] = useState(
    history[0]?.englishInput ?? INITIAL_SAMPLE_TRANSLATION.englishInput,
  );
  const [tone, setTone] = useState<SentenceTone>(history[0]?.tone ?? 'polite');
  const [activeResult, setActiveResult] = useState<SentenceTranslationResult>(
    history[0] ?? INITIAL_SAMPLE_TRANSLATION,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [copiedGerman, setCopiedGerman] = useState(false);

  const runTranslation = async (rawSentence: string, selectedTone: SentenceTone) => {
    const err = validateEnglishSentenceInput(rawSentence);
    if (err) {
      setValidationError(err);
      return;
    }

    const cleaned = rawSentence.trim();
    setValidationError(null);
    setApiError(null);
    setAudioNotice(null);

    // Check if identical sentence + tone is already in local history for instant load
    const cachedHistory = history.find(
      (item) =>
        item.tone === selectedTone &&
        item.englishInput.trim().toLowerCase() === cleaned.toLowerCase(),
    );
    if (cachedHistory) {
      setActiveResult(cachedHistory);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: cleaned, tone: selectedTone }),
      });

      const payload = (await response.json()) as {
        translation?: Partial<SentenceTranslationResult>;
        error?: string;
      };

      if (!response.ok || !payload.translation) {
        setApiError(
          payload.error || 'Could not translate this sentence right now. Please try again.',
        );
        return;
      }

      const normalized = normalizeSentenceTranslation(payload.translation, cleaned, selectedTone);
      setActiveResult(normalized);
      onHistoryChange(upsertSentenceHistory(history, normalized));
    } catch {
      setApiError('Network error while translating sentence. Please retry.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runTranslation(englishInput, tone);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void runTranslation(englishInput, tone);
    }
  };

  const handlePlayGerman = async (text: string, key: string, slow: boolean) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setPlayingKey(key);
    setAudioNotice(null);
    const result = await playGermanAudio(cleanText, { slow });
    setPlayingKey((curr) => (curr === key ? null : curr));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  const handleCopyGerman = async () => {
    try {
      await navigator.clipboard.writeText(activeResult.germanSentence);
      setCopiedGerman(true);
      window.setTimeout(() => setCopiedGerman(false), 2000);
    } catch {
      setCopiedGerman(false);
    }
  };

  const handleSelectPreset = (sentence: string) => {
    setEnglishInput(sentence);
    setValidationError(null);
    void runTranslation(sentence, tone);
  };

  const handleRemoveHistoryItem = (id: string) => {
    onHistoryChange(history.filter((item) => item.id !== id));
  };

  return (
    <section aria-labelledby="sentence-translator-title" className="space-y-6">
      {/* Input Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <Languages className="w-3.5 h-3.5" aria-hidden="true" />
              <span>English → Simple German · A1/A2 Everyday Phrasing</span>
            </div>
            <h1
              id="sentence-translator-title"
              className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
            >
              English to Simple German Sentence
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Type any English sentence to get simple everyday German, word-by-word English &amp;
              Hindi meanings, Devanagari pronunciation, and Normal or Slow German audio.
            </p>
          </div>

          {/* Polite (Sie) vs Casual (du) Tone Toggle */}
          <div
            role="group"
            aria-label="German formality tone"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start md:self-auto shrink-0"
          >
            <button
              type="button"
              aria-pressed={tone === 'polite'}
              onClick={() => setTone('polite')}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                tone === 'polite'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Polite (Sie)
            </button>
            <button
              type="button"
              aria-pressed={tone === 'casual'}
              onClick={() => setTone('casual')}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                tone === 'casual'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Casual (du)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="english-sentence-input"
              className="text-xs font-semibold text-slate-700"
            >
              Enter an English sentence
            </label>
            <span className="text-xs text-slate-400 tabular-nums">
              {englishInput.length}/{MAX_SENTENCE_INPUT_LENGTH}
            </span>
          </div>

          <div className="relative">
            <textarea
              id="english-sentence-input"
              rows={2}
              value={englishInput}
              onChange={(e) => {
                setEnglishInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. I would like a cup of coffee, please."
              aria-invalid={Boolean(validationError)}
              className="w-full pr-10 px-4 py-3 text-base bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 resize-y focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {englishInput && (
              <button
                type="button"
                onClick={() => {
                  setEnglishInput('');
                  setValidationError(null);
                  setApiError(null);
                }}
                aria-label="Clear English sentence"
                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {validationError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {validationError}
            </p>
          )}
          {apiError && (
            <p
              role="alert"
              className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2"
            >
              {apiError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500">
              Press Enter to translate · Simple everyday German for A1/A2 learners
            </span>

            <button
              type="submit"
              disabled={isTranslating}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Translating…</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" aria-hidden="true" />
                  <span>Translate to Simple German</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick-try Everyday English Examples */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500">Try an everyday sentence:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_ENGLISH_SENTENCES.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isTranslating}
                onClick={() => handleSelectPreset(preset)}
                className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-60 text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Translated German Sentence + Normal/Slow Audio Card */}
      <article
        aria-label="Simple German sentence translation"
        aria-busy={isTranslating}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        {isTranslating && (
          <div
            role="status"
            className="flex items-center gap-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
            <span>Building simple German translation and word-by-word meanings…</span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-blue-700">Simple German</span>
            <span aria-hidden="true">·</span>
            <span>CEFR {activeResult.cefr}</span>
            <span aria-hidden="true">·</span>
            <span>{activeResult.tone === 'casual' ? 'Casual (du)' : 'Polite (Sie)'}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyGerman}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            {copiedGerman ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy German</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-600">English: </span>
              {activeResult.englishInput}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 leading-snug">
              {activeResult.germanSentence}
            </h2>
          </div>

          {/* Dedicated Normal & Slow Sentence Audio Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={playingKey !== null}
              onClick={() => handlePlayGerman(activeResult.germanSentence, 'sentence-normal', false)}
              aria-label="Listen to German sentence at normal speed"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {playingKey === 'sentence-normal' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Listen Normal (1.0×)</span>
            </button>

            <button
              type="button"
              disabled={playingKey !== null}
              onClick={() => handlePlayGerman(activeResult.germanSentence, 'sentence-slow', true)}
              aria-label="Listen to German sentence at slower speed"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {playingKey === 'sentence-slow' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Turtle className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Listen Slowly (0.65×)</span>
            </button>

            <SpeakCheckButton
              targetText={activeResult.germanSentence}
              devanagari={activeResult.devanagariSentence}
              variant="primary"
            />
          </div>
        </div>

        {audioNotice && (
          <p role="status" className="text-xs text-amber-800">
            {audioNotice}
          </p>
        )}

        {/* Devanagari Pronunciation, Hindi Sentence Meaning & Grammar Tip */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div>
            <div className="text-xs font-medium text-slate-500">Devanagari Pronunciation</div>
            <p className="mt-1 font-devanagari text-xl sm:text-2xl font-semibold text-blue-800 leading-relaxed">
              {activeResult.devanagariSentence}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-slate-500">हिंदी अर्थ (Hindi Meaning)</div>
              <p className="mt-1 font-devanagari text-base text-slate-900 font-medium">
                {activeResult.hindiSentence}
              </p>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Simple Structure Tip</div>
              <p className="mt-1 text-slate-700 leading-relaxed">{activeResult.grammarTip}</p>
            </div>
          </div>
        </div>

        {/* Word-by-Word Breakdown Section */}
        <section aria-labelledby="word-by-word-heading" className="pt-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3
              id="word-by-word-heading"
              className="font-display text-xl font-semibold text-slate-900"
            >
              Word-by-Word Meaning
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {activeResult.words.length}{' '}
              {activeResult.words.length === 1 ? 'word' : 'words'} in sentence order
            </span>
          </div>

          <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeResult.words.map((item, idx) => {
              const speakWord = stripArticleAndPunctuation(item.german) || item.german;
              const lookupTarget = stripArticleAndPunctuation(item.baseForm || item.german) || speakWord;
              const normalWordKey = `wbw-normal-${idx}-${item.german}`;
              const slowWordKey = `wbw-slow-${idx}-${item.german}`;

              return (
                <li
                  key={`${item.german}-${idx}`}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate">{item.role}</span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-display text-xl font-semibold text-slate-900">
                        {item.article && (
                          <span className="text-slate-400 font-normal text-sm mr-1">
                            {item.article}
                          </span>
                        )}
                        {item.german}
                      </span>
                      {item.devanagari && (
                        <span className="font-devanagari text-sm font-semibold text-blue-800">
                          ({item.devanagari})
                        </span>
                      )}
                    </div>

                    <dl className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1 text-sm">
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-xs text-slate-500 shrink-0">English:</dt>
                        <dd className="text-slate-800 font-medium leading-snug">{item.english}</dd>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-xs text-slate-500 shrink-0">हिंदी:</dt>
                        <dd className="font-devanagari text-slate-900 font-medium leading-snug">
                          {item.hindi}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={playingKey !== null}
                        onClick={() => handlePlayGerman(speakWord, normalWordKey, false)}
                        aria-label={`Listen to word ${speakWord} at normal speed`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-50 rounded-md cursor-pointer"
                      >
                        {playingKey === normalWordKey ? (
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3 h-3" aria-hidden="true" />
                        )}
                        <span>Play</span>
                      </button>

                      <button
                        type="button"
                        disabled={playingKey !== null}
                        onClick={() => handlePlayGerman(speakWord, slowWordKey, true)}
                        aria-label={`Listen to word ${speakWord} slowly`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-50 rounded-md cursor-pointer"
                      >
                        {playingKey === slowWordKey ? (
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Turtle className="w-3 h-3" aria-hidden="true" />
                        )}
                        <span>Slow</span>
                      </button>

                      <SpeakCheckButton
                        targetText={speakWord}
                        devanagari={item.devanagari}
                        variant="compact"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onLookupWordInDictionary(lookupTarget)}
                      aria-label={`Open ${lookupTarget} in Dictionary`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap cursor-pointer"
                    >
                      <span>Dictionary</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </article>

      {/* Recent Translated Sentences */}
      {history.length > 0 && (
        <section
          aria-labelledby="recent-sentences-heading"
          className="bg-white border border-slate-200 rounded-xl p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <h2
                id="recent-sentences-heading"
                className="font-display text-lg font-semibold text-slate-900"
              >
                Recent Translated Sentences
              </h2>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {history.length} saved locally
            </span>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {history.map((item) => {
              const isSelected = item.id === activeResult.id;
              return (
                <li
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveResult(item);
                      setEnglishInput(item.englishInput);
                      setTone(item.tone);
                      setValidationError(null);
                      setApiError(null);
                    }}
                    className="text-left min-w-0 flex-1 group cursor-pointer"
                  >
                    <p
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-700'
                      }`}
                    >
                      {item.germanSentence}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.englishInput}
                      {item.hindiSentence ? ` · ${item.hindiSentence}` : ''}
                    </p>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={playingKey !== null}
                      onClick={() => handlePlayGerman(item.germanSentence, `hist-n-${item.id}`, false)}
                      aria-label={`Play "${item.germanSentence}" at normal speed`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                    >
                      {playingKey === `hist-n-${item.id}` ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>Normal</span>
                    </button>

                    <button
                      type="button"
                      disabled={playingKey !== null}
                      onClick={() => handlePlayGerman(item.germanSentence, `hist-s-${item.id}`, true)}
                      aria-label={`Play "${item.germanSentence}" slowly`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                    >
                      {playingKey === `hist-s-${item.id}` ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Turtle className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>Slow</span>
                    </button>

                    <SpeakCheckButton
                      targetText={item.germanSentence}
                      devanagari={item.devanagariSentence}
                      variant="compact"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveHistoryItem(item.id)}
                      aria-label={`Remove "${item.englishInput}" from recent sentences`}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </section>
  );
}
