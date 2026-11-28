import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Loader2,
  Search,
  Turtle,
  Volume2,
  X,
} from 'lucide-react';
import type { EnglishSuggestItem, EnglishToGermanResult } from '../types/enToDe';
import { playGermanAudio } from '../utils/audioPlayer';
import {
  INITIAL_SAMPLE_EN_TO_DE,
  MAX_EN_TO_DE_INPUT,
  PRESET_ENGLISH_WORDS,
  normalizeEnglishToGermanResult,
  validateEnglishWordInput,
} from '../utils/englishToGerman';

interface EnglishToGermanViewProps {
  onLookupWordInDictionary: (word: string) => void;
}

export function EnglishToGermanView({ onLookupWordInDictionary }: EnglishToGermanViewProps) {
  const [query, setQuery] = useState(INITIAL_SAMPLE_EN_TO_DE.englishQuery);
  const [result, setResult] = useState<EnglishToGermanResult>(INITIAL_SAMPLE_EN_TO_DE);
  const [suggestions, setSuggestions] = useState<EnglishSuggestItem[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [activeSuggestIdx, setActiveSuggestIdx] = useState(-1);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const suppressSuggestRef = useRef(true);
  const activeAbortRef = useRef<AbortController | null>(null);

  const dismissSuggestions = () => {
    suppressSuggestRef.current = true;
    activeAbortRef.current?.abort();
    activeAbortRef.current = null;
    setIsSuggestOpen(false);
    setActiveSuggestIdx(-1);
    setIsSuggesting(false);
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || suppressSuggestRef.current) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      setActiveSuggestIdx(-1);
      setIsSuggesting(false);
      return;
    }

    const controller = new AbortController();
    activeAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      if (suppressSuggestRef.current) return;
      setIsSuggesting(true);
      try {
        const res = await fetch(
          `/api/en-to-de/suggest?q=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal },
        );
        if (res.ok && !suppressSuggestRef.current) {
          const data = (await res.json()) as { suggestions?: EnglishSuggestItem[] };
          const list = Array.isArray(data.suggestions) ? data.suggestions : [];
          setSuggestions(list);
          setIsSuggestOpen(list.length > 0);
          setActiveSuggestIdx(-1);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        if (activeAbortRef.current === controller) {
          setIsSuggesting(false);
        }
      }
    }, 90);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const runLookup = async (rawQuery: string) => {
    const err = validateEnglishWordInput(rawQuery);
    if (err) {
      setValidationError(err);
      return;
    }

    const cleaned = rawQuery.trim();
    dismissSuggestions();
    setValidationError(null);
    setApiError(null);
    setAudioNotice(null);
    setIsSearching(true);

    try {
      const response = await fetch('/api/en-to-de', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleaned }),
      });

      const payload = (await response.json()) as {
        result?: Record<string, unknown>;
        source?: 'ai' | 'dictionary';
        error?: string;
      };

      if (!response.ok || !payload.result) {
        setApiError(payload.error || 'Could not find German translations right now.');
        return;
      }

      const normalized = normalizeEnglishToGermanResult(
        payload.result,
        cleaned,
        payload.source === 'dictionary' ? 'dictionary' : 'ai',
      );
      if (normalized.matches.length === 0) {
        setApiError('No German words found for that query. Try a simpler everyday English word.');
        return;
      }
      setResult(normalized);
    } catch {
      setApiError('Network error while looking up English to German words. Please retry.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runLookup(query);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setIsSuggestOpen(false);
      setActiveSuggestIdx(-1);
    } else if (e.key === 'Enter' && activeSuggestIdx >= 0 && suggestions[activeSuggestIdx]) {
      e.preventDefault();
      const chosen = suggestions[activeSuggestIdx].english;
      setQuery(chosen);
      void runLookup(chosen);
    }
  };

  const handlePlayGerman = async (text: string, key: string, slow: boolean, ipa?: string) => {
    setPlayingKey(key);
    setAudioNotice(null);
    const res = await playGermanAudio(text, { slow, ipa });
    setPlayingKey((curr) => (curr === key ? null : curr));
    if (res.error) {
      setAudioNotice(res.error);
    }
  };

  const handleSelectPreset = (word: string) => {
    suppressSuggestRef.current = true;
    setQuery(word);
    void runLookup(word);
  };

  const gridClass =
    result.matches.length === 1
      ? 'max-w-2xl'
      : result.matches.length === 2
        ? 'md:grid-cols-2'
        : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <section aria-labelledby="en-to-de-title" className="space-y-6">
      {/* Search Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>English → German Dictionary · Native German Audio</span>
          </div>
          <h1
            id="en-to-de-title"
            className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
          >
            English to German Words Dictionary
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Search any English word or everyday phrase to get the most natural German words with
            gender articles, Devanagari pronunciation, Hindi meaning, and slow or normal German
            audio.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="english-word-search" className="text-xs font-semibold text-slate-700">
              Enter an English word or short phrase
            </label>
            <span className="text-xs text-slate-400 tabular-nums">
              {query.length}/{MAX_EN_TO_DE_INPUT}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div ref={containerRef} className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="english-word-search"
                type="text"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={isSuggestOpen && suggestions.length > 0}
                aria-controls="english-autocomplete-listbox"
                aria-activedescendant={
                  activeSuggestIdx >= 0 ? `english-suggestion-${activeSuggestIdx}` : undefined
                }
                value={query}
                onFocus={() => {
                  if (!suppressSuggestRef.current && suggestions.length > 0) {
                    setIsSuggestOpen(true);
                  }
                }}
                onChange={(e) => {
                  suppressSuggestRef.current = false;
                  setQuery(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. water bottle, bedroom, hospital, to sleep, breakfast..."
                aria-invalid={Boolean(validationError)}
                className="w-full h-11 pl-10 pr-10 text-[15px] text-slate-900 placeholder:text-slate-400 bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-700 rounded-lg outline-none transition-colors duration-150"
              />
              {isSuggesting ? (
                <Loader2
                  className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
              ) : (
                query && (
                  <button
                    type="button"
                    onClick={() => {
                      dismissSuggestions();
                      suppressSuggestRef.current = false;
                      setQuery('');
                      setValidationError(null);
                      setApiError(null);
                    }}
                    aria-label="Clear English search input"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )
              )}

              {isSuggestOpen && suggestions.length > 0 && (
                <ul
                  id="english-autocomplete-listbox"
                  role="listbox"
                  aria-label="English word suggestions"
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 max-h-[320px] overflow-y-auto"
                >
                  {suggestions.map((item, idx) => {
                    const isHighlighted = idx === activeSuggestIdx;
                    return (
                      <li
                        key={`${item.english}-${idx}`}
                        id={`english-suggestion-${idx}`}
                        role="option"
                        aria-selected={isHighlighted}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQuery(item.english);
                            void runLookup(item.english);
                          }}
                          onMouseEnter={() => setActiveSuggestIdx(idx)}
                          className={`w-full text-left px-4 py-2.5 flex items-baseline justify-between gap-4 cursor-pointer ${
                            isHighlighted ? 'bg-blue-50 text-slate-900' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {item.english}
                          </span>
                          <span className="text-xs text-slate-600 shrink-0 flex items-baseline gap-1.5">
                            {item.article && (
                              <span className="text-slate-400">{item.article}</span>
                            )}
                            <span className="font-medium text-slate-800">{item.topGerman}</span>
                            <span className="font-devanagari text-blue-700">
                              {item.devanagariPreview}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-2 px-5 h-11 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>Find German Words</span>
                </>
              )}
            </button>
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
        </form>

        {/* Quick-Try Everyday English Presets */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500">Try a common English word:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_ENGLISH_WORDS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isSearching}
                onClick={() => handleSelectPreset(preset)}
                className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-60"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {audioNotice && (
        <p
          role="status"
          className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2"
        >
          {audioNotice}
        </p>
      )}

      {/* Results Stage */}
      <div aria-label="German translations" aria-busy={isSearching} className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900">
            German Words for “{result.englishQuery}”
            {result.hindiGloss && (
              <span className="ml-2 font-devanagari text-base font-medium text-slate-500">
                ({result.hindiGloss})
              </span>
            )}
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {result.matches.length} {result.matches.length === 1 ? 'word' : 'words'} · Audio speaks
            German without der/die/das
          </span>
        </div>

        {isSearching && (
          <div
            role="status"
            className="flex items-center gap-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
            <span>Finding the most natural German words with pronunciation &amp; examples…</span>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-4 ${gridClass}`}>
          {result.matches.map((item, idx) => {
            const isPrimary = idx === 0;
            const normalKey = `e2d-n-${idx}-${item.germanWord}`;
            const slowKey = `e2d-s-${idx}-${item.germanWord}`;
            const exKey = `e2d-ex-${idx}-${item.germanWord}`;

            return (
              <article
                key={`${item.germanWord}-${idx}`}
                className={`bg-white border rounded-xl p-5 flex flex-col justify-between ${
                  isPrimary ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className={isPrimary ? 'font-semibold text-emerald-700' : 'font-medium text-slate-500'}>
                      {isPrimary ? 'Most common translation' : `Option ${idx + 1}`}
                    </span>
                    <span className="text-slate-500 truncate">
                      {item.partOfSpeech}
                      {item.cefr ? ` · ${item.cefr}` : ''}
                    </span>
                  </div>

                  <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                    {item.article && (
                      <span className="text-slate-400 font-normal text-lg mr-1.5">
                        {item.article}
                      </span>
                    )}
                    {item.germanWord}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    {item.devanagari && (
                      <span className="font-devanagari text-lg font-semibold text-blue-800">
                        {item.devanagari}
                      </span>
                    )}
                    {item.ipa && (
                      <span className="font-mono text-xs text-slate-500">{item.ipa}</span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                    {item.hindiMeaning && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-slate-500 shrink-0">हिंदी:</span>
                        <span className="font-devanagari font-medium text-slate-900">
                          {item.hindiMeaning}
                        </span>
                      </div>
                    )}
                    {item.nuance && (
                      <p className="text-xs text-slate-600 leading-relaxed">{item.nuance}</p>
                    )}
                  </div>

                  {item.exampleGerman && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-800 leading-snug">
                          {item.exampleGerman}
                        </p>
                        <button
                          type="button"
                          disabled={playingKey !== null}
                          onClick={() => handlePlayGerman(item.exampleGerman, exKey, false)}
                          aria-label={`Listen to example sentence for ${item.germanWord}`}
                          className="p-1 text-slate-500 hover:text-blue-700 rounded cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {playingKey === exKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      {item.exampleEnglish && (
                        <p className="text-slate-500">{item.exampleEnglish}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Listen Normal / Slow + Jump to Full Breakdown & Word Formation */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={playingKey !== null}
                      onClick={() =>
                        handlePlayGerman(item.germanWord, normalKey, false, item.ipa)
                      }
                      aria-label={`Listen to ${item.germanWord} at normal speed`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md cursor-pointer"
                    >
                      {playingKey === normalKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Listen</span>
                    </button>

                    <button
                      type="button"
                      disabled={playingKey !== null}
                      onClick={() =>
                        handlePlayGerman(item.germanWord, slowKey, true, item.ipa)
                      }
                      aria-label={`Listen to ${item.germanWord} slowly`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-md cursor-pointer"
                    >
                      {playingKey === slowKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Slow</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLookupWordInDictionary(item.germanWord)}
                    aria-label={`Open full breakdown and word parts for ${item.germanWord}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/60 hover:bg-blue-50 border border-blue-200/70 rounded-md transition-colors duration-150 cursor-pointer"
                  >
                    <span>Open Full Breakdown &amp; Word Parts</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
