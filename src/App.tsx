import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { A1CertificateView } from './components/A1CertificateView';
import { Header, type AppView } from './components/Header';
import { MinimalPairsView } from './components/MinimalPairsView';
import { NearbyGermanView } from './components/NearbyGermanView';
import {
  PronunciationEntryView,
  type PlaybackSpeed,
} from './components/PronunciationEntryView';
import { SavedWordsView } from './components/SavedWordsView';
import { SearchToolbar } from './components/SearchToolbar';
import { SentenceTranslatorView } from './components/SentenceTranslatorView';
import { SoundGuideView } from './components/SoundGuideView';
import { WordListRail } from './components/WordListRail';
import { CURATED_WORDS } from './data/curatedWords';
import { auth, googleProvider } from './firebase';
import type { A1ExamAttempt, A1UserProgress, A1WorkspaceTab } from './types/a1';
import type {
  DictionaryEntry,
  DictionarySuggestion,
  SearchedWordRecord,
  WordCategory,
} from './types/dictionary';
import type { SentenceTranslationResult } from './types/sentence';
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
  deleteSearchedWordFromCloud,
  recordExamAttemptToCloud,
  saveUserProgressToCloud,
  subscribeToExamAttempts,
  subscribeToSearchedWords,
  subscribeToUserProgress,
  syncInitialUserProgress,
  syncLocalSearchedWordsToCloud,
  upsertSearchedWordToCloud,
} from './utils/firebaseProgressSync';
import {
  isPlaceholderEnglishMeaning,
  mergeSearchedWords,
  needsMeaningEnrichment,
  toSafeWordDocId,
  upsertSearchedWordLocal,
} from './utils/searchedWords';

