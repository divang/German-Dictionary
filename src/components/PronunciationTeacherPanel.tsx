import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Loader2,
  Sparkles,
  Turtle,
  Volume2,
} from 'lucide-react';
import type {
  PronunciationCheckFeedback,
  PronunciationWordChunk,
  TeacherStepGuidance,
} from '../types/pronunciationCheck';
import {
  buildSpellSoundGuide,
  getChunkRoleLabel,
  getChunkStatusMeta,
  type StuckPatternResult,
} from '../utils/pronunciationCheck';

interface PronunciationTeacherPanelProps {
  targetText: string;
  chunks: PronunciationWordChunk[];
  activeChunkIndex: number | null;
  masteredChunkIndices: ReadonlySet<number>;
  chunkAttemptCount: number;
  latestChunkFeedback: PronunciationCheckFeedback | null;
  teacherGuidance?: TeacherStepGuidance;
  stuckInfo: StuckPatternResult;
  isRecording: boolean;
  playingChunkMode: 'part' | 'slow' | null;
  onSelectChunk: (index: number | null) => void;
  onPlayChunk: (chunk: PronunciationWordChunk, slowInWord: boolean) => void;
}

export function PronunciationTeacherPanel({
  targetText,
  chunks,
  activeChunkIndex,
  masteredChunkIndices,
  chunkAttemptCount,
  latestChunkFeedback,
  teacherGuidance,
  stuckInfo,
  isRecording,
  playingChunkMode,
  onSelectChunk,
  onPlayChunk,
}: PronunciationTeacherPanelProps) {
  const [manualSpellOpen, setManualSpellOpen] = useState(false);

  if (chunks.length === 0) return null;

  const activeChunk =
    activeChunkIndex !== null && activeChunkIndex >= 0 && activeChunkIndex < chunks.length
      ? chunks[activeChunkIndex]
      : null;

  const spellSoundGuide =
    teacherGuidance?.spellingPrompt?.trim() || buildSpellSoundGuide(chunks);

  const hasEvaluatedChunks = chunks.some((c) => c.status !== 'pending');
  const recommendedIdx =
    teacherGuidance &&
    teacherGuidance.recommendedChunkIndex >= 0 &&
    teacherGuidance.recommendedChunkIndex < chunks.length
      ? teacherGuidance.recommendedChunkIndex
      : stuckInfo.recommendedChunkIndex;
  const recommendedChunk = chunks[recommendedIdx] ?? chunks[0];

  const showRescueBanner =
    activeChunk === null &&
    (stuckInfo.isStuck || Boolean(teacherGuidance?.shouldBreakDown));

  // Auto-open the explicit "Spell / Sound It Out" box if learner retried the chunk 2+ times
  // or if they are stuck overall, or if they toggled it manually.
  const showSpellOutBox = manualSpellOpen || chunkAttemptCount >= 2 || stuckInfo.isStuck;

  const chunkPassed =
    activeChunkIndex !== null &&
    (masteredChunkIndices.has(activeChunkIndex) ||
      (latestChunkFeedback !== null && latestChunkFeedback.accuracyScore >= 70));

  const nextChunkIndex =
    activeChunkIndex !== null && activeChunkIndex + 1 < chunks.length
      ? activeChunkIndex + 1
      : null;

  return (
    <div className="space-y-3.5" data-testid="pronunciation-teacher-panel">
      {/* Human Teacher Rescue Banner (shown in Full-Word view when stuck or score < 75%) */}
      {showRescueBanner && recommendedChunk && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                {stuckInfo.isStuck
                  ? `Teacher Step-In · After ${stuckInfo.attemptCount} Tries`
                  : 'Teacher Tip · Break It Into Smaller Parts'}
              </p>
              <p className="text-sm font-medium text-slate-900 leading-relaxed">
                {teacherGuidance?.teacherMessage ||
                  `Let's pause the full word and practice just the ${getChunkRoleLabel(recommendedChunk.role).toLowerCase()} "${recommendedChunk.chunk}" first, then put "${targetText}" back together.`}
              </p>
              {teacherGuidance?.teacherMessageHindi && (
                <p className="text-xs sm:text-sm font-devanagari text-blue-950/90 leading-relaxed">
                  {teacherGuidance.teacherMessageHindi}
                </p>
              )}
            </div>
          </div>

          {spellSoundGuide && (
            <div className="bg-white border border-blue-200/80 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800">
              <span className="font-semibold text-blue-800 mr-1.5">Spell-Sound Map:</span>
              <span className="font-devanagari font-medium break-words">{spellSoundGuide}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRecording}
              onClick={() => onSelectChunk(recommendedIdx)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Practice “{recommendedChunk.chunk}” ({getChunkRoleLabel(recommendedChunk.role)}) First
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Prefix / Infix / Suffix Word Map */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-800">
              Word Breakdown · Tap Any Prefix, Infix, or Suffix to Drill
            </h3>
          </div>
          {hasEvaluatedChunks && (
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Clear
              </span>
              <span className="inline-flex items-center gap-1 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                Almost
              </span>
              <span className="inline-flex items-center gap-1 text-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
                Fix This
              </span>
            </div>
          )}
        </div>

        {/* Clickable Chunk Tiles */}
        <div className="flex flex-wrap items-stretch gap-2" role="list" aria-label="Word sound chunks">
          {chunks.map((chunk, idx) => {
            const isSelected = activeChunkIndex === idx;
            const isMastered = masteredChunkIndices.has(idx);
            const meta = getChunkStatusMeta(isMastered ? 'correct' : chunk.status);

            return (
              <button
                key={`${chunk.chunk}-${idx}`}
                type="button"
                disabled={isRecording}
                aria-pressed={isSelected}
                aria-label={`Practice ${getChunkRoleLabel(chunk.role)} ${chunk.chunk}`}
                onClick={() => onSelectChunk(idx)}
                className={`flex flex-col items-start justify-between text-left px-3 py-2.5 min-w-[92px] flex-1 sm:flex-initial rounded-xl border transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  meta.tileClass
                } ${isSelected ? 'ring-2 ring-blue-700 ring-offset-1 shadow-xs' : ''}`}
              >
                <div className="w-full flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                    {getChunkRoleLabel(chunk.role).split(' / ')[0]}
                  </span>
                  {isMastered ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                      <Check className="w-2.5 h-2.5" aria-hidden="true" />
                      Done
                    </span>
                  ) : chunk.score !== null ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${meta.badgeClass}`}
                    >
                      {chunk.score}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">
                      #{idx + 1}
                    </span>
                  )}
                </div>

                <span className="font-display text-lg font-bold leading-snug mt-1">
                  {chunk.chunk}
                </span>

                {chunk.targetDevanagari && (
                  <span className="font-devanagari text-xs font-semibold text-blue-800 mt-0.5">
                    {chunk.targetDevanagari}
                  </span>
                )}
              </button>
            );
          })}

          {/* Final Step: Combine Full Word */}
          <button
            type="button"
            disabled={isRecording}
            aria-pressed={activeChunkIndex === null}
            aria-label={`Combine and practice full word ${targetText}`}
            onClick={() => onSelectChunk(null)}
            className={`flex flex-col items-start justify-between text-left px-3 py-2.5 min-w-[112px] flex-1 sm:flex-initial rounded-xl border transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              activeChunkIndex === null
                ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-blue-700 ring-offset-1'
                : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                activeChunkIndex === null ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Final Step
            </span>
            <span className="font-display text-base font-bold leading-snug mt-1">
              Full Word
            </span>
            <span
              className={`text-xs mt-0.5 truncate max-w-[130px] ${
                activeChunkIndex === null ? 'text-blue-200' : 'text-slate-600'
              }`}
            >
              {targetText}
            </span>
          </button>
        </div>

        {/* Full Spell-Sound Formula (compact reference below tiles when not in rescue banner) */}
        {!showRescueBanner && spellSoundGuide && (
          <div className="bg-white border border-slate-200/90 rounded-lg px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900 mr-1.5">Say it piece by piece:</span>
            <span className="font-devanagari font-medium text-blue-900 break-words">
              {spellSoundGuide}
            </span>
          </div>
        )}
      </div>

      {/* Active Step-by-Step Teacher Drill Card for Selected Chunk */}
      {activeChunk && activeChunkIndex !== null && (
        <div
          className="bg-white border-2 border-blue-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs"
          data-testid="active-chunk-drill-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-800">
                  Step {activeChunkIndex + 1} of {chunks.length} · {getChunkRoleLabel(activeChunk.role)}
                </span>
                {activeChunk.heardAs && (
                  <span className="text-xs text-rose-700 font-medium">
                    Earlier heard: “{activeChunk.heardAs}”
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
                <span className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  {activeChunk.chunk}
                </span>
                {activeChunk.targetDevanagari && (
                  <span className="font-devanagari text-xl font-semibold text-blue-700">
                    {activeChunk.targetDevanagari}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Inside <span className="font-semibold text-slate-800">“{targetText}”</span> — record
                just this part below to lock in the sound.
              </p>
            </div>

            {/* Listen to Chunk Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={playingChunkMode !== null || isRecording}
                onClick={() => onPlayChunk(activeChunk, false)}
                aria-label={`Listen to part ${activeChunk.chunk}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {playingChunkMode === 'part' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Hear Part</span>
              </button>
              <button
                type="button"
                disabled={playingChunkMode !== null || isRecording}
                onClick={() => onPlayChunk(activeChunk, true)}
                aria-label={`Hear ${activeChunk.chunk} slowly inside ${targetText}`}
                className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {playingChunkMode === 'slow' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Slow Word</span>
              </button>
            </div>
          </div>

          {/* Human Teacher Mouth & Hindi Cue */}
          <div className="space-y-2 text-xs sm:text-sm">
            {activeChunk.teacherHint && (
              <p className="text-slate-800 leading-relaxed">
                <span className="font-semibold text-slate-900">Teacher Cue:</span>{' '}
                {activeChunk.teacherHint}
              </p>
            )}
            {activeChunk.hindiCoachCue && (
              <p className="font-devanagari text-blue-950 bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
                <span className="font-semibold">हिंदी गाइड:</span> {activeChunk.hindiCoachCue}
              </p>
            )}
          </div>

          {/* "Can't pick it up? Spell / Say It Out" Fallback Helper */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <button
              type="button"
              onClick={() => setManualSpellOpen((prev) => !prev)}
              aria-expanded={showSpellOutBox}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {showSpellOutBox
                  ? 'Hide Spell-Out Trick for This Part'
                  : 'Still hard to pick up? Show Spell-Out Trick'}
              </span>
            </button>

            {showSpellOutBox && (
              <div
                className="bg-amber-50/80 border border-amber-200 rounded-lg px-3.5 py-2.5 space-y-1 text-xs sm:text-sm text-amber-950"
                data-testid="chunk-spell-out-box"
              >
                <p className="font-semibold text-amber-900">
                  Spell &amp; Say It Out ({getChunkRoleLabel(activeChunk.role)}: {activeChunk.chunk})
                </p>
                <p className="font-devanagari leading-relaxed">{activeChunk.spellOutCue}</p>
              </div>
            )}
          </div>

          {/* Celebration & Next Step Progression when chunk passes */}
          {chunkPassed && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>
                  Nice! You got “{activeChunk.chunk}”
                  {latestChunkFeedback ? ` (${latestChunkFeedback.accuracyScore}%)` : ''}.
                </span>
              </div>
              {nextChunkIndex !== null ? (
                <button
                  type="button"
                  onClick={() => onSelectChunk(nextChunkIndex)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  <span>Next: {chunks[nextChunkIndex].chunk}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectChunk(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  <span>Combine Full Word “{targetText}”</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Stepper Footer Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              disabled={isRecording || activeChunkIndex === 0}
              onClick={() => onSelectChunk(Math.max(0, activeChunkIndex - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 rounded-lg cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Previous Part</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => onSelectChunk(null)}
                className="px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Back to Full Word
              </button>
              {nextChunkIndex !== null && (
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => onSelectChunk(nextChunkIndex)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                >
                  <span>Next: {chunks[nextChunkIndex].chunk}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
