import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquare,
  Volume2,
} from 'lucide-react';
import type { A1Module } from '../types/a1';
import { playGermanAudio } from '../utils/audioPlayer';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';

interface A1CurriculumPanelProps {
  modules: A1Module[];
  activeModuleId: string;
  completedLessonIds: string[];
  masteredVocabIds: string[];
  onSelectModule: (moduleId: string) => void;
  onToggleCompleteModule: (moduleId: string) => void;
  onToggleMasterVocab: (vocabId: string) => void;
  onLookupWordInDictionary: (word: string) => void;
}

export function A1CurriculumPanel({
  modules,
  activeModuleId,
  completedLessonIds,
  masteredVocabIds,
  onSelectModule,
  onToggleCompleteModule,
  onToggleMasterVocab,
  onLookupWordInDictionary,
}: A1CurriculumPanelProps) {
  const activeModule = modules.find((m) => m.id === activeModuleId) ?? modules[0];
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [quizSelections, setQuizSelections] = useState<Record<string, number>>({});
  const [quizSubmittedByModule, setQuizSubmittedByModule] = useState<Record<string, boolean>>({});

  const isModuleCompleted = completedLessonIds.includes(activeModule.id);
  const isQuizSubmitted = Boolean(quizSubmittedByModule[activeModule.id]);

  const handlePlay = async (key: string, text: string, slow: boolean, ipa?: string) => {
    setPlayingKey(key);
    setAudioNotice(null);
    const result = await playGermanAudio(text, { slow, ipa });
    setPlayingKey((current) => (current === key ? null : current));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  const moduleVocabMasteredCount = activeModule.vocabulary.filter((v) =>
    masteredVocabIds.includes(v.id),
  ).length;

  const checkpointAnsweredCount = activeModule.checkpoint.filter(
    (q) => typeof quizSelections[q.id] === 'number',
  ).length;

  const checkpointCorrectCount = activeModule.checkpoint.filter(
    (q) => quizSelections[q.id] === q.correctIndex,
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-6 items-start">
      {/* Left rail: 8-module syllabus */}
      <aside
        aria-label="Goethe A1 syllabus modules"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            A1 Syllabus
          </span>
          <span className="text-xs font-medium text-slate-600 tabular-nums">
            {completedLessonIds.length}/{modules.length} done
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {modules.map((mod) => {
            const selected = mod.id === activeModule.id;
            const done = completedLessonIds.includes(mod.id);
            const masteredInMod = mod.vocabulary.filter((v) =>
              masteredVocabIds.includes(v.id),
            ).length;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                  selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle
                      className={`w-4 h-4 ${selected ? 'text-blue-700' : 'text-slate-300'}`}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        selected ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      Modul {mod.number}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {masteredInMod}/{mod.vocabulary.length} words
                    </span>
                  </div>
                  <p
                    className={`text-sm font-semibold mt-0.5 leading-snug ${
                      selected ? 'text-slate-900' : 'text-slate-800'
                    }`}
                  >
                    {mod.germanTitle}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{mod.englishTitle}</p>
                  <p className="text-xs text-slate-500 font-devanagari mt-0.5">{mod.hindiTitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main module lesson canvas */}
      <div className="space-y-6 min-w-0">
        {audioNotice && (
          <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {audioNotice}
          </div>
        )}

        {/* Module header card */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 tabular-nums">
                Modul {activeModule.number} of {modules.length} · ~{activeModule.estimatedMinutes}{' '}
                min · {moduleVocabMasteredCount}/{activeModule.vocabulary.length} words mastered
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                {activeModule.germanTitle}
              </h2>
              <p className="text-sm text-slate-600">
                {activeModule.englishTitle} ·{' '}
                <span className="font-devanagari text-slate-700">{activeModule.hindiTitle}</span>
              </p>
              <p className="text-sm text-slate-700 pt-1">
                <span className="font-semibold text-slate-900">Goethe A1 Can-Do:</span>{' '}
                {activeModule.canDoStatement}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleCompleteModule(activeModule.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isModuleCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-blue-700 border-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isModuleCompleted ? 'Module Completed' : 'Mark Module Complete'}</span>
            </button>
          </div>
        </section>

        {/* Grammar for Hindi speakers */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Grammar &amp; Hindi Contrast
            </h3>
          </div>

          <div className="space-y-2">
            <h4 className="font-display text-lg font-semibold text-slate-900">
              {activeModule.grammarTitle}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {activeModule.grammarExplanation}
            </p>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 font-devanagari leading-relaxed">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-blue-700 block mb-1">
                Hindi Bridge (हिंदी से तुलना)
              </span>
              {activeModule.hindiComparison}
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {activeModule.grammarExamples.map((ex, idx) => {
              const normalKey = `${activeModule.id}-gram-n-${idx}`;
              const slowKey = `${activeModule.id}-gram-s-${idx}`;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{ex.german}</p>
                    <p className="text-sm font-devanagari text-blue-800">{ex.devanagari}</p>
                    <p className="text-xs text-slate-600">
                      {ex.english} · <span className="font-devanagari">{ex.hindi}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handlePlay(normalKey, ex.german, false)}
                      disabled={playingKey !== null}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-60"
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
                      onClick={() => void handlePlay(slowKey, ex.german, true)}
                      disabled={playingKey !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {playingKey === slowKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Slow</span>
                    </button>
                    <SpeakCheckButton
                      targetText={ex.german}
                      devanagari={ex.devanagari}
                      variant="compact"
                      className="min-h-[34px]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Core A1 Vocabulary (bare word pronunciation without der/die/das) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Core A1 Vocabulary ({activeModule.vocabulary.length} Words)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audio pronounces each German word directly (without der/die/das) in Normal or Slow
                speed.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-600 tabular-nums">
              {moduleVocabMasteredCount}/{activeModule.vocabulary.length} mastered
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeModule.vocabulary.map((item) => {
              const mastered = masteredVocabIds.includes(item.id);
              const normalKey = `vocab-n-${item.id}`;
              const slowKey = `vocab-s-${item.id}`;
              return (
                <article
                  key={item.id}
                  className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                    mastered ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {item.article ? (
                            <span className="text-xs font-normal text-slate-500 mr-1.5">
                              {item.article}
                            </span>
                          ) : null}
                          {item.german}
                        </p>
                        <p className="text-sm font-devanagari font-medium text-blue-800">
                          {item.devanagari}{' '}
                          <span className="font-mono text-xs text-slate-500 ml-1">{item.ipa}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleMasterVocab(item.id)}
                        aria-pressed={mastered}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium rounded-md border transition-colors cursor-pointer shrink-0 ${
                          mastered
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{mastered ? 'Mastered' : 'Master'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-700">
                      {item.english} ·{' '}
                      <span className="font-devanagari text-slate-800">{item.hindi}</span>
                    </p>

                    <div className="pt-1.5 border-t border-slate-100 text-xs space-y-0.5">
                      <p className="text-slate-800">{item.exampleGerman}</p>
                      <p className="text-slate-500 font-devanagari">{item.exampleHindi}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handlePlay(normalKey, item.german, false, item.ipa)}
                        disabled={playingKey !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer disabled:opacity-60"
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
                        onClick={() => void handlePlay(slowKey, item.german, true, item.ipa)}
                        disabled={playingKey !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer disabled:opacity-60"
                      >
                        {playingKey === slowKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Slow</span>
                      </button>
                      <SpeakCheckButton
                        targetText={item.german}
                        devanagari={item.devanagari}
                        ipa={item.ipa}
                        variant="compact"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onLookupWordInDictionary(item.german)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                    >
                      <span>Dictionary</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Everyday A1 Dialogue */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Everyday Dialogue · {activeModule.dialogueTitle}
            </h3>
          </div>

          <div className="space-y-3">
            {activeModule.dialogue.map((line, idx) => {
              const normalKey = `dlg-n-${activeModule.id}-${idx}`;
              const slowKey = `dlg-s-${activeModule.id}-${idx}`;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {line.speaker}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{line.german}</p>
                    <p className="text-sm font-devanagari text-blue-800">{line.devanagari}</p>
                    <p className="text-xs text-slate-600">
                      {line.english} · <span className="font-devanagari">{line.hindi}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handlePlay(normalKey, line.german, false)}
                      disabled={playingKey !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer disabled:opacity-60"
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
                      onClick={() => void handlePlay(slowKey, line.german, true)}
                      disabled={playingKey !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer disabled:opacity-60"
                    >
                      {playingKey === slowKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Slow</span>
                    </button>
                    <SpeakCheckButton
                      targetText={line.german}
                      devanagari={line.devanagari}
                      variant="compact"
                      className="min-h-[34px]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Module Checkpoint Quiz */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Module {activeModule.number} Checkpoint ({activeModule.checkpoint.length} Questions)
            </h3>
            {isQuizSubmitted && (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  checkpointCorrectCount === activeModule.checkpoint.length
                    ? 'text-emerald-700'
                    : 'text-blue-700'
                }`}
              >
                Score: {checkpointCorrectCount}/{activeModule.checkpoint.length}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {activeModule.checkpoint.map((q, qIdx) => {
              const selectedIdx = quizSelections[q.id];
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {qIdx + 1}. {q.prompt}
                  </p>
                  {q.hindiHint && (
                    <p className="text-xs text-slate-500 font-devanagari">{q.hindiHint}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedIdx === oIdx;
                      const isCorrect = oIdx === q.correctIndex;
                      let btnStyle =
                        'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
                      if (isQuizSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'bg-rose-50 border-rose-300 text-rose-900';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-blue-50 border-blue-600 text-blue-900 font-medium';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() =>
                            setQuizSelections((prev) => ({
                              ...prev,
                              [q.id]: oIdx,
                            }))
                          }
                          className={`text-left px-3 py-2 min-h-[40px] text-xs rounded-lg border transition-colors cursor-pointer ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {isQuizSubmitted && (
                    <p className="text-xs text-slate-600 pt-1">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              disabled={checkpointAnsweredCount < activeModule.checkpoint.length}
              onClick={() => {
                setQuizSubmittedByModule((prev) => ({
                  ...prev,
                  [activeModule.id]: true,
                }));
                if (
                  checkpointCorrectCount >= activeModule.checkpoint.length - 1 &&
                  !isModuleCompleted
                ) {
                  onToggleCompleteModule(activeModule.id);
                }
              }}
              className="px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answers ({checkpointAnsweredCount}/{activeModule.checkpoint.length})
            </button>

            {activeModule.number < modules.length && (
              <button
                type="button"
                onClick={() => {
                  const next = modules.find((m) => m.number === activeModule.number + 1);
                  if (next) onSelectModule(next.id);
                }}
                className="text-sm font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
              >
                Next: Modul {activeModule.number + 1} →
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
