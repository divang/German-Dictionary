import { useMemo } from 'react';
import {
  Cloud,
  CloudOff,
  Loader2,
  LogIn,
  LogOut,
  PlayCircle,
} from 'lucide-react';
import {
  A1_LISTENING_TASKS,
  A1_MOCK_EXAM_QUESTIONS,
  A1_MODULES,
  A1_READING_TASKS,
  A1_SPEAKING_CARDS,
  A1_WRITING_PROMPTS,
} from '../data/a1Curriculum';
import type { A1ExamAttempt, A1UserProgress, A1WorkspaceTab } from '../types/a1';
import { calculateA1Readiness } from '../utils/a1Progress';
import { A1CurriculumPanel } from './A1CurriculumPanel';
import { A1MockExamPanel } from './A1MockExamPanel';
import { A1SkillsPanel } from './A1SkillsPanel';

interface CloudSyncAccount {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
}

interface A1CertificateViewProps {
  progress: A1UserProgress;
  examAttempts: A1ExamAttempt[];
  cloudUser: CloudSyncAccount | null;
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  authError: string | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onChangeTab: (tab: A1WorkspaceTab) => void;
  onSelectModule: (moduleId: string) => void;
  onToggleCompleteModule: (moduleId: string) => void;
  onToggleMasterVocab: (vocabId: string) => void;
  onRecordExamAttempt: (attempt: Omit<A1ExamAttempt, 'ownerId' | 'createdAtMs'>) => Promise<void> | void;
  onLookupWordInDictionary: (word: string) => void;
}

const WORKSPACE_TABS: { id: A1WorkspaceTab; label: string; sub: string }[] = [
  { id: 'modules', label: 'Curriculum', sub: '8 Modules' },
  { id: 'hoeren', label: 'Hören', sub: 'Listening' },
  { id: 'lesen', label: 'Lesen', sub: 'Reading' },
  { id: 'schreiben', label: 'Schreiben', sub: 'Writing' },
  { id: 'sprechen', label: 'Sprechen', sub: 'Speaking' },
  { id: 'mock-exam', label: 'Mock Exam', sub: '100 pts' },
];

