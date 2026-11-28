import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  CloudOff,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Loader2,
  LogOut,
  MessageSquare,
  Play,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  Turtle,
  Volume2,
  X,
  Youtube,
} from 'lucide-react';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';
import {
  CORE_A1_LESSON_COUNT,
  YOUTUBE_A1_LESSONS,
  YOUTUBE_COURSE_STAGES,
} from '../data/youtubeA1';
import type {
  LessonQuizSummary,
  YoutubeA1Lesson,
  YoutubeCourseStageId,
  YoutubeLessonProgressRecord,
} from '../types/youtubeCourse';
import { playGermanAudio } from '../utils/audioPlayer';
import {
  MAX_PERSONAL_NOTES_LENGTH,
  YOUTUBE_A1_PLAYLIST_URL,
  buildYoutubeEmbedUrl,
  buildYoutubeThumbnailUrl,
  buildYoutubeWatchUrl,
  filterYoutubeLessons,
  formatLessonNotebookExport,
  gradeLessonExercises,
  type YoutubeLessonFilterMode,
} from '../utils/youtubeCourse';

export interface YoutubeCloudUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
}

interface YoutubeCourseViewProps {
  progressMap: Record<string, YoutubeLessonProgressRecord>;
  cloudUser: YoutubeCloudUser | null;
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  authError: string | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onSaveLessonProgress: (
    lesson: YoutubeA1Lesson,
    patch: Partial<Omit<YoutubeLessonProgressRecord, 'lessonId' | 'lessonNumber'>>,
  ) => void;
  onLookupWordInDictionary: (word: string) => void;
}

type LessonWorkspaceTab = 'notes' | 'practice' | 'exercises';

const GERMAN_SPECIAL_CHARS = ['ä', 'ö', 'ü', 'ß'];

