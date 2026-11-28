import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react';
import { GERMAN_ALPHABET } from '../data/basicsAlphabet';
import {
  ALL_PRONOUNS,
  CALENDAR_LIST,
  CORE_NUMBERS,
  PARTS_OF_SPEECH_GUIDES,
  PRONUNCIATION_RULES,
  QUESTION_WORDS,
  WEEKDAYS_LIST,
} from '../data/basicsReference';
import type {
  BasicsExampleWord,
  BasicsSubTab,
  PronounCategory,
} from '../types/basics';
import { playGermanAudio } from '../utils/audioPlayer';
import { describeGermanNumber } from '../utils/germanNumbers';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';

interface BasicsHubViewProps {
  onLookupWordInDictionary: (word: string) => void;
}

const SUB_TABS: { id: BasicsSubTab; label: string }[] = [
  { id: 'alphabet', label: 'Alphabet' },
  { id: 'pronunciation', label: 'Pronunciation Rules' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'pronouns', label: 'Pronouns' },
  { id: 'pos', label: 'Parts of Speech' },
  { id: 'questions', label: 'Question Words' },
];

const PRONOUN_TABS: { id: PronounCategory | 'all'; label: string; hint: string }[] = [
  {
    id: 'nominative',
    label: 'Nominative (Subject)',
    hint: 'The doer of the action — answers "Who?" (Wer?). Example: Ich lerne Deutsch.',
  },
  {
    id: 'accusative',
    label: 'Accusative (Direct Object)',
    hint: 'Receives the direct action — answers "Whom?" (Wen?). Example: Er sieht mich.',
  },
  {
    id: 'dative',
    label: 'Dative (Indirect Object)',
    hint: 'Recipient of the action — answers "To whom?" (Wem?). Example: Kannst du mir helfen?',
  },
  {
    id: 'possessive',
    label: 'Possessive (My / Your)',
    hint: 'Shows ownership. Add -e before feminine or plural nouns (mein Buch, meine Tasche).',
  },
  {
    id: 'other',
    label: 'Reflexive & Indefinite',
    hint: 'Essential everyday pronouns like sich (oneself), man (one/people), jemand, niemand, alles.',
  },
  {
    id: 'all',
    label: 'All Pronouns',
    hint: 'Complete overview of all 34 German pronouns across every case and usage.',
  },
];

