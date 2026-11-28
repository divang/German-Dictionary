import { useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { A1ExamAttempt, A1MockQuestion } from '../types/a1';
import { GOETHE_A1_PASS_PERCENT, gradeA1MockExam } from '../utils/a1Progress';
import { playGermanAudio } from '../utils/audioPlayer';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';

interface A1MockExamPanelProps {
  questions: A1MockQuestion[];
  attemptHistory: A1ExamAttempt[];
  isCloudSynced: boolean;
  onRecordAttempt: (attempt: Omit<A1ExamAttempt, 'ownerId' | 'createdAtMs'>) => Promise<void> | void;
}

export function A1MockExamPanel({
  questions,
  attemptHistory,
  isCloudSynced,
  onRecordAttempt,
}: A1MockExamPanelProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const resultSectionRef = useRef<HTMLElement | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((q) => typeof answers[q.id] === 'number').length,
    [questions, answers],
  );

  const result = useMemo(
    () => (submitted ? gradeA1MockExam(questions, answers) : null),
    [submitted, questions, answers],
  );

  const handlePlay = async (key: string, text: string, slow: boolean) => {
    setPlayingKey(key);
    setAudioNotice(null);
    const res = await playGermanAudio(text, { slow });
    setPlayingKey((current) => (current === key ? null : current));
    if (res.error) setAudioNotice(res.error);
  };

  const handleSubmitExam = async () => {
    const graded = gradeA1MockExam(questions, answers);
    setSubmitted(true);
    window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    setIsSavingAttempt(true);
    try {
      await onRecordAttempt({
        id: `mock_${Date.now()}`,
        examType: 'mock-full',
        status: 'completed',
        score: graded.score,
        maxScore: graded.maxScore,
        passed: graded.passed,
        sectionScores: graded.sectionScores,
      });
    } finally {
      setIsSavingAttempt(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {audioNotice && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {audioNotice}
        </div>
      )}

      {/* Exam overview header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Start Deutsch 1 · 100-Point Full Simulation
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900">
            Goethe-Zertifikat A1 Mock Exam
          </h2>
          <p className="text-sm text-slate-600">
            4 sections (25 points each): Hören, Lesen, Schreiben, and Sprechen. Pass mark is{' '}
            <span className="font-semibold text-slate-900 tabular-nums">
              {GOETHE_A1_PASS_PERCENT}% (60/100)
            </span>
            .
          </p>
        </div>

        <div className="text-right tabular-nums">
          <p className="text-xs font-medium text-slate-500">Questions Answered</p>
          <p className="font-display text-2xl font-semibold text-slate-900">
            {answeredCount} / {questions.length}
          </p>
        </div>
      </section>

      {/* Graded result summary */}
      {submitted && result && (
        <section
          ref={resultSectionRef}
          aria-live="polite"
          className={`rounded-xl border p-5 sm:p-6 space-y-4 ${
            result.passed
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Award
                className={`w-6 h-6 mt-0.5 shrink-0 ${
                  result.passed ? 'text-emerald-700' : 'text-amber-700'
                }`}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {result.passed ? 'Bestanden · Certificate Pass Mark Reached' : 'Noch üben · Keep Practicing'}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums mt-0.5">
                  {result.score} / {result.maxScore} Points ({result.percent}%)
                </h3>
                <p className="text-xs text-slate-700 mt-1 tabular-nums">
                  {result.correctCount} of {result.totalQuestions} questions correct ·{' '}
                  {isCloudSynced
                    ? 'Saved to your cloud profile across all devices'
                    : 'Saved on this browser (sign in with Google above to sync across devices)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Retake Mock Exam</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {(
              [
                ['Hören', result.sectionScores.hoeren],
                ['Lesen', result.sectionScores.lesen],
                ['Schreiben', result.sectionScores.schreiben],
                ['Sprechen', result.sectionScores.sprechen],
              ] as const
            ).map(([label, pts]) => (
              <div key={label} className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-display text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                  {pts} / 25
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Question list */}
      <div className="space-y-4">
        {questions.map((q, index) => {
          const selected = answers[q.id];
          const isCorrect = selected === q.correctIndex;
          const normalKey = `mock-n-${q.id}`;
          const slowKey = `mock-s-${q.id}`;

          return (
            <article
              key={q.id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">
                  Question {index + 1} · {q.sectionLabel}
                </span>
                <span className="tabular-nums font-medium">{q.points} pts</span>
              </div>

              {q.audioScript && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePlay(normalKey, q.audioScript!, false)}
                    disabled={playingKey !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    {playingKey === normalKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>Play Audio (Normal)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePlay(slowKey, q.audioScript!, true)}
                    disabled={playingKey !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    <span>Slow</span>
                  </button>
                  <SpeakCheckButton
                    targetText={q.audioScript}
                    displayLabel={`Question ${index + 1} (${q.sectionLabel})`}
                    variant="compact"
                    className="min-h-[36px]"
                  />
                </div>
              )}

              {q.readingPassage && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed">
                  {q.readingPassage}
                </div>
              )}

              <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {q.options.map((opt, oIdx) => {
                  const isChosen = selected === oIdx;
                  const isRightOpt = oIdx === q.correctIndex;
                  let cls = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
                  if (submitted) {
                    if (isRightOpt) {
                      cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                    } else if (isChosen && !isRightOpt) {
                      cls = 'bg-rose-50 border-rose-300 text-rose-900';
                    }
                  } else if (isChosen) {
                    cls = 'bg-blue-50 border-blue-600 text-blue-900 font-medium';
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                      className={`text-left px-3 py-2.5 min-h-[42px] text-xs rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="flex items-start gap-2 pt-1 text-xs text-slate-700">
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span>{q.explanation}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600 tabular-nums">
            Answered {answeredCount} of {questions.length} questions. You can submit once you finish
            all sections (or submit early to test your score).
          </p>
          <button
            type="button"
            disabled={answeredCount === 0 || isSavingAttempt}
            onClick={() => void handleSubmitExam()}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingAttempt && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>Submit A1 Mock Exam</span>
          </button>
        </div>
      )}

      {/* Attempt history */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recent Mock Exam Attempts
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {attemptHistory.length} recorded
          </span>
        </div>

        {attemptHistory.length === 0 ? (
          <p className="text-sm text-slate-500">
            No mock exam attempts yet. Complete the 100-point test above to track your Goethe A1
            readiness over time.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Date</th>
                  <th className="py-2 pr-4 font-semibold">Result</th>
                  <th className="py-2 pr-4 font-semibold">Total Score</th>
                  <th className="py-2 pr-4 font-semibold">Hören</th>
                  <th className="py-2 pr-4 font-semibold">Lesen</th>
                  <th className="py-2 pr-4 font-semibold">Schreiben</th>
                  <th className="py-2 font-semibold">Sprechen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {attemptHistory.map((attempt) => (
                  <tr key={attempt.id} className="text-slate-700">
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {new Date(attempt.createdAtMs).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          attempt.passed ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {attempt.passed ? 'Bestanden' : 'Noch üben'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">
                      {attempt.score} / {attempt.maxScore}
                    </td>
                    <td className="py-2.5 pr-4">{attempt.sectionScores.hoeren}/25</td>
                    <td className="py-2.5 pr-4">{attempt.sectionScores.lesen}/25</td>
                    <td className="py-2.5 pr-4">{attempt.sectionScores.schreiben}/25</td>
                    <td className="py-2.5">{attempt.sectionScores.sprechen}/25</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
