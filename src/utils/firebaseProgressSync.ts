import {
  Timestamp,
  collection,
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
