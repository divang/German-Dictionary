import { ArrowRight, Bookmark, Loader2, Search } from 'lucide-react';
import type { DictionaryEntry } from '../types/dictionary';

interface WordListRailProps {
  entries: DictionaryEntry[];
  activeId: string;
  savedIds: string[];
  query: string;
  hasExactMatch: boolean;
  isLookingUp: boolean;
  onSelectEntry: (entry: DictionaryEntry) => void;
  onLiveLookup: (word: string) => void;
}

export function WordListRail({
  entries,
  activeId,
  savedIds,
  query,
  hasExactMatch,
  isLookingUp,
  onSelectEntry,
  onLiveLookup,
}: WordListRailProps) {
  const trimmedQuery = query.trim();

  return (
    <aside
      aria-label="German lexicon index"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
    >
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 font-sans">Lexicon</h2>
        <span className="text-xs text-slate-500 tabular-nums">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Live Lookup Prompt when user types a word not yet matched */}
      {trimmedQuery.length >= 2 && !hasExactMatch && (
        <div className="p-3 bg-blue-50/70 border-b border-blue-100">
          <button
            type="button"
            disabled={isLookingUp}
            onClick={() => onLiveLookup(trimmedQuery)}
            className="w-full text-left px-3.5 py-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium text-blue-700">Live pronunciation coach</div>
              <div className="text-sm font-semibold text-slate-900 truncate">
                Pronounce “{trimmedQuery}”
              </div>
            </div>
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 text-blue-700 animate-spin shrink-0" aria-hidden="true" />
            ) : (
              <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="p-6 text-center">
          <Search className="w-5 h-5 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-slate-700">No curated entry matches</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Press Enter or click “Break Down” above to generate a Hindi pronunciation guide for any
            German word.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[360px] lg:max-h-[720px] overflow-y-auto">
          {entries.map((entry) => {
            const isActive = entry.id === activeId;
            const isSaved = savedIds.includes(entry.id);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`w-full text-left px-4 py-3.5 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700 ${
                    isActive
                      ? 'bg-blue-50/80 text-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 truncate">
                      {entry.article && (
                        <>
                          <span className="text-xs text-slate-400 mr-1 font-normal">
                            {entry.article}
                          </span>{' '}
                        </>
                      )}
                      <span
                        className={`text-[15px] font-semibold ${
                          isActive ? 'text-blue-800' : 'text-slate-900'
                        }`}
                      >
                        {entry.word}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSaved && (
                        <Bookmark
                          className="w-3.5 h-3.5 text-blue-700 fill-blue-700"
                          aria-label="Saved word"
                        />
                      )}
                      <span className="text-[11px] font-mono text-slate-400">{entry.cefr}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-devanagari font-medium text-blue-700 truncate">
                      {entry.devanagariFull}
                    </span>
                    <span className="text-slate-500 truncate max-w-[130px]">
                      {entry.englishMeaning}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
