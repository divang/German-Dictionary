import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, RefObject } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { DictionarySuggestion, WordCategory } from '../types/dictionary';

const UMLAUT_CHARS = ['ä', 'ö', 'ü', 'ß'] as const;

const CATEGORIES: { id: WordCategory; label: string }[] = [
  { id: 'all', label: 'All Curated' },
  { id: 'umlauts', label: 'Umlauts (ä, ö, ü)' },
  { id: 'ch-r', label: 'CH & R Traps' },
  { id: 'loanwords', label: 'Loanwords & Silent H' },
  { id: 'everyday', label: 'Everyday Essentials' },
];

interface SearchToolbarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  category: WordCategory;
  totalDictionaryEntries: number;
  validationError: string | null;
  lookupError: string | null;
  isLookingUp: boolean;
  onQueryChange: (value: string) => void;
  onInsertChar: (char: string) => void;
  onCategoryChange: (cat: WordCategory) => void;
  onSubmitLookup: (e: FormEvent) => void;
  onSelectSuggestion: (suggestion: DictionarySuggestion) => void;
  onClearQuery: () => void;
}

export function SearchToolbar({
  inputRef,
  query,
  category,
  totalDictionaryEntries,
  validationError,
  lookupError,
  isLookingUp,
  onQueryChange,
  onInsertChar,
  onCategoryChange,
  onSubmitLookup,
  onSelectSuggestion,
  onClearQuery,
}: SearchToolbarProps) {
  const [suggestions, setSuggestions] = useState<DictionarySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const suppressSuggestRef = useRef(false);
  const activeSuggestAbortRef = useRef<AbortController | null>(null);

  const dismissSuggestions = () => {
    suppressSuggestRef.current = true;
    activeSuggestAbortRef.current?.abort();
    activeSuggestAbortRef.current = null;
    setIsOpen(false);
    setActiveIdx(-1);
    setIsSuggesting(false);
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || suppressSuggestRef.current) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIdx(-1);
      setIsSuggesting(false);
      return;
    }

    const controller = new AbortController();
    activeSuggestAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      if (suppressSuggestRef.current) return;
      setIsSuggesting(true);
      try {
        const res = await fetch(
          `/api/suggest?q=${encodeURIComponent(trimmed)}&limit=9`,
          { signal: controller.signal },
        );
        if (res.ok && !suppressSuggestRef.current) {
          const data = (await res.json()) as { suggestions?: DictionarySuggestion[] };
          const list = Array.isArray(data.suggestions) ? data.suggestions : [];
          setSuggestions(list);
          setIsOpen(list.length > 0);
          setActiveIdx(-1);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        if (activeSuggestAbortRef.current === controller) {
          setIsSuggesting(false);
        }
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIdx(-1);
    } else if (e.key === 'Enter' && activeIdx >= 0 && suggestions[activeIdx]) {
      e.preventDefault();
      const chosen = suggestions[activeIdx];
      dismissSuggestions();
      onSelectSuggestion(chosen);
    }
  };

  const countText =
    totalDictionaryEntries > 0
      ? `${totalDictionaryEntries.toLocaleString()} German words indexed locally`
      : 'Full German Dictionary';

  return (
    <section
      aria-label="Dictionary search and filters"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-blue-700 tabular-nums">
            {countText} · Hindi Native Pronunciation Guide
          </p>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Start typing any German word (e.g.{' '}
            <span className="font-mono text-slate-800">biologisches</span>,{' '}
            <span className="font-mono text-slate-800">Krankenhaus</span>, or{' '}
            <span className="font-mono text-slate-800">broetchen</span>) for instant autocomplete,
            Devanagari syllable breakdowns, and slow or normal German audio.
          </p>
        </div>

        {/* Umlaut Quick-Insert Bar */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          role="group"
          aria-label="Insert German character"
        >
          <span className="text-xs text-slate-500 mr-1 whitespace-nowrap">Insert:</span>
          {UMLAUT_CHARS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                suppressSuggestRef.current = false;
                onInsertChar(ch);
              }}
              aria-label={`Insert character ${ch}`}
              className="w-9 h-9 text-sm font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          dismissSuggestions();
          onSubmitLookup(e);
        }}
        noValidate
        className="mt-4"
      >
        <label htmlFor="german-word-search" className="sr-only">
          Search or enter any German word to pronounce
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div ref={containerRef} className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="german-word-search"
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={isOpen && suggestions.length > 0}
              aria-controls="german-autocomplete-listbox"
              aria-activedescendant={
                activeIdx >= 0 ? `german-suggestion-${activeIdx}` : undefined
              }
              value={query}
              onFocus={() => {
                if (!suppressSuggestRef.current && suggestions.length > 0) setIsOpen(true);
              }}
              onChange={(e) => {
                suppressSuggestRef.current = false;
                onQueryChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search any German word (e.g. biologisches, Friseur, Krankenhaus)..."
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? 'search-validation-error' : undefined}
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
                    setSuggestions([]);
                    onClearQuery();
                  }}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )
            )}

            {/* Instant Autocomplete Listbox */}
            {isOpen && suggestions.length > 0 && (
              <ul
                id="german-autocomplete-listbox"
                role="listbox"
                aria-label="German word suggestions"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 max-h-[360px] overflow-y-auto"
              >
                {suggestions.map((item, idx) => {
                  const isHighlighted = idx === activeIdx;
                  return (
                    <li
                      key={`${item.word}-${idx}`}
                      id={`german-suggestion-${idx}`}
                      role="option"
                      aria-selected={isHighlighted}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          dismissSuggestions();
                          onSelectSuggestion(item);
                        }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`w-full text-left px-4 py-2.5 flex items-baseline justify-between gap-4 transition-colors duration-100 cursor-pointer ${
                          isHighlighted ? 'bg-blue-50 text-slate-900' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-semibold text-slate-900">
                              {item.article && (
                                <span className="text-xs font-normal text-slate-400 mr-1">
                                  {item.article}
                                </span>
                              )}
                              {item.word}
                            </span>
                            <span className="font-devanagari text-xs font-medium text-blue-700">
                              {item.devanagariPreview}
                            </span>
                            {item.pos && (
                              <span className="text-[11px] text-slate-400">{item.pos}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {item.english}
                          </div>
                        </div>
                        {item.isCurated && (
                          <span className="text-[11px] font-medium text-blue-700 whitespace-nowrap shrink-0">
                            Featured
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={isLookingUp}
            className="inline-flex items-center justify-center gap-2 px-5 h-11 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isLookingUp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Looking up…</span>
              </>
            ) : (
              <span>Break Down</span>
            )}
          </button>
        </div>

        {validationError && (
          <p
            id="search-validation-error"
            role="alert"
            className="mt-2 text-xs font-medium text-red-700"
          >
            {validationError}
          </p>
        )}

        {lookupError && (
          <div
            role="alert"
            className="mt-3 px-4 py-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg"
          >
            {lookupError}
          </div>
        )}
      </form>

      {/* Category Filter Segmented Control */}
      <div
        role="group"
        aria-label="Filter curated words by sound category"
        className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 ${
                isSelected
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
