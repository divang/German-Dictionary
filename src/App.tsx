import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { A1CertificateView } from './components/A1CertificateView';
import { Header, type AppView } from './components/Header';
import { MinimalPairsView } from './components/MinimalPairsView';
import {
  PronunciationEntryView,
  type PlaybackSpeed,
} from './components/PronunciationEntryView';
import { SavedWordsView } from './components/SavedWordsView';
import { SearchToolbar } from './components/SearchToolbar';
import { SoundGuideView } from './components/SoundGuideView';
import { WordListRail } from './components/WordListRail';
import { CURATED_WORDS } from './data/curatedWords';
import { auth, googleProvider } from './firebase';
import type { A1ExamAttempt, A1UserProgress, A1WorkspaceTab } from './types/a1';
import type {
  DictionaryEntry,
  DictionarySuggestion,
  WordCategory,
} from './types/dictionary';
import {
  DEFAULT_A1_PROGRESS,
  MAX_COMPLETED_LESSONS,
  MAX_MASTERED_VOCAB,
  clampNumber,
  sanitizeA1Tab,
  sanitizeIdList,
  sanitizeModuleId,
  toggleListId,
} from './utils/a1Progress';
import {
  filterEntries,
  findExactWordMatch,
  normalizeGeneratedEntry,
  toggleSavedWordId,
  upsertRecentEntry,
} from './utils/dictionary';
import {
  recordExamAttemptToCloud,
  saveUserProgressToCloud,
  subscribeToExamAttempts,
  subscribeToUserProgress,
  syncInitialUserProgress,
} from './utils/firebaseProgressSync';

const SAVED_IDS_KEY = 'lautbhasha_saved_ids_v1';
const CUSTOM_ENTRIES_KEY = 'lautbhasha_custom_entries_v1';
const A1_PROGRESS_KEY = 'lautbhasha_a1_progress_v1';
const A1_ATTEMPTS_KEY = 'lautbhasha_a1_attempts_v1';

function loadJsonFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadInitialA1Progress(): A1UserProgress {
  const raw = loadJsonFromStorage<Partial<A1UserProgress>>(A1_PROGRESS_KEY, {});
  return {
    completedLessonIds: sanitizeIdList(
      Array.isArray(raw.completedLessonIds) ? raw.completedLessonIds : [],
      MAX_COMPLETED_LESSONS,
    ),
    masteredVocabIds: sanitizeIdList(
      Array.isArray(raw.masteredVocabIds) ? raw.masteredVocabIds : [],
      MAX_MASTERED_VOCAB,
    ),
    lastActiveModuleId: sanitizeModuleId(raw.lastActiveModuleId),
    lastActiveTab: sanitizeA1Tab(raw.lastActiveTab),
    bestMockScore: clampNumber(typeof raw.bestMockScore === 'number' ? raw.bestMockScore : 0, 0, 100),
    totalMockAttempts: clampNumber(
      typeof raw.totalMockAttempts === 'number' ? raw.totalMockAttempts : 0,
      0,
      1000,
    ),
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dictionary');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<WordCategory>('all');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('normal');
  const [totalDictionaryEntries, setTotalDictionaryEntries] = useState<number>(382641);
  const [customEntries, setCustomEntries] = useState<DictionaryEntry[]>(() =>
    loadJsonFromStorage<DictionaryEntry[]>(CUSTOM_ENTRIES_KEY, []),
  );
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    loadJsonFromStorage<string[]>(SAVED_IDS_KEY, []),
  );
  const [a1Progress, setA1Progress] = useState<A1UserProgress>(() => loadInitialA1Progress());
  const [examAttempts, setExamAttempts] = useState<A1ExamAttempt[]>(() =>
    loadJsonFromStorage<A1ExamAttempt[]>(A1_ATTEMPTS_KEY, []),
  );
  const [activeEntryId, setActiveEntryId] = useState<string>(CURATED_WORDS[0].id);
  const [recentEntries, setRecentEntries] = useState<DictionaryEntry[]>([CURATED_WORDS[0]]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isEnhancingAi, setIsEnhancingAi] = useState(false);

  // Firebase Auth & Firestore Cloud Sync state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const entryStageRef = useRef<HTMLDivElement | null>(null);
  const latestProgressRef = useRef(a1Progress);
  const latestSavedIdsRef = useRef(savedIds);
  const cloudReadyRef = useRef(false);

  latestProgressRef.current = a1Progress;
  latestSavedIdsRef.current = savedIds;

  useEffect(() => {
    let active = true;
    fetch('/api/dictionary/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { totalEntries?: number } | null) => {
        if (active && data?.totalEntries && data.totalEntries > 0) {
          setTotalDictionaryEntries(data.totalEntries);
        }
      })
      .catch(() => {
        // Keep default count if stats endpoint is briefly busy
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(savedIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_ENTRIES_KEY, JSON.stringify(customEntries));
    } catch {
      // Ignore storage quota errors
    }
  }, [customEntries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(A1_PROGRESS_KEY, JSON.stringify(a1Progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [a1Progress]);

  useEffect(() => {
    try {
      window.localStorage.setItem(A1_ATTEMPTS_KEY, JSON.stringify(examAttempts.slice(0, 20)));
    } catch {
      // Ignore storage quota errors
    }
  }, [examAttempts]);

  // Listen to Firebase Auth state & synchronize Firestore progress for verified users
  useEffect(() => {
    let unsubProgress: (() => void) | null = null;
    let unsubAttempts: (() => void) | null = null;
    let cancelled = false;

    const cleanupListeners = () => {
      unsubProgress?.();
      unsubProgress = null;
      unsubAttempts?.();
      unsubAttempts = null;
      cloudReadyRef.current = false;
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      cleanupListeners();
      if (cancelled) return;

      setFirebaseUser(user);
      setIsAuthLoading(false);

      if (!user || !user.emailVerified) {
        setIsSyncingCloud(false);
        return;
      }

      setIsSyncingCloud(true);
      setAuthError(null);
      try {
        const merged = await syncInitialUserProgress(
          user.uid,
          latestProgressRef.current,
          latestSavedIdsRef.current,
        );
        if (cancelled) return;

        setA1Progress(merged.progress);
        setSavedIds(merged.savedWordIds);
        cloudReadyRef.current = true;

        unsubProgress = subscribeToUserProgress(
          user.uid,
          (snapshot) => {
            if (cancelled) return;
            setA1Progress(snapshot.progress);
            setSavedIds(snapshot.savedWordIds);
          },
          () => {
            if (!cancelled) {
              setAuthError('Cloud sync paused briefly. Your progress stays saved on this device.');
            }
          },
        );

        unsubAttempts = subscribeToExamAttempts(
          user.uid,
          (attempts) => {
            if (cancelled) return;
            setExamAttempts(attempts);
          },
          () => {
            // Non-blocking: local attempts remain visible if Firestore list errors
          },
        );
      } catch {
        if (!cancelled) {
          setAuthError('Could not connect to cloud sync right now. Local progress is active.');
        }
      } finally {
        if (!cancelled) {
          setIsSyncingCloud(false);
        }
      }
    });

    return () => {
      cancelled = true;
      cleanupListeners();
      unsubAuth();
    };
  }, []);

  const persistProgressIfSignedIn = useCallback(
    (nextProgress: A1UserProgress, nextSavedIds: string[]) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudReadyRef.current) {
        return;
      }
      setIsSyncingCloud(true);
      void saveUserProgressToCloud(firebaseUser.uid, nextProgress, nextSavedIds)
        .catch(() => {
          setAuthError('Could not push latest update to cloud. Saved locally.');
        })
        .finally(() => {
          setIsSyncingCloud(false);
        });
    },
    [firebaseUser],
  );

  const handleSignInGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/popup-blocked') {
        setAuthError('Pop-up was blocked by your browser. Please allow pop-ups to sign in with Google.');
        return;
      }
      setAuthError('Google Sign-In could not be completed right now. Please try again.');
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch {
      setAuthError('Could not sign out right now.');
    }
  };

  const allEntries = useMemo(() => {
    const seen = new Set<string>();
    const combined: DictionaryEntry[] = [];
    for (const item of [...customEntries, ...CURATED_WORDS]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    return combined;
  }, [customEntries]);

  const filteredEntries = useMemo(
    () => filterEntries(allEntries, query, category),
    [allEntries, query, category],
  );

  const activeEntry = useMemo(
    () => allEntries.find((e) => e.id === activeEntryId) ?? CURATED_WORDS[0],
    [allEntries, activeEntryId],
  );

  const exactMatch = useMemo(() => findExactWordMatch(allEntries, query), [allEntries, query]);

  const savedEntries = useMemo(
    () =>
      savedIds
        .map((id) => allEntries.find((e) => e.id === id))
        .filter((e): e is DictionaryEntry => Boolean(e)),
    [savedIds, allEntries],
  );

  const selectEntry = (entry: DictionaryEntry, scrollToStage = false) => {
    setActiveEntryId(entry.id);
    setRecentEntries((prev) => upsertRecentEntry(prev, entry));
    setActiveView('dictionary');
    setLookupError(null);
    setValidationError(null);
    if (scrollToStage && window.innerWidth < 1024) {
      window.setTimeout(() => {
        entryStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleToggleSave = (entry: DictionaryEntry) => {
    setSavedIds((prev) => {
      const next = toggleSavedWordId(prev, entry.id);
      persistProgressIfSignedIn(latestProgressRef.current, next);
      return next;
    });
  };

  const updateA1Progress = useCallback(
    (updater: (prev: A1UserProgress) => A1UserProgress) => {
      setA1Progress((prev) => {
        const next = updater(prev);
        persistProgressIfSignedIn(next, latestSavedIdsRef.current);
        return next;
      });
    },
    [persistProgressIfSignedIn],
  );

  const handleA1ChangeTab = useCallback(
    (tab: A1WorkspaceTab) => {
      updateA1Progress((prev) => ({
        ...prev,
        lastActiveTab: sanitizeA1Tab(tab),
      }));
    },
    [updateA1Progress],
  );

  const handleA1SelectModule = useCallback(
    (moduleId: string) => {
      updateA1Progress((prev) => ({
        ...prev,
        lastActiveModuleId: sanitizeModuleId(moduleId),
      }));
    },
    [updateA1Progress],
  );

  const handleA1ToggleCompleteModule = useCallback(
    (moduleId: string) => {
      updateA1Progress((prev) => ({
        ...prev,
        completedLessonIds: toggleListId(prev.completedLessonIds, moduleId, MAX_COMPLETED_LESSONS),
      }));
    },
    [updateA1Progress],
  );

  const handleA1ToggleMasterVocab = useCallback(
    (vocabId: string) => {
      updateA1Progress((prev) => ({
        ...prev,
        masteredVocabIds: toggleListId(prev.masteredVocabIds, vocabId, MAX_MASTERED_VOCAB),
      }));
    },
    [updateA1Progress],
  );

  const handleRecordExamAttempt = useCallback(
    async (attempt: Omit<A1ExamAttempt, 'ownerId' | 'createdAtMs'>) => {
      const fullAttempt: A1ExamAttempt = {
        ...attempt,
        ownerId: firebaseUser?.uid ?? 'local',
        createdAtMs: Date.now(),
      };

      const nextProgress: A1UserProgress = {
        ...latestProgressRef.current,
        bestMockScore: clampNumber(
          Math.max(latestProgressRef.current.bestMockScore, attempt.score),
          0,
          100,
        ),
        totalMockAttempts: clampNumber(latestProgressRef.current.totalMockAttempts + 1, 0, 1000),
      };

      setA1Progress(nextProgress);
      setExamAttempts((prev) => [fullAttempt, ...prev.filter((a) => a.id !== fullAttempt.id)].slice(0, 20));

      if (firebaseUser && firebaseUser.emailVerified && cloudReadyRef.current) {
        setIsSyncingCloud(true);
        try {
          await recordExamAttemptToCloud(
            firebaseUser.uid,
            attempt,
            nextProgress,
            latestSavedIdsRef.current,
          );
        } catch {
          setAuthError('Exam result saved locally; cloud sync will retry on next sign-in.');
        } finally {
          setIsSyncingCloud(false);
        }
      }
    },
    [firebaseUser],
  );

  /**
   * Instant local lookup against all 382,641 German dictionary entries stored in the repo.
   */
  const handleDictionaryLookup = async (wordToLookup: string) => {
    const cleaned = wordToLookup.trim();
    if (!cleaned) {
      setValidationError(
        'Enter a German word or phrase first (for example: biologisches, Krankenhaus, or Bahnhof).',
      );
      searchInputRef.current?.focus();
      return;
    }

    const existing = findExactWordMatch(allEntries, cleaned);
    if (existing) {
      selectEntry(existing, true);
      return;
    }

    setValidationError(null);
    setLookupError(null);
    setIsLookingUp(true);
    setActiveView('dictionary');

    try {
      const response = await fetch(`/api/lookup?word=${encodeURIComponent(cleaned)}`);
      const payload = (await response.json()) as {
        entry?: DictionaryEntry;
        error?: string;
      };

      if (!response.ok || !payload.entry) {
        setLookupError(payload.error || 'Could not look up that word right now.');
        return;
      }

      const lookedUp = payload.entry;
      const isCuratedMatch = CURATED_WORDS.some((c) => c.id === lookedUp.id);
      if (!isCuratedMatch) {
        setCustomEntries((prev) =>
          [lookedUp, ...prev.filter((item) => item.id !== lookedUp.id)].slice(0, 30),
        );
      } else if (lookedUp.matchedQuery) {
        setCustomEntries((prev) =>
          [lookedUp, ...prev.filter((item) => item.id !== lookedUp.id)].slice(0, 30),
        );
      }
      setCategory('all');
      selectEntry(lookedUp, true);
    } catch {
      setLookupError('Network error while looking up dictionary entry. Please retry.');
    } finally {
      setIsLookingUp(false);
    }
  };

  /**
   * Optional AI Coach enhancement via Gemini for idiomatic Hindi meanings & extra custom tips.
   */
  const handleEnhanceWithAi = async (entry: DictionaryEntry) => {
    setLookupError(null);
    setIsEnhancingAi(true);
    try {
      const response = await fetch('/api/pronounce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: entry.word }),
      });

      const payload = (await response.json()) as {
        entry?: Partial<DictionaryEntry>;
        error?: string;
      };

      if (!response.ok || !payload.entry) {
        setLookupError(
          payload.error ||
            'AI Coach is temporarily busy—your in-repo German dictionary breakdown remains ready below.',
        );
        return;
      }

      const normalized = normalizeGeneratedEntry(
        {
          ...payload.entry,
          collocations: payload.entry.collocations ?? entry.collocations,
          examples:
            payload.entry.examples && payload.entry.examples.length > 0
              ? payload.entry.examples
              : payload.entry.example
                ? [payload.entry.example, ...(entry.examples ?? []).slice(0, 2)]
                : entry.examples,
        },
        entry.word,
      );

      setCustomEntries((prev) =>
        [normalized, ...prev.filter((item) => item.id !== normalized.id)].slice(0, 30),
      );
      selectEntry(normalized, false);
    } catch {
      setLookupError('Could not reach AI Coach right now—your local dictionary breakdown is shown below.');
    } finally {
      setIsEnhancingAi(false);
    }
  };

  const handleSubmitLookup = (e: FormEvent) => {
    e.preventDefault();
    void handleDictionaryLookup(query);
  };

  const handleSelectSuggestion = (suggestion: DictionarySuggestion) => {
    setQuery(suggestion.word);
    if (suggestion.curatedId) {
      const found = CURATED_WORDS.find((w) => w.id === suggestion.curatedId);
      if (found) {
        setCategory('all');
        selectEntry(found, true);
        return;
      }
    }
    void handleDictionaryLookup(suggestion.word);
  };

  const handleInsertChar = (char: string) => {
    setValidationError(null);
    setQuery((prev) => prev + char);
    searchInputRef.current?.focus();
  };

  const handleRandomWord = () => {
    const candidates = CURATED_WORDS.filter((w) => w.id !== activeEntry.id);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? CURATED_WORDS[0];
    setQuery('');
    setCategory('all');
    selectEntry(chosen, true);
  };

  const handleOpenWordById = (wordId: string) => {
    const found = allEntries.find((w) => w.id === wordId);
    if (found) {
      setQuery('');
      setCategory('all');
      selectEntry(found, true);
    }
  };

  const mobileTabs: { id: AppView; label: string }[] = [
    { id: 'dictionary', label: 'Dictionary' },
    { id: 'a1-certificate', label: 'A1 Certificate' },
    { id: 'sound-guide', label: 'Sound Guide' },
    { id: 'minimal-pairs', label: 'Pairs' },
    { id: 'saved', label: savedIds.length > 0 ? `Saved (${savedIds.length})` : 'Saved' },
  ];

  const cloudAccount = firebaseUser
    ? {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header
        activeView={activeView}
        savedCount={savedIds.length}
        onNavigate={setActiveView}
        onRandomWord={handleRandomWord}
      />

      {/* Non-sticky mobile navigation bar so sticky height stays strictly under 15% */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto"
      >
        <div className="flex items-center gap-2 min-w-max">
          {mobileTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'dictionary' && (
          <div className="space-y-6">
            <SearchToolbar
              inputRef={searchInputRef}
              query={query}
              category={category}
              totalDictionaryEntries={totalDictionaryEntries}
              validationError={validationError}
              lookupError={lookupError}
              isLookingUp={isLookingUp}
              onQueryChange={(val) => {
                setQuery(val);
                if (validationError) setValidationError(null);
              }}
              onInsertChar={handleInsertChar}
              onCategoryChange={setCategory}
              onSubmitLookup={handleSubmitLookup}
              onSelectSuggestion={handleSelectSuggestion}
              onClearQuery={() => {
                setQuery('');
                setValidationError(null);
                setLookupError(null);
                searchInputRef.current?.focus();
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)] gap-6 items-start">
              <div className={query.trim() ? 'order-1 lg:order-1' : 'order-2 lg:order-1'}>
                <WordListRail
                  entries={filteredEntries}
                  activeId={activeEntry.id}
                  savedIds={savedIds}
                  query={query}
                  hasExactMatch={Boolean(exactMatch)}
                  isLookingUp={isLookingUp}
                  onSelectEntry={(entry) => selectEntry(entry, true)}
                  onLiveLookup={(word) => void handleDictionaryLookup(word)}
                />
              </div>

              <div
                ref={entryStageRef}
                className={`min-w-0 ${query.trim() ? 'order-2 lg:order-2' : 'order-1 lg:order-2'}`}
              >
                <PronunciationEntryView
                  entry={activeEntry}
                  isSaved={savedIds.includes(activeEntry.id)}
                  playbackSpeed={playbackSpeed}
                  isEnhancingAi={isEnhancingAi}
                  onPlaybackSpeedChange={setPlaybackSpeed}
                  onToggleSave={handleToggleSave}
                  onLookupPhrase={(phrase) => {
                    setQuery(phrase);
                    void handleDictionaryLookup(phrase);
                  }}
                  onEnhanceWithAi={(entry) => void handleEnhanceWithAi(entry)}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'a1-certificate' && (
          <A1CertificateView
            progress={a1Progress ?? DEFAULT_A1_PROGRESS}
            examAttempts={examAttempts}
            cloudUser={cloudAccount}
            isAuthLoading={isAuthLoading}
            isSyncingCloud={isSyncingCloud}
            authError={authError}
            onSignInGoogle={() => void handleSignInGoogle()}
            onSignOut={() => void handleSignOut()}
            onChangeTab={handleA1ChangeTab}
            onSelectModule={handleA1SelectModule}
            onToggleCompleteModule={handleA1ToggleCompleteModule}
            onToggleMasterVocab={handleA1ToggleMasterVocab}
            onRecordExamAttempt={handleRecordExamAttempt}
            onLookupWordInDictionary={(word) => {
              setQuery(word);
              void handleDictionaryLookup(word);
            }}
          />
        )}

        {activeView === 'sound-guide' && (
          <SoundGuideView curatedWords={CURATED_WORDS} onOpenWord={handleOpenWordById} />
        )}

        {activeView === 'minimal-pairs' && (
          <MinimalPairsView
            onOpenWord={handleOpenWordById}
            onLookupWord={(word) => {
              setQuery(word);
              void handleDictionaryLookup(word);
            }}
          />
        )}

        {activeView === 'saved' && (
          <SavedWordsView
            savedEntries={savedEntries}
            recentEntries={recentEntries}
            onOpenEntry={(entry) => selectEntry(entry, true)}
            onRemoveSaved={handleToggleSave}
            onGoToDictionary={() => setActiveView('dictionary')}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            LautBhasha · {totalDictionaryEntries.toLocaleString()} German–English Dictionary Entries
            (FreeDict) · Goethe-Zertifikat A1 Prep
          </span>
          <span>Devanagari phonetic guides · IPA · Cross-device A1 Cloud Sync</span>
        </div>
      </footer>
    </div>
  );
}