const SAVED_IDS_KEY = 'lautbhasha_saved_ids_v1';
const CUSTOM_ENTRIES_KEY = 'lautbhasha_custom_entries_v1';
const SEARCHED_WORDS_KEY = 'lautbhasha_searched_words_v1';
const SENTENCE_HISTORY_KEY = 'lautbhasha_sentence_history_v1';
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
  const [searchedWords, setSearchedWords] = useState<SearchedWordRecord[]>(() =>
    loadJsonFromStorage<SearchedWordRecord[]>(SEARCHED_WORDS_KEY, []),
  );
  const [sentenceHistory, setSentenceHistory] = useState<SentenceTranslationResult[]>(() =>
    loadJsonFromStorage<SentenceTranslationResult[]>(SENTENCE_HISTORY_KEY, []),
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
  const [translatingEntryId, setTranslatingEntryId] = useState<string | null>(null);

  // Firebase Auth & Firestore Cloud Sync state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const entryStageRef = useRef<HTMLDivElement | null>(null);
  const latestProgressRef = useRef(a1Progress);
  const latestSavedIdsRef = useRef(savedIds);
  const latestSearchedWordsRef = useRef(searchedWords);
  const cloudReadyRef = useRef(false);
  const inFlightTranslationRef = useRef<Set<string>>(new Set());

  latestProgressRef.current = a1Progress;
  latestSavedIdsRef.current = savedIds;
  latestSearchedWordsRef.current = searchedWords;

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
      window.localStorage.setItem(SEARCHED_WORDS_KEY, JSON.stringify(searchedWords));
    } catch {
      // Ignore storage quota errors
    }
  }, [searchedWords]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SENTENCE_HISTORY_KEY, JSON.stringify(sentenceHistory));
    } catch {
      // Ignore storage quota errors
    }
  }, [sentenceHistory]);

  useEffect(() => {
    try {
      window.localStorage.setItem(A1_ATTEMPTS_KEY, JSON.stringify(examAttempts.slice(0, 20)));
    } catch {
      // Ignore storage quota errors
    }
  }, [examAttempts]);

  // Listen to Firebase Auth state & synchronize Firestore progress + searched words for verified users
  useEffect(() => {
    let unsubProgress: (() => void) | null = null;
    let unsubAttempts: (() => void) | null = null;
    let unsubSearched: (() => void) | null = null;
    let hasSyncedLocalSearched = false;
    let cancelled = false;

    const cleanupListeners = () => {
      unsubProgress?.();
      unsubProgress = null;
      unsubAttempts?.();
      unsubAttempts = null;
      unsubSearched?.();
      unsubSearched = null;
      hasSyncedLocalSearched = false;
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

        unsubSearched = subscribeToSearchedWords(
          user.uid,
          (cloudWords) => {
            if (cancelled) return;
            const localSnapshot = latestSearchedWordsRef.current;
            const combined = mergeSearchedWords(localSnapshot, cloudWords);
            setSearchedWords(combined);

            if (!hasSyncedLocalSearched) {
              hasSyncedLocalSearched = true;
              void syncLocalSearchedWordsToCloud(
                user.uid,
                localSnapshot,
                cloudWords,
                merged.progress,
                merged.savedWordIds,
              ).catch(() => {
                // Non-blocking: local searched words remain persisted in browser storage
              });
            }
          },
          () => {
            // Non-blocking: local searched words remain visible if Firestore list errors
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
   * Permanently stores any searched German word in localStorage + Firestore (when signed in)
   * so words searched on laptop are immediately available for revision on phone.
   */
  const recordSearchedWord = useCallback(
    (entry: DictionaryEntry, incrementCount = true) => {
      const { list, record } = upsertSearchedWordLocal(latestSearchedWordsRef.current, entry, {
        incrementCount,
      });
      latestSearchedWordsRef.current = list;
      setSearchedWords(list);

      if (firebaseUser && firebaseUser.emailVerified && cloudReadyRef.current) {
        setIsSyncingCloud(true);
        void upsertSearchedWordToCloud(
          firebaseUser.uid,
          record,
          latestProgressRef.current,
          latestSavedIdsRef.current,
        )
          .catch(() => {
            // Word remains safely stored in local browser storage
          })
          .finally(() => {
            setIsSyncingCloud(false);
          });
      }
    },
    [firebaseUser],
  );

  /**
   * Automatically fetches concise English & Devanagari Hindi meanings for any looked-up word
   * that lacks a Hindi gloss (or has placeholder English meaning), then updates the active card
   * and synced searched-word record seamlessly.
   */
  const enrichEntryMeanings = useCallback(
    async (entry: DictionaryEntry, alsoPersistHistory = true) => {
      if (!needsMeaningEnrichment(entry)) return;
      const docId = toSafeWordDocId(entry.word);
      if (inFlightTranslationRef.current.has(docId)) return;

      // Reuse already-stored English/Hindi meaning from permanent searched history if available
      const savedHistoryMatch = latestSearchedWordsRef.current.find((w) => w.id === docId);
      if (
        savedHistoryMatch &&
        savedHistoryMatch.hindiMeaning &&
        !isPlaceholderEnglishMeaning(savedHistoryMatch.englishMeaning)
      ) {
        const hydrated: DictionaryEntry = {
          ...entry,
          englishMeaning: savedHistoryMatch.englishMeaning,
          hindiMeaning: savedHistoryMatch.hindiMeaning,
        };
        setCustomEntries((prev) =>
          [hydrated, ...prev.filter((item) => item.id !== hydrated.id)].slice(0, 40),
        );
        setRecentEntries((prev) => prev.map((item) => (item.id === hydrated.id ? hydrated : item)));
        return;
      }

      inFlightTranslationRef.current.add(docId);
      setTranslatingEntryId(entry.id);

      try {
        const res = await fetch('/api/translate-meaning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: entry.word,
            article: entry.article ?? '',
            partOfSpeech: entry.partOfSpeech,
            englishHint: entry.englishMeaning,
            exampleGerman: entry.example?.german ?? '',
          }),
        });

        if (!res.ok) return;
        const data = (await res.json()) as {
          englishMeaning?: string;
          hindiMeaning?: string;
          exampleHindi?: string;
        };

        const nextEnglish =
          data.englishMeaning && !isPlaceholderEnglishMeaning(data.englishMeaning)
            ? data.englishMeaning
            : entry.englishMeaning;
        const nextHindi = data.hindiMeaning?.trim() || entry.hindiMeaning;
        if (!nextHindi && nextEnglish === entry.englishMeaning) return;

        const nextExample =
          entry.example && data.exampleHindi && !entry.example.hindi
            ? { ...entry.example, hindi: data.exampleHindi }
            : entry.example;

        const nextExamples =
          entry.examples && entry.examples.length > 0 && data.exampleHindi && !entry.examples[0].hindi
            ? [{ ...entry.examples[0], hindi: data.exampleHindi }, ...entry.examples.slice(1)]
            : entry.examples;

        const enriched: DictionaryEntry = {
          ...entry,
          englishMeaning: nextEnglish,
          hindiMeaning: nextHindi,
          example: nextExample,
          examples: nextExamples,
        };

        setCustomEntries((prev) => {
          const exists = prev.some((item) => item.id === enriched.id);
          if (exists) {
            return prev.map((item) => (item.id === enriched.id ? enriched : item));
          }
          return [enriched, ...prev].slice(0, 40);
        });
        setRecentEntries((prev) => prev.map((item) => (item.id === enriched.id ? enriched : item)));

        if (alsoPersistHistory) {
          recordSearchedWord(enriched, false);
        }
      } catch {
        // Non-blocking: dictionary breakdown remains visible even if translation endpoint is busy
      } finally {
        inFlightTranslationRef.current.delete(docId);
        setTranslatingEntryId((curr) => (curr === entry.id ? null : curr));
      }
    },
    [recordSearchedWord],
  );

  /**
   * Instant local lookup against all 382,641 German dictionary entries stored in the repo.
   */
  const handleDictionaryLookup = async (
    wordToLookup: string,
    options?: { incrementSearchCount?: boolean; preservedMeanings?: { english?: string; hindi?: string } },
  ) => {
    const cleaned = wordToLookup.trim();
    const shouldIncrement = options?.incrementSearchCount ?? true;
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
      if (shouldIncrement) {
        recordSearchedWord(existing, true);
      }
      void enrichEntryMeanings(existing, true);
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

      const preserved = options?.preservedMeanings;
      const lookedUp: DictionaryEntry = {
        ...payload.entry,
        englishMeaning:
          preserved?.english && isPlaceholderEnglishMeaning(payload.entry.englishMeaning)
            ? preserved.english
            : payload.entry.englishMeaning || preserved?.english || '',
        hindiMeaning: payload.entry.hindiMeaning || preserved?.hindi || '',
      };

      const isCuratedMatch = CURATED_WORDS.some((c) => c.id === lookedUp.id);
      if (!isCuratedMatch || lookedUp.matchedQuery || lookedUp.hindiMeaning) {
        setCustomEntries((prev) =>
          [lookedUp, ...prev.filter((item) => item.id !== lookedUp.id)].slice(0, 40),
        );
      }
      setCategory('all');
      selectEntry(lookedUp, true);
      if (shouldIncrement) {
        recordSearchedWord(lookedUp, true);
      }
      void enrichEntryMeanings(lookedUp, true);
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
        [normalized, ...prev.filter((item) => item.id !== normalized.id)].slice(0, 40),
      );
      selectEntry(normalized, false);
      recordSearchedWord(normalized, false);
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
        recordSearchedWord(found, true);
        void enrichEntryMeanings(found, true);
        return;
      }
    }
    void handleDictionaryLookup(suggestion.word);
  };

  const handleOpenSearchedWord = (record: SearchedWordRecord) => {
    setQuery(record.word);
    void handleDictionaryLookup(record.word, {
      incrementSearchCount: false,
      preservedMeanings: {
        english: record.englishMeaning,
        hindi: record.hindiMeaning,
      },
    });
  };

  const handleRemoveSearchedWord = (record: SearchedWordRecord) => {
    setSearchedWords((prev) => prev.filter((item) => item.id !== record.id));
    if (firebaseUser && firebaseUser.emailVerified && cloudReadyRef.current) {
      void deleteSearchedWordFromCloud(firebaseUser.uid, record.id).catch(() => {
        // Non-blocking: removed locally
      });
    }
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

  const revisionCount = searchedWords.length > 0 ? searchedWords.length : savedIds.length;
  const activeEntryIsInHistory = useMemo(
    () => searchedWords.some((item) => item.id === toSafeWordDocId(activeEntry.word)),
    [searchedWords, activeEntry.word],
  );

  const mobileTabs: { id: AppView; label: string }[] = [
    { id: 'dictionary', label: 'Dictionary' },
    { id: 'nearby', label: 'Nearby' },
    { id: 'sentences', label: 'Sentences' },
    { id: 'a1-certificate', label: 'A1 Certificate' },
    { id: 'sound-guide', label: 'Sound Guide' },
    { id: 'minimal-pairs', label: 'Pairs' },
    { id: 'saved', label: revisionCount > 0 ? `Revision (${revisionCount})` : 'Revision' },
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
        savedCount={revisionCount}
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
                  isAutoSavedHistory={activeEntryIsInHistory}
                  isLoadingMeaning={translatingEntryId === activeEntry.id}
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

        {activeView === 'nearby' && (
          <NearbyGermanView
            onLookupWordInDictionary={(word) => {
              setQuery(word);
              void handleDictionaryLookup(word);
            }}
          />
        )}

        {activeView === 'sentences' && (
          <SentenceTranslatorView
            history={sentenceHistory}
            onHistoryChange={setSentenceHistory}
            onLookupWordInDictionary={(word) => {
              setQuery(word);
              void handleDictionaryLookup(word);
            }}
          />
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
            searchedWords={searchedWords}
            savedEntries={savedEntries}
            cloudUser={cloudAccount}
            isAuthLoading={isAuthLoading}
            isSyncingCloud={isSyncingCloud}
            authError={authError}
            onSignInGoogle={() => void handleSignInGoogle()}
            onSignOut={() => void handleSignOut()}
            onOpenSearchedWord={handleOpenSearchedWord}
            onRemoveSearchedWord={handleRemoveSearchedWord}
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
