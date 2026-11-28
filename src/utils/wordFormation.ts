import type { WordFormation, WordFormationPart } from '../types/dictionary';
import { stripArticleAndPunctuation } from './sentenceTranslator';

const VALID_ARTICLES = new Set(['der', 'die', 'das']);

export function normalizeArticle(raw: unknown): 'der' | 'die' | 'das' | '' {
  const cleaned = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (VALID_ARTICLES.has(cleaned)) {
    return cleaned as 'der' | 'die' | 'das';
  }
  return '';
}

export function articleToGenderLabel(article: 'der' | 'die' | 'das' | ''): string {
  if (article === 'der') return 'masculine';
  if (article === 'die') return 'feminine';
  if (article === 'das') return 'neuter';
  return '';
}

/**
 * Formats a concise human-readable word formation equation such as:
 * "Wasser (water) + Flasche (bottle, feminine)"
 * or "schlafen (to sleep) + Zimmer (room, neuter)"
 */
export function buildFormationFormula(parts: WordFormationPart[]): string {
  return parts
    .map((part) => {
      const detailPieces: string[] = [];
      if (part.meaning) detailPieces.push(part.meaning);
      if (part.genderLabel) detailPieces.push(part.genderLabel);
      const detail = detailPieces.length > 0 ? ` (${detailPieces.join(', ')})` : '';
      return `${part.german}${detail}`;
    })
    .join(' + ');
}

export function normalizeWordFormation(
  raw: Partial<WordFormation> | null | undefined,
  fallbackWord: string,
): WordFormation {
  const rawParts = Array.isArray(raw?.parts) ? raw.parts : [];
  const parts: WordFormationPart[] = [];

  for (const item of rawParts) {
    if (!item || typeof item !== 'object') continue;
    const rawGerman = String(item.german ?? '').trim();
    if (!rawGerman) continue;

    // Preserve prefix/suffix hyphen markers like "ent-" or "-chen" when bound,
    // while stripping leading der/die/das from standalone words so audio never speaks articles.
    const isBoundAffix = rawGerman.startsWith('-') || rawGerman.endsWith('-');
    const cleanGerman = isBoundAffix
      ? rawGerman.slice(0, 40)
      : (stripArticleAndPunctuation(rawGerman) || rawGerman).slice(0, 60);
    if (!cleanGerman) continue;

    const article = isBoundAffix ? '' : normalizeArticle(item.article);
    const rawGender = String(item.genderLabel ?? '')
      .trim()
      .toLowerCase();
    const genderLabel =
      rawGender === 'masculine' || rawGender === 'feminine' || rawGender === 'neuter'
        ? rawGender
        : articleToGenderLabel(article);

    const meaning = String(item.meaning ?? '')
      .trim()
      .slice(0, 120);
    const hindiMeaning = String(item.hindiMeaning ?? '')
      .trim()
      .slice(0, 120);
    const devanagari = String(item.devanagari ?? '')
      .trim()
      .slice(0, 80);
    const role = String(item.role ?? '')
      .trim()
      .slice(0, 40);

    // Pure linking letters like "-s-" or "-n-" aren't standalone spoken words
    const isLinkingElement =
      /^-?[a-z]{1,2}-$/i.test(rawGerman) || role.toLowerCase().includes('linking');
    const speakable =
      typeof item.speakable === 'boolean' ? item.speakable && !isLinkingElement : !isLinkingElement && !isBoundAffix;

    parts.push({
      german: cleanGerman,
      article,
      genderLabel,
      meaning,
      hindiMeaning: hindiMeaning || undefined,
      devanagari: devanagari || undefined,
      role: role || undefined,
      speakable,
    });
  }

  const boundedParts = parts.slice(0, 6);
  const formulaText =
    String(raw?.formulaText ?? '').trim().slice(0, 260) ||
    (boundedParts.length > 0 ? buildFormationFormula(boundedParts) : fallbackWord);

  const explanation =
    String(raw?.explanation ?? '').trim().slice(0, 420) ||
    (boundedParts.length > 1
      ? `${fallbackWord} is formed by combining ${boundedParts.map((p) => p.german).join(' + ')}.`
      : `${fallbackWord} is a base German word rather than a multi-word compound.`);

  const isCompoundOrDerived =
    typeof raw?.isCompoundOrDerived === 'boolean'
      ? raw.isCompoundOrDerived
      : boundedParts.length >= 2;

  return {
    isCompoundOrDerived,
    formulaText,
    explanation,
    parts: boundedParts,
  };
}
