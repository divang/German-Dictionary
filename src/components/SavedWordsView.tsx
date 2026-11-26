import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Cloud,
  CloudOff,
  History,
  Loader2,
  LogIn,
  LogOut,
  Search,
  Smartphone,
  Trash2,
  Turtle,
  Volume2,
  X,
} from 'lucide-react';
import type { DictionaryEntry, SearchedWordRecord } from '../types/dictionary';
import { playGermanAudio } from '../utils/audioPlayer';
import { filterSearchedWords } from '../utils/searchedWords';

interface CloudAccountInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
}

interface SavedWordsViewProps {
  searchedWords: SearchedWordRecord[];
  savedEntries: DictionaryEntry[];
  cloudUser: CloudAccountInfo | null;
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  authError: string | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onOpenSearchedWord: (record: SearchedWordRecord) => void;
  onRemoveSearchedWord: (record: SearchedWordRecord) => void;
  onOpenEntry: (entry: DictionaryEntry) => void;
  onRemoveSaved: (entry: DictionaryEntry) => void;
  onGoToDictionary: () => void;
}

type RevisionTab = 'searched' | 'bookmarked';

function formatRelativeDate(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) {
    const mins = Math.max(1, Math.round(diffMs / 60_000));
    return `${mins}m ago`;
  }
  if (diffMs < 86_400_000) {
    const hrs = Math.max(1, Math.round(diffMs / 3_600_000));
    return `${hrs}h ago`;
  }
  return new Date(timestampMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function SavedWordsView({
  searchedWords,
  savedEntries,
  cloudUser,
  isAuthLoading,
  isSyncingCloud,
  authError,
  onSignInGoogle,
  onSignOut,
  onOpenSearchedWord,
  onRemoveSearchedWord,
  onOpenEntry,
  onRemoveSaved,
  onGoToDictionary,
}: SavedWordsViewProps) {
  const [activeTab, setActiveTab] = useState<RevisionTab>('searched');
  const [filterQuery, setFilterQuery] = useState('');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const filteredSearched = useMemo(
    () => filterSearchedWords(searchedWords, filterQuery),
    [searchedWords, filterQuery],
  );

  const filteredBookmarked = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return savedEntries;
    return savedEntries.filter(
      (e) =>
        e.word.toLowerCase().includes(q) ||
        e.englishMeaning.toLowerCase().includes(q) ||
        e.hindiMeaning.toLowerCase().includes(q) ||
        e.devanagariFull.toLowerCase().includes(q),
    );
  }, [savedEntries, filterQuery]);

  const handlePlayWord = async (word: string, key: string, slow: boolean, ipa?: string) => {
    setPlayingKey(key);
    setAudioNotice(null);
    // Always speak bare German word without der/die/das
    const result = await playGermanAudio(word, { slow, ipa });
    setPlayingKey((curr) => (curr === key ? null : curr));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  return (
    <section aria-labelledby="saved-words-title" className="space-y-6">
      {/* Header + Cross-Device Cloud Sync Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Laptop ↔ Phone Revision Wordbook</span>
          </div>
          <h1
            id="saved-words-title"
            className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
          >
            My Revision List
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Every German word you search is automatically saved here with its English &amp; Hindi
            meaning and Devanagari pronunciation so you can revise anytime on your phone.
          </p>
        </div>

        {/* Cloud Sync Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:min-w-[290px] shrink-0">
          {isAuthLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700" aria-hidden="true" />
              <span>Checking cloud sync…</span>
            </div>
          ) : cloudUser ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Cloud className="w-4 h-4" aria-hidden="true" />
                  <span>{isSyncingCloud ? 'Syncing to phone…' : 'Synced across devices'}</span>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
              <p className="text-xs text-slate-600 truncate">
                {cloudUser.displayName || cloudUser.email}
              </p>
              <p className="text-[11px] text-slate-500">
                Sign in with the same Google account on your phone to revise all searched words.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <CloudOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>Saved permanently on this device</span>
              </div>
              <button
                type="button"
                onClick={onSignInGoogle}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign in with Google to Sync to Phone</span>
              </button>
            </div>
          )}

          {authError && (
            <p role="status" className="mt-2 text-xs text-amber-800">
              {authError}
            </p>
          )}
        </div>
      </div>

      {/* Tabs + Quick Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Revision sections"
          className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'searched'}
            onClick={() => setActiveTab('searched')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
              activeTab === 'searched'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="tabular-nums">Searched History ({searchedWords.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bookmarked'}
            onClick={() => setActiveTab('bookmarked')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
              activeTab === 'bookmarked'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="tabular-nums">Bookmarked ({savedEntries.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter German, English, or हिंदी…"
            aria-label="Filter revision words"
            className="w-full pl-9 pr-8 py-2 min-h-[40px] text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              aria-label="Clear filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {audioNotice && (
        <p role="status" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2">
          {audioNotice}
        </p>
      )}

      {/* Tab 1: Auto-Saved Searched Words History */}
      {activeTab === 'searched' && (
        <>
          {searchedWords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <History className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
                No searched words yet
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                Search any German word in the dictionary—like Krankenhaus, biologisches, or
                Bahnhof—and it will be stored here automatically with English &amp; Hindi meanings.
              </p>
              <button
                type="button"
                onClick={onGoToDictionary}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <span>Search Dictionary</span>
              </button>
            </div>
          ) : filteredSearched.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
              No searched words match “{filterQuery}”.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSearched.map((item) => {
                const normalKey = `hist-normal-${item.id}`;
                const slowKey = `hist-slow-${item.id}`;
                return (
                  <article
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">
                          {item.article ? `${item.article} · ` : ''}
                          {item.partOfSpeech}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {item.searchCount > 1
                            ? `Searched ${item.searchCount}×`
                            : formatRelativeDate(item.lastSearchedAtMs)}
                        </span>
                      </div>

                      <h2 className="mt-1.5 font-display text-xl font-semibold text-slate-900">
                        {item.article && (
                          <span className="text-slate-400 font-normal mr-1 text-base">
                            {item.article}
                          </span>
                        )}
                        {item.word}
                      </h2>

                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <span className="font-devanagari text-lg font-semibold text-blue-800">
                          {item.devanagariFull}
                        </span>
                        {item.ipa && (
                          <span className="font-mono text-xs text-slate-500">{item.ipa}</span>
                        )}
                      </div>

                      {/* English & Hindi Meanings for Quick Revision */}
                      <dl className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-sm">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-xs text-slate-500 shrink-0">English:</dt>
                          <dd className="text-slate-800 font-medium leading-snug">
                            {item.englishMeaning || '—'}
                          </dd>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-xs text-slate-500 shrink-0">हिंदी:</dt>
                          <dd className="font-devanagari text-slate-900 font-medium leading-snug">
                            {item.hindiMeaning || '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={playingKey !== null}
                          onClick={() => handlePlayWord(item.word, normalKey, false, item.ipa)}
                          aria-label={`Listen to ${item.word} at normal speed`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors duration-150 cursor-pointer"
                        >
                          {playingKey === normalKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Normal</span>
                        </button>

                        <button
                          type="button"
                          disabled={playingKey !== null}
                          onClick={() => handlePlayWord(item.word, slowKey, true, item.ipa)}
                          aria-label={`Listen to ${item.word} slowly`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-md transition-colors duration-150 cursor-pointer"
                        >
                          {playingKey === slowKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Slow</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenSearchedWord(item)}
                          aria-label={`Open full pronunciation breakdown for ${item.word}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                        >
                          <span>Full Breakdown</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveSearchedWord(item)}
                          aria-label={`Remove ${item.word} from revision history`}
                          className="inline-flex items-center gap-1 px-2 py-1 min-h-[32px] text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Manually Bookmarked Words */}
      {activeTab === 'bookmarked' && (
        <>
          {savedEntries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <Bookmark className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
                No bookmarked words yet
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                Click “Bookmark” on your hardest German words to pin a focused drill list separate
                from your full searched history.
              </p>
              <button
                type="button"
                onClick={onGoToDictionary}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <span>Browse Dictionary</span>
              </button>
            </div>
          ) : filteredBookmarked.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
              No bookmarked words match “{filterQuery}”.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookmarked.map((entry) => {
                const normalKey = `bm-normal-${entry.id}`;
                const slowKey = `bm-slow-${entry.id}`;
                return (
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
                      <dl className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-sm">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-xs text-slate-500 shrink-0">English:</dt>
                          <dd className="text-slate-800 font-medium">{entry.englishMeaning}</dd>
                        </div>
                        {entry.hindiMeaning && (
                          <div className="flex items-baseline gap-1.5">
                            <dt className="text-xs text-slate-500 shrink-0">हिंदी:</dt>
                            <dd className="font-devanagari text-slate-900 font-medium">
                              {entry.hindiMeaning}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={playingKey !== null}
                          onClick={() => handlePlayWord(entry.word, normalKey, false, entry.ipa)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md cursor-pointer"
                        >
                          {playingKey === normalKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Normal</span>
                        </button>
                        <button
                          type="button"
                          disabled={playingKey !== null}
                          onClick={() => handlePlayWord(entry.word, slowKey, true, entry.ipa)}
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

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenEntry(entry)}
                          aria-label={`Open breakdown for ${entry.word}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                        >
                          <span>Full Breakdown</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSaved(entry)}
                          aria-label={`Remove ${entry.word} from bookmarks`}
                          className="inline-flex items-center gap-1 px-2 py-1 min-h-[32px] text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
