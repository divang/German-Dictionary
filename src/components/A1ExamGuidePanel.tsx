import { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  Volume2,
} from 'lucide-react';
import {
  A1_EXAM_PHRASE_CARDS,
  A1_EXAM_SECTIONS,
  A1_FORM_VOCABULARY,
  A1_GRAMMAR_CHEAT_SHEET,
  A1_STUDY_ROADMAP,
  GOETHE_A1_EXAM_FACTS,
} from '../data/a1ExamGuide';
import type { A1WorkspaceTab } from '../types/a1';
import { playGermanAudio } from '../utils/audioPlayer';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';

interface A1ExamGuidePanelProps {
  completedLessonIds: string[];
  onJumpToModule: (moduleId: string) => void;
  onJumpToTab: (tab: A1WorkspaceTab) => void;
}

type GuideSubTab = 'blueprint' | 'roadmap' | 'grammar' | 'templates';

export function A1ExamGuidePanel({
  completedLessonIds,
  onJumpToModule,
  onJumpToTab,
}: A1ExamGuidePanelProps) {
  const [subTab, setSubTab] = useState<GuideSubTab>('blueprint');
  const [grammarFilter, setGrammarFilter] = useState<
    'all' | 'articles-cases' | 'verbs' | 'prepositions' | 'structure'
  >('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const handleSpeak = async (id: string, text: string, slow = false) => {
    setAudioNotice(null);
    setPlayingId(id);
    try {
      const res = await playGermanAudio(text, { slow });
      if (res.error) setAudioNotice(res.error);
    } finally {
      setPlayingId((curr) => (curr === id ? null : curr));
    }
  };

  const filteredGrammar =
    grammarFilter === 'all'
      ? A1_GRAMMAR_CHEAT_SHEET
      : A1_GRAMMAR_CHEAT_SHEET.filter((g) => g.category === grammarFilter);

  return (
    <div className="space-y-6">
      {/* Sub-navigation inside Exam Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              {GOETHE_A1_EXAM_FACTS.officialName}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5">
              Complete A1 Exam Blueprint, Roadmap &amp; Grammar Guide
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 self-start md:self-auto shrink-0">
            <Award className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>
              Pass Mark: {GOETHE_A1_EXAM_FACTS.passingScore} / {GOETHE_A1_EXAM_FACTS.totalPoints}{' '}
              Points (60%)
            </span>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Goethe A1 Exam Guide sections"
          className="flex flex-wrap gap-2 pt-3 border-t border-slate-100"
        >
          {(
            [
              { id: 'blueprint', label: 'Exam Format & Scoring', icon: ClipboardList },
              { id: 'roadmap', label: '8-Week Study Roadmap', icon: CalendarDays },
              { id: 'grammar', label: 'Complete A1 Grammar', icon: BookOpen },
              { id: 'templates', label: 'Form, Email & Speaking Kit', icon: MessageSquare },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
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
      </div>

      {/* ================================================================= */}
      {/* 1. OFFICIAL EXAM FORMAT & SCORING BLUEPRINT                       */}
      {/* ================================================================= */}
      {subTab === 'blueprint' && (
        <div className="space-y-5">
          {/* Passing Rule Overview Banner */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-950">
              <span>
                <strong>Written Exam:</strong> {GOETHE_A1_EXAM_FACTS.writtenDuration}
              </span>
              <span>
                <strong>Oral Exam:</strong> {GOETHE_A1_EXAM_FACTS.oralDuration}
              </span>
              <span>
                <strong>Total:</strong> 100 pts (25 pts × 4 skills)
              </span>
            </div>
            <p className="font-devanagari text-sm text-blue-900 leading-relaxed">
              {GOETHE_A1_EXAM_FACTS.hindiSummary}
            </p>
          </div>

          {/* 4 Skill Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {A1_EXAM_SECTIONS.map((sec) => (
              <article
                key={sec.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-slate-900">
                        {sec.germanName}{' '}
                        <span className="text-slate-500 font-normal">({sec.englishName})</span>
                      </h3>
                      <p className="font-devanagari text-xs text-blue-700 font-medium">
                        {sec.hindiName} · {sec.duration}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 tabular-nums shrink-0">
                      {sec.points} pts
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {sec.parts.map((part) => (
                      <div
                        key={part.label}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1"
                      >
                        <p className="text-xs font-semibold text-slate-900">{part.label}</p>
                        <p className="text-xs text-slate-700">{part.taskSummary}</p>
                        <p className="text-[11px] text-blue-800 font-medium">Tip: {part.tip}</p>
                      </div>
                    ))}
                  </div>

                  <p className="font-devanagari text-xs text-slate-700 bg-amber-50/70 border border-amber-200/80 rounded-lg px-3 py-2 leading-relaxed">
                    <strong className="text-amber-950">हिंदी रणनीति:</strong> {sec.hindiStrategy}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onJumpToTab(sec.id)}
                  className="inline-flex items-center justify-center gap-1.5 w-full px-3.5 py-2.5 min-h-[40px] text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Practice {sec.germanName} Now</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. 8-WEEK COMPLETE A1 STUDY ROADMAP                               */}
      {/* ================================================================= */}
      {subTab === 'roadmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {A1_STUDY_ROADMAP.map((item) => {
            const allTargetsDone =
              item.targetModules.length > 0 &&
              item.targetModules.every((mId) => completedLessonIds.includes(mId));
            return (
              <article
                key={item.week}
                className={`bg-white border rounded-xl p-5 flex flex-col justify-between gap-4 ${
                  allTargetsDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                        Week {item.week}
                      </span>
                      <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      <p className="font-devanagari text-xs text-slate-600">{item.hindiTitle}</p>
                    </div>
                    {allTargetsDone && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{item.focus}</p>

                  <ul className="space-y-1.5 text-xs text-slate-800 list-disc pl-4">
                    {item.checklist.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (item.targetSkillTab === 'modules' && item.targetModules[0]) {
                      onJumpToModule(item.targetModules[0]);
                    } else {
                      onJumpToTab(item.targetSkillTab);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. COMPLETE GOETHE A1 MASTER GRAMMAR CHEAT SHEET                  */}
      {/* ================================================================= */}
      {subTab === 'grammar' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'All 8 A1 Grammar Pillars' },
                { id: 'articles-cases', label: 'Articles & Cases' },
                { id: 'verbs', label: 'Verbs, Modals & Perfekt' },
                { id: 'prepositions', label: 'Prepositions' },
                { id: 'structure', label: 'Negation, Questions & Imperative' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={grammarFilter === f.id}
                onClick={() => setGrammarFilter(f.id)}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  grammarFilter === f.id
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredGrammar.map((topic) => (
              <article
                key={topic.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {topic.title}
                  </h3>
                  <p className="font-devanagari text-xs font-medium text-blue-700 mt-0.5">
                    {topic.hindiTitle}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-slate-800 leading-relaxed">{topic.ruleSummary}</p>
                  <p className="font-devanagari text-sm text-blue-950 bg-blue-50/70 border border-blue-100 rounded-lg px-3.5 py-2.5 leading-relaxed">
                    <strong>हिंदी ब्रिज:</strong> {topic.hindiBridge}
                  </p>
                </div>

                {topic.quickTable && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs min-w-[520px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          {topic.quickTable.headers.map((h) => (
                            <th key={h} className="py-2 px-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {topic.quickTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/60">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-2 px-3 ${
                                  cIdx === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-2.5">
                  {topic.examples.map((ex, idx) => {
                    const key = `gram-${topic.id}-${idx}`;
                    return (
                      <div
                        key={key}
                        className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{ex.german}</p>
                          <p className="font-devanagari text-xs font-medium text-blue-700">
                            {ex.devanagari}
                          </p>
                          <p className="text-xs text-slate-600">
                            {ex.english} ·{' '}
                            <span className="font-devanagari text-slate-700">{ex.hindi}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleSpeak(key, ex.german, false)}
                            aria-label={`Listen to example ${ex.german}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                          >
                            {playingId === key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Listen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSpeak(`${key}-slow`, ex.german, true)}
                            aria-label={`Listen slowly to example ${ex.german}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[32px] text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Slow</span>
                          </button>
                          <SpeakCheckButton
                            targetText={ex.german}
                            devanagari={ex.devanagari}
                            variant="compact"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. FORM VOCABULARY, EMAIL FRAMES & SPEAKING SURVIVAL KIT          */}
      {/* ================================================================= */}
      {subTab === 'templates' && (
        <div className="space-y-6">
          {/* Schreiben Teil 1: Official German Form Fields */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Schreiben Teil 1: Essential Formular (Form) Fields
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                These 12 German labels appear on almost every Goethe-Zertifikat A1 registration form.
              </p>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[540px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">German Field</th>
                    <th className="py-2.5 px-3">English Meaning</th>
                    <th className="py-2.5 px-3">Hindi Meaning (हिंदी)</th>
                    <th className="py-2.5 px-3">Example Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {A1_FORM_VOCABULARY.map((field) => (
                    <tr key={field.german} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{field.german}</td>
                      <td className="py-2.5 px-3 text-slate-700">{field.english}</td>
                      <td className="py-2.5 px-3 font-devanagari text-blue-800">{field.hindi}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                        {field.sampleEntry}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Schreiben Teil 2 + Sprechen Survival Phrases */}
          {(
            [
              {
                group: 'email-formal' as const,
                title: 'Schreiben Teil 2: Formal Email Phrases (Sie)',
                subtitle: 'Use for hotels, schools, offices, doctors, and people you address as Herr/Frau.',
              },
              {
                group: 'email-informal' as const,
                title: 'Schreiben Teil 2: Informal Email Phrases (du)',
                subtitle: 'Use for friends, classmates, and party invitations.',
              },
              {
                group: 'speaking-survival' as const,
                title: 'Sprechen Teil 1–3: High-Scoring Oral Exam Phrases',
                subtitle: 'Listen and verify your voice on these must-know speaking exam sentences.',
              },
            ]
          ).map((block) => (
            <section
              key={block.group}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">{block.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{block.subtitle}</p>
              </div>
              <div className="space-y-2.5">
                {A1_EXAM_PHRASE_CARDS.filter((c) => c.group === block.group).map((card) => {
                  const key = `tpl-${card.id}`;
                  return (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {card.purpose}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">{card.german}</p>
                        <p className="font-devanagari text-xs font-medium text-blue-700">
                          {card.devanagari}
                        </p>
                        <p className="text-xs text-slate-600">
                          {card.english} ·{' '}
                          <span className="font-devanagari text-slate-700">{card.hindi}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleSpeak(key, card.german, false)}
                          aria-label={`Listen to ${card.german}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                        >
                          {playingId === key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>
                        <SpeakCheckButton
                          targetText={card.german}
                          devanagari={card.devanagari}
                          variant="compact"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
