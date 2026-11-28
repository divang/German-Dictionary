import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { A1ExamAttempt, A1UserProgress } from '../types/a1';
import type { SearchedWordRecord } from '../types/dictionary';
import type { YoutubeLessonProgressRecord } from '../types/youtubeCourse';
import { toSafeWordDocId } from './searchedWords';
import { sanitizeLessonProgressRecord } from './youtubeCourse';
import {
  MAX_COMPLETED_LESSONS,
  MAX_MASTERED_VOCAB,
  MAX_SAVED_WORDS,
  clampNumber,
  mergeA1Progress,
  sanitizeA1Tab,
  sanitizeIdList,
  sanitizeModuleId,
} from './a1Progress';

export interface CloudSyncedSnapshot {
  progress: A1UserProgress;
  savedWordIds: string[];
}

function parseTimestampMs(raw: unknown): number {
  if (raw instanceof Timestamp) {
    return raw.toMillis();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  return Date.now();
}

/**
 * Ensures the learner's /users/{uid} document exists and merges local progress into Firestore
 * right after Google Sign-In so progress carries across all devices.
 */
export async function syncInitialUserProgress(
  uid: string,
  localProgress: A1UserProgress,
  localSavedWordIds: string[],
): Promise<CloudSyncedSnapshot> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const sanitizedProgress: A1UserProgress = {
        completedLessonIds: sanitizeIdList(localProgress.completedLessonIds, MAX_COMPLETED_LESSONS),
        masteredVocabIds: sanitizeIdList(localProgress.masteredVocabIds, MAX_MASTERED_VOCAB),
        lastActiveModuleId: sanitizeModuleId(localProgress.lastActiveModuleId),
        lastActiveTab: sanitizeA1Tab(localProgress.lastActiveTab),
        bestMockScore: clampNumber(localProgress.bestMockScore, 0, 100),
        totalMockAttempts: clampNumber(localProgress.totalMockAttempts, 0, 1000),
      };
      const savedWordIds = sanitizeIdList(localSavedWordIds, MAX_SAVED_WORDS);

      await setDoc(userRef, {
        ownerId: uid,
        completedLessonIds: sanitizedProgress.completedLessonIds,
        masteredVocabIds: sanitizedProgress.masteredVocabIds,
        savedWordIds,
        lastActiveModuleId: sanitizedProgress.lastActiveModuleId,
        lastActiveTab: sanitizedProgress.lastActiveTab,
        bestMockScore: sanitizedProgress.bestMockScore,
        totalMockAttempts: sanitizedProgress.totalMockAttempts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { progress: sanitizedProgress, savedWordIds };
    }

    const data = snap.data();
    const cloudProgress: Partial<A1UserProgress> = {
      completedLessonIds: Array.isArray(data.completedLessonIds) ? data.completedLessonIds : [],
      masteredVocabIds: Array.isArray(data.masteredVocabIds) ? data.masteredVocabIds : [],
      lastActiveModuleId: typeof data.lastActiveModuleId === 'string' ? data.lastActiveModuleId : undefined,
      lastActiveTab: typeof data.lastActiveTab === 'string' ? (data.lastActiveTab as A1UserProgress['lastActiveTab']) : undefined,
      bestMockScore: typeof data.bestMockScore === 'number' ? data.bestMockScore : 0,
      totalMockAttempts: typeof data.totalMockAttempts === 'number' ? data.totalMockAttempts : 0,
    };
    const cloudSavedIds = Array.isArray(data.savedWordIds) ? (data.savedWordIds as string[]) : [];

    const mergedProgress = mergeA1Progress(localProgress, cloudProgress);
    const mergedSaved = sanitizeIdList([...cloudSavedIds, ...localSavedWordIds], MAX_SAVED_WORDS);

    await updateDoc(userRef, {
      completedLessonIds: mergedProgress.completedLessonIds,
      masteredVocabIds: mergedProgress.masteredVocabIds,
      savedWordIds: mergedSaved,
      lastActiveModuleId: mergedProgress.lastActiveModuleId,
      lastActiveTab: mergedProgress.lastActiveTab,
      bestMockScore: mergedProgress.bestMockScore,
      totalMockAttempts: mergedProgress.totalMockAttempts,
      updatedAt: serverTimestamp(),
    });

    return { progress: mergedProgress, savedWordIds: mergedSaved };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Persists incremental study progress & bookmarks to /users/{uid}.
 */
export async function saveUserProgressToCloud(
  uid: string,
  progress: A1UserProgress,
  savedWordIds: string[],
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  const payload = {
    completedLessonIds: sanitizeIdList(progress.completedLessonIds, MAX_COMPLETED_LESSONS),
    masteredVocabIds: sanitizeIdList(progress.masteredVocabIds, MAX_MASTERED_VOCAB),
    savedWordIds: sanitizeIdList(savedWordIds, MAX_SAVED_WORDS),
    lastActiveModuleId: sanitizeModuleId(progress.lastActiveModuleId),
    lastActiveTab: sanitizeA1Tab(progress.lastActiveTab),
    bestMockScore: clampNumber(progress.bestMockScore, 0, 100),
    totalMockAttempts: clampNumber(progress.totalMockAttempts, 0, 1000),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

/**
 * Atomically records an immutable A1 ExamAttempt under /users/{uid}/examAttempts/{attemptId}
 * and updates the parent /users/{uid} summary stats in a single Firestore batch.
 */
export async function recordExamAttemptToCloud(
  uid: string,
  attempt: Omit<A1ExamAttempt, 'ownerId' | 'createdAtMs'>,
  nextProgress: A1UserProgress,
  savedWordIds: string[],
): Promise<void> {
  const attemptId = /^[a-zA-Z0-9_-]{1,128}$/.test(attempt.id)
    ? attempt.id
    : `attempt_${Date.now()}`;
  const attemptPath = `users/${uid}/examAttempts/${attemptId}`;
  const userRef = doc(db, 'users', uid);
  const attemptRef = doc(db, 'users', uid, 'examAttempts', attemptId);

  try {
    const userSnap = await getDoc(userRef);
    const batch = writeBatch(db);

    const sanitizedCompleted = sanitizeIdList(nextProgress.completedLessonIds, MAX_COMPLETED_LESSONS);
    const sanitizedVocab = sanitizeIdList(nextProgress.masteredVocabIds, MAX_MASTERED_VOCAB);
    const sanitizedSaved = sanitizeIdList(savedWordIds, MAX_SAVED_WORDS);

    if (!userSnap.exists()) {
      batch.set(userRef, {
        ownerId: uid,
        completedLessonIds: sanitizedCompleted,
        masteredVocabIds: sanitizedVocab,
        savedWordIds: sanitizedSaved,
        lastActiveModuleId: sanitizeModuleId(nextProgress.lastActiveModuleId),
        lastActiveTab: sanitizeA1Tab(nextProgress.lastActiveTab),
        bestMockScore: clampNumber(nextProgress.bestMockScore, 0, 100),
        totalMockAttempts: clampNumber(nextProgress.totalMockAttempts, 0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(userRef, {
        completedLessonIds: sanitizedCompleted,
        masteredVocabIds: sanitizedVocab,
        savedWordIds: sanitizedSaved,
        lastActiveModuleId: sanitizeModuleId(nextProgress.lastActiveModuleId),
        lastActiveTab: sanitizeA1Tab(nextProgress.lastActiveTab),
        bestMockScore: clampNumber(nextProgress.bestMockScore, 0, 100),
        totalMockAttempts: clampNumber(nextProgress.totalMockAttempts, 0, 1000),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(attemptRef, {
      ownerId: uid,
      examType: attempt.examType,
      status: 'completed',
      score: clampNumber(attempt.score, 0, 100),
      maxScore: clampNumber(attempt.maxScore, 1, 100),
      passed: Boolean(attempt.passed),
      sectionScores: {
        hoeren: clampNumber(attempt.sectionScores.hoeren, 0, 25),
        lesen: clampNumber(attempt.sectionScores.lesen, 0, 25),
        schreiben: clampNumber(attempt.sectionScores.schreiben, 0, 25),
        sprechen: clampNumber(attempt.sectionScores.sprechen, 0, 25),
      },
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, attemptPath);
  }
}

/**
 * Subscribes to live A1 user progress updates across devices for an authenticated verified user.
 */
export function subscribeToUserProgress(
  uid: string,
  onUpdate: (snapshot: CloudSyncedSnapshot) => void,
  onError: (err: Error) => void,
): () => void {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      onUpdate({
        progress: {
          completedLessonIds: sanitizeIdList(
            Array.isArray(data.completedLessonIds) ? data.completedLessonIds : [],
            MAX_COMPLETED_LESSONS,
          ),
          masteredVocabIds: sanitizeIdList(
            Array.isArray(data.masteredVocabIds) ? data.masteredVocabIds : [],
            MAX_MASTERED_VOCAB,
          ),
          lastActiveModuleId: sanitizeModuleId(
            typeof data.lastActiveModuleId === 'string' ? data.lastActiveModuleId : undefined,
          ),
          lastActiveTab: sanitizeA1Tab(
            typeof data.lastActiveTab === 'string' ? data.lastActiveTab : undefined,
          ),
          bestMockScore: clampNumber(
            typeof data.bestMockScore === 'number' ? data.bestMockScore : 0,
            0,
            100,
          ),
          totalMockAttempts: clampNumber(
            typeof data.totalMockAttempts === 'number' ? data.totalMockAttempts : 0,
            0,
            1000,
          ),
        },
        savedWordIds: sanitizeIdList(
          Array.isArray(data.savedWordIds) ? data.savedWordIds : [],
          MAX_SAVED_WORDS,
        ),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Subscribes to the user's exam attempt history using an explicit ownerId filter
 * matching the Firestore secure-list rule.
 */
export function subscribeToExamAttempts(
  uid: string,
  onUpdate: (attempts: A1ExamAttempt[]) => void,
  onError: (err: Error) => void,
): () => void {
  const attemptsPath = `users/${uid}/examAttempts`;
  const attemptsQuery = query(
    collection(db, 'users', uid, 'examAttempts'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20),
  );

  return onSnapshot(
    attemptsQuery,
    (querySnap) => {
      const attempts: A1ExamAttempt[] = querySnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: typeof data.ownerId === 'string' ? data.ownerId : uid,
          examType: (data.examType as A1ExamAttempt['examType']) || 'mock-full',
          status: 'completed',
          score: clampNumber(typeof data.score === 'number' ? data.score : 0, 0, 100),
          maxScore: clampNumber(typeof data.maxScore === 'number' ? data.maxScore : 100, 1, 100),
          passed: Boolean(data.passed),
          sectionScores: {
            hoeren: clampNumber(Number(data.sectionScores?.hoeren ?? 0), 0, 25),
            lesen: clampNumber(Number(data.sectionScores?.lesen ?? 0), 0, 25),
            schreiben: clampNumber(Number(data.sectionScores?.schreiben ?? 0), 0, 25),
            sprechen: clampNumber(Number(data.sectionScores?.sprechen ?? 0), 0, 25),
          },
          createdAtMs: parseTimestampMs(data.createdAt),
        };
      });
      onUpdate(attempts);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, attemptsPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

const VALID_ARTICLES = new Set(['', 'der', 'die', 'das']);

function sanitizeSearchedWordFields(record: SearchedWordRecord) {
  return {
    word: record.word.trim().slice(0, 100) || 'Wort',
    article: VALID_ARTICLES.has(record.article) ? record.article : '',
    partOfSpeech: record.partOfSpeech.trim().slice(0, 60) || 'German word',
    cefr: record.cefr.trim().slice(0, 10) || 'A1',
    englishMeaning: record.englishMeaning.trim().slice(0, 240),
    hindiMeaning: record.hindiMeaning.trim().slice(0, 240),
    devanagariFull: record.devanagariFull.trim().slice(0, 180),
    ipa: record.ipa.trim().slice(0, 120),
    searchCount: clampNumber(record.searchCount, 1, 10000),
  };
}

/**
 * Permanently upserts a searched German word under /users/{uid}/searchedWords/{wordId}
 * so words searched on laptop are immediately available for revision on phone.
 */
export async function upsertSearchedWordToCloud(
  uid: string,
  record: SearchedWordRecord,
  fallbackProgress: A1UserProgress,
  fallbackSavedWordIds: string[],
): Promise<void> {
  const wordId = /^[a-zA-Z0-9_-]{1,100}$/.test(record.id)
    ? record.id
    : toSafeWordDocId(record.word);
  const wordPath = `users/${uid}/searchedWords/${wordId}`;
  const userRef = doc(db, 'users', uid);
  const wordRef = doc(db, 'users', uid, 'searchedWords', wordId);
  const fields = sanitizeSearchedWordFields(record);

  try {
    const [userSnap, wordSnap] = await Promise.all([getDoc(userRef), getDoc(wordRef)]);

    if (!userSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(userRef, {
        ownerId: uid,
        completedLessonIds: sanitizeIdList(fallbackProgress.completedLessonIds, MAX_COMPLETED_LESSONS),
        masteredVocabIds: sanitizeIdList(fallbackProgress.masteredVocabIds, MAX_MASTERED_VOCAB),
        savedWordIds: sanitizeIdList(fallbackSavedWordIds, MAX_SAVED_WORDS),
        lastActiveModuleId: sanitizeModuleId(fallbackProgress.lastActiveModuleId),
        lastActiveTab: sanitizeA1Tab(fallbackProgress.lastActiveTab),
        bestMockScore: clampNumber(fallbackProgress.bestMockScore, 0, 100),
        totalMockAttempts: clampNumber(fallbackProgress.totalMockAttempts, 0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(wordRef, {
        ownerId: uid,
        ...fields,
        createdAt: serverTimestamp(),
        lastSearchedAt: serverTimestamp(),
      });
      await batch.commit();
      return;
    }

    if (wordSnap.exists()) {
      const existingData = wordSnap.data();
      const existingEnglish = typeof existingData.englishMeaning === 'string' ? existingData.englishMeaning : '';
      const existingHindi = typeof existingData.hindiMeaning === 'string' ? existingData.hindiMeaning : '';
      const existingCount = typeof existingData.searchCount === 'number' ? existingData.searchCount : 1;

      await updateDoc(wordRef, {
        ...fields,
        englishMeaning: fields.englishMeaning || existingEnglish,
        hindiMeaning: fields.hindiMeaning || existingHindi,
        searchCount: clampNumber(Math.max(fields.searchCount, existingCount), 1, 10000),
        lastSearchedAt: serverTimestamp(),
      });
    } else {
      await setDoc(wordRef, {
        ownerId: uid,
        ...fields,
        createdAt: serverTimestamp(),
        lastSearchedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, wordPath);
  }
}

/**
 * Syncs locally searched words (e.g. from before Google Sign-In) into Firestore
 * so laptop and phone revision lists merge automatically.
 */
export async function syncLocalSearchedWordsToCloud(
  uid: string,
  localRecords: SearchedWordRecord[],
  cloudRecords: SearchedWordRecord[],
  fallbackProgress: A1UserProgress,
  fallbackSavedWordIds: string[],
): Promise<void> {
  if (localRecords.length === 0) return;

  const cloudById = new Map(cloudRecords.map((item) => [item.id, item]));
  const toUpload = localRecords
    .filter((local) => {
      const existing = cloudById.get(local.id);
      if (!existing) return true;
      const addsHindi = Boolean(local.hindiMeaning && !existing.hindiMeaning);
      const higherCount = local.searchCount > existing.searchCount;
      return addsHindi || higherCount;
    })
    .slice(0, 50);

  for (const record of toUpload) {
    await upsertSearchedWordToCloud(uid, record, fallbackProgress, fallbackSavedWordIds);
  }
}

/**
 * Subscribes to the user's permanent searched-word history across devices.
 * Explicitly filters by ownerId == uid to match the Firestore secure-list rule.
 */
export function subscribeToSearchedWords(
  uid: string,
  onUpdate: (records: SearchedWordRecord[]) => void,
  onError: (err: Error) => void,
): () => void {
  const wordsPath = `users/${uid}/searchedWords`;
  const wordsQuery = query(
    collection(db, 'users', uid, 'searchedWords'),
    where('ownerId', '==', uid),
    orderBy('lastSearchedAt', 'desc'),
    limit(200),
  );

  return onSnapshot(
    wordsQuery,
    (querySnap) => {
      const records: SearchedWordRecord[] = querySnap.docs.map((d) => {
        const data = d.data();
        const rawArticle = typeof data.article === 'string' && VALID_ARTICLES.has(data.article)
          ? (data.article as SearchedWordRecord['article'])
          : '';
        return {
          id: d.id,
          word: typeof data.word === 'string' ? data.word : d.id,
          article: rawArticle,
          partOfSpeech: typeof data.partOfSpeech === 'string' ? data.partOfSpeech : 'German word',
          cefr: typeof data.cefr === 'string' ? data.cefr : 'A1',
          englishMeaning: typeof data.englishMeaning === 'string' ? data.englishMeaning : '',
          hindiMeaning: typeof data.hindiMeaning === 'string' ? data.hindiMeaning : '',
          devanagariFull: typeof data.devanagariFull === 'string' ? data.devanagariFull : '',
          ipa: typeof data.ipa === 'string' ? data.ipa : '',
          searchCount: clampNumber(typeof data.searchCount === 'number' ? data.searchCount : 1, 1, 10000),
          createdAtMs: parseTimestampMs(data.createdAt),
          lastSearchedAtMs: parseTimestampMs(data.lastSearchedAt),
        };
      });
      onUpdate(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, wordsPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Removes a word from the user's synced searched-word history.
 */
export async function deleteSearchedWordFromCloud(uid: string, wordId: string): Promise<void> {
  const safeId = /^[a-zA-Z0-9_-]{1,100}$/.test(wordId) ? wordId : toSafeWordDocId(wordId);
  const wordPath = `users/${uid}/searchedWords/${safeId}`;
  const wordRef = doc(db, 'users', uid, 'searchedWords', safeId);

  try {
    await deleteDoc(wordRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, wordPath);
  }
}

/**
 * Persists a single Learn German YouTube A1 lesson's personal notes, completion status,
 * practice count, and best exercise score under /users/{uid}/youtubeLessonNotes/{lessonId}.
 */
export async function upsertYoutubeLessonProgressToCloud(
  uid: string,
  record: YoutubeLessonProgressRecord,
  fallbackProgress: A1UserProgress,
  fallbackSavedWordIds: string[],
): Promise<void> {
  const safe = sanitizeLessonProgressRecord(record.lessonId, record.lessonNumber, record);
  const notePath = `users/${uid}/youtubeLessonNotes/${safe.lessonId}`;
  const userRef = doc(db, 'users', uid);
  const noteRef = doc(db, 'users', uid, 'youtubeLessonNotes', safe.lessonId);

  try {
    const [userSnap, noteSnap] = await Promise.all([getDoc(userRef), getDoc(noteRef)]);

    if (!userSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(userRef, {
        ownerId: uid,
        completedLessonIds: sanitizeIdList(fallbackProgress.completedLessonIds, MAX_COMPLETED_LESSONS),
        masteredVocabIds: sanitizeIdList(fallbackProgress.masteredVocabIds, MAX_MASTERED_VOCAB),
        savedWordIds: sanitizeIdList(fallbackSavedWordIds, MAX_SAVED_WORDS),
        lastActiveModuleId: sanitizeModuleId(fallbackProgress.lastActiveModuleId),
        lastActiveTab: sanitizeA1Tab(fallbackProgress.lastActiveTab),
        bestMockScore: clampNumber(fallbackProgress.bestMockScore, 0, 100),
        totalMockAttempts: clampNumber(fallbackProgress.totalMockAttempts, 0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(noteRef, {
        ownerId: uid,
        lessonNumber: safe.lessonNumber,
        completed: safe.completed,
        personalNotes: safe.personalNotes,
        bestExerciseScore: safe.bestExerciseScore,
        practiceCount: safe.practiceCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return;
    }

    if (noteSnap.exists()) {
      await updateDoc(noteRef, {
        lessonNumber: safe.lessonNumber,
        completed: safe.completed,
        personalNotes: safe.personalNotes,
        bestExerciseScore: safe.bestExerciseScore,
        practiceCount: safe.practiceCount,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(noteRef, {
        ownerId: uid,
        lessonNumber: safe.lessonNumber,
        completed: safe.completed,
        personalNotes: safe.personalNotes,
        bestExerciseScore: safe.bestExerciseScore,
        practiceCount: safe.practiceCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, notePath);
  }
}

/**
 * Subscribes to live cross-device Learn German YouTube A1 notebook updates for the owner.
 */
export function subscribeToYoutubeLessonProgress(
  uid: string,
  onUpdate: (progressMap: Record<string, YoutubeLessonProgressRecord>) => void,
  onError: (err: Error) => void,
): () => void {
  const notesPath = `users/${uid}/youtubeLessonNotes`;
  const notesQuery = query(
    collection(db, 'users', uid, 'youtubeLessonNotes'),
    where('ownerId', '==', uid),
    limit(100),
  );

  return onSnapshot(
    notesQuery,
    (querySnap) => {
      const map: Record<string, YoutubeLessonProgressRecord> = {};
      for (const d of querySnap.docs) {
        const data = d.data();
        const lessonNumber =
          typeof data.lessonNumber === 'number' && Number.isFinite(data.lessonNumber)
            ? data.lessonNumber
            : 1;
        map[d.id] = sanitizeLessonProgressRecord(d.id, lessonNumber, {
          completed: Boolean(data.completed),
          personalNotes: typeof data.personalNotes === 'string' ? data.personalNotes : '',
          bestExerciseScore: typeof data.bestExerciseScore === 'number' ? data.bestExerciseScore : 0,
          practiceCount: typeof data.practiceCount === 'number' ? data.practiceCount : 0,
          updatedAtMs: parseTimestampMs(data.updatedAt),
        });
      }
      onUpdate(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, notesPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

/**
 * Uploads any locally saved YouTube A1 lesson notes/progress that are newer or missing in Firestore.
 */
export async function syncLocalYoutubeProgressToCloud(
  uid: string,
  localMap: Record<string, YoutubeLessonProgressRecord>,
  cloudMap: Record<string, YoutubeLessonProgressRecord>,
  fallbackProgress: A1UserProgress,
  fallbackSavedWordIds: string[],
): Promise<void> {
  const entries = Object.values(localMap).filter((local) => {
    const hasMeaningfulData =
      local.completed ||
      local.personalNotes.trim().length > 0 ||
      local.bestExerciseScore > 0 ||
      local.practiceCount > 0;
    if (!hasMeaningfulData) return false;

    const cloud = cloudMap[local.lessonId];
    if (!cloud) return true;
    return (
      (local.completed && !cloud.completed) ||
      local.bestExerciseScore > cloud.bestExerciseScore ||
      local.practiceCount > cloud.practiceCount ||
      (local.personalNotes.trim().length > 0 &&
        local.personalNotes !== cloud.personalNotes &&
        local.updatedAtMs > cloud.updatedAtMs)
    );
  });

  for (const record of entries.slice(0, 70)) {
    await upsertYoutubeLessonProgressToCloud(uid, record, fallbackProgress, fallbackSavedWordIds);
  }
}


