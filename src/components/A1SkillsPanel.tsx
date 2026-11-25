import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type {
  A1ListeningTask,
  A1ReadingTask,
  A1SpeakingCard,
  A1WritingEvaluation,
  A1WritingPrompt,
  SelfIntroProfile,
} from '../types/a1';
import { buildSelfIntroScript } from '../utils/a1Progress';
import { playGermanAudio } from '../utils/audioPlayer';

interface A1SkillsPanelProps {
  activeSkill: 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';
  listeningTasks: A1ListeningTask[];
  readingTasks: A1ReadingTask[];
  writingPrompts: A1WritingPrompt[];
  speakingCards: A1SpeakingCard[];
}

export function A1SkillsPanel({
  activeSkill,
  listeningTasks,
  readingTasks,
  writingPrompts,
  speakingCards,
}: A1SkillsPanelProps) {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  // Hören state
  const [listenAnswers, setListenAnswers] = useState<Record<string, number>>({});
  const [listenChecked, setListenChecked] = useState<Record<string, boolean>>({});
  const [revealedTranscripts, setRevealedTranscripts] = useState<Record<string, boolean>>({});

  // Lesen state
  const [readAnswers, setReadAnswers] = useState<Record<string, number>>({});
  const [readChecked, setReadChecked] = useState<Record<string, boolean>>({});
  const [revealedHindiSummary, setRevealedHindiSummary] = useState<Record<string, boolean>>({});

  // Schreiben Part 1 (Formular) state
  const [formFirstName, setFormFirstName] = useState('');
  const [formPeopleCount, setFormPeopleCount] = useState('2');
  const [formArrivalCity, setFormArrivalCity] = useState('');
  const [formPayment, setFormPayment] = useState('EC-Karte');
  const [formChecked, setFormChecked] = useState(false);

  // Schreiben Part 2 (Email) state
  const [activePromptId, setActivePromptId] = useState(writingPrompts[0]?.id ?? 'write-1');
  const [emailDraft, setEmailDraft] = useState('');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<A1WritingEvaluation | null>(null);

  // Sprechen Part 1 (Sich vorstellen) state
  const [introProfile, setIntroProfile] = useState<SelfIntroProfile>({
    name: 'Aarav Sharma',
    age: '26',
    country: 'Indien',
    city: 'Delhi',
    languages: 'Hindi, Englisch und ein bisschen Deutsch',
    profession: 'Softwareentwickler',
    hobby: 'Musik hören und reisen',
  });

  const introLines = useMemo(() => buildSelfIntroScript(introProfile), [introProfile]);
  const fullIntroGerman = useMemo(
    () => introLines.map((l) => l.german).join(' '),
    [introLines],
  );

  const activePrompt =
    writingPrompts.find((p) => p.id === activePromptId) ?? writingPrompts[0];

  const wordCount = useMemo(() => {
    const trimmed = emailDraft.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [emailDraft]);

  const handlePlay = async (key: string, text: string, slow: boolean) => {
    setPlayingKey(key);
    setAudioNotice(null);
    const result = await playGermanAudio(text, { slow });
    setPlayingKey((current) => (current === key ? null : current));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  const handleGradeEmail = async () => {
    if (!activePrompt) return;
    setGradeError(null);
    setEvaluation(null);
    if (emailDraft.trim().length < 10) {
      setGradeError('Write at least a short German email before requesting AI Coach grading.');
      return;
    }

    setIsGrading(true);
    try {
      const response = await fetch('/api/a1/grade-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptTitle: activePrompt.title,
          bulletPoints: activePrompt.bulletPoints,
          learnerText: emailDraft,
        }),
      });
      const payload = (await response.json()) as {
        evaluation?: A1WritingEvaluation;
        error?: string;
      };
      if (!response.ok || !payload.evaluation) {
        setGradeError(
          payload.error ||
            'AI Writing Coach is temporarily unavailable. Compare with the model answer below.',
        );
        return;
      }
      setEvaluation(payload.evaluation);
    } catch {
      setGradeError('Network error while grading. Compare with the model answer or retry.');
    } finally {
      setIsGrading(false);
    }
  };

  const formularErrors = useMemo(() => {
    const issues: string[] = [];
    if (formFirstName.trim().length < 2) {
      issues.push('Vorname & Nachname: Enter your full name (as on passport).');
    }
    if (formPeopleCount !== '2') {
      issues.push('Personenanzahl: Scenario says you travel with 1 friend → 2 Personen.');
    }
    if (!formArrivalCity.trim().toLowerCase().includes('münchen') && !formArrivalCity.trim().toLowerCase().includes('munich')) {
      issues.push('Reiseziel: Scenario destination is München.');
    }
    if (formPayment !== 'Kreditkarte') {
      issues.push('Zahlungsart: Scenario says you pay by credit card → Kreditkarte.');
    }
    return issues;
  }, [formFirstName, formPeopleCount, formArrivalCity, formPayment]);

  return (
    <div className="space-y-6">
      {audioNotice && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {audioNotice}
        </div>
      )}

      {/* HÖREN (Listening) */}
      {activeSkill === 'hoeren' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Goethe-Zertifikat A1 · Hören (20 min · 25 Points)
            </p>
            <h2 className="font-display text-xl font-semibold text-slate-900 mt-1">
              Listening Comprehension Practice
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Play each German announcement at Normal or Slow speed, select your answer, then reveal
              the Devanagari pronunciation and Hindi translation to review.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {listeningTasks.map((task) => {
              const selected = listenAnswers[task.id];
              const checked = Boolean(listenChecked[task.id]);
              const showTranscript = Boolean(revealedTranscripts[task.id]);
              const normalKey = `listen-n-${task.id}`;
              const slowKey = `listen-s-${task.id}`;

              return (
                <article
                  key={task.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{task.partLabel}</p>
                      <h3 className="font-display text-lg font-semibold text-slate-900 mt-0.5">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">{task.situation}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handlePlay(normalKey, task.audioScript, false)}
                        disabled={playingKey !== null}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-60"
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
                        onClick={() => void handlePlay(slowKey, task.audioScript, true)}
                        disabled={playingKey !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-60"
                      >
                        {playingKey === slowKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Slow Speed</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setRevealedTranscripts((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        {showTranscript ? (
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{showTranscript ? 'Hide Script' : 'Devanagari Script'}</span>
                      </button>
                    </div>

                    {showTranscript && (
                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <p className="font-semibold text-slate-900 leading-relaxed">
                          {task.audioScript}
                        </p>
                        <p className="font-devanagari text-blue-800 leading-relaxed">
                          {task.devanagariScript}
                        </p>
                        <p className="font-devanagari text-slate-600 leading-relaxed">
                          {task.hindiTranslation}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <p className="text-sm font-medium text-slate-900">{task.question}</p>
                      <div className="space-y-1.5">
                        {task.options.map((opt, idx) => {
                          const isSelected = selected === idx;
                          const isCorrect = idx === task.correctIndex;
                          let cls = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
                          if (checked) {
                            if (isCorrect) {
                              cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                            } else if (isSelected) {
                              cls = 'bg-rose-50 border-rose-300 text-rose-900';
                            }
                          } else if (isSelected) {
                            cls = 'bg-blue-50 border-blue-600 text-blue-900 font-medium';
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                setListenAnswers((prev) => ({ ...prev, [task.id]: idx }))
                              }
                              className={`w-full text-left px-3 py-2 min-h-[38px] text-xs rounded-lg border transition-colors cursor-pointer ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={typeof selected !== 'number'}
                      onClick={() => setListenChecked((prev) => ({ ...prev, [task.id]: true }))}
                      className="px-3.5 py-2 min-h-[36px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Check Answer
                    </button>
                    {checked && (
                      <p className="text-xs text-slate-700 leading-relaxed">{task.explanation}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* LESEN (Reading) */}
      {activeSkill === 'lesen' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Goethe-Zertifikat A1 · Lesen (25 min · 25 Points)
            </p>
            <h2 className="font-display text-xl font-semibold text-slate-900 mt-1">
              Reading Emails, Ads &amp; Everyday Signs
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Practice scanning authentic A1 notices for Richtig / Falsch details. Toggle the Hindi
              summary whenever you want a quick comprehension check.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {readingTasks.map((task) => {
              const selected = readAnswers[task.id];
              const checked = Boolean(readChecked[task.id]);
              const showHindi = Boolean(revealedHindiSummary[task.id]);

              return (
                <article
                  key={task.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {task.partLabel} · {task.textType}
                        </p>
                        <h3 className="font-display text-lg font-semibold text-slate-900 mt-0.5">
                          {task.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedHindiSummary((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                        className="text-xs font-medium text-blue-700 hover:text-blue-800 shrink-0 cursor-pointer"
                      >
                        {showHindi ? 'Hide Hindi' : 'Hindi Summary'}
                      </button>
                    </div>

                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 whitespace-pre-line leading-relaxed">
                      {task.germanText}
                    </div>

                    {showHindi && (
                      <p className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs font-devanagari text-slate-800 leading-relaxed">
                        {task.hindiSummary}
                      </p>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-900">{task.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {task.options.map((opt, idx) => {
                          const isSelected = selected === idx;
                          const isCorrect = idx === task.correctIndex;
                          let cls = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
                          if (checked) {
                            if (isCorrect) {
                              cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                            } else if (isSelected) {
                              cls = 'bg-rose-50 border-rose-300 text-rose-900';
                            }
                          } else if (isSelected) {
                            cls = 'bg-blue-50 border-blue-600 text-blue-900 font-medium';
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                setReadAnswers((prev) => ({ ...prev, [task.id]: idx }))
                              }
                              className={`text-left px-3 py-2 min-h-[38px] text-xs rounded-lg border transition-colors cursor-pointer ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={typeof selected !== 'number'}
                      onClick={() => setReadChecked((prev) => ({ ...prev, [task.id]: true }))}
                      className="px-3.5 py-2 min-h-[36px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Check Answer
                    </button>
                    {checked && (
                      <p className="text-xs text-slate-700 leading-relaxed">{task.explanation}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHREIBEN (Writing) */}
      {activeSkill === 'schreiben' && (
        <div className="space-y-6">
          {/* Teil 1: Formular */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Schreiben · Teil 1 (Formular ausfüllen · 5 Points)
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                Hotel Booking Form Drill
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Scenario: You are booking a weekend trip to <strong>München</strong> with{' '}
                <strong>one friend</strong> (2 people total). You want to pay by{' '}
                <strong>Kreditkarte</strong>. Fill out the German form below:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span>Vorname &amp; Nachname (Full Name)</span>
                <input
                  type="text"
                  value={formFirstName}
                  onChange={(e) => {
                    setFormFirstName(e.target.value);
                    setFormChecked(false);
                  }}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full px-3 py-2 min-h-[40px] text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span>Anzahl der Personen (Number of Guests)</span>
                <select
                  value={formPeopleCount}
                  onChange={(e) => {
                    setFormPeopleCount(e.target.value);
                    setFormChecked(false);
                  }}
                  className="w-full px-3 py-2 min-h-[40px] text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700"
                >
                  <option value="1">1 Person</option>
                  <option value="2">2 Personen</option>
                  <option value="3">3 Personen</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span>Reiseziel (Destination City)</span>
                <input
                  type="text"
                  value={formArrivalCity}
                  onChange={(e) => {
                    setFormArrivalCity(e.target.value);
                    setFormChecked(false);
                  }}
                  placeholder="e.g. München"
                  className="w-full px-3 py-2 min-h-[40px] text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span>Zahlungsart (Payment Method)</span>
                <select
                  value={formPayment}
                  onChange={(e) => {
                    setFormPayment(e.target.value);
                    setFormChecked(false);
                  }}
                  className="w-full px-3 py-2 min-h-[40px] text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700"
                >
                  <option value="Bar">Bar (Cash)</option>
                  <option value="EC-Karte">EC-Karte (Debit Card)</option>
                  <option value="Kreditkarte">Kreditkarte (Credit Card)</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setFormChecked(true)}
                className="px-4 py-2 min-h-[38px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Check Formular
              </button>
              {formChecked && formularErrors.length === 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Perfect! All fields match the Goethe A1 scenario.
                </span>
              )}
            </div>

            {formChecked && formularErrors.length > 0 && (
              <ul className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 list-disc list-inside">
                {formularErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Teil 2: Short Email + AI Coach Grading */}
          {activePrompt && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Schreiben · Teil 2 (Kurze E-Mail · ~30 Words · 25-Point Rubric)
                  </p>
                  <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                    {activePrompt.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  {writingPrompts.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActivePromptId(p.id);
                        setEvaluation(null);
                        setGradeError(null);
                        setShowModelAnswer(false);
                      }}
                      className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-lg border cursor-pointer ${
                        p.id === activePrompt.id
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Prompt {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-sm">
                <p className="text-slate-800">{activePrompt.scenario}</p>
                <p className="text-xs font-devanagari text-slate-600">
                  {activePrompt.hindiScenario}
                </p>
                <ul className="list-disc list-inside text-xs text-slate-800 space-y-1 pt-1">
                  {activePrompt.bulletPoints.map((bp, idx) => (
                    <li key={idx}>{bp}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <label htmlFor="a1-email-draft" className="font-medium text-slate-700">
                    Your German Email Draft
                  </label>
                  <span className="tabular-nums">{wordCount} words (target: ~30 words)</span>
                </div>
                <textarea
                  id="a1-email-draft"
                  rows={5}
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="Sehr geehrte Frau Bauer,&#10;&#10;ich kann am Freitag leider nicht kommen..."
                  className="w-full p-3.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700 leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleGradeEmail()}
                  disabled={isGrading}
                  className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isGrading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{isGrading ? 'Grading on Goethe A1 Rubric...' : 'Evaluate with AI Coach'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowModelAnswer((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  {showModelAnswer ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{showModelAnswer ? 'Hide Model Answer' : 'Show Model Answer'}</span>
                </button>
              </div>

              {gradeError && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {gradeError}
                </div>
              )}

              {evaluation && (
                <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Goethe A1 Examiner Result
                      </p>
                      <p
                        className={`font-display text-2xl font-semibold tabular-nums mt-0.5 ${
                          evaluation.passed ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {evaluation.totalScore} / {evaluation.maxScore} ·{' '}
                        {evaluation.passed ? 'Bestanden (Passed)' : 'Needs Practice'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 tabular-nums">
                      Task {evaluation.taskCompletion}/10 · Grammar {evaluation.grammarAndVocab}/10
                      · Structure {evaluation.structure}/5
                    </p>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <p className="text-slate-800">{evaluation.feedbackEnglish}</p>
                    <p className="font-devanagari text-slate-700">{evaluation.feedbackHindi}</p>
                  </div>

                  {evaluation.correctedGerman && (
                    <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Polished A1 German Version
                      </p>
                      <p className="text-sm text-slate-900 whitespace-pre-line">
                        {evaluation.correctedGerman}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {evaluation.strengths.length > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                        <p className="font-semibold text-emerald-900 mb-1">Strengths</p>
                        <ul className="list-disc list-inside text-emerald-900 space-y-0.5">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluation.improvements.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                        <p className="font-semibold text-amber-900 mb-1">Next Improvements</p>
                        <ul className="list-disc list-inside text-amber-900 space-y-0.5">
                          {evaluation.improvements.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showModelAnswer && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Model A1 Answer
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void handlePlay(`model-${activePrompt.id}`, activePrompt.modelAnswer, true)
                      }
                      disabled={playingKey !== null}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Listen (Slow)</span>
                    </button>
                  </div>
                  <p className="text-sm text-slate-900 whitespace-pre-line leading-relaxed">
                    {activePrompt.modelAnswer}
                  </p>
                  <p className="text-xs font-devanagari text-blue-800 leading-relaxed">
                    {activePrompt.modelDevanagari}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* SPRECHEN (Speaking) */}
      {activeSkill === 'sprechen' && (
        <div className="space-y-6">
          {/* Teil 1: Interactive Sich vorstellen builder */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sprechen · Teil 1 (Sich vorstellen · Self-Introduction Builder)
                </p>
                <h2 className="font-display text-xl font-semibold text-slate-900 mt-1">
                  Personalize Your Goethe A1 Exam Introduction
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Edit your details below to generate your exact German exam script with Devanagari
                  pronunciation and audio playback.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handlePlay('intro-full-n', fullIntroGerman, false)}
                  disabled={playingKey !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {playingKey === 'intro-full-n' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Play Full Script</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handlePlay('intro-full-s', fullIntroGerman, true)}
                  disabled={playingKey !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  <span>Slow</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {(
                  [
                    ['name', 'Name'],
                    ['age', 'Age (Alter)'],
                    ['country', 'Country (Land in German)'],
                    ['city', 'City (Wohnort)'],
                    ['languages', 'Languages (Sprachen)'],
                    ['profession', 'Profession (Beruf)'],
                    ['hobby', 'Hobbies'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="space-y-1 text-xs font-medium text-slate-700">
                    <span>{label}</span>
                    <input
                      type="text"
                      value={introProfile[field]}
                      onChange={(e) =>
                        setIntroProfile((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      className="w-full px-3 py-2 min-h-[38px] text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-2.5">
                {introLines.map((line, idx) => {
                  const keyN = `intro-line-n-${idx}`;
                  const keyS = `intro-line-s-${idx}`;
                  return (
                    <div
                      key={line.label}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {line.label}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">{line.german}</p>
                        <p className="text-sm font-devanagari text-blue-800">{line.devanagari}</p>
                        <p className="text-xs font-devanagari text-slate-600">{line.hindi}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handlePlay(keyN, line.german, false)}
                          disabled={playingKey !== null}
                          className="px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePlay(keyS, line.german, true)}
                          disabled={playingKey !== null}
                          className="px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          Slow
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Teil 2 & Teil 3: Speaking Prompt Cards */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sprechen · Teil 2 &amp; Teil 3 (Wortkarten &amp; Bitten formulieren)
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                Goethe A1 Exam Prompt Cards
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {speakingCards.map((card) => {
                const qKey = `spk-q-${card.id}`;
                const aKey = `spk-a-${card.id}`;
                return (
                  <article
                    key={card.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        {card.part === 'teil-2' ? 'Teil 2 · Information' : 'Teil 3 · Request'} ·{' '}
                        {card.topic}
                      </span>
                      <span className="text-xs font-devanagari text-slate-500">
                        {card.hindiMeaning}
                      </span>
                    </div>

                    <p className="font-display text-lg font-semibold text-slate-900">
                      Card Keyword: {card.keyword}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                            Question / Request
                          </span>
                          <button
                            type="button"
                            onClick={() => void handlePlay(qKey, card.sampleQuestion, false)}
                            disabled={playingKey !== null}
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-medium cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Listen</span>
                          </button>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{card.sampleQuestion}</p>
                        <p className="font-devanagari text-blue-800">
                          {card.sampleQuestionDevanagari}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                            Partner Reply
                          </span>
                          <button
                            type="button"
                            onClick={() => void handlePlay(aKey, card.sampleAnswer, false)}
                            disabled={playingKey !== null}
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-medium cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Listen</span>
                          </button>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{card.sampleAnswer}</p>
                        <p className="font-devanagari text-blue-800">
                          {card.sampleAnswerDevanagari}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