export function YoutubeCourseView({
  progressMap,
  cloudUser,
  isAuthLoading,
  isSyncingCloud,
  authError,
  onSignInGoogle,
  onSignOut,
  onSaveLessonProgress,
  onLookupWordInDictionary,
}: YoutubeCourseViewProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(YOUTUBE_A1_LESSONS[0].id);
  const [activeTab, setActiveTab] = useState<LessonWorkspaceTab>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<YoutubeCourseStageId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<YoutubeLessonFilterMode>('all');
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  // Video player toggle (lazy embed on click so page loads fast)
  const [showEmbeddedPlayer, setShowEmbeddedPlayer] = useState(false);

  // Audio playback feedback
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  // Personal notes editor state
  const [draftNotes, setDraftNotes] = useState('');
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [copiedNotebook, setCopiedNotebook] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lessonContentRef = useRef<HTMLDivElement | null>(null);

  // Practice flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardOrder, setCardOrder] = useState<number[]>([]);
  const [practiceLoggedToast, setPracticeLoggedToast] = useState(false);

  // Exercise quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSummary, setQuizSummary] = useState<LessonQuizSummary | null>(null);

  const activeLesson = useMemo(
    () => YOUTUBE_A1_LESSONS.find((l) => l.id === selectedLessonId) ?? YOUTUBE_A1_LESSONS[0],
    [selectedLessonId],
  );

  const activeLessonIndex = useMemo(
    () => YOUTUBE_A1_LESSONS.findIndex((l) => l.id === activeLesson.id),
    [activeLesson.id],
  );

  const activeStage = useMemo(
    () => YOUTUBE_COURSE_STAGES.find((s) => s.id === activeLesson.stageId),
    [activeLesson.stageId],
  );

  const activeProgress = progressMap[activeLesson.id];

  const filteredLessons = useMemo(
    () =>
      filterYoutubeLessons(YOUTUBE_A1_LESSONS, {
        query: searchQuery,
        stageId: stageFilter,
        mode: statusFilter,
        progressMap,
      }),
    [searchQuery, stageFilter, statusFilter, progressMap],
  );

  // Overall course stats
  const courseStats = useMemo(() => {
    let completedCore = 0;
    let completedBonus = 0;
    let notesWritten = 0;
    let scoredCount = 0;
    let scoreSum = 0;

    for (const lesson of YOUTUBE_A1_LESSONS) {
      const rec = progressMap[lesson.id];
      if (!rec) continue;
      if (rec.completed) {
        if (lesson.isBonus) completedBonus += 1;
        else completedCore += 1;
      }
      if (rec.personalNotes.trim().length > 0) {
        notesWritten += 1;
      }
      if (rec.bestExerciseScore > 0) {
        scoredCount += 1;
        scoreSum += rec.bestExerciseScore;
      }
    }

    return {
      completedCore,
      completedBonus,
      corePercent: Math.round((completedCore / CORE_A1_LESSON_COUNT) * 100),
      notesWritten,
      avgScore: scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 0,
      scoredCount,
    };
  }, [progressMap]);

  // Reset per-lesson UI states when switching lessons
  useEffect(() => {
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setDraftNotes(progressMap[activeLesson.id]?.personalNotes ?? '');
    setNotesSaveStatus('idle');
    setShowEmbeddedPlayer(false);
    setCopiedNotebook(false);
    setPracticeLoggedToast(false);
    setQuizAnswers({});
    setQuizSummary(null);
    setCardIndex(0);
    setCardFlipped(false);
    setCardOrder(activeLesson.vocabulary.map((_, i) => i));
    // Intentionally sync only when activeLesson.id changes; cloud note updates sync below if idle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson.id]);

  // Hydrate personal notes if cloud sync delivers newer notes while user isn't actively editing
  useEffect(() => {
    const stored = activeProgress?.personalNotes ?? '';
    if (notesSaveStatus === 'idle' && stored !== draftNotes && draftNotes === '') {
      setDraftNotes(stored);
    }
  }, [activeProgress?.personalNotes, notesSaveStatus, draftNotes]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSelectLesson = (lessonId: string) => {
    // Flush unsaved notes immediately before switching
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      if (draftNotes !== (activeProgress?.personalNotes ?? '')) {
        onSaveLessonProgress(activeLesson, { personalNotes: draftNotes });
      }
    }
    setSelectedLessonId(lessonId);
    setMobileRailOpen(false);
    if (window.innerWidth < 1024) {
      window.setTimeout(() => {
        lessonContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handlePlayAudio = async (key: string, germanText: string, slow: boolean) => {
    setPlayingAudioKey(key);
    await playGermanAudio(germanText, { slow });
    setPlayingAudioKey((curr) => (curr === key ? null : curr));
  };

  const handleNotesChange = (value: string) => {
    const capped = value.slice(0, MAX_PERSONAL_NOTES_LENGTH);
    setDraftNotes(capped);
    setNotesSaveStatus('saving');

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      onSaveLessonProgress(activeLesson, { personalNotes: capped });
      setNotesSaveStatus('saved');
      autoSaveTimerRef.current = null;
    }, 650);
  };

  const handleSaveNotesNow = () => {
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    onSaveLessonProgress(activeLesson, { personalNotes: draftNotes });
    setNotesSaveStatus('saved');
  };

  const handleCopyStudySheet = async () => {
    const text = formatLessonNotebookExport(activeLesson, {
      lessonId: activeLesson.id,
      lessonNumber: activeLesson.lessonNumber,
      completed: Boolean(activeProgress?.completed),
      personalNotes: draftNotes,
      bestExerciseScore: activeProgress?.bestExerciseScore ?? 0,
      practiceCount: activeProgress?.practiceCount ?? 0,
      updatedAtMs: Date.now(),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotebook(true);
      window.setTimeout(() => setCopiedNotebook(false), 2200);
    } catch {
      // Clipboard blocked in restricted contexts
    }
  };

  const handleToggleCompleted = () => {
    onSaveLessonProgress(activeLesson, {
      completed: !activeProgress?.completed,
    });
  };

  const handleLogPracticeSession = () => {
    const nextCount = (activeProgress?.practiceCount ?? 0) + 1;
    onSaveLessonProgress(activeLesson, { practiceCount: nextCount });
    setPracticeLoggedToast(true);
    window.setTimeout(() => setPracticeLoggedToast(false), 2400);
  };

  const handleShuffleCards = () => {
    const indices = activeLesson.vocabulary.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setCardOrder(indices);
    setCardIndex(0);
    setCardFlipped(false);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (quizSummary) {
      setQuizSummary(null);
    }
  };

  const handleAppendSpecialChar = (questionId: string, char: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: `${prev[questionId] ?? ''}${char}`,
    }));
    if (quizSummary) {
      setQuizSummary(null);
    }
  };

  const handleCheckExercises = () => {
    const graded = gradeLessonExercises(activeLesson.exercises, quizAnswers);
    setQuizSummary(graded);

    const prevBest = activeProgress?.bestExerciseScore ?? 0;
    const nextBest = Math.max(prevBest, graded.percentage);
    onSaveLessonProgress(activeLesson, {
      bestExerciseScore: nextBest,
      ...(graded.passed ? { completed: true } : {}),
    });
  };

  const handleResetExercises = () => {
    setQuizAnswers({});
    setQuizSummary(null);
  };

  const currentVocabIndex = cardOrder[cardIndex] ?? 0;
  const currentCard = activeLesson.vocabulary[currentVocabIndex] ?? activeLesson.vocabulary[0];

  const prevLesson = activeLessonIndex > 0 ? YOUTUBE_A1_LESSONS[activeLessonIndex - 1] : null;
  const nextLesson =
    activeLessonIndex >= 0 && activeLessonIndex < YOUTUBE_A1_LESSONS.length - 1
      ? YOUTUBE_A1_LESSONS[activeLessonIndex + 1]
      : null;

  const isCompleted = Boolean(activeProgress?.completed);
  const bestScore = activeProgress?.bestExerciseScore ?? 0;
  const practiceSessions = activeProgress?.practiceCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Course Banner & Digital Notebook Progress */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-700">
              <Youtube className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span className="uppercase tracking-wider">Learn German · A1 Free Course</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-slate-600 font-medium">64 Core Lessons + 2 Bonus Videos</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Learn German YouTube — Digital A1 Notebook
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Structured grammar notes with Hindi tips, interactive flashcards, speaking dialogues,
              graded exercises, and your personal notebook for every lesson — no hard copy needed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={YOUTUBE_A1_PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>Open Full Playlist</span>
            </a>
          </div>
        </div>

        {/* Progress Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Core A1 Progress</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {courseStats.completedCore} / {CORE_A1_LESSON_COUNT} ({courseStats.corePercent}%)
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-700 transition-all duration-300"
                style={{ width: `${Math.min(100, courseStats.corePercent)}%` }}
              />
            </div>
            {courseStats.completedBonus > 0 && (
              <p className="text-[11px] text-emerald-700 font-medium">
                +{courseStats.completedBonus} bonus video{courseStats.completedBonus > 1 ? 's' : ''} completed
              </p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Personal Notes Saved</p>
              <p className="font-display text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {courseStats.notesWritten}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">
                  {courseStats.notesWritten === 1 ? 'lesson' : 'lessons'}
                </span>
              </p>
            </div>
            <FileText className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Exercise Average</p>
              <p className="font-display text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {courseStats.scoredCount > 0 ? `${courseStats.avgScore}%` : '—'}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">
                  ({courseStats.scoredCount} graded)
                </span>
              </p>
            </div>
            <ClipboardCheck className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* Cloud Sync Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {isAuthLoading ? (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              Checking notebook sync…
            </span>
          ) : cloudUser ? (
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>
                Notebook synced to{' '}
                <strong className="font-semibold text-slate-900">
                  {cloudUser.displayName || cloudUser.email}
                </strong>
              </span>
              {isSyncingCloud && (
                <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  Syncing…
                </span>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                <LogOut className="w-3 h-3" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <CloudOff className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                Notes are saved on this browser automatically. Sign in to sync across phone &amp; laptop.
              </span>
              <button
                type="button"
                onClick={onSignInGoogle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer shrink-0"
              >
                <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                Sign in with Google to Sync
              </button>
            </div>
          )}
          {authError && <p className="text-amber-700 font-medium">{authError}</p>}
        </div>
      </section>

      {/* Main 2-Column Workspace: 66-Lesson Curriculum Rail + Active Lesson Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Rail: Curriculum Browser */}
        <aside className="bg-white border border-slate-200 rounded-2xl overflow-hidden lg:sticky lg:top-20">
          {/* Mobile Collapse Header */}
          <button
            type="button"
            onClick={() => setMobileRailOpen((o) => !o)}
            aria-expanded={mobileRailOpen}
            className="lg:hidden w-full px-4 py-3.5 flex items-center justify-between text-left bg-slate-50 border-b border-slate-200 cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                All 66 Playlist Videos
              </p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                Lesson {activeLesson.lessonNumber}: {activeLesson.shortTitle}
              </p>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-500 transition-transform ${
                mobileRailOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          <div className={`${mobileRailOpen ? 'block' : 'hidden'} lg:block`}>
            {/* Search & Filters */}
            <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lesson #, topic, or German..."
                  aria-label="Search YouTube A1 lessons"
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear lesson search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as YoutubeCourseStageId | 'all')}
                aria-label="Filter lessons by stage"
                className="w-full px-2.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All 8 Stages (64 Core + 2 Bonus)</option>
                {YOUTUBE_COURSE_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.title} ({stage.lessonRange})
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'core-64', label: 'Core 64' },
                    { id: 'incomplete', label: 'To Do' },
                    { id: 'completed', label: 'Done' },
                    { id: 'with-notes', label: 'Notes' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setStatusFilter(mode.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                      statusFilter === mode.id
                        ? 'bg-blue-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtered Count */}
            <div className="px-3.5 py-2 text-[11px] font-medium text-slate-500 border-b border-slate-100 flex items-center justify-between">
              <span>
                Showing {filteredLessons.length} of {YOUTUBE_A1_LESSONS.length} videos
              </span>
              {(searchQuery || stageFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStageFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-blue-700 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Scrollable Lesson List */}
            <div
              role="list"
              aria-label="Learn German A1 YouTube lesson list"
              className="max-h-[540px] lg:max-h-[650px] overflow-y-auto divide-y divide-slate-100"
            >
              {filteredLessons.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <p>No lessons match this filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStageFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-blue-700 font-medium hover:underline cursor-pointer"
                  >
                    Show all 66 lessons
                  </button>
                </div>
              ) : (
                filteredLessons.map((lesson) => {
                  const rec = progressMap[lesson.id];
                  const isActive = lesson.id === activeLesson.id;
                  const done = Boolean(rec?.completed);
                  const hasNotes = Boolean(rec?.personalNotes?.trim());
                  const score = rec?.bestExerciseScore ?? 0;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      role="listitem"
                      onClick={() => handleSelectLesson(lesson.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full px-3.5 py-3 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/90 border-l-[3px] border-l-blue-700'
                          : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-semibold tabular-nums flex items-center justify-center shrink-0 mt-0.5 ${
                          done
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isActive
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {done ? (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          String(lesson.lessonNumber).padStart(2, '0')
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p
                            className={`text-xs sm:text-[13px] font-semibold leading-snug truncate ${
                              isActive ? 'text-blue-950' : 'text-slate-900'
                            }`}
                          >
                            {lesson.shortTitle}
                          </p>
                          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                            {lesson.duration}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {lesson.germanTopic}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-medium">
                          {lesson.isBonus && (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Bonus
                            </span>
                          )}
                          {hasNotes && (
                            <span className="text-blue-700 inline-flex items-center gap-0.5">
                              <FileText className="w-3 h-3" aria-hidden="true" />
                              Note
                            </span>
                          )}
                          {score > 0 && (
                            <span className="text-emerald-700 tabular-nums">Best: {score}%</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Right Stage: Active Lesson Header + Video + Notes / Practice / Exercises */}
        <div ref={lessonContentRef} className="min-w-0 space-y-5">
          {/* Active Lesson Header & Video Card */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="text-blue-700 font-semibold">
                    {activeLesson.isBonus
                      ? `Bonus Video #${activeLesson.lessonNumber}`
                      : `Lesson ${activeLesson.lessonNumber} of ${CORE_A1_LESSON_COUNT}`}
                  </span>
                  {activeStage && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{activeStage.title}</span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="tabular-nums">{activeLesson.duration}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
                  {activeLesson.shortTitle}
                </h2>
                <p className="text-sm font-medium text-blue-800">{activeLesson.germanTopic}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleCompleted}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
                </button>

                <div className="inline-flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white">
                  <button
                    type="button"
                    disabled={!prevLesson}
                    onClick={() => prevLesson && handleSelectLesson(prevLesson.id)}
                    aria-label="Previous lesson"
                    className="px-2.5 py-2 min-h-[38px] text-slate-700 hover:bg-slate-50 disabled:opacity-35 cursor-pointer border-r border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={!nextLesson}
                    onClick={() => nextLesson && handleSelectLesson(nextLesson.id)}
                    aria-label="Next lesson"
                    className="px-2.5 py-2 min-h-[38px] text-slate-700 hover:bg-slate-50 disabled:opacity-35 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{activeLesson.summary}</p>

            {/* Video Preview / On-Demand Embedded Player */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              {showEmbeddedPlayer ? (
                <div>
                  <div className="relative w-full aspect-video bg-slate-900">
                    <iframe
                      src={buildYoutubeEmbedUrl(activeLesson.videoId)}
                      title={activeLesson.youtubeTitle}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-white border-t border-slate-200 text-xs">
                    <span className="text-slate-600 truncate">{activeLesson.youtubeTitle}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={buildYoutubeWatchUrl(activeLesson.videoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 font-medium hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        Watch on YouTube
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowEmbeddedPlayer(false)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-md cursor-pointer"
                      >
                        Collapse Video
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setShowEmbeddedPlayer(true)}
                    className="relative w-full sm:w-44 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0 group cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                    aria-label={`Play video for Lesson ${activeLesson.lessonNumber}`}
                  >
                    <img
                      src={buildYoutubeThumbnailUrl(activeLesson.videoId)}
                      alt={activeLesson.youtubeTitle}
                      loading="lazy"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30 group-hover:bg-slate-900/20 transition-colors">
                      <span className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                        <Play className="w-4 h-4 fill-current ml-0.5" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-slate-900/85 text-white rounded tabular-nums">
                      {activeLesson.duration}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                      {activeLesson.youtubeTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEmbeddedPlayer(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span>Play Video Here</span>
                      </button>
                      <a
                        href={buildYoutubeWatchUrl(activeLesson.videoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Watch on YouTube</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3 Lesson Mode Tabs: Notes | Practice | Exercises */}
            <div
              role="tablist"
              aria-label="Lesson study sections"
              className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100"
            >
              {(
                [
                  { id: 'notes', label: 'Notes & Notebook', icon: BookOpen },
                  { id: 'practice', label: 'Practice', icon: MessageSquare },
                  { id: 'exercises', label: 'Exercises', icon: ClipboardCheck },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] text-xs sm:text-sm font-semibold rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                    {tab.id === 'exercises' && bestScore > 0 && (
                      <span
                        className={`hidden sm:inline-block text-[11px] px-1.5 py-0.5 rounded tabular-nums ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {bestScore}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* TAB 1: NOTES & DIGITAL NOTEBOOK */}
          {activeTab === 'notes' && (
            <div className="space-y-5">
              {/* Key Formula Highlight */}
              <section className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                  Key Formula to Remember
                </p>
                <p className="mt-1 text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                  {activeLesson.keyFormula}
                </p>
              </section>

              {/* Core Structured Lesson Notes */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Lesson Notes &amp; Grammar Rules
                  </h3>
                  <button
                    type="button"
                    onClick={() => void handleCopyStudySheet()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                  >
                    {copiedNotebook ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span className="text-emerald-700">Copied Study Sheet</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy Study Sheet</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {activeLesson.notes.map((point, idx) => (
                    <div
                      key={point.heading}
                      className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 space-y-1.5">
                          <h4 className="text-sm font-semibold text-slate-900">{point.heading}</h4>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {point.explanation}
                          </p>
                          {point.hindiTip && (
                            <p className="text-xs sm:text-sm font-devanagari text-blue-950 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
                              <strong className="font-semibold">हिंदी टिप:</strong> {point.hindiTip}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Common Mistake Callout */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle
                    className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                    <span className="font-semibold">Common Mistake to Avoid: </span>
                    {activeLesson.commonMistake}
                  </div>
                </div>
              </section>

              {/* Vocabulary & Expressions Table */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Key Vocabulary &amp; Phrases ({activeLesson.vocabulary.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Listen at normal or slow speed, verify your pronunciation, or open any word in
                    the dictionary.
                  </p>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {activeLesson.vocabulary.map((item, idx) => {
                    const normalKey = `vocab-n-${activeLesson.id}-${idx}`;
                    const slowKey = `vocab-s-${activeLesson.id}-${idx}`;
                    const cleanLookupWord = item.german.split(/[/(,!?]/)[0].trim();

                    return (
                      <div
                        key={`${item.german}-${idx}`}
                        className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                            <span className="text-base font-semibold text-slate-900">
                              {item.german}
                            </span>
                            <span className="font-devanagari text-sm font-medium text-blue-700">
                              {item.devanagari}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700">
                            {item.english}{' '}
                            <span className="text-slate-300 mx-1">·</span>
                            <span className="font-devanagari text-slate-600">{item.hindi}</span>
                          </p>
                          {item.note && (
                            <p className="text-[11px] text-slate-500">{item.note}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handlePlayAudio(normalKey, item.german, false)}
                            aria-label={`Listen to ${item.german}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                          >
                            {playingAudioKey === normalKey ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Listen</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handlePlayAudio(slowKey, item.german, true)}
                            aria-label={`Listen slowly to ${item.german}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[32px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            {playingAudioKey === slowKey ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Slow</span>
                          </button>

                          <SpeakCheckButton
                            targetText={item.german}
                            devanagari={item.devanagari}
                            variant="compact"
                          />

                          {cleanLookupWord.split(/\s+/).length <= 3 && (
                            <button
                              type="button"
                              onClick={() => onLookupWordInDictionary(cleanLookupWord)}
                              title="Open full pronunciation breakdown in Dictionary"
                              className="px-2 py-1.5 min-h-[32px] text-xs font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md cursor-pointer"
                            >
                              Dictionary
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* My Personal Digital Notebook */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      My Personal Study Notes (Lesson {activeLesson.lessonNumber})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Jot down extra examples, doubts, or Hindi memory hooks while watching the video.
                      Auto-saves here so you don&apos;t need a paper notebook.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 tabular-nums">
                      {draftNotes.length} / {MAX_PERSONAL_NOTES_LENGTH}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveNotesNow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Save Notes</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={draftNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={5}
                  maxLength={MAX_PERSONAL_NOTES_LENGTH}
                  aria-label={`Personal study notes for Lesson ${activeLesson.lessonNumber}`}
                  placeholder={`Write your own examples or takeaways from Lesson ${activeLesson.lessonNumber}: ${activeLesson.shortTitle}...`}
                  className="w-full p-3.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {notesSaveStatus === 'saving'
                      ? 'Saving note…'
                      : notesSaveStatus === 'saved'
                        ? cloudUser
                          ? 'Saved & synced to your Google account.'
                          : 'Saved locally on this device.'
                        : draftNotes.trim().length > 0
                          ? 'Personal note saved for this lesson.'
                          : 'Start typing — auto-saves after you pause.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('practice')}
                    className="font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Next: Speaking Practice →
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: PRACTICE (FLASHCARDS + GUIDED SPEAKING DIALOGUE) */}
          {activeTab === 'practice' && (
            <div className="space-y-5">
              {/* Interactive Active Recall Flashcards */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-700" aria-hidden="true" />
                      Active Recall Flashcards
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Say the German phrase aloud from the English &amp; Hindi cue, then flip to check
                      and verify your pronunciation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 tabular-nums">
                      Card {cardIndex + 1} / {activeLesson.vocabulary.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleShuffleCards}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Shuffle</span>
                    </button>
                  </div>
                </div>

                {currentCard && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="text-center space-y-2 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {cardFlipped ? 'German Answer' : 'Translate & Speak in German'}
                      </span>
                      <p className="text-lg sm:text-xl font-semibold text-slate-900">
                        {currentCard.english}
                      </p>
                      <p className="font-devanagari text-base text-slate-600">
                        {currentCard.hindi}
                      </p>

                      {cardFlipped && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-1.5">
                          <p className="font-display text-2xl sm:text-3xl font-semibold text-blue-800">
                            {currentCard.german}
                          </p>
                          <p className="font-devanagari text-lg font-semibold text-slate-700">
                            {currentCard.devanagari}
                          </p>
                          {currentCard.note && (
                            <p className="text-xs text-slate-500">{currentCard.note}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCardFlipped((f) => !f)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                      >
                        {cardFlipped ? (
                          <>
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                            <span>Hide Answer</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" aria-hidden="true" />
                            <span>Reveal German Answer</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handlePlayAudio(`card-n-${currentVocabIndex}`, currentCard.german, false)
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        {playingAudioKey === `card-n-${currentVocabIndex}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>Listen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handlePlayAudio(`card-s-${currentVocabIndex}`, currentCard.german, true)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs sm:text-sm font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        <Turtle className="w-4 h-4" aria-hidden="true" />
                        <span>Slow</span>
                      </button>

                      <SpeakCheckButton
                        targetText={currentCard.german}
                        devanagari={currentCard.devanagari}
                        variant="primary"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setCardIndex((prev) =>
                            prev === 0 ? activeLesson.vocabulary.length - 1 : prev - 1,
                          );
                          setCardFlipped(false);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        Previous Card
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCardIndex((prev) => (prev + 1) % activeLesson.vocabulary.length);
                          setCardFlipped(false);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        Next Card
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Guided Speaking Dialogue */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      Guided Speaking Dialogue
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Shadow each line aloud using Listen + Verify to build natural A1 speaking flow.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-600 tabular-nums">
                    Logged sessions: <strong className="text-slate-900">{practiceSessions}</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {activeLesson.practiceDialogue.map((line, idx) => {
                    const lineKey = `dlg-n-${activeLesson.id}-${idx}`;
                    const lineSlowKey = `dlg-s-${activeLesson.id}-${idx}`;
                    return (
                      <div
                        key={`${line.speaker}-${idx}`}
                        className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            {line.speaker}
                          </span>
                          <p className="text-base font-semibold text-slate-900 leading-snug">
                            {line.german}
                          </p>
                          <p className="font-devanagari text-sm font-medium text-blue-700">
                            {line.devanagari}
                          </p>
                          <p className="text-xs text-slate-600">
                            {line.english} <span className="text-slate-300 mx-1">·</span>
                            <span className="font-devanagari">{line.hindi}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handlePlayAudio(lineKey, line.german, false)}
                            aria-label={`Listen to line ${idx + 1}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                          >
                            {playingAudioKey === lineKey ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Listen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePlayAudio(lineSlowKey, line.german, true)}
                            aria-label={`Listen slowly to line ${idx + 1}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[32px] text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                          >
                            <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Slow</span>
                          </button>
                          <SpeakCheckButton
                            targetText={line.german}
                            devanagari={line.devanagari}
                            variant="compact"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLogPracticeSession}
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>Log Completed Practice Session</span>
                    </button>
                    {practiceLoggedToast && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Practice session #{practiceSessions} logged!
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('exercises')}
                    className="text-xs sm:text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Next: Graded Exercises →
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: GRADED EXERCISES */}
          {activeTab === 'exercises' && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Lesson {activeLesson.lessonNumber} Exercises ({activeLesson.exercises.length}{' '}
                    Questions)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mix of multiple choice and fill-in-the-blank. Score 60% or higher to pass and
                    auto-mark this lesson complete.
                  </p>
                </div>
                {bestScore > 0 && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg tabular-nums">
                    Best Score: {bestScore}%
                  </span>
                )}
              </div>

              {/* Graded Result Summary Banner */}
              {quizSummary && (
                <div
                  role="status"
                  className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    quizSummary.passed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div>
                    <p className="text-sm sm:text-base font-semibold">
                      Score: {quizSummary.correctCount} / {quizSummary.totalCount} (
                      {quizSummary.percentage}%) —{' '}
                      {quizSummary.passed ? 'Lesson Passed!' : 'Keep Practicing'}
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      {quizSummary.passed
                        ? 'Great work! This lesson is marked complete in your A1 notebook.'
                        : 'Review the explanations below and try again to hit 60% or higher.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetExercises}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Try Again
                    </button>
                    {nextLesson && (
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectLesson(nextLesson.id);
                          setActiveTab('notes');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg cursor-pointer"
                      >
                        Next Lesson ({nextLesson.lessonNumber})
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Question Cards */}
              <div className="space-y-4">
                {activeLesson.exercises.map((q, idx) => {
                  const userVal = quizAnswers[q.id] ?? '';
                  const gradedItem = quizSummary?.results.find((r) => r.questionId === q.id);

                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 space-y-3 ${
                        gradedItem
                          ? gradedItem.isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-rose-50/40 border-rose-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                          <span className="text-blue-700 mr-1.5 tabular-nums">Q{idx + 1}.</span>
                          {q.prompt}
                        </p>
                        <span className="text-[11px] font-medium text-slate-500 uppercase shrink-0">
                          {q.type === 'mcq' ? 'Multiple Choice' : 'Fill in Blank'}
                        </span>
                      </div>

                      {q.hint && (
                        <p className="text-xs text-slate-500">
                          <strong>Hint:</strong> {q.hint}
                        </p>
                      )}

                      {q.type === 'mcq' && q.options ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => {
                            const selected = userVal === opt;
                            const showRight = gradedItem && opt === q.correctAnswer;
                            const showWrong = gradedItem && selected && !gradedItem.isCorrect;

                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleAnswerChange(q.id, opt)}
                                aria-pressed={selected}
                                className={`px-3.5 py-2.5 text-left text-sm rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                  showRight
                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-semibold'
                                    : showWrong
                                      ? 'bg-rose-100 border-rose-500 text-rose-950 font-semibold'
                                      : selected
                                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                                }`}
                              >
                                <span>{opt}</span>
                                {showRight && (
                                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                                )}
                                {showWrong && (
                                  <X className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                              type="text"
                              value={userVal}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              placeholder="Type your German answer..."
                              aria-label={`Answer for question ${idx + 1}`}
                              className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                            <div className="flex items-center gap-1">
                              {GERMAN_SPECIAL_CHARS.map((ch) => (
                                <button
                                  key={ch}
                                  type="button"
                                  onClick={() => handleAppendSpecialChar(q.id, ch)}
                                  aria-label={`Insert ${ch}`}
                                  className="w-8 h-8 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-800 cursor-pointer"
                                >
                                  {ch}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {gradedItem && (
                        <div
                          className={`text-xs sm:text-sm rounded-lg p-3 ${
                            gradedItem.isCorrect
                              ? 'bg-emerald-100/70 text-emerald-950'
                              : 'bg-rose-100/70 text-rose-950'
                          }`}
                        >
                          <p className="font-semibold">
                            {gradedItem.isCorrect
                              ? 'Correct!'
                              : `Correct answer: ${gradedItem.correctAnswer}`}
                          </p>
                          <p className="mt-0.5 leading-relaxed">{gradedItem.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCheckExercises}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Check Answers</span>
                </button>

                {quizSummary && (
                  <button
                    type="button"
                    onClick={handleResetExercises}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear &amp; Retry</span>
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
