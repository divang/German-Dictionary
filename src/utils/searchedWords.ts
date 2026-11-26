import type { DictionaryEntry, SearchedWordRecord } from '../types/dictionary';

export const MAX_SEARCHED_WORDS_LOCAL = 300;
export const MAX_SEARCH_COUNT = 10000;

const VALID_ARTICLES = new Set(['', 'der', 'die', 'das']);

/**
 * Produces a deterministic Firestore-safe document ID matching ^[a-zA-Z0-9_-]{1,100}$
 * for any German word or short phrase (transliterating umlauts and ß cleanly).
 */
export function toSafeWordDocId(rawWord: string): string {
  const normalized = rawWord
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);

  if (normalized.length > 0) {
    return normalized;
  }

  // Deterministic fallback hash for non-Latin queries (e.g. Hindi input)
  let hash = 0;
  for (let i = 0; i < rawWord.length; i += 1) {
    hash = (hash * 31 + rawWord.charCodeAt(i)) >>> 0;
  }
  return `w_${hash.toString(36) || 'entry'}`;
}

export function isPlaceholderEnglishMeaning(text: string | undefined): boolean {
  if (!text || !text.trim()) return true;
  const lower = text.trim().toLowerCase();
  return (
    lower.includes('looked up via phonetic breakdown') ||
    lower === 'german term' ||
    lower === 'unknown'
  );
}

export function needsMeaningEnrichment(entry: Pick<DictionaryEntry, 'englishMeaning' | 'hindiMeaning'>): boolean {
  const missingHindi = !entry.hindiMeaning || entry.hindiMeaning.trim().length === 0;
  const placeholderEnglish = isPlaceholderEnglishMeaning(entry.englishMeaning);
  return missingHindi || placeholderEnglish;
}

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function sanitizeArticle(value: unknown): 'der' | 'die' | 'das' | '' {
  if (typeof value === 'string' && VALID_ARTICLES.has(value)) {
    return value as 'der' | 'die' | 'das' | '';
  }
  return '';
}

function clampSearchCount(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.min(MAX_SEARCH_COUNT, Math.max(1, Math.round(count)));
}

/**
 * Builds a blueprint-compliant SearchedWordRecord from a DictionaryEntry,
 * preserving richer existing English/Hindi meanings if the incoming entry lacks them.
 */
export function buildSearchedWordRecord(
  entry: DictionaryEntry,
  existing?: SearchedWordRecord,
  options?: { incrementCount?: boolean; nowMs?: number },
): SearchedWordRecord {
  const nowMs = options?.nowMs ?? Date.now();
  const incrementCount = options?.incrementCount ?? true;
  const id = existing?.id ?? toSafeWordDocId(entry.word);

  const incomingEnglish = clampString(entry.englishMeaning, 240);
  const existingEnglish = clampString(existing?.englishMeaning ?? '', 240);
  const englishMeaning =
    !isPlaceholderEnglishMeaning(incomingEnglish)
      ? incomingEnglish
      : !isPlaceholderEnglishMeaning(existingEnglish)
        ? existingEnglish
        : incomingEnglish || existingEnglish;

  const incomingHindi = clampString(entry.hindiMeaning, 240);
  const existingHindi = clampString(existing?.hindiMeaning ?? '', 240);
  const hindiMeaning = incomingHindi || existingHindi;

  const nextCount = existing
    ? clampSearchCount(existing.searchCount + (incrementCount ? 1 : 0))
    : 1;

  return {
    id,
    word: clampString(entry.word, 100) || existing?.word || 'Wort',
    article: sanitizeArticle(entry.article ?? existing?.article ?? ''),
    partOfSpeech: clampString(entry.partOfSpeech || existing?.partOfSpeech || 'German word', 60),
    cefr: clampString(entry.cefr || existing?.cefr || 'A1', 10),
    englishMeaning,
    hindiMeaning,
    devanagariFull: clampString(entry.devanagariFull || existing?.devanagariFull || '', 180),
    ipa: clampString(entry.ipa || existing?.ipa || '', 120),
    searchCount: nextCount,
    createdAtMs: existing?.createdAtMs ?? nowMs,
    lastSearchedAtMs: incrementCount ? nowMs : existing?.lastSearchedAtMs ?? nowMs,
  };
}

/**
 * Inserts or updates a searched word in the local revision list, keeping most recently searched first.
 */
export function upsertSearchedWordLocal(
  list: SearchedWordRecord[],
  entry: DictionaryEntry,
  options?: { incrementCount?: boolean; nowMs?: number },
): { list: SearchedWordRecord[]; record: SearchedWordRecord } {
  const targetId = toSafeWordDocId(entry.word);
  const existing = list.find((item) => item.id === targetId);
  const record = buildSearchedWordRecord(entry, existing, options);

  const rest = list.filter((item) => item.id !== targetId);
  const nextList = [record, ...rest]
    .sort((a, b) => b.lastSearchedAtMs - a.lastSearchedAtMs)
    .slice(0, MAX_SEARCHED_WORDS_LOCAL);

  return { list: nextList, record };
}

/**
 * Merges local (e.g. laptop offline/pre-login) and cloud (e.g. phone/other device) searched words
 * by deterministic word ID, keeping the richest English & Hindi meanings, highest search count,
 * and most recent search timestamp.
 */
export function mergeSearchedWords(
  local: SearchedWordRecord[],
  cloud: SearchedWordRecord[],
): SearchedWordRecord[] {
  const byId = new Map<string, SearchedWordRecord>();

  for (const item of cloud) {
    if (!item?.id || !item?.word) continue;
    byId.set(item.id, item);
  }

  for (const item of local) {
    if (!item?.id || !item?.word) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }

    const englishMeaning = !isPlaceholderEnglishMeaning(existing.englishMeaning)
      ? existing.englishMeaning
      : !isPlaceholderEnglishMeaning(item.englishMeaning)
        ? item.englishMeaning
        : existing.englishMeaning || item.englishMeaning;

    const hindiMeaning = existing.hindiMeaning || item.hindiMeaning;

    byId.set(item.id, {
      id: existing.id,
      word: existing.word || item.word,
      article: existing.article || item.article,
      partOfSpeech: existing.partOfSpeech || item.partOfSpeech,
      cefr: existing.cefr || item.cefr,
      englishMeaning: clampString(englishMeaning, 240),
      hindiMeaning: clampString(hindiMeaning, 240),
      devanagariFull: existing.devanagariFull || item.devanagariFull,
      ipa: existing.ipa || item.ipa,
      searchCount: clampSearchCount(Math.max(existing.searchCount, item.searchCount)),
      createdAtMs: Math.min(existing.createdAtMs, item.createdAtMs),
      lastSearchedAtMs: Math.max(existing.lastSearchedAtMs, item.lastSearchedAtMs),
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => b.lastSearchedAtMs - a.lastSearchedAtMs)
    .slice(0, MAX_SEARCHED_WORDS_LOCAL);
}

export function filterSearchedWords(
  records: SearchedWordRecord[],
  query: string,
): SearchedWordRecord[] {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return records;
  return records.filter(
    (item) =>
      item.word.toLowerCase().includes(cleaned) ||
      item.englishMeaning.toLowerCase().includes(cleaned) ||
      item.hindiMeaning.toLowerCase().includes(cleaned) ||
      item.devanagariFull.toLowerCase().includes(cleaned),
  );
}
