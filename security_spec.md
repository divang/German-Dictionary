# LautBhasha — Firestore Security Specification

## 1. Data Invariants & Relationship Mapping
- **Master Source of Truth**: `/users/{userId}` holds a learner's private, PII-free German A1 progress and synced bookmarks. Every document under `/users/{userId}`, `/users/{userId}/examAttempts/{attemptId}`, `/users/{userId}/searchedWords/{wordId}`, and `/users/{userId}/youtubeLessonNotes/{lessonId}` strictly belongs to `request.auth.uid == userId`.
- **Verified Identity**: All read/write operations require a signed-in user with `request.auth.token.email_verified == true`.
- **PII Isolation**: No email addresses, phone numbers, or street addresses are stored in Firestore documents; only opaque UIDs, lesson IDs, vocabulary IDs, numeric exam scores, German/English/Hindi dictionary word entries, and personal study notes are persisted, and all reads are strictly owner-only (`isOwner(userId)`).
- **Master Gate**: All three subcollections (`/users/{userId}/examAttempts/{attemptId}`, `/users/{userId}/searchedWords/{wordId}`, and `/users/{userId}/youtubeLessonNotes/{lessonId}`) verify that parent `/users/{userId}` exists (`exists(...)`) on `get`, `update`, and `delete`, and `exists(...) || existsAfter(...)` on `create` to support atomic first-write batches.
- **Terminal State Locking**: `ExamAttempt.status` is strictly `'completed'`. Once created, exam attempts are immutable (`allow update: if false;`).
- **Temporal & Field Immutability**: `createdAt == request.time` on create and never changes on update; `updatedAt == request.time` on `UserProgress` and `YoutubeLessonNote` updates; `lastSearchedAt == request.time` on `SearchedWord` creates/updates; `ownerId` is immutable everywhere.
- **Total Array & String Bounds**: Every string has an explicit `.size()` ceiling (`personalNotes <= 4000`, `englishMeaning <= 240`, `hindiMeaning <= 240`); every numeric field has strict bounds (`lessonNumber 1..100`, `bestExerciseScore 0..100`, `practiceCount 0..1000`); every array (`completedLessonIds <= 50`, `masteredVocabIds <= 200`, `savedWordIds <= 100`) enforces `.size()` bounds and first-element type validation.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: `GET /users/user_a` or `SET /users/user_a/youtubeLessonNotes/yt-a1-01` with `auth == null`.
2. **Unverified Email Write**: `CREATE /users/user_a` or `/users/user_a/youtubeLessonNotes/yt-a1-01` with `auth.uid == 'user_a'` and `auth.token.email_verified == false`.
3. **Cross-User Identity Spoofing (Path)**: `user_b` attempts `GET`, `LIST`, or `CREATE` on `/users/user_a`, `/users/user_a/searchedWords/friseur`, or `/users/user_a/youtubeLessonNotes/yt-a1-01`.
4. **OwnerId Field Spoofing**: `user_a` attempts `CREATE /users/user_a/youtubeLessonNotes/yt-a1-01` with `ownerId: 'user_b'`.
5. **Shadow / Ghost Field Injection (Create)**: `user_a` creates `/users/user_a` or `youtubeLessonNotes/yt-a1-01` with extra field `isAdmin: true`.
6. **Shadow / Ghost Field Injection (Update)**: `user_a` updates `/users/user_a` or `youtubeLessonNotes/yt-a1-01` with extra field `role: 'superuser'`.
7. **Immutable Field Tampering**: `user_a` updates `/users/user_a` or `youtubeLessonNotes/yt-a1-01` changing `createdAt` or `ownerId`.
8. **Client Timestamp Spoofing**: `user_a` creates/updates `UserProgress`, `SearchedWord`, or `YoutubeLessonNote` with client-forged `createdAt`, `updatedAt`, or `lastSearchedAt` (`!= request.time`).
9. **ID Poisoning / Denial of Wallet**: `user_a` attempts `CREATE /users/user_a/youtubeLessonNotes/bad$$id...` or injects > 4000 chars into `personalNotes`.
10. **Array / String Overflow Poisoning**: `user_a` updates `completedLessonIds` with > 50 items or invalid non-string first element `[123]`.
11. **Terminal State Mutation**: `user_a` attempts `UPDATE /users/user_a/examAttempts/attempt_1` to change `score` from `45` to `95` after `status == 'completed'`.
12. **Orphaned Subcollection Write / Cross-User List**: `user_a` attempts `CREATE /users/user_a/youtubeLessonNotes/yt-a1-01` before `/users/{userId}` exists (outside atomic batch), or `user_b` attempts `LIST /users/user_a/youtubeLessonNotes`.
