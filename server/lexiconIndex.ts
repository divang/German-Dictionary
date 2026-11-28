import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import type { CollocationItem, DictionaryEntry, DictionarySuggestion } from '../src/types/dictionary';
import type { EnglishSuggestItem } from '../src/types/enToDe';
import { normalizeGermanQuery, stripUmlautsSimple } from '../src/utils/dictionary';
import {
  buildDeterministicGermanEntry,
  transliterateGermanToDevanagari,
} from '../src/utils/germanPhonetics';
import { CURATED_WORDS } from '../src/data/curatedWords';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RawLexiconRow {
  word: string;
  norm: string;
  simple: string;
  article: string;
  pos: string;
  ipa: string;
  english: string;
  freqRank: number;
}

class GermanLexiconIndex {
  private rows: RawLexiconRow[] = [];
  private prefixBuckets = new Map<string, number[]>();
  private exactMap = new Map<string, number>();
  private simpleExactMap = new Map<string, number>();
  private englishExactMap = new Map<string, number[]>();
  private englishPrefixBuckets = new Map<string, string[]>();
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  public get totalEntries(): number {
    return this.rows.length;
  }

  public get isReady(): boolean {
    return this.loaded;
  }

  public async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = new Promise<void>((resolve) => {
      try {
        const gzPath = path.resolve(__dirname, '../data/german-dictionary.tsv.gz');
        if (!fs.existsSync(gzPath)) {
          console.warn('[lexicon] Dictionary file not found at', gzPath);
          this.loaded = true;
          resolve();
          return;
        }

        const compressed = fs.readFileSync(gzPath);
        const text = zlib.gunzipSync(compressed).toString('utf-8');
        const lines = text.split('\n');

        const rows: RawLexiconRow[] = [];
        const buckets = new Map<string, number[]>();
        const exact = new Map<string, number>();
        const simpleExact = new Map<string, number>();
        const engExact = new Map<string, number[]>();
        const engPrefix = new Map<string, string[]>();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const parts = line.split('\t');
          if (parts.length < 5) continue;

          const word = parts[0];
          const article = parts[1] || '';
          const pos = parts[2] || '';
          const ipa = parts[3] || '';
          const english = parts[4] || '';
          const freqRank = Number(parts[5]) || 0;

          const norm = normalizeGermanQuery(word);
          const simple = stripUmlautsSimple(word);
          if (!norm) continue;

          const idx = rows.length;
          rows.push({ word, norm, simple, article, pos, ipa, english, freqRank });

          if (!exact.has(norm)) exact.set(norm, idx);
          if (!simpleExact.has(simple)) simpleExact.set(simple, idx);

          // Bucket by first 2 chars of both normalized (oe/ae/ue) and stripped (o/a/u) keys
          const key1 = norm.slice(0, 2);
          if (key1.length >= 1) {
            let b = buckets.get(key1);
            if (!b) {
              b = [];
              buckets.set(key1, b);
            }
            b.push(idx);
          }
          const key2 = simple.slice(0, 2);
          if (key2 !== key1 && key2.length >= 1) {
            let b2 = buckets.get(key2);
            if (!b2) {
              b2 = [];
              buckets.set(key2, b2);
            }
            b2.push(idx);
          }

          // Reverse English gloss index for fast English -> German lookup & autocomplete
          if (english && !word.includes(' ')) {
            const glossPieces = english.split(/[;,]/);
            for (let g = 0; g < Math.min(glossPieces.length, 4); g++) {
              const cleanedGloss = glossPieces[g]
                .replace(/\([^)]*\)/g, '')
                .replace(/\[[^\]]*\]/g, '')
                .trim()
                .toLowerCase();
              if (!cleanedGloss || cleanedGloss.length < 2 || cleanedGloss.length > 36) continue;

              const glossKeys = [cleanedGloss];
              if (cleanedGloss.startsWith('to ') && cleanedGloss.length > 5) {
                glossKeys.push(cleanedGloss.slice(3).trim());
              }

              for (const gKey of glossKeys) {
                if (!/^[a-z][a-z\s'-]*$/.test(gKey)) continue;
                let list = engExact.get(gKey);
                if (!list) {
                  list = [];
                  engExact.set(gKey, list);
                  const pk = gKey.slice(0, 2);
                  let pb = engPrefix.get(pk);
                  if (!pb) {
                    pb = [];
                    engPrefix.set(pk, pb);
                  }
                  pb.push(gKey);
                }
                if (list.length < 18) {
                  list.push(idx);
                }
              }
            }
          }
        }

        this.rows = rows;
        this.prefixBuckets = buckets;
        this.exactMap = exact;
        this.simpleExactMap = simpleExact;
        this.englishExactMap = engExact;
        this.englishPrefixBuckets = engPrefix;
        this.loaded = true;
        console.log(
          `[lexicon] Indexed ${rows.length.toLocaleString()} German entries (${engExact.size.toLocaleString()} English gloss keys).`,
        );
      } catch (err) {
        console.error('[lexicon] Failed loading dictionary:', err);
        this.loaded = true;
      } finally {
        resolve();
      }
    });

    return this.loadingPromise;
  }

  /**
   * Returns fast ranked autocomplete suggestions (prefix matches first, curated + high frequency boosted).
   */
  public suggest(rawQuery: string, limit = 10): DictionarySuggestion[] {
    const q = rawQuery.trim();
    if (!q) return [];

    const qNorm = normalizeGermanQuery(q);
    const qSimple = stripUmlautsSimple(q);
    const results: DictionarySuggestion[] = [];
    const seen = new Set<string>();

    // 1. Check curated words first for instant high-priority matches
    for (const c of CURATED_WORDS) {
      const cNorm = normalizeGermanQuery(c.word);
      const cSimple = stripUmlautsSimple(c.word);
      if (
        cNorm.startsWith(qNorm) ||
        cSimple.startsWith(qSimple) ||
        qNorm.startsWith(cNorm) && cNorm.length >= 4
      ) {
        seen.add(c.word.toLowerCase());
        results.push({
          word: c.word,
          article: c.article || '',
          pos: c.partOfSpeech,
          english: c.englishMeaning,
          devanagariPreview: c.devanagariFull,
          isCurated: true,
          curatedId: c.id,
        });
      }
    }

    if (results.length >= limit) {
      return results.slice(0, limit);
    }

    // 2. Query 2-char prefix buckets from the 382k repo corpus
    const bucketKey1 = qNorm.slice(0, 2);
    const bucketKey2 = qSimple.slice(0, 2);
    const candidateIndices = new Set<number>();

    if (qNorm.length === 1) {
      // Single-char search: scan matching buckets starting with qNorm[0]
      for (const [k, list] of this.prefixBuckets.entries()) {
        if (k.startsWith(qNorm)) {
          for (let i = 0; i < Math.min(list.length, 40); i++) {
            candidateIndices.add(list[i]);
          }
        }
      }
    } else {
      const b1 = this.prefixBuckets.get(bucketKey1);
      if (b1) {
        for (let i = 0; i < b1.length; i++) candidateIndices.add(b1[i]);
      }
      if (bucketKey2 !== bucketKey1) {
        const b2 = this.prefixBuckets.get(bucketKey2);
        if (b2) {
          for (let i = 0; i < b2.length; i++) candidateIndices.add(b2[i]);
        }
      }
    }

    // Because rows in german-dictionary.tsv.gz are ALREADY sorted by frequency rank + single-word preference,
    // iterating indices in ascending order naturally yields the most common German words first!
    const exactOrSingle: RawLexiconRow[] = [];
    const phraseMatches: RawLexiconRow[] = [];

    const sortedCandidates = Array.from(candidateIndices).sort((a, b) => a - b);
    for (const idx of sortedCandidates) {
      const row = this.rows[idx];
      if (seen.has(row.word.toLowerCase())) continue;

      const starts = row.norm.startsWith(qNorm) || row.simple.startsWith(qSimple);
      if (!starts) continue;

      if (!row.word.includes(' ')) {
        exactOrSingle.push(row);
      } else {
        phraseMatches.push(row);
      }
      if (exactOrSingle.length >= limit * 2 && phraseMatches.length >= limit) {
        break;
      }
    }

    // Also include German stem match if user typed an inflected form like "biologisches" -> "biologisch"
    const stemMatch = this.findStemRow(q);
    if (stemMatch && !seen.has(stemMatch.word.toLowerCase())) {
      seen.add(stemMatch.word.toLowerCase());
      results.push({
        word: stemMatch.word,
        article: stemMatch.article,
        pos: stemMatch.pos || 'German word',
        english: stemMatch.english,
        devanagariPreview: transliterateGermanToDevanagari(stemMatch.word),
      });
    }

    for (const row of [...exactOrSingle, ...phraseMatches]) {
      if (results.length >= limit) break;
      const key = row.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        word: row.word,
        article: row.article,
        pos: row.pos || 'German word',
        english: row.english,
        devanagariPreview: transliterateGermanToDevanagari(row.word),
      });
    }

    return results.slice(0, limit);
  }

  private findExactRow(word: string): RawLexiconRow | undefined {
    const norm = normalizeGermanQuery(word);
    const idx1 = this.exactMap.get(norm);
    if (idx1 !== undefined) return this.rows[idx1];
    const simple = stripUmlautsSimple(word);
    const idx2 = this.simpleExactMap.get(simple);
    if (idx2 !== undefined) return this.rows[idx2];
    return undefined;
  }

  /**
   * Resolves common German adjective/noun/verb inflections (e.g. biologisches -> biologisch,
   * Häuser -> Haus, Krankenhäuser -> Krankenhaus) to their base dictionary lemma.
   */
  private findStemRow(word: string): RawLexiconRow | undefined {
    const clean = word.trim();
    if (clean.includes(' ') || clean.length < 4) return undefined;

    const suffixes = ['es', 'er', 'en', 'em', 'e', 's', 'st', 't', 'te', 'ten'];
    for (const suf of suffixes) {
      if (clean.toLowerCase().endsWith(suf) && clean.length - suf.length >= 3) {
        const stem = clean.slice(0, clean.length - suf.length);
        const found = this.findExactRow(stem);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Finds real multi-word collocations from the 382k dictionary (like Linguee's
   * "Examples: biologisches Alter — biological age").
   */
  public findCollocations(word: string, stemWord?: string, limit = 5): CollocationItem[] {
    const qNorm = normalizeGermanQuery(word);
    const sNorm = stemWord ? normalizeGermanQuery(stemWord) : qNorm;
    const prefix = sNorm.slice(0, Math.min(sNorm.length, 6));
    const bucket = this.prefixBuckets.get(prefix.slice(0, 2));
    if (!bucket) return [];

    const items: CollocationItem[] = [];
    const seen = new Set<string>();

    for (const idx of bucket) {
      const row = this.rows[idx];
      if (!row.word.includes(' ')) continue;
      if (row.word.length > 48) continue;

      if (row.norm.startsWith(qNorm) || row.norm.startsWith(sNorm)) {
        const key = row.word.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          german: row.word,
          devanagari: transliterateGermanToDevanagari(row.word),
          english: row.english.split(';')[0]?.trim() || row.english,
          article: row.article || undefined,
        });
        if (items.length >= limit) break;
      }
    }

    return items;
  }

  /**
   * Instant local lookup across curated showcase words AND all 382,641 German dictionary entries.
   */
  public lookupWord(rawWord: string): DictionaryEntry | null {
    const cleaned = rawWord.trim();
    if (!cleaned) return null;

    const qNorm = normalizeGermanQuery(cleaned);
    const qSimple = stripUmlautsSimple(cleaned);

    // 1. Check curated showcase entries (exact or inflected form match, e.g. biologisches -> biologisch)
    const curatedExact = CURATED_WORDS.find(
      (c) =>
        normalizeGermanQuery(c.word) === qNorm ||
        stripUmlautsSimple(c.word) === qSimple ||
        (c.article && normalizeGermanQuery(`${c.article} ${c.word}`) === qNorm),
    );
    if (curatedExact) {
      return curatedExact;
    }

    // Check if query is a German inflected form of a curated adjective/word (e.g. biologisches -> biologisch)
    const curatedStem = CURATED_WORDS.find((c) => {
      const cNorm = normalizeGermanQuery(c.word);
      return (
        cNorm.length >= 5 &&
        qNorm.startsWith(cNorm) &&
        ['e', 'es', 'er', 'en', 'em'].includes(qNorm.slice(cNorm.length))
      );
    });
    if (curatedStem) {
      return {
        ...curatedStem,
        matchedQuery: cleaned,
      };
    }

    // 2. Exact match in the 382,641-word in-repo German dictionary
    const exactRow = this.findExactRow(cleaned);
    const stemRow = exactRow ? undefined : this.findStemRow(cleaned);
    const matchedRow = exactRow ?? stemRow;

    if (matchedRow) {
      const collocations = this.findCollocations(cleaned, matchedRow.word, 5);
      return buildDeterministicGermanEntry({
        word: exactRow ? matchedRow.word : cleaned,
        article: matchedRow.article,
        partOfSpeech: matchedRow.pos || (matchedRow.article ? 'Noun' : 'German word'),
        englishMeaning: matchedRow.english,
        ipa: matchedRow.ipa,
        collocations,
        matchedQuery: exactRow ? undefined : `Inflected form of ${matchedRow.word}`,
      });
    }

    // 3. Even if the user types a novel compound German word (German allows arbitrary compounds!),
    //    our deterministic phonetics engine still produces an instant, accurate Hindi-native breakdown!
    const collocations = this.findCollocations(cleaned, cleaned, 4);
    return buildDeterministicGermanEntry({
      word: cleaned,
      partOfSpeech: 'German compound / phrase',
      englishMeaning: 'Looked up via phonetic breakdown (click Enhance with AI Coach for full translation)',
      collocations,
    });
  }

  /**
   * Fast English autocomplete suggestions backed by our 382k FreeDict corpus.
   */
  public suggestEnglish(rawQuery: string, limit = 8): EnglishSuggestItem[] {
    const q = rawQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const qBare = q.startsWith('to ') ? q.slice(3).trim() : q;
    const prefixKey = qBare.slice(0, 2);
    const candidates = this.englishPrefixBuckets.get(prefixKey) ?? [];

    const exactMatches: string[] = [];
    const prefixMatches: string[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const engKey = candidates[i];
      if (engKey === q || engKey === qBare) {
        exactMatches.push(engKey);
      } else if (engKey.startsWith(qBare)) {
        prefixMatches.push(engKey);
      }
      if (prefixMatches.length >= limit * 4) break;
    }

    prefixMatches.sort((a, b) => a.length - b.length || a.localeCompare(b));
    const orderedKeys = [...exactMatches, ...prefixMatches].slice(0, limit);

    const results: EnglishSuggestItem[] = [];
    const seen = new Set<string>();
    for (const engKey of orderedKeys) {
      if (seen.has(engKey)) continue;
      seen.add(engKey);
      const rowIndices = this.englishExactMap.get(engKey);
      if (!rowIndices || rowIndices.length === 0) continue;
      const topRow = this.rows[rowIndices[0]];
      if (!topRow) continue;
      results.push({
        english: engKey,
        topGerman: topRow.word,
        article: topRow.article,
        devanagariPreview: transliterateGermanToDevanagari(topRow.word),
      });
    }
    return results;
  }

  /**
   * Fast reverse lookup: returns ranked German dictionary rows matching an English word or phrase.
   */
  public searchEnglishToGerman(rawQuery: string, limit = 12): RawLexiconRow[] {
    const q = rawQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const qBare = q.startsWith('to ') ? q.slice(3).trim() : q;
    const seenWords = new Set<string>();
    const results: RawLexiconRow[] = [];

    const pushRow = (row: RawLexiconRow | undefined) => {
      if (!row) return;
      const key = row.word.toLowerCase();
      if (seenWords.has(key)) return;
      seenWords.add(key);
      results.push(row);
    };

    // 1. Exact English gloss matches (highest precision)
    for (const key of [q, qBare, `to ${qBare}`]) {
      const indices = this.englishExactMap.get(key);
      if (indices) {
        for (const idx of indices) {
          pushRow(this.rows[idx]);
          if (results.length >= limit) return results;
        }
      }
    }

    // 2. Prefix English gloss matches (e.g. "water bottle" or "bedroom")
    const prefixKey = qBare.slice(0, 2);
    const bucket = this.englishPrefixBuckets.get(prefixKey) ?? [];
    for (let i = 0; i < bucket.length; i++) {
      const engKey = bucket[i];
      if (!engKey.startsWith(qBare)) continue;
      const indices = this.englishExactMap.get(engKey);
      if (!indices) continue;
      for (const idx of indices.slice(0, 3)) {
        pushRow(this.rows[idx]);
        if (results.length >= limit) return results;
      }
    }

    return results;
  }

  /**
   * Returns paginated real German words starting with (or containing, for ß) a specific alphabet letter
   * so learners can click "Load More Words" inside the Alphabet section.
   */
  public getWordsByLetter(
    rawLetter: string,
    offset = 0,
    limit = 5,
    excludeLower: Set<string> = new Set(),
  ): {
    words: {
      word: string;
      article: 'der' | 'die' | 'das' | '';
      devanagari: string;
      english: string;
      sentenceGerman: string;
      sentenceEnglish: string;
      source: 'corpus';
    }[];
    hasMore: boolean;
  } {
    const letter = rawLetter.trim().toLowerCase();
    if (!letter) return { words: [], hasMore: false };

    const isEszett = letter === 'ß';
    const skipFunctionWords = new Set([
      'aber', 'auch', 'auf', 'aus', 'alle', 'als', 'also', 'am', 'an', 'bei', 'bis',
      'da', 'damit', 'dann', 'das', 'dass', 'dem', 'den', 'denn', 'der', 'des', 'die',
      'doch', 'dort', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'für', 'hat',
      'hier', 'ich', 'ihm', 'ihn', 'ihr', 'im', 'in', 'ist', 'jedoch', 'kein', 'keine',
      'man', 'mehr', 'mit', 'nach', 'nicht', 'noch', 'nun', 'nur', 'oder', 'ohne',
      'sehr', 'sein', 'seit', 'sich', 'sie', 'sind', 'so', 'sogar', 'sondern', 'über',
      'um', 'und', 'uns', 'unter', 'vom', 'von', 'vor', 'war', 'was', 'weil', 'wenn',
      'wer', 'wie', 'wir', 'wird', 'wo', 'zu', 'zum', 'zur', 'zwar',
    ]);
    const skipEnglishGloss = new Set([
      'and', 'but', 'or', 'also', 'too', 'on', 'in', 'at', 'of', 'to', 'from',
      'the', 'a', 'an', 'if', 'that', 'this', 'with', 'for', 'by', 'as', 'so', 'not',
    ]);

    const matched: RawLexiconRow[] = [];
    const seen = new Set<string>(excludeLower);
    const needed = offset + limit + 1;

    const collectPass = (strictConcreteOnly: boolean) => {
      for (let i = 0; i < this.rows.length; i++) {
        if (matched.length >= needed) break;
        const row = this.rows[i];
        if (!row.word || row.word.includes(' ') || row.word.length < (strictConcreteOnly ? 4 : 3) || row.word.length > 20) {
          continue;
        }
        if (!row.english || row.english.length > 80) continue;
        if (!/^[a-zäöüßA-ZÄÖÜ]+$/.test(row.word)) continue;

        const lowerWord = row.word.toLowerCase();
        if (isEszett ? !lowerWord.includes('ß') : !lowerWord.startsWith(letter)) {
          continue;
        }
        if (seen.has(lowerWord) || skipFunctionWords.has(lowerWord)) continue;

        const shortEng = (row.english.split(/[;,]/)[0]?.trim() || row.english)
          .replace(/\([^)]*\)/g, '')
          .trim();
        if (!shortEng || skipEnglishGloss.has(shortEng.toLowerCase())) continue;

        const posLower = row.pos.toLowerCase();
        const isNoun = row.article === 'der' || row.article === 'die' || row.article === 'das';
        const isTrueVerb = !/\badverb\b/.test(posLower) && /\bverb\b/.test(posLower);
        const isAdj = /\badj/.test(posLower);

        if (strictConcreteOnly && !isNoun && !isTrueVerb && !isAdj) {
          continue;
        }

        seen.add(lowerWord);
        matched.push(row);
      }
    };

    // Pass 1: Prefer clear everyday nouns, true verbs, and adjectives
    collectPass(true);
    // Pass 2: Fallback for rare letters (e.g. X, Y, ß) if fewer than needed
    if (matched.length < needed) {
      collectPass(false);
    }

    const slice = matched.slice(offset, offset + limit);
    const hasMore = matched.length > offset + limit;

    const words = slice.map((row) => {
      const art =
        row.article === 'der' || row.article === 'die' || row.article === 'das'
          ? row.article
          : '';
      const shortEnglish = row.english.split(/[;,]/)[0]?.trim() || row.english;
      const cleanEng = shortEnglish.replace(/\([^)]*\)/g, '').trim() || shortEnglish;
      const posLower = row.pos.toLowerCase();
      const isTrueVerb = !/\badverb\b/.test(posLower) && /\bverb\b/.test(posLower);
      const isAdj = /\badj/.test(posLower);

      let sentenceGerman = `Heute lerne ich das deutsche Wort „${row.word}“.`;
      let sentenceEnglish = `Today I am learning the German word "${cleanEng}".`;

      if (art === 'der') {
        sentenceGerman = `Der ${row.word} ist heute sehr wichtig.`;
        sentenceEnglish = `The ${cleanEng} is very important today.`;
      } else if (art === 'die') {
        sentenceGerman = `Die ${row.word} ist sehr wichtig.`;
        sentenceEnglish = `The ${cleanEng} is very important.`;
      } else if (art === 'das') {
        sentenceGerman = `Das ${row.word} ist sehr interessant.`;
        sentenceEnglish = `The ${cleanEng} is very interesting.`;
      } else if (isTrueVerb) {
        const bareVerbEng = cleanEng.replace(/^to\s+/i, '');
        sentenceGerman = `Wir wollen heute ${row.word}.`;
        sentenceEnglish = `We want to ${bareVerbEng} today.`;
      } else if (isAdj) {
        sentenceGerman = `Das finde ich sehr ${row.word}.`;
        sentenceEnglish = `I find that very ${cleanEng}.`;
      }

      return {
        word: row.word,
        article: art as 'der' | 'die' | 'das' | '',
        devanagari: transliterateGermanToDevanagari(row.word),
        english: shortEnglish,
        sentenceGerman,
        sentenceEnglish,
        source: 'corpus' as const,
      };
    });

    return { words, hasMore };
  }
}

export const germanLexicon = new GermanLexiconIndex();