function cleanSpokenGerman(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function BasicsHubView({ onLookupWordInDictionary }: BasicsHubViewProps) {
  const [activeTab, setActiveTab] = useState<BasicsSubTab>('alphabet');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  // 1. Alphabet state
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [extraWordsByLetter, setExtraWordsByLetter] = useState<Record<string, BasicsExampleWord[]>>(
    {},
  );
  const [hasMoreByLetter, setHasMoreByLetter] = useState<Record<string, boolean>>({});
  const [loadingMoreLetter, setLoadingMoreLetter] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // 2. Pronunciation rules filter
  const [ruleCategory, setRuleCategory] = useState<'all' | 'vowels' | 'length' | 'consonants'>(
    'all',
  );

  // 3. Numbers state (interactive converter + group filter)
  const [numberInput, setNumberInput] = useState<string>('47');
  const [numberGroup, setNumberGroup] = useState<'all' | '0-20' | 'tens' | 'compounds' | 'large'>(
    'all',
  );

  // 6. Pronouns filter
  const [pronounCategory, setPronounCategory] = useState<PronounCategory | 'all'>('nominative');

  // 7. Parts of speech filter
  const [selectedPosId, setSelectedPosId] = useState<string>('all');

  const handleSpeak = async (id: string, text: string, slow = false) => {
    const spoken = cleanSpokenGerman(text);
    if (!spoken) return;
    setAudioNotice(null);
    setPlayingId(id);
    try {
      const result = await playGermanAudio(spoken, { slow });
      if (result.error) {
        setAudioNotice(result.error);
      }
    } finally {
      setPlayingId((curr) => (curr === id ? null : curr));
    }
  };

  const currentLetterEntry = useMemo(
    () => GERMAN_ALPHABET.find((item) => item.letter === selectedLetter) ?? GERMAN_ALPHABET[0],
    [selectedLetter],
  );

  const displayedLetterWords = useMemo(() => {
    const extra = extraWordsByLetter[currentLetterEntry.letter] ?? [];
    return [...currentLetterEntry.examples, ...extra];
  }, [currentLetterEntry, extraWordsByLetter]);

  const canLoadMoreForLetter = hasMoreByLetter[currentLetterEntry.letter] ?? true;

  const handleLoadMoreLetterWords = async () => {
    const letter = currentLetterEntry.letter;
    setLoadMoreError(null);
    setLoadingMoreLetter(letter);
    try {
      const excludeParam = displayedLetterWords.map((w) => w.word.toLowerCase()).join(',');
      const res = await fetch(
        `/api/basics/alphabet-words?letter=${encodeURIComponent(letter)}&offset=0&limit=5&exclude=${encodeURIComponent(excludeParam)}`,
      );
      if (!res.ok) {
        throw new Error('Could not load additional words right now.');
      }
      const data = (await res.json()) as {
        words?: BasicsExampleWord[];
        hasMore?: boolean;
      };
      const newWords = Array.isArray(data.words) ? data.words : [];
      if (newWords.length > 0) {
        setExtraWordsByLetter((prev) => ({
          ...prev,
          [letter]: [...(prev[letter] ?? []), ...newWords],
        }));
      }
      setHasMoreByLetter((prev) => ({
        ...prev,
        [letter]: Boolean(data.hasMore) && newWords.length > 0,
      }));
    } catch {
      setLoadMoreError('Could not load more words right now. Please try again.');
    } finally {
      setLoadingMoreLetter(null);
    }
  };

  const filteredRules = useMemo(() => {
    if (ruleCategory === 'all') return PRONUNCIATION_RULES;
    return PRONUNCIATION_RULES.filter((r) => r.category === ruleCategory);
  }, [ruleCategory]);

  const parsedNumber = useMemo(() => {
    const trimmed = numberInput.trim();
    if (!trimmed) return { valid: false, error: 'Enter any number from 0 to 999,999.', data: null };
    if (!/^\d+$/.test(trimmed)) {
      return { valid: false, error: 'Digits only (0 to 999,999).', data: null };
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < 0 || num > 999999) {
      return { valid: false, error: 'Enter a whole number between 0 and 999,999.', data: null };
    }
    return { valid: true, error: null, data: describeGermanNumber(num) };
  }, [numberInput]);

  const filteredNumbers = useMemo(() => {
    if (numberGroup === 'all') return CORE_NUMBERS;
    return CORE_NUMBERS.filter((n) => n.group === numberGroup);
  }, [numberGroup]);

  const filteredPronouns = useMemo(() => {
    if (pronounCategory === 'all') return ALL_PRONOUNS;
    return ALL_PRONOUNS.filter((p) => p.category === pronounCategory);
  }, [pronounCategory]);

  const activePronounHint = useMemo(
    () => PRONOUN_TABS.find((t) => t.id === pronounCategory)?.hint ?? '',
    [pronounCategory],
  );

  const filteredPosGuides = useMemo(() => {
    if (selectedPosId === 'all') return PARTS_OF_SPEECH_GUIDES;
    return PARTS_OF_SPEECH_GUIDES.filter((g) => g.id === selectedPosId);
  }, [selectedPosId]);

  const monthsList = useMemo(
    () => CALENDAR_LIST.filter((c) => c.group === 'month'),
    [],
  );
  const seasonsList = useMemo(
    () => CALENDAR_LIST.filter((c) => c.group === 'season'),
    [],
  );
  const daysOnlyList = useMemo(
    () => WEEKDAYS_LIST.filter((w) => w.group === 'weekday'),
    [],
  );
  const timeWordsList = useMemo(
    () => WEEKDAYS_LIST.filter((w) => w.group === 'time-word'),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              German Foundations · हिंदी सीखने वालों के लिए
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
              German Basics &amp; Grammar Reference
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Master the German alphabet, pronunciation combinations, numbers, weekdays, calendar,
              pronouns, parts of speech, and question words — every word and example sentence plays
              clean German audio.
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div
          role="tablist"
          aria-label="German Basics sections"
          className="flex flex-wrap gap-2 pt-2 border-t border-slate-100"
        >
          {SUB_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {audioNotice && (
          <div
            role="status"
            className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5"
          >
            {audioNotice}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 1. ALPHABET                                                       */}
      {/* ================================================================= */}
      {activeTab === 'alphabet' && (
        <section aria-label="German Alphabet" className="space-y-6">
          {/* 30-Letter Picker Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Choose a Letter (26 Letters + Ä, Ö, Ü, ß)
              </h2>
              <span className="text-xs text-slate-500">
                Tap any letter for its German name, pronunciation, and example words
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {GERMAN_ALPHABET.map((item) => {
                const isActive = item.letter === currentLetterEntry.letter;
                const isSpecial = ['Ä', 'Ö', 'Ü', 'ß'].includes(item.letter);
                return (
                  <button
                    key={item.letter}
                    type="button"
                    onClick={() => {
                      setSelectedLetter(item.letter);
                      setLoadMoreError(null);
                    }}
                    aria-pressed={isActive}
                    aria-label={`Letter ${item.letter}, pronounced ${item.nameGerman}`}
                    className={`flex flex-col items-center justify-center py-2 px-1.5 min-h-[54px] rounded-lg border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      isActive
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : isSpecial
                          ? 'bg-amber-50/70 border-amber-200 text-slate-900 hover:bg-amber-100'
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-display text-lg font-semibold leading-none">
                      {item.letter}
                    </span>
                    <span
                      className={`text-[11px] mt-1 leading-none ${
                        isActive ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {item.nameGerman}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Letter Spotlight */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <span className="font-display text-3xl sm:text-4xl font-semibold text-blue-800">
                    {currentLetterEntry.displayPair}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
                      Letter Name: {currentLetterEntry.nameGerman}
                    </h2>
                    <span className="font-devanagari text-xl font-semibold text-blue-700">
                      {currentLetterEntry.devanagariName}
                    </span>
                    <span className="font-mono text-sm text-slate-500">
                      {currentLetterEntry.ipa}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{currentLetterEntry.soundSummary}</p>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Hindi Tip:</span>{' '}
                    {currentLetterEntry.hindiTip}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    void handleSpeak(
                      `letter-${currentLetterEntry.letter}`,
                      currentLetterEntry.spokenLetterPrompt,
                      false,
                    )
                  }
                  aria-label={`Listen to German letter ${currentLetterEntry.letter}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {playingId === `letter-${currentLetterEntry.letter}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>Listen to Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleSpeak(
                      `letter-slow-${currentLetterEntry.letter}`,
                      currentLetterEntry.spokenLetterPrompt,
                      true,
                    )
                  }
                  aria-label={`Listen slowly to German letter ${currentLetterEntry.letter}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>Slow</span>
                </button>
                <SpeakCheckButton
                  targetText={currentLetterEntry.spokenLetterPrompt}
                  displayLabel={`Letter ${currentLetterEntry.letter} (${currentLetterEntry.nameGerman})`}
                  devanagari={currentLetterEntry.devanagariName}
                  ipa={currentLetterEntry.ipa}
                  variant="primary"
                />
              </div>
            </div>
          </div>

          {/* Example Words Grid */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-semibold text-slate-900">
                Example Words for “{currentLetterEntry.letter}” ({displayedLetterWords.length})
              </h3>
              <span className="text-xs text-slate-500">
                Audio speaks each word cleanly without der / die / das
              </span>
            </div>

            <div
              data-testid="alphabet-words-grid"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {displayedLetterWords.map((item, idx) => {
                const wordKey = `alpha-word-${currentLetterEntry.letter}-${idx}-${item.word}`;
                const wordSlowKey = `${wordKey}-slow`;
                const sentKey = `alpha-sent-${currentLetterEntry.letter}-${idx}-${item.word}`;
                return (
                  <article
                    key={`${item.word}-${idx}`}
                    data-testid="alphabet-word-card"
                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            {item.article && (
                              <span className="text-sm font-medium text-slate-400">
                                {item.article}
                              </span>
                            )}
                            <h4 className="font-display text-xl font-semibold text-slate-900 break-words">
                              {item.word}
                            </h4>
                            <span className="font-devanagari text-base font-medium text-blue-700">
                              {item.devanagari}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5">
                            <span>{item.english}</span>
                            {item.hindi && (
                              <span className="font-devanagari text-slate-600">
                                {' '}
                                · {item.hindi}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleSpeak(wordKey, item.word, false)}
                            aria-label={`Listen to word ${item.word}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                          >
                            {playingId === wordKey ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Listen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSpeak(wordSlowKey, item.word, true)}
                            aria-label={`Listen slowly to word ${item.word}`}
                            className="px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Slow
                          </button>
                          <SpeakCheckButton
                            targetText={item.word}
                            devanagari={item.devanagari}
                            variant="compact"
                            className="min-h-[36px]"
                          />
                        </div>
                      </div>

                      {/* Example Sentence */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 leading-snug">
                            {item.sentenceGerman}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleSpeak(sentKey, item.sentenceGerman, false)}
                              aria-label={`Listen to example sentence for ${item.word}`}
                              className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                            >
                              {playingId === sentKey ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                            <SpeakCheckButton targetText={item.sentenceGerman} variant="icon" />
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{item.sentenceEnglish}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        {item.source === 'corpus' ? 'From 382k German Dictionary' : 'Curated A1 Word'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onLookupWordInDictionary(item.word)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
                      >
                        <span>Open in Dictionary</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {loadMoreError && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
                {loadMoreError}
              </p>
            )}

            <div className="flex justify-center pt-1">
              {canLoadMoreForLetter ? (
                <button
                  type="button"
                  onClick={() => void handleLoadMoreLetterWords()}
                  disabled={loadingMoreLetter === currentLetterEntry.letter}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {loadingMoreLetter === currentLetterEntry.letter ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" aria-hidden="true" />
                  ) : (
                    <Plus className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  )}
                  <span>
                    {loadingMoreLetter === currentLetterEntry.letter
                      ? `Loading more words for ${currentLetterEntry.letter}...`
                      : `Load 5 More Words for ${currentLetterEntry.letter}`}
                  </span>
                </button>
              ) : (
                <p className="text-xs text-slate-500">
                  You have loaded all available dictionary words for “{currentLetterEntry.letter}”.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 2. PRONUNCIATION TECHNIQUES                                       */}
      {/* ================================================================= */}
      {activeTab === 'pronunciation' && (
        <section aria-label="German Pronunciation Techniques" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                German Letter Combinations &amp; Pronunciation Rules
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                German spelling is consistent — learn these {PRONUNCIATION_RULES.length} rules once
                and you can read almost any German word accurately.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Rules' },
                  { id: 'vowels', label: 'Vowels (ie, ei, au, eu)' },
                  { id: 'length', label: 'Double Letters & Silent H' },
                  { id: 'consonants', label: 'Consonants (ch, sch, sp/st, z)' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setRuleCategory(cat.id)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    ruleCategory === cat.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRules.map((rule) => {
              const sentKey = `rule-sent-${rule.id}`;
              const sentSlowKey = `rule-sent-slow-${rule.id}`;
              return (
                <article
                  key={rule.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <span className="font-display text-2xl font-semibold text-blue-800">
                          {rule.pattern}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">
                          →
                        </span>
                        <span className="text-base font-semibold text-slate-900">
                          {rule.soundsLike}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-devanagari text-lg font-semibold text-blue-700">
                          {rule.devanagari}
                        </span>
                        <span className="font-mono text-xs text-slate-500">{rule.ipa}</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">{rule.ruleExplanation}</p>

                    <div className="bg-blue-50/70 border border-blue-100 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800">
                      <span className="font-semibold text-blue-900">Hindi Memory Trick: </span>
                      <span>{rule.hindiTrick}</span>
                    </div>

                    {/* Clickable Example Words */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rule.examples.map((ex) => {
                        const exKey = `rule-ex-${rule.id}-${ex.word}`;
                        return (
                          <div
                            key={ex.word}
                            className="flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() => void handleSpeak(exKey, ex.word, false)}
                              aria-label={`Listen to example word ${ex.word}`}
                              className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left rounded-md px-1 py-0.5 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  {ex.article && (
                                    <span className="text-[11px] text-slate-400">{ex.article}</span>
                                  )}
                                  <span className="text-sm font-semibold text-slate-900 truncate">
                                    {ex.word}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 truncate">
                                  <span className="font-devanagari text-blue-700">
                                    {ex.devanagari}
                                  </span>{' '}
                                  · {ex.english}
                                </div>
                              </div>
                              {playingId === exKey ? (
                                <Loader2
                                  className="w-3.5 h-3.5 animate-spin text-blue-700 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Volume2
                                  className="w-3.5 h-3.5 text-blue-700 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                            <SpeakCheckButton
                              targetText={ex.word}
                              devanagari={ex.devanagari}
                              variant="icon"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rule Example Sentence */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{rule.sentenceGerman}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sentKey, rule.sentenceGerman, false)}
                          aria-label={`Listen to sentence for ${rule.pattern}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                        >
                          {playingId === sentKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sentSlowKey, rule.sentenceGerman, true)}
                          aria-label={`Listen slowly to sentence for ${rule.pattern}`}
                          className="px-2 py-1 min-h-[32px] text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Slow
                        </button>
                        <SpeakCheckButton targetText={rule.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{rule.sentenceEnglish}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. NUMBERS (INTERACTIVE SPELLER + COMPLETE REFERENCE)             */}
      {/* ================================================================= */}
      {activeTab === 'numbers' && (
        <section aria-label="German Numbers" className="space-y-6">
          {/* Interactive Any-Number Converter */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 shrink-0">
                <Hash className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Interactive Any-Number Converter (0 to 999,999)
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Type any number to hear its exact German pronunciation, see the reversed ones-first
                  pattern, and practice it in a sentence.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label
                  htmlFor="basics-number-input"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5"
                >
                  Enter any number (0–999,999)
                </label>
                <input
                  id="basics-number-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="e.g. 147"
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">Try:</span>
                {['21', '47', '147', '589', '2026'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNumberInput(preset)}
                    className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      numberInput === preset
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {!parsedNumber.valid || !parsedNumber.data ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
                {parsedNumber.error}
              </p>
            ) : (
              <div
                data-testid="generated-number-card"
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="font-mono text-lg font-semibold text-blue-700">
                        {parsedNumber.data.value.toLocaleString()}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        =
                      </span>
                      <span className="font-display text-2xl font-semibold text-slate-900 break-all">
                        {parsedNumber.data.german}
                      </span>
                    </div>
                    <p className="font-devanagari text-lg text-blue-700 mt-1">
                      {parsedNumber.data.devanagari}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        void handleSpeak('gen-num-word', parsedNumber.data!.german, false)
                      }
                      aria-label={`Listen to number ${parsedNumber.data.value}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      {playingId === 'gen-num-word' ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>Listen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleSpeak('gen-num-word-slow', parsedNumber.data!.german, true)
                      }
                      aria-label={`Listen slowly to number ${parsedNumber.data.value}`}
                      className="px-3 py-2 min-h-[40px] bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Slow
                    </button>
                    <SpeakCheckButton
                      targetText={parsedNumber.data.german}
                      displayLabel={`${parsedNumber.data.value.toLocaleString()} (${parsedNumber.data.german})`}
                      devanagari={parsedNumber.data.devanagari}
                      variant="primary"
                    />
                  </div>
                </div>

                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">How it is built: </span>
                  {parsedNumber.data.breakdownNote}
                </p>

                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {parsedNumber.data.sentenceGerman}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {parsedNumber.data.sentenceEnglish}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        void handleSpeak('gen-num-sent', parsedNumber.data!.sentenceGerman, false)
                      }
                      aria-label="Listen to generated number example sentence"
                      className="p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 shrink-0 cursor-pointer"
                    >
                      {playingId === 'gen-num-sent' ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                    <SpeakCheckButton
                      targetText={parsedNumber.data.sentenceGerman}
                      variant="icon"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Complete Numbers Chart */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-slate-900">
                All Core German Numbers with Example Sentences
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: '0-20', label: '0–20' },
                    { id: 'tens', label: 'Tens (30–90)' },
                    { id: 'compounds', label: '21–99 Rule' },
                    { id: 'large', label: '100 & Above' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setNumberGroup(g.id)}
                    className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      numberGroup === g.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNumbers.map((num) => {
                const wKey = `num-w-${num.value}`;
                const sKey = `num-s-${num.value}`;
                return (
                  <article
                    key={num.value}
                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span className="font-mono text-lg font-bold text-blue-700 shrink-0">
                          {num.value.toLocaleString()}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-display text-xl font-semibold text-slate-900 break-words">
                            {num.german}
                          </h4>
                          <p className="text-sm text-slate-600 font-devanagari">
                            {num.devanagari}
                            {num.hindiNumeral ? ` · ${num.hindiNumeral}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(wKey, num.german, false)}
                          aria-label={`Listen to German number ${num.german}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer"
                        >
                          {playingId === wKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSpeak(`${wKey}-slow`, num.german, true)}
                          aria-label={`Listen slowly to German number ${num.german}`}
                          className="px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        >
                          Slow
                        </button>
                        <SpeakCheckButton
                          targetText={num.german}
                          devanagari={num.devanagari}
                          variant="compact"
                          className="min-h-[36px]"
                        />
                      </div>
                    </div>

                    {num.note && (
                      <p className="text-xs text-blue-900 bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2">
                        {num.note}
                      </p>
                    )}

                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{num.sentenceGerman}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{num.sentenceEnglish}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, num.sentenceGerman, false)}
                          aria-label={`Listen to example sentence for ${num.german}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <SpeakCheckButton targetText={num.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 4. WEEKDAYS                                                       */}
      {/* ================================================================= */}
      {activeTab === 'weekdays' && (
        <section aria-label="German Weekdays" className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-950">
            <span className="font-semibold">Grammar Shortcut:</span> All 7 weekdays in German are{' '}
            <span className="font-semibold">masculine (der)</span>. To say “on Monday”, use{' '}
            <span className="font-semibold">am</span> (am Montag, am Dienstag, am Wochenende).
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Days of the Week (Die Wochentage)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {daysOnlyList.map((day) => {
                const wKey = `day-w-${day.german}`;
                const sKey = `day-s-${day.german}`;
                return (
                  <article
                    key={day.german}
                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {day.shortForm && (
                          <span className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-800 shrink-0">
                            {day.shortForm}
                          </span>
                        )}
                        <div>
                          <div className="flex flex-wrap items-baseline gap-2">
                            {day.article && (
                              <span className="text-sm text-slate-400">{day.article}</span>
                            )}
                            <h3 className="font-display text-xl font-semibold text-slate-900">
                              {day.german}
                            </h3>
                            <span className="font-devanagari text-base text-blue-700 font-medium">
                              {day.devanagari}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5">
                            {day.english}{' '}
                            <span className="font-devanagari text-slate-600">· {day.hindi}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(wKey, day.german, false)}
                          aria-label={`Listen to ${day.german}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer"
                        >
                          {playingId === wKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSpeak(`${wKey}-slow`, day.german, true)}
                          aria-label={`Listen slowly to ${day.german}`}
                          className="px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        >
                          Slow
                        </button>
                        <SpeakCheckButton
                          targetText={day.german}
                          devanagari={day.devanagari}
                          variant="compact"
                          className="min-h-[36px]"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{day.sentenceGerman}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{day.sentenceEnglish}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, day.sentenceGerman, false)}
                          aria-label={`Listen to example sentence for ${day.german}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <SpeakCheckButton targetText={day.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Useful Everyday Day Words
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timeWordsList.map((tw) => {
                const wKey = `tw-w-${tw.german}`;
                const sKey = `tw-s-${tw.german}`;
                return (
                  <article
                    key={tw.german}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-baseline gap-2">
                          {tw.article && (
                            <span className="text-sm text-slate-400">{tw.article}</span>
                          )}
                          <h4 className="font-display text-lg font-semibold text-slate-900">
                            {tw.german}
                          </h4>
                          <span className="font-devanagari text-base text-blue-700">
                            {tw.devanagari}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-0.5">
                          {tw.english}{' '}
                          <span className="font-devanagari text-slate-600">· {tw.hindi}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(wKey, tw.german, false)}
                          aria-label={`Listen to ${tw.german}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer shrink-0"
                        >
                          {playingId === wKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>
                        <SpeakCheckButton
                          targetText={tw.german}
                          devanagari={tw.devanagari}
                          variant="compact"
                          className="min-h-[36px]"
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tw.sentenceGerman}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{tw.sentenceEnglish}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, tw.sentenceGerman, false)}
                          aria-label={`Listen to example sentence for ${tw.german}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <SpeakCheckButton targetText={tw.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 5. CALENDAR NAMES (12 MONTHS + 4 SEASONS)                         */}
      {/* ================================================================= */}
      {activeTab === 'calendar' && (
        <section aria-label="German Months and Seasons" className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-950 flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-semibold">Grammar Shortcut:</span> All 12 months and all 4
              seasons are <span className="font-semibold">masculine (der)</span>. Use{' '}
              <span className="font-semibold">im</span> for “in” (im Januar, im Juli, im Sommer).
            </p>
          </div>

          {/* 12 Months */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              12 Months of the Year (Die Monate)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthsList.map((m, idx) => {
                const wKey = `month-w-${m.german}`;
                const sKey = `month-s-${m.german}`;
                return (
                  <article
                    key={m.german}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Month {idx + 1} · {m.shortForm}
                        </span>
                        <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400">{m.article}</span>
                          <h3 className="font-display text-lg font-semibold text-slate-900">
                            {m.german}
                          </h3>
                        </div>
                        <p className="font-devanagari text-sm text-blue-700 font-medium">
                          {m.devanagari}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {m.english} · <span className="font-devanagari">{m.hindi}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(wKey, m.german, false)}
                          aria-label={`Listen to month ${m.german}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer shrink-0"
                        >
                          {playingId === wKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>
                        <SpeakCheckButton
                          targetText={m.german}
                          devanagari={m.devanagari}
                          variant="icon"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-900">
                          {m.sentenceGerman}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{m.sentenceEnglish}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, m.sentenceGerman, false)}
                          aria-label={`Listen to example sentence for ${m.german}`}
                          className="p-1.5 min-w-[30px] min-h-[30px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <SpeakCheckButton targetText={m.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* 4 Seasons */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              4 Seasons (Die Jahreszeiten)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seasonsList.map((s) => {
                const wKey = `season-w-${s.german}`;
                const sKey = `season-s-${s.german}`;
                return (
                  <article
                    key={s.german}
                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm text-slate-400">{s.article}</span>
                          <h3 className="font-display text-xl font-semibold text-slate-900">
                            {s.german}
                          </h3>
                          <span className="font-devanagari text-base text-blue-700 font-medium">
                            {s.devanagari}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-0.5">
                          {s.english}{' '}
                          <span className="font-devanagari text-slate-600">· {s.hindi}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(wKey, s.german, false)}
                          aria-label={`Listen to season ${s.german}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer shrink-0"
                        >
                          {playingId === wKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>
                        <SpeakCheckButton
                          targetText={s.german}
                          devanagari={s.devanagari}
                          variant="compact"
                          className="min-h-[36px]"
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.sentenceGerman}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{s.sentenceEnglish}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, s.sentenceGerman, false)}
                          aria-label={`Listen to example sentence for ${s.german}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <SpeakCheckButton targetText={s.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 6. ALL PRONOUNS                                                   */}
      {/* ================================================================= */}
      {activeTab === 'pronouns' && (
        <section aria-label="German Pronouns" className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-slate-900">
                All German Pronouns (Personal, Possessive &amp; Reflexive)
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRONOUN_TABS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPronounCategory(cat.id)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    pronounCategory === cat.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <p className="text-sm text-slate-600">{activePronounHint}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPronouns.map((p, idx) => {
              const wKey = `pro-w-${p.category}-${idx}`;
              const sKey = `pro-s-${p.category}-${idx}`;
              return (
                <article
                  key={`${p.category}-${p.german}-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-display text-xl font-semibold text-slate-900">
                          {p.german}
                        </h3>
                        <span className="font-devanagari text-base font-medium text-blue-700">
                          {p.devanagari}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {p.english}{' '}
                        <span className="font-devanagari text-slate-600">· {p.hindi}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{p.note}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleSpeak(wKey, p.german, false)}
                        aria-label={`Listen to pronoun ${p.german}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer"
                      >
                        {playingId === wKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Listen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSpeak(`${wKey}-slow`, p.german, true)}
                        aria-label={`Listen slowly to pronoun ${p.german}`}
                        className="px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      >
                        Slow
                      </button>
                      <SpeakCheckButton
                        targetText={p.german}
                        devanagari={p.devanagari}
                        variant="compact"
                        className="min-h-[36px]"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{p.sentenceGerman}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, p.sentenceGerman, false)}
                          aria-label={`Listen to example sentence for ${p.german}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <SpeakCheckButton targetText={p.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{p.sentenceEnglish}</p>
                    <p className="text-xs font-devanagari text-slate-500">{p.sentenceHindi}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 7. PARTS OF SPEECH TECHNIQUES                                     */}
      {/* ================================================================= */}
      {activeTab === 'pos' && (
        <section aria-label="German Parts of Speech Techniques" className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-700" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Parts of Speech Techniques (Wortarten)
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Practical shortcuts for German Nouns, Verbs, Adjectives, Adverbs, Articles,
              Prepositions, and Conjunctions so you can build accurate sentences quickly.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedPosId('all')}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  selectedPosId === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All 7 Parts of Speech
              </button>
              {PARTS_OF_SPEECH_GUIDES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedPosId(g.id)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    selectedPosId === g.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g.nameEnglish}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {filteredPosGuides.map((guide) => (
              <article
                key={guide.id}
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-slate-900">
                      {guide.nameEnglish}{' '}
                      <span className="text-slate-400 font-normal">· {guide.nameGerman}</span>
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{guide.summary}</p>
                  </div>
                  <span className="font-devanagari text-sm font-semibold text-blue-700">
                    {guide.devanagari}
                  </span>
                </div>

                {/* Techniques */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Key Techniques &amp; Memory Rules</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-800 list-disc pl-5">
                    {guide.keyTechniques.map((tip, i) => (
                      <li key={i} className="leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Examples */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {guide.examples.map((ex, i) => {
                    const wKey = `pos-w-${guide.id}-${i}`;
                    const sKey = `pos-s-${guide.id}-${i}`;
                    return (
                      <div
                        key={`${guide.id}-${ex.german}-${i}`}
                        className="bg-slate-50 border border-slate-200/90 rounded-lg p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              {ex.article && (
                                <span className="text-xs text-slate-400">{ex.article}</span>
                              )}
                              <span className="font-display text-base font-semibold text-slate-900">
                                {ex.german}
                              </span>
                            </div>
                            <p className="font-devanagari text-xs text-blue-700 font-medium">
                              {ex.devanagari}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {ex.english} · <span className="font-devanagari">{ex.hindi}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleSpeak(wKey, ex.german, false)}
                              aria-label={`Listen to ${ex.german}`}
                              className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                            >
                              {playingId === wKey ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                            <SpeakCheckButton
                              targetText={ex.german}
                              devanagari={ex.devanagari}
                              variant="icon"
                            />
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-md p-2.5 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-slate-900 leading-snug">
                              {ex.sentenceGerman}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {ex.sentenceEnglish}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleSpeak(sKey, ex.sentenceGerman, false)}
                              aria-label={`Listen to example sentence for ${ex.german}`}
                              className="p-1 min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded bg-slate-50 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                            >
                              {playingId === sKey ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Volume2 className="w-3 h-3" aria-hidden="true" />
                              )}
                            </button>
                            <SpeakCheckButton targetText={ex.sentenceGerman} variant="icon" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 8. ALL QUESTION WORDS (W-FRAGEN)                                  */}
      {/* ================================================================= */}
      {activeTab === 'questions' && (
        <section aria-label="German Question Words" className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-950 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-semibold">W-Fragen Rule:</span> Place the question word at{' '}
              <span className="font-semibold">Position 1</span> and the conjugated verb immediately
              at <span className="font-semibold">Position 2</span> — e.g.{' '}
              <em>Wo wohnst du?</em> (Where do you live?).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold text-slate-900">
              All {QUESTION_WORDS.length} German Question Words (W-Fragen)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTION_WORDS.map((q) => {
              const wKey = `q-w-${q.german}`;
              const sKey = `q-s-${q.german}`;
              const sSlowKey = `q-s-slow-${q.german}`;
              return (
                <article
                  key={q.german}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-display text-xl font-semibold text-slate-900">
                          {q.german}
                        </h3>
                        <span className="font-devanagari text-base font-medium text-blue-700">
                          {q.devanagari}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {q.english}{' '}
                        <span className="font-devanagari text-slate-600">· {q.hindi}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{q.usageTip}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleSpeak(wKey, q.german, false)}
                        aria-label={`Listen to question word ${q.german}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer"
                      >
                        {playingId === wKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Listen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSpeak(`${wKey}-slow`, q.german, true)}
                        aria-label={`Listen slowly to question word ${q.german}`}
                        className="px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      >
                        Slow
                      </button>
                      <SpeakCheckButton
                        targetText={q.german}
                        devanagari={q.devanagari}
                        variant="compact"
                        className="min-h-[36px]"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{q.sentenceGerman}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sKey, q.sentenceGerman, false)}
                          aria-label={`Listen to example question for ${q.german}`}
                          className="p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                        >
                          {playingId === sKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSpeak(sSlowKey, q.sentenceGerman, true)}
                          aria-label={`Listen slowly to example question for ${q.german}`}
                          className="px-2 py-1 min-h-[32px] text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Slow
                        </button>
                        <SpeakCheckButton targetText={q.sentenceGerman} variant="icon" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{q.sentenceEnglish}</p>
                    <p className="text-xs font-devanagari text-slate-500">{q.sentenceHindi}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