export function A1CertificateView({
  progress,
  examAttempts,
  cloudUser,
  isAuthLoading,
  isSyncingCloud,
  authError,
  onSignInGoogle,
  onSignOut,
  onChangeTab,
  onSelectModule,
  onToggleCompleteModule,
  onToggleMasterVocab,
  onRecordExamAttempt,
  onLookupWordInDictionary,
}: A1CertificateViewProps) {
  const totalVocabCount = useMemo(
    () => A1_MODULES.reduce((sum, mod) => sum + mod.vocabulary.length, 0),
    [],
  );

  const readiness = useMemo(
    () => calculateA1Readiness(progress, A1_MODULES.length, totalVocabCount),
    [progress, totalVocabCount],
  );

  const resumeModule = useMemo(
    () => A1_MODULES.find((m) => m.id === progress.lastActiveModuleId) ?? A1_MODULES[0],
    [progress.lastActiveModuleId],
  );

  const isCloudActive = Boolean(cloudUser && cloudUser.emailVerified);

  return (
    <div className="space-y-6">
      {/* Top Goethe A1 Readiness & Cross-Device Cloud Sync Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Goethe-Zertifikat A1 · Start Deutsch 1 for Hindi Speakers
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              German A1 Certificate Workspace
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Master all 8 CEFR A1 modules, train Hören, Lesen, Schreiben, and Sprechen, and sync
              your progress seamlessly across phone, tablet, and desktop.
            </p>
          </div>

          {/* Cross-device Cloud Sync control */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 min-w-[260px] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                {isCloudActive ? (
                  <Cloud className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                ) : (
                  <CloudOff className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                )}
                <span>{isCloudActive ? 'Synced Across Devices' : 'Saved Locally'}</span>
              </div>
              {isSyncingCloud && (
                <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin" aria-hidden="true" />
              )}
            </div>

            {isAuthLoading ? (
              <p className="text-xs text-slate-500">Checking sync status...</p>
            ) : cloudUser ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 truncate">
                  {cloudUser.displayName || cloudUser.email || 'Signed-in Learner'}
                </p>
                {!cloudUser.emailVerified && (
                  <p className="text-[11px] text-amber-800">
                    Please verify your Google email to enable Firestore sync.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Continue your A1 certificate from any device with Google Sign-In.
                </p>
                <button
                  type="button"
                  onClick={onSignInGoogle}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[38px] text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign in with Google to Sync</span>
                </button>
              </div>
            )}

            {authError && <p className="text-[11px] text-amber-800 leading-snug">{authError}</p>}
          </div>
        </div>

        {/* Readiness Progress Bar + Compact Metrics */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm tabular-nums">
              <span>
                <strong className="font-display text-lg text-slate-900">
                  {readiness.overallPercent}%
                </strong>{' '}
                <span className="text-xs text-slate-500">A1 Readiness</span>
              </span>
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900">
                  {readiness.modulesCompleted}/{readiness.totalModules}
                </strong>{' '}
                Modules
              </span>
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900">
                  {readiness.vocabMastered}/{readiness.totalVocab}
                </strong>{' '}
                Core Words
              </span>
              <span className="text-xs text-slate-600">
                Best Mock:{' '}
                <strong className="text-slate-900">
                  {readiness.bestMockScore > 0 ? `${readiness.bestMockScore}%` : '—'}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectModule(resumeModule.id);
                onChangeTab('modules');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Continue: Modul {resumeModule.number} ({resumeModule.englishTitle})
              </span>
            </button>
          </div>

          <div
            role="progressbar"
            aria-label="Goethe A1 overall readiness"
            aria-valuenow={readiness.overallPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
          >
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${readiness.overallPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 6-Tab Workspace Switcher */}
      <nav
        aria-label="A1 Certificate sections"
        className="bg-white border border-slate-200 rounded-xl p-1.5 overflow-x-auto"
      >
        <div className="grid grid-cols-6 min-w-[600px] gap-1">
          {WORKSPACE_TABS.map((tab) => {
            const active = progress.lastActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`px-3 py-2 min-h-[44px] rounded-lg text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="block text-sm font-semibold leading-tight">{tab.label}</span>
                <span
                  className={`block text-[11px] mt-0.5 ${
                    active ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active Workspace Panel */}
      {progress.lastActiveTab === 'modules' && (
        <A1CurriculumPanel
          modules={A1_MODULES}
          activeModuleId={progress.lastActiveModuleId}
          completedLessonIds={progress.completedLessonIds}
          masteredVocabIds={progress.masteredVocabIds}
          onSelectModule={onSelectModule}
          onToggleCompleteModule={onToggleCompleteModule}
          onToggleMasterVocab={onToggleMasterVocab}
          onLookupWordInDictionary={onLookupWordInDictionary}
        />
      )}

      {(progress.lastActiveTab === 'hoeren' ||
        progress.lastActiveTab === 'lesen' ||
        progress.lastActiveTab === 'schreiben' ||
        progress.lastActiveTab === 'sprechen') && (
        <A1SkillsPanel
          activeSkill={progress.lastActiveTab}
          listeningTasks={A1_LISTENING_TASKS}
          readingTasks={A1_READING_TASKS}
          writingPrompts={A1_WRITING_PROMPTS}
          speakingCards={A1_SPEAKING_CARDS}
        />
      )}

      {progress.lastActiveTab === 'mock-exam' && (
        <A1MockExamPanel
          questions={A1_MOCK_EXAM_QUESTIONS}
          attemptHistory={examAttempts}
          isCloudSynced={isCloudActive}
          onRecordAttempt={onRecordExamAttempt}
        />
      )}
    </div>
  );
}
