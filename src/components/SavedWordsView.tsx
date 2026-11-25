import { ArrowUpRight, Bookmark, Trash2 } from 'lucide-react';
import type { DictionaryEntry } from '../types/dictionary';

interface SavedWordsViewProps {
  savedEntries: DictionaryEntry[];
  recentEntries: DictionaryEntry[];
  onOpenEntry: (entry: DictionaryEntry) => void;
  onRemoveSaved: (entry: DictionaryEntry) => void;
  onGoToDictionary: () => void;
}

export function SavedWordsView({
  savedEntries,
  recentEntries,
  onOpenEntry,
  onRemoveSaved,
  onGoToDictionary,
}: SavedWordsViewProps) {
  return (
    <section aria-labelledby="saved-words-title" className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-700">Personal Wordbook</p>
          <h1
            id="saved-words-title"
            className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
          >
            Saved Words
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Keep tricky German words handy for quick pronunciation drills. Saved locally in your
            browser.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-500 tabular-nums">
          {savedEntries.length} {savedEntries.length === 1 ? 'saved word' : 'saved words'}
        </span>
      </div>

      {savedEntries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Bookmark className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
            No saved words yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            Click “Save Word” on any pronunciation entry—such as Friseur, Brötchen, or
            Eichhörnchen—to build your practice list.
          </p>
          <button
            type="button"
            onClick={onGoToDictionary}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <span>Browse Dictionary</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedEntries.map((entry) => (
            <article
              key={entry.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {entry.article ? `${entry.article} · ` : ''}
                    {entry.partOfSpeech}
                  </span>
                  <span className="font-mono">{entry.ipa}</span>
                </div>
                <h2 className="mt-1.5 font-display text-xl font-semibold text-slate-900">
                  {entry.word}
                </h2>
                <p className="mt-1 font-devanagari text-lg font-semibold text-blue-800">
                  {entry.devanagariFull}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {entry.englishMeaning}
                  {entry.hindiMeaning ? ` · ${entry.hindiMeaning}` : ''}
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenEntry(entry)}
                  aria-label={`Open breakdown for ${entry.word}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 rounded-sm"
                >
                  <span>Study Breakdown</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSaved(entry)}
                  aria-label={`Remove ${entry.word} from saved words`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {recentEntries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">Recently Viewed</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenEntry(entry)}
                className="px-3.5 py-2 min-h-[38px] text-xs font-medium text-slate-800 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
              >
                <span>{entry.word}</span>
                <span className="ml-1.5 font-devanagari text-blue-700">{entry.devanagariFull}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
