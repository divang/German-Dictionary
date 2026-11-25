import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces global default deny, verified users, and zero blanket reads', () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('match /{document=**}'));
  assert.ok(rulesText.includes('allow read, write: if false;'));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
  assert.ok(!rulesText.includes('allow read: if isSignedIn();'));
  assert.ok(!rulesText.includes('allow list: if isSignedIn();'));
});

test('firestore.rules covers every collection declared in firebase-blueprint.json with strict validation', () => {
  const paths = Object.keys(blueprint.firestore);
  assert.deepEqual(paths.sort(), ['/users/{userId}', '/users/{userId}/examAttempts/{attemptId}']);

  // Verify UserProgress validation & action-based updates
  assert.ok(rulesText.includes('function isValidUserProgress(data, userId)'));
  assert.ok(rulesText.includes('incoming().ownerId == existing().ownerId'));
  assert.ok(rulesText.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rulesText.includes('incoming().updatedAt == request.time'));
  assert.ok(rulesText.includes('affectedKeys().hasOnly('));

  // Verify ExamAttempt Master Gate, Atomicity, Secure List, and Terminal State Lock
  assert.ok(rulesText.includes('function isValidExamAttempt(data, userId)'));
  assert.ok(rulesText.includes('resource.data.ownerId == request.auth.uid'));
  assert.ok(rulesText.includes('existsAfter(/databases/$(database)/documents/users/$(userId))'));
  assert.ok(rulesText.includes('allow update: if false;'));
});

test('Dirty Dozen security assertions: rules block all 12 adversarial attack vectors', () => {
  const dirtyDozenChecks: { name: string; guardRegex: RegExp }[] = [
    { name: '1. Unauthenticated read/write blocked', guardRegex: /request\.auth != null/ },
    { name: '2. Unverified email blocked', guardRegex: /request\.auth\.token\.email_verified == true/ },
    { name: '3. Cross-user path access blocked', guardRegex: /request\.auth\.uid == userId/ },
    { name: '4. OwnerId spoofing blocked', guardRegex: /data\.ownerId == request\.auth\.uid/ },
    { name: '5. Shadow field on create blocked', guardRegex: /data\.keys\(\)\.hasOnly\(/ },
    { name: '6. Shadow field on update blocked', guardRegex: /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/ },
    { name: '7. Immutable createdAt tampering blocked', guardRegex: /incoming\(\)\.createdAt == existing\(\)\.createdAt/ },
    { name: '8. Client timestamp spoofing blocked', guardRegex: /incoming\(\)\.createdAt == request\.time/ },
    { name: '9. ID poisoning blocked', guardRegex: /id\.size\(\) <= 128 && id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/ },
    { name: '10. Array overflow & element type poisoning blocked', guardRegex: /arr\.size\(\) <= maxLen/ },
    { name: '11. Terminal exam attempt mutation blocked', guardRegex: /data\.status == 'completed'[\s\S]*allow update: if false;/ },
    { name: '12. Orphaned subcollection & cross-user list blocked', guardRegex: /allow list: if isOwner\(userId\)\s*&& resource\.data\.ownerId == request\.auth\.uid;/ },
  ];

  for (const check of dirtyDozenChecks) {
    assert.match(rulesText, check.guardRegex, `Missing security guard for: ${check.name}`);
  }
});
