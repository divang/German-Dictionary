import { Fragment, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  Layers,
  Loader2,
  Plus,
  Turtle,
  Volume2,
  Wand2,
} from 'lucide-react';
import type { DictionaryEntry, WordFormation } from '../types/dictionary';
import { getDifficultyMeta } from '../utils/dictionary';
import { playGermanAudio } from '../utils/audioPlayer';
import { resolveSyllableAudioTarget } from '../utils/voiceSelection';
import { normalizeWordFormation } from '../utils/wordFormation';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';
import { ArticulationDiagram } from './ArticulationDiagram';

const clientWordFormationCache = new Map<string, WordFormation>();

export type PlaybackSpeed = 'normal' | 'slow';

interface PronunciationEntryViewProps {
  entry: DictionaryEntry;
  isSaved: boolean;
  isAutoSavedHistory?: boolean;
  isLoadingMeaning?: boolean;
  playbackSpeed: PlaybackSpeed;
  isEnhancingAi: boolean;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  onToggleSave: (entry: DictionaryEntry) => void;
  onLookupPhrase: (phrase: string) => void;
  onEnhanceWithAi: (entry: DictionaryEntry) => void;
}

export function PronunciationEntryView({
  entry,
  isSaved,
  isAutoSavedHistory = false,
  isLoadingMeaning = false,
  playbackSpeed,
  isEnhancingAi,
  onPlaybackSpeedChange,
  onToggleSave,
  onLookupPhrase,
  onEnhanceWithAi,
}: PronunciationEntryViewProps) {
  const defaultFocusIndex = Math.max(
    0,
    entry.syllables.findIndex((s) => s.difficulty === 'new-sound'),
  );
  const [selectedSyllableIdx, setSelectedSyllableIdx] = useState<number>(defaultFocusIndex);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formationCacheKey = `${(entry.article ?? '').toLowerCase()}::${entry.word.toLowerCase()}`;
  const [wordFormation, setWordFormation] = useState<WordFormation | null>(
    () => entry.wordFormation ?? clientWordFormationCache.get(formationCacheKey) ?? null,
  );
  const [isLoadingFormation, setIsLoadingFormation] = useState(false);

  useEffect(() => {
    const trickyIdx = entry.syllables.findIndex((s) => s.difficulty === 'new-sound');
    setSelectedSyllableIdx(trickyIdx >= 0 ? trickyIdx : 0);
    setAudioNotice(null);
    setCopied(false);
  }, [entry.id, entry.syllables]);

  useEffect(() => {
    if (entry.wordFormation) {
      clientWordFormationCache.set(formationCacheKey, entry.wordFormation);
      setWordFormation(entry.wordFormation);
      setIsLoadingFormation(false);
      return;
    }

    const cached = clientWordFormationCache.get(formationCacheKey);
    if (cached) {
      setWordFormation(cached);
      setIsLoadingFormation(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setWordFormation(null);
    setIsLoadingFormation(true);

    fetch('/api/word-formation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: entry.word,
        article: entry.article ?? '',
        englishMeaning: entry.englishMeaning,
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { formation?: Partial<WordFormation> } | null) => {
        if (cancelled) return;
        if (data?.formation) {
          const normalized = normalizeWordFormation(data.formation, entry.word);
          clientWordFormationCache.set(formationCacheKey, normalized);
          setWordFormation(normalized);
        }
      })
      .catch(() => {
        // Non-blocking: rest of dictionary breakdown stays visible
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFormation(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [formationCacheKey, entry.word, entry.article, entry.englishMeaning, entry.wordFormation]);

  const activeSyllable = entry.syllables[selectedSyllableIdx] ?? entry.syllables[0];
  const sentenceList =
    entry.examples && entry.examples.length > 0 ? entry.examples : [entry.example];

  const handlePlay = async (text: string, key: string, slow: boolean, ipa?: string) => {
    setPlayingKey(key);
    setAudioNotice(null);
    const result = await playGermanAudio(text, { slow, ipa });
    setPlayingKey((curr) => (curr === key ? null : curr));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  const handleCopyGuide = async () => {
    const summary = [
      `${entry.article ? `${entry.article} ` : ''}${entry.word} (${entry.englishMeaning}${entry.hindiMeaning ? ` / ${entry.hindiMeaning}` : ''})`,
      `Pronunciation: ${entry.devanagariFull} (${entry.romanizedFull}) · ${entry.ipa}`,
      entry.stressSummary,
      entry.originNote,
      '',
      'Syllable-by-Syllable Breakdown for Hindi Speakers:',
      ...entry.syllables.map(
        (s) =>
          `• ${s.segment} (${s.devanagari}): ${s.explanation}${
            s.mouthSteps ? `\n  Steps: ${s.mouthSteps.join(' ')}` : ''
          }${s.quickShortcut ? `\n  Quick shortcut: ${s.quickShortcut}` : ''}`,
      ),
      '',
      'Example Sentences:',
      ...sentenceList.map((ex) => `• ${ex.german} (${ex.devanagari}) — ${ex.english}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const sourceLabel =
    entry.source === 'live'
      ? 'AI Coach breakdown'
      : entry.source === 'dictionary'
        ? 'In-repo German dictionary'
        : 'Curated breakdown';

  return (
    <article
      aria-label={`Pronunciation breakdown for ${entry.word}`}
      className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8"
    >
      {/* Top Unboxed Metadata Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {entry.article && (
            <>
              <span className="font-medium text-slate-700">{entry.article}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>{entry.partOfSpeech}</span>
          <span aria-hidden="true">·</span>
          <span>CEFR {entry.cefr}</span>
          <span aria-hidden="true">·</span>
          <span className="text-blue-700 font-medium">{sourceLabel}</span>
          {isAutoSavedHistory && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-medium">Saved to Revision History</span>
            </>
          )}
          {entry.matchedQuery && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-slate-600">Matched “{entry.matchedQuery}”</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {entry.source === 'dictionary' && (
            <button
              type="button"
              disabled={isEnhancingAi}
              onClick={() => onEnhanceWithAi(entry)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {isEnhancingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isEnhancingAi ? 'Enhancing…' : 'Enhance with AI'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Guide</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(entry)}
            aria-pressed={isSaved}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium border rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 ${
              isSaved
                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${isSaved ? 'fill-blue-700 text-blue-700' : ''}`}
              aria-hidden="true"
            />
            <span>{isSaved ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
        </div>
      </div>

      {/* Headword, Meaning & Speed-Controlled Audio */}
      <div className="mt-3.5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            {entry.article && (
              <>
                <span className="text-slate-400 font-normal mr-1.5 text-2xl sm:text-3xl">
                  {entry.article}
                </span>{' '}
              </>
            )}
            {entry.word}
          </h1>

          {/* Clear English & Hindi Meanings */}
          <dl className="mt-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm sm:text-[15px] leading-relaxed">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs font-medium text-slate-500 shrink-0">English:</dt>
              <dd className="text-slate-800 font-medium">{entry.englishMeaning}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs font-medium text-slate-500 shrink-0">हिंदी:</dt>
              <dd className="font-devanagari text-slate-900 font-medium">
                {entry.hindiMeaning ? (
                  entry.hindiMeaning
                ) : isLoadingMeaning ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-sans font-normal">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-700" aria-hidden="true" />
                    <span>Fetching Hindi meaning…</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    Tap Enhance with AI for Hindi gloss
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Audio Playback & Speed Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Default pronunciation speed"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80"
          >
            <button
              type="button"
              aria-pressed={playbackSpeed === 'normal'}
              onClick={() => onPlaybackSpeedChange('normal')}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 ${
                playbackSpeed === 'normal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Normal 1.0×
            </button>
            <button
              type="button"
              aria-pressed={playbackSpeed === 'slow'}
              onClick={() => onPlaybackSpeedChange('slow')}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 ${
                playbackSpeed === 'slow'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Slow 0.65×
            </button>
          </div>

          <button
            type="button"
            disabled={playingKey !== null}
            onClick={() =>
              handlePlay(
                entry.word,
                'word-primary',
                playbackSpeed === 'slow',
                entry.ipa,
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {playingKey === 'word-primary' ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : playbackSpeed === 'slow' ? (
              <Turtle className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{playbackSpeed === 'slow' ? 'Listen Slowly' : 'Listen'}</span>
          </button>

          <SpeakCheckButton
            targetText={entry.word}
            devanagari={entry.devanagariFull}
            ipa={entry.ipa}
            variant="primary"
          />
        </div>
      </div>

      {audioNotice && (
        <p role="status" className="mt-3 text-xs text-amber-800">
          {audioNotice}
        </p>
      )}

      {/* Hero Pronunciation Summary Strip */}
      <section
        aria-label="Pronunciation overview"
        className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">Devanagari Pronunciation</div>
            <div className="mt-1 font-devanagari text-3xl sm:text-4xl font-semibold text-blue-800 tracking-normal">
              {entry.devanagariFull}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 md:text-right">
            <div>
              <div className="text-xs font-medium text-slate-500">Stress Guide</div>
              <div className="mt-0.5 text-lg font-semibold text-slate-900">
                ({entry.romanizedFull})
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">IPA</div>
              <div className="mt-0.5 font-mono text-base text-slate-700">{entry.ipa}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-1.5 text-[15px] leading-relaxed text-slate-700">
          <p className="font-medium text-slate-900">{entry.stressSummary}.</p>
          <p>{entry.originNote}</p>
        </div>
      </section>

      {/* Word Formation / Compound Building Blocks with Inline Listen (keeps current word context) */}
      {(isLoadingFormation || (wordFormation && wordFormation.parts.length > 0)) && (
        <section
          aria-labelledby="word-formation-heading"
          className="mt-6 bg-blue-50/40 border border-blue-200/80 rounded-xl p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <h2
                id="word-formation-heading"
                className="font-display text-lg sm:text-xl font-semibold text-slate-900"
              >
                How This Word Is Formed
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Listen to each separated word right here without leaving “{entry.word}”
            </span>
          </div>

          {isLoadingFormation && !wordFormation ? (
            <div
              role="status"
              className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-800"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
              <span>Breaking down the root and compound words for “{entry.word}”…</span>
            </div>
          ) : (
            wordFormation && (
              <div className="mt-3.5 space-y-4">
                {/* Concise Formula Summary Line */}
                <p className="text-sm sm:text-[15px] leading-relaxed text-slate-800 bg-white border border-blue-100 rounded-lg px-4 py-2.5">
                  <span className="font-semibold text-slate-900">
                    {entry.article ? `${entry.article} ` : ''}
                    {entry.word}
                  </span>{' '}
                  {entry.englishMeaning &&
                    !entry.englishMeaning.toLowerCase().includes('looked up via phonetic') && (
                      <span className="text-slate-500">({entry.englishMeaning})</span>
                    )}
                  <span className="text-slate-400 mx-1.5">:</span>
                  <span className="font-medium text-blue-900">{wordFormation.formulaText}</span>
                </p>

                {/* Separated Building-Block Cards Joined by + with Inline Audio */}
                <div className="flex flex-wrap items-stretch gap-2.5">
                  {wordFormation.parts.map((part, partIdx) => {
                    const partNormalKey = `part-n-${partIdx}-${part.german}`;
                    const partSlowKey = `part-s-${partIdx}-${part.german}`;
                    return (
                      <Fragment key={`${part.german}-${partIdx}`}>
                        {partIdx > 0 && (
                          <div
                            aria-hidden="true"
                            className="flex items-center justify-center px-0.5 text-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-[210px] max-w-full sm:max-w-[320px] bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
                          <div>
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="flex flex-wrap items-baseline gap-x-1.5">
                                {part.article && (
                                  <span className="text-xs font-normal text-slate-400">
                                    {part.article}
                                  </span>
                                )}
                                <span className="font-display text-lg font-semibold text-slate-900">
                                  {part.german}
                                </span>
                              </div>
                              {(part.genderLabel || part.role) && (
                                <span className="text-[11px] font-medium text-slate-500 shrink-0">
                                  {part.genderLabel || part.role}
                                </span>
                              )}
                            </div>

                            {part.devanagari && (
                              <div className="mt-0.5 font-devanagari text-sm font-semibold text-blue-800">
                                {part.devanagari}
                              </div>
                            )}

                            <div className="mt-1.5 text-xs text-slate-700 leading-relaxed space-y-0.5">
                              {part.meaning && (
                                <div>
                                  <span className="text-slate-400">Meaning: </span>
                                  <span className="font-medium text-slate-800">
                                    {part.meaning}
                                  </span>
                                </div>
                              )}
                              {part.hindiMeaning && (
                                <div className="font-devanagari text-slate-700">
                                  <span className="font-sans text-slate-400">हिंदी: </span>
                                  {part.hindiMeaning}
                                </div>
                              )}
                            </div>
                          </div>

                          {part.speakable && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={playingKey !== null}
                                onClick={() =>
                                  handlePlay(part.german, partNormalKey, false)
                                }
                                aria-label={`Listen to separated word ${part.german}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                              >
                                {playingKey === partNormalKey ? (
                                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Volume2 className="w-3 h-3" aria-hidden="true" />
                                )}
                                <span>Listen</span>
                              </button>
                              <button
                                type="button"
                                disabled={playingKey !== null}
                                onClick={() =>
                                  handlePlay(part.german, partSlowKey, true)
                                }
                                aria-label={`Listen to separated word ${part.german} slowly`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                              >
                                {playingKey === partSlowKey ? (
                                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Turtle className="w-3 h-3" aria-hidden="true" />
                                )}
                                <span>Slow</span>
                              </button>
                              <SpeakCheckButton
                                targetText={part.german}
                                devanagari={part.devanagari}
                                variant="compact"
                              />
                            </div>
                          )}
                        </div>
                      </Fragment>
                    );
                  })}
                </div>

                {wordFormation.explanation && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {wordFormation.explanation}
                  </p>
                )}
              </div>
            )
          )}
        </section>
      )}

      {/* Linguee-Style Sample Sentences with Slow / Normal German Audio */}
      <section aria-labelledby="example-heading" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="example-heading"
            className="font-display text-xl sm:text-2xl font-semibold text-slate-900"
          >
            Example Sentences in Context
          </h2>
          <span className="text-xs text-slate-500">
            Play any sentence in German at normal or slow speed
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
          {sentenceList.map((ex, idx) => {
            const normalKey = `sent-normal-${idx}`;
            const slowKey = `sent-slow-${idx}`;
            return (
              <div
                key={`${ex.german}-${idx}`}
                className="p-4 sm:p-5 bg-white grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 items-start"
              >
                <div className="space-y-1.5">
                  <p className="text-[15px] font-semibold text-slate-900 leading-snug">
                    {ex.german}
                  </p>
                  {ex.devanagari && (
                    <p className="font-devanagari text-sm font-medium text-blue-800 leading-relaxed">
                      {ex.devanagari}
                    </p>
                  )}
                  <div className="pt-1.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={playingKey !== null}
                      onClick={() => handlePlay(ex.german, normalKey, false)}
                      aria-label={`Read sentence ${idx + 1} at normal speed`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
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
                      onClick={() => handlePlay(ex.german, slowKey, true)}
                      aria-label={`Read sentence ${idx + 1} at slow speed`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      {playingKey === slowKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Slow</span>
                    </button>

                    <SpeakCheckButton
                      targetText={ex.german}
                      devanagari={ex.devanagari}
                      variant="compact"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-sm md:border-l md:border-slate-100 md:pl-4">
                  <p className="text-slate-700 leading-relaxed">{ex.english}</p>
                  {ex.hindi && (
                    <p className="font-devanagari text-xs text-slate-500 leading-relaxed">
                      {ex.hindi}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Linguee-Style Related Phrases & Collocations */}
        {entry.collocations && entry.collocations.length > 0 && (
          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-slate-600">
              Common Phrases &amp; Collocations
            </h3>
            <ul className="mt-3 divide-y divide-slate-200/70">
              {entry.collocations.map((col, colIdx) => {
                const colKey = `col-${colIdx}`;
                return (
                  <li
                    key={`${col.german}-${colIdx}`}
                    className="py-2.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <button
                        type="button"
                        onClick={() => onLookupPhrase(col.german)}
                        className="font-medium text-slate-900 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 rounded-sm"
                      >
                        {col.article && (
                          <span className="text-xs text-slate-400 font-normal">
                            {col.article}{' '}
                          </span>
                        )}
                        <span>{col.german}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      </button>
                      <span className="font-devanagari text-xs text-blue-700">
                        {col.devanagari}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        —
                      </span>
                      <span className="text-slate-600">{col.english}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={playingKey !== null}
                        onClick={() =>
                          handlePlay(
                            col.german,
                            colKey,
                            playbackSpeed === 'slow',
                          )
                        }
                        aria-label={`Listen to phrase ${col.german}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-600 hover:text-blue-700 bg-white border border-slate-200 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                      >
                        {playingKey === colKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{playbackSpeed === 'slow' ? 'Slow' : 'Listen'}</span>
                      </button>
                      <SpeakCheckButton
                        targetText={col.german}
                        devanagari={col.devanagari}
                        variant="compact"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Interactive Syllable-by-Syllable Breakdown */}
      <section aria-labelledby="syllable-heading" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="syllable-heading"
            className="font-display text-xl sm:text-2xl font-semibold text-slate-900"
          >
            Syllable-by-Syllable Breakdown for Hindi Speakers
          </h2>
          <span className="text-xs text-slate-500">
            Select any sound chunk to inspect lip &amp; tongue posture
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Select syllable to inspect mouth posture"
          className="mt-4 flex flex-wrap gap-2"
        >
          {entry.syllables.map((syl, index) => {
            const isSelected = index === selectedSyllableIdx;
            return (
              <button
                key={syl.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedSyllableIdx(index)}
                className={`px-4 py-2.5 min-h-[44px] rounded-lg border text-left transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-baseline gap-2 whitespace-nowrap">
                  <span className="text-sm font-semibold">{syl.segment}</span>
                  <span
                    className={`font-devanagari text-sm ${
                      isSelected ? 'text-blue-100' : 'text-blue-700'
                    }`}
                  >
                    {syl.devanagari}
                  </span>
                </div>
                <div
                  className={`mt-0.5 text-[11px] font-mono whitespace-nowrap ${
                    isSelected ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {syl.ipa}
                  {syl.stressed ? ' · stressed' : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Articulation Diagram for the Selected Syllable */}
        {activeSyllable && (
          <div className="mt-5">
            <ArticulationDiagram syllable={activeSyllable} />
          </div>
        )}

        {/* Complete Editorial Syllable Breakdown List */}
        <ol className="mt-6 divide-y divide-slate-200/80 border-t border-b border-slate-200/80">
          {entry.syllables.map((syl, index) => {
            const isSelected = index === selectedSyllableIdx;
            const diffMeta = getDifficultyMeta(syl.difficulty);
            const chunkKey = `syl-${syl.id}`;

            return (
              <li
                key={syl.id}
                className={`py-5 transition-colors duration-150 ${
                  isSelected ? 'bg-blue-50/35 -mx-4 px-4 rounded-lg' : ''
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSyllableIdx(index)}
                      className="text-left font-semibold text-base text-slate-900 hover:text-blue-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 rounded-sm"
                    >
                      <span>{syl.segment}</span>{' '}
                      <span className="font-devanagari text-blue-800">({syl.devanagari})</span>
                    </button>
                    <span className="font-mono text-xs text-slate-500">{syl.ipa}</span>
                    {syl.stressed && (
                      <span className="text-xs font-medium text-blue-700">· Primary stress</span>
                    )}
                    <span className={`text-xs font-medium ${diffMeta.textClass}`}>
                      <span aria-hidden="true">· {diffMeta.symbol} </span>
                      {diffMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={playingKey !== null}
                      onClick={() => {
                        setSelectedSyllableIdx(index);
                        const target = resolveSyllableAudioTarget({
                          segment: syl.segment,
                          word: entry.word,
                          ipa: syl.ipa,
                          wordIpa: entry.ipa,
                        });
                        handlePlay(
                          target.text,
                          chunkKey,
                          target.forceSlow || playbackSpeed === 'slow',
                          target.ipa,
                        );
                      }}
                      aria-label={`Hear sound ${syl.segment}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] text-xs font-medium text-slate-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      {playingKey === chunkKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Hear</span>
                    </button>
                    <SpeakCheckButton
                      targetText={
                        resolveSyllableAudioTarget({
                          segment: syl.segment,
                          word: entry.word,
                          ipa: syl.ipa,
                          wordIpa: entry.ipa,
                        }).text
                      }
                      displayLabel={`${syl.segment} in ${entry.word}`}
                      devanagari={syl.devanagari}
                      ipa={syl.ipa}
                      variant="compact"
                    />
                  </div>
                </div>

                <p className="mt-2 text-[15px] leading-relaxed text-slate-700 max-w-[68ch]">
                  {syl.explanation}
                </p>

                {syl.mouthSteps && syl.mouthSteps.length > 0 && (
                  <div className="mt-3.5 bg-slate-50 border border-slate-200/90 rounded-lg p-4 max-w-[68ch]">
                    <p className="text-xs font-semibold text-slate-700">How to make this sound</p>
                    <ol className="mt-2 space-y-1.5 list-decimal list-inside text-sm leading-relaxed text-slate-800">
                      {syl.mouthSteps.map((step, stepIdx) => (
                        <li key={stepIdx} className="font-devanagari">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {syl.quickShortcut && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-[68ch]">
                    <span className="font-semibold text-slate-800">Quick shortcut: </span>
                    <span className="font-devanagari">{syl.quickShortcut}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}
