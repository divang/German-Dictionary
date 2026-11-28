import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Turtle,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import type {
  PronunciationAttemptRecord,
  PronunciationCheckFeedback,
  PronunciationCheckMode,
  PronunciationCheckTarget,
  PronunciationWordChunk,
} from '../types/pronunciationCheck';
import { playGermanAudio, stopCurrentAudio } from '../utils/audioPlayer';
import {
  buildFallbackWordChunks,
  cleanTargetForCheck,
  detectStuckPattern,
  getAccuracyTier,
  normalizeCheckMode,
  normalizePronunciationFeedback,
  sanitizeAudioMimeType,
} from '../utils/pronunciationCheck';
import { resolveSyllableAudioTarget } from '../utils/voiceSelection';
import { PronunciationTeacherPanel } from '../components/PronunciationTeacherPanel';

interface PronunciationCheckContextValue {
  openCheck: (target: PronunciationCheckTarget) => void;
  closeCheck: () => void;
}

const PronunciationCheckContext = createContext<PronunciationCheckContextValue | null>(null);

const MAX_RECORDING_SECONDS = 12;
const PRONUNCIATION_MODE_STORAGE_KEY = 'lautbhasha_pronunciation_mode';

function readStoredCheckMode(): PronunciationCheckMode {
  try {
    return normalizeCheckMode(window.localStorage.getItem(PRONUNCIATION_MODE_STORAGE_KEY));
  } catch {
    return 'fast';
  }
}

export function PronunciationCheckProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<PronunciationCheckTarget | null>(null);

  const openCheck = useCallback((nextTarget: PronunciationCheckTarget) => {
    const cleaned = cleanTargetForCheck(nextTarget.text);
    if (!cleaned) return;
    stopCurrentAudio();
    setTarget({
      ...nextTarget,
      text: cleaned,
    });
  }, []);

  const closeCheck = useCallback(() => {
    stopCurrentAudio();
    setTarget(null);
  }, []);

  return (
    <PronunciationCheckContext.Provider value={{ openCheck, closeCheck }}>
      {children}
      {target && <PronunciationCheckModal target={target} onClose={closeCheck} />}
    </PronunciationCheckContext.Provider>
  );
}

export function usePronunciationCheck(): PronunciationCheckContextValue {
  const ctx = useContext(PronunciationCheckContext);
  if (!ctx) {
    throw new Error('usePronunciationCheck must be used within PronunciationCheckProvider');
  }
  return ctx;
}

interface SpeakCheckButtonProps {
  targetText: string;
  displayLabel?: string;
  devanagari?: string;
  ipa?: string;
  variant?: 'primary' | 'compact' | 'icon';
  className?: string;
}

/**
 * Reusable trigger button placed beside every Listen button across LautBhasha
 * so learners can immediately record and verify their German pronunciation accuracy.
 */
export function SpeakCheckButton({
  targetText,
  displayLabel,
  devanagari,
  ipa,
  variant = 'compact',
  className = '',
}: SpeakCheckButtonProps) {
  const { openCheck } = usePronunciationCheck();
  const cleanLabel = cleanTargetForCheck(targetText);
  if (!cleanLabel) return null;

  const handleClick = () => {
    openCheck({
      text: cleanLabel,
      displayLabel,
      devanagari,
      ipa,
    });
  };

  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Verify your pronunciation of ${cleanLabel}`}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${className}`}
      >
        <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Verify Voice</span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Verify your German pronunciation"
        aria-label={`Verify your pronunciation of ${cleanLabel}`}
        className={`p-1.5 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 ${className}`}
      >
        <Mic className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Record your voice and verify German pronunciation accuracy"
      aria-label={`Verify your pronunciation of ${cleanLabel}`}
      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 ${className}`}
    >
      <Mic className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Verify</span>
    </button>
  );
}

interface PronunciationCheckModalProps {
  target: PronunciationCheckTarget;
  onClose: () => void;
}

function PronunciationCheckModal({ target, onClose }: PronunciationCheckModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playingTarget, setPlayingTarget] = useState<'normal' | 'slow' | null>(null);
  const [playingChunkMode, setPlayingChunkMode] = useState<'part' | 'slow' | null>(null);
  const [isPlayingUserClip, setIsPlayingUserClip] = useState(false);
  const [attempts, setAttempts] = useState<PronunciationAttemptRecord[]>([]);
  const [checkMode, setCheckMode] = useState<PronunciationCheckMode>(() => readStoredCheckMode());
  const [analyzingMode, setAnalyzingMode] = useState<PronunciationCheckMode>('fast');

  // Human-Teacher Step-by-Step Breakdown & Drill state
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [masteredChunkIndices, setMasteredChunkIndices] = useState<Set<number>>(() => new Set());
  const [chunkAttemptCounts, setChunkAttemptCounts] = useState<Record<number, number>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const lastRecordedRef = useRef<{
    blob: Blob;
    rawMime: string;
    chunk: PronunciationWordChunk | null;
    chunkIndex: number | null;
  } | null>(null);

  const handleSelectCheckMode = (nextMode: PronunciationCheckMode) => {
    setCheckMode(nextMode);
    try {
      window.localStorage.setItem(PRONUNCIATION_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage failures
    }
  };

  const fallbackChunks = useMemo(
    () => buildFallbackWordChunks(target.text, target.devanagari),
    [target.text, target.devanagari],
  );

  // Latest full-word attempt provides the overall word breakdown map & teacher guidance
  const latestFullWordAttempt = useMemo(
    () => attempts.find((a) => !a.practicedChunk) ?? null,
    [attempts],
  );

  const latestAttempt = attempts[0] ?? null;
  const feedback = latestAttempt?.feedback ?? null;

  const activeWordChunks: PronunciationWordChunk[] = useMemo(() => {
    const evaluated = latestFullWordAttempt?.feedback.wordBreakdown;
    if (evaluated && evaluated.length > 0) {
      return evaluated;
    }
    return fallbackChunks;
  }, [latestFullWordAttempt, fallbackChunks]);

  const activeChunk: PronunciationWordChunk | null =
    activeChunkIndex !== null &&
    activeChunkIndex >= 0 &&
    activeChunkIndex < activeWordChunks.length
      ? activeWordChunks[activeChunkIndex]
      : null;

  const stuckInfo = useMemo(() => detectStuckPattern(attempts), [attempts]);

  // Latest feedback specifically for the currently active chunk (if learner just drilled it)
  const latestChunkFeedback = useMemo(() => {
    if (!activeChunk) return null;
    const match = attempts.find((a) => a.practicedChunk === activeChunk.chunk);
    return match?.feedback ?? null;
  }, [attempts, activeChunk]);

  const cleanupRecordingHandles = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (analyserRafRef.current !== null) {
      window.cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setMicLevel(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Ignore cleanup errors
      }
      cleanupRecordingHandles();
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
    };
  }, [cleanupRecordingHandles, onClose]);

  const handlePlayTarget = async (slow: boolean) => {
    setPlayingTarget(slow ? 'slow' : 'normal');
    setErrorMsg(null);
    const res = await playGermanAudio(target.text, { slow, ipa: target.ipa });
    setPlayingTarget(null);
    if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handlePlayChunk = async (chunk: PronunciationWordChunk, slowInWord: boolean) => {
    setPlayingChunkMode(slowInWord ? 'slow' : 'part');
    setErrorMsg(null);

    if (slowInWord) {
      const res = await playGermanAudio(target.text, { slow: true, ipa: target.ipa });
      setPlayingChunkMode(null);
      if (res.error) setErrorMsg(res.error);
      return;
    }

    const resolved = resolveSyllableAudioTarget({
      segment: chunk.speakText || chunk.chunk,
      word: target.text,
      wordIpa: target.ipa,
    });
    const res = await playGermanAudio(resolved.text, {
      slow: resolved.forceSlow,
      ipa: resolved.ipa,
    });
    setPlayingChunkMode(null);
    if (res.error) setErrorMsg(res.error);
  };

  const handlePlayUserRecording = (audioUrl: string) => {
    stopCurrentAudio();
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current = null;
    }
    const audio = new Audio(audioUrl);
    userAudioRef.current = audio;
    setIsPlayingUserClip(true);
    audio.onended = () => {
      setIsPlayingUserClip(false);
      userAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsPlayingUserClip(false);
      userAudioRef.current = null;
    };
    void audio.play().catch(() => {
      setIsPlayingUserClip(false);
    });
  };

  const evaluateRecordedBlob = async (
    blob: Blob,
    rawMime: string,
    overrideMode?: PronunciationCheckMode,
    overrideChunk?: { chunk: PronunciationWordChunk | null; chunkIndex: number | null },
  ) => {
    const modeToUse = overrideMode ?? checkMode;
    const chunkToUse = overrideChunk ? overrideChunk.chunk : activeChunk;
    const chunkIndexToUse = overrideChunk ? overrideChunk.chunkIndex : activeChunkIndex;

    lastRecordedRef.current = {
      blob,
      rawMime,
      chunk: chunkToUse,
      chunkIndex: chunkIndexToUse,
    };

    setAnalyzingMode(modeToUse);
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const str = typeof reader.result === 'string' ? reader.result : '';
          const commaIdx = str.indexOf(',');
          resolve(commaIdx >= 0 ? str.slice(commaIdx + 1) : str);
        };
        reader.onerror = () => reject(new Error('Could not read recorded audio.'));
        reader.readAsDataURL(blob);
      });

      const mimeType = sanitizeAudioMimeType(rawMime || blob.type);
      const isDrillingChunk = chunkToUse !== null && chunkIndexToUse !== null;

      const relevantPrevious = isDrillingChunk
        ? attempts.filter((a) => a.practicedChunk === chunkToUse.chunk)
        : attempts.filter((a) => !a.practicedChunk);

      const previousScores = relevantPrevious.map((a) => a.feedback.accuracyScore).slice(0, 5);
      const previousWeakSegments = Array.from(
        new Set(
          relevantPrevious.flatMap((a) =>
            (a.feedback.wordBreakdown ?? [])
              .filter((c) => c.status === 'needs-work' || c.status === 'close')
              .map((c) => c.chunk),
          ),
        ),
      ).slice(0, 5);

      const res = await fetch('/api/evaluate-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetText: isDrillingChunk ? chunkToUse.speakText || chunkToUse.chunk : target.text,
          devanagariHint: isDrillingChunk
            ? chunkToUse.targetDevanagari
            : target.devanagari ?? '',
          ipaHint: isDrillingChunk ? '' : target.ipa ?? '',
          audioBase64: base64,
          mimeType,
          mode: modeToUse,
          attemptNumber: relevantPrevious.length + 1,
          previousScores,
          previousWeakSegments,
          focusChunk: isDrillingChunk ? chunkToUse.chunk : undefined,
          parentTarget: isDrillingChunk ? target.text : undefined,
          chunkRole: isDrillingChunk ? chunkToUse.role : undefined,
        }),
      });

      const payload = (await res.json()) as {
        feedback?: Partial<PronunciationCheckFeedback> & Record<string, unknown>;
        mode?: PronunciationCheckMode;
        error?: string;
      };

      if (!res.ok || !payload.feedback) {
        setErrorMsg(
          payload.error || 'Could not analyze your pronunciation right now. Please try again.',
        );
        return;
      }

      const resolvedMode = payload.mode ?? modeToUse;
      const normalized = normalizePronunciationFeedback(
        payload.feedback,
        isDrillingChunk ? chunkToUse.chunk : target.text,
        isDrillingChunk ? chunkToUse.chunk : undefined,
        resolvedMode,
      );
      const audioUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(audioUrl);

      setAttempts((prev) => [
        {
          id: `att-${Date.now()}`,
          timestampMs: Date.now(),
          feedback: normalized,
          audioUrl,
          practicedChunk: isDrillingChunk ? chunkToUse.chunk : null,
          evaluationMode: resolvedMode,
        },
        ...prev,
      ]);

      // Automatically surface the interactive prefix/infix/suffix breakdown map after evaluation
      setShowTeacherPanel(true);

      if (isDrillingChunk && chunkIndexToUse !== null) {
        setChunkAttemptCounts((prev) => ({
          ...prev,
          [chunkIndexToUse]: (prev[chunkIndexToUse] ?? 0) + 1,
        }));
        if (normalized.accuracyScore >= 70) {
          setMasteredChunkIndices((prev) => {
            const next = new Set(prev);
            next.add(chunkIndexToUse);
            return next;
          });
        }
      }
    } catch {
      setErrorMsg('Network error while analyzing your voice. Please try recording again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecheckWithAdvanced = () => {
    const last = lastRecordedRef.current;
    if (!last || isAnalyzing || isRecording) return;
    handleSelectCheckMode('advanced');
    void evaluateRecordedBlob(last.blob, last.rawMime, 'advanced', {
      chunk: last.chunk,
      chunkIndex: last.chunkIndex,
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupRecordingHandles();
  };

  const startRecording = async () => {
    stopCurrentAudio();
    setErrorMsg(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorMsg(
        'Microphone recording is not supported in this browser. Try Chrome, Edge, or Safari with microphone access.',
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      // Live audio level visual indicator so learner sees voice pickup
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const tickLevel = () => {
            analyser.getByteTimeDomainData(dataArray);
            let sumSq = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const v = (dataArray[i] - 128) / 128;
              sumSq += v * v;
            }
            const rms = Math.sqrt(sumSq / dataArray.length);
            setMicLevel(Math.min(100, Math.round(rms * 320)));
            analyserRafRef.current = window.requestAnimationFrame(tickLevel);
          };
          analyserRafRef.current = window.requestAnimationFrame(tickLevel);
        }
      } catch {
        // Optional visual level meter
      }

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      let recorder: MediaRecorder;
      try {
        const options: MediaRecorderOptions = { audioBitsPerSecond: 24000 };
        if (preferredMime) options.mimeType = preferredMime;
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        cleanupRecordingHandles();
        setIsRecording(false);
        const rawType = recorder.mimeType || preferredMime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: rawType });
        if (blob.size < 350) {
          setErrorMsg(
            'Recording was too short or silent. Tap Start Recording, speak clearly, then tap Stop.',
          );
          return;
        }
        void evaluateRecordedBlob(blob, rawType);
      };

      recorder.start();
      setIsRecording(true);
      setElapsedSec(0);

      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds += 1;
        setElapsedSec(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch {
      cleanupRecordingHandles();
      setIsRecording(false);
      setErrorMsg(
        'Microphone permission was blocked. Please allow microphone access in your browser address bar and try again.',
      );
    }
  };

  const handleToggleTeacherBreakdown = () => {
    if (showTeacherPanel) {
      setShowTeacherPanel(false);
      setActiveChunkIndex(null);
    } else {
      setShowTeacherPanel(true);
      if (activeWordChunks.length > 0) {
        const startIdx =
          latestFullWordAttempt?.feedback.teacherGuidance?.recommendedChunkIndex ?? 0;
        setActiveChunkIndex(
          startIdx >= 0 && startIdx < activeWordChunks.length ? startIdx : 0,
        );
      }
    }
  };

  const tier = feedback ? getAccuracyTier(feedback.accuracyScore) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pronunciation-check-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Top Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
              <Mic className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="pronunciation-check-title"
                className="font-display text-lg font-semibold text-slate-900 leading-tight"
              >
                Verify Your German Pronunciation
              </h2>
              <p className="text-xs text-slate-500">
                Accuracy score, prefix/infix/suffix breakdown &amp; step-by-step teacher coaching
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close pronunciation checker"
            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Target German Word / Sentence Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Target German to Speak
                </span>
                <p className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 break-words leading-snug">
                  {target.displayLabel || target.text}
                </p>
                {(target.devanagari || target.ipa) && (
                  <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
                    {target.devanagari && (
                      <span className="font-devanagari text-lg font-semibold text-blue-700">
                        {target.devanagari}
                      </span>
                    )}
                    {target.ipa && (
                      <span className="font-mono text-xs text-slate-500">{target.ipa}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={playingTarget !== null || isRecording}
                  onClick={() => void handlePlayTarget(false)}
                  aria-label="Listen to target German at normal speed"
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {playingTarget === 'normal' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Listen</span>
                </button>
                <button
                  type="button"
                  disabled={playingTarget !== null || isRecording}
                  onClick={() => void handlePlayTarget(true)}
                  aria-label="Listen to target German slowly"
                  className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {playingTarget === 'slow' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Slow</span>
                </button>
              </div>
            </div>

            {/* Instant Step-by-Step Teacher Breakdown Trigger */}
            {activeWordChunks.length > 1 && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-600">
                  Struggling with a tricky sound? Break it into prefix, infix &amp; suffix parts.
                </span>
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={handleToggleTeacherBreakdown}
                  aria-expanded={showTeacherPanel}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                    showTeacherPanel
                      ? 'bg-blue-700 text-white border-blue-700 hover:bg-blue-800'
                      : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {showTeacherPanel
                      ? 'Hide Part-by-Part Breakdown'
                      : 'Break Into Parts & Practice Step-by-Step'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Dual-Mode Accuracy Selector: Fast Check vs Advanced Accuracy */}
          <div
            role="radiogroup"
            aria-label="Voice accuracy check mode"
            className="bg-white border border-slate-200 rounded-xl p-2 grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={checkMode === 'fast'}
              disabled={isRecording || isAnalyzing}
              onClick={() => handleSelectCheckMode('fast')}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                checkMode === 'fast'
                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                  : 'bg-slate-50/60 border-transparent text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                  checkMode === 'fast'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">
                  Fast Check <span className="font-normal opacity-75">· Quicker response</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Best for quick daily drills &amp; fast repeat practice.
                </p>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={checkMode === 'advanced'}
              disabled={isRecording || isAnalyzing}
              onClick={() => handleSelectCheckMode('advanced')}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                checkMode === 'advanced'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-slate-50/60 border-transparent text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                  checkMode === 'advanced'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">
                  Advanced Accuracy <span className="font-normal opacity-75">· Deeper check</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Turn on for tricky German sounds (ö, ü, ch, r, Friseur).
                </p>
              </div>
            </button>
          </div>

          {/* Interactive Word Breakdown Map & Human-Teacher Step-by-Step Drill Panel */}
          {showTeacherPanel && (
            <PronunciationTeacherPanel
              targetText={target.text}
              chunks={activeWordChunks}
              activeChunkIndex={activeChunkIndex}
              masteredChunkIndices={masteredChunkIndices}
              chunkAttemptCount={
                activeChunkIndex !== null ? (chunkAttemptCounts[activeChunkIndex] ?? 0) : 0
              }
              latestChunkFeedback={latestChunkFeedback}
              teacherGuidance={latestFullWordAttempt?.feedback.teacherGuidance}
              stuckInfo={stuckInfo}
              isRecording={isRecording}
              playingChunkMode={playingChunkMode}
              onSelectChunk={(idx) => {
                setErrorMsg(null);
                setActiveChunkIndex(idx);
              }}
              onPlayChunk={(chunk, slowInWord) => void handlePlayChunk(chunk, slowInWord)}
            />
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-950"
            >
              <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Pronunciation Accuracy Analysis Results */}
          {feedback && tier && (
            <div className="space-y-4 border-t border-slate-200 pt-5">
              {/* Score Header + Playback My Voice */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`font-display text-4xl font-bold tabular-nums ${tier.scoreTextClass}`}
                    >
                      {feedback.accuracyScore}%
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {feedback.practicedChunk
                            ? `Part “${feedback.practicedChunk}” · ${tier.label}`
                            : tier.label}
                        </p>
                        {feedback.evaluationMode && (
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                              feedback.evaluationMode === 'advanced'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}
                          >
                            {feedback.evaluationMode === 'advanced'
                              ? 'Advanced Accuracy'
                              : 'Fast Check'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-devanagari text-slate-600">{tier.hindiLabel}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {latestAttempt?.audioUrl && (
                      <button
                        type="button"
                        onClick={() => handlePlayUserRecording(latestAttempt.audioUrl!)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                        <span>{isPlayingUserClip ? 'Playing Your Voice…' : 'Hear My Recording'}</span>
                      </button>
                    )}
                    {feedback.evaluationMode === 'fast' && lastRecordedRef.current && (
                      <button
                        type="button"
                        disabled={isAnalyzing || isRecording}
                        onClick={handleRecheckWithAdvanced}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        <span>Re-check with Advanced Accuracy</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Accuracy Meter Bar */}
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${tier.barClass}`}
                    style={{ width: `${Math.max(4, feedback.accuracyScore)}%` }}
                  />
                </div>

                {/* What the Coach Heard */}
                {(feedback.heardText || feedback.heardDevanagari) && (
                  <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-semibold text-slate-500">What we heard:</span>
                    {feedback.heardText && (
                      <span className="font-medium text-slate-900">“{feedback.heardText}”</span>
                    )}
                    {feedback.heardDevanagari && (
                      <span className="font-devanagari font-semibold text-blue-700">
                        ({feedback.heardDevanagari})
                      </span>
                    )}
                  </div>
                )}

                {/* Overall Feedback in English + Hindi */}
                <div className="space-y-1 text-sm">
                  <p className="text-slate-800 leading-relaxed">{feedback.summaryEnglish}</p>
                  {feedback.summaryHindi && (
                    <p className="font-devanagari text-slate-600 leading-relaxed">
                      {feedback.summaryHindi}
                    </p>
                  )}
                </div>
              </div>

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    <span>What You Pronounced Well</span>
                  </div>
                  <ul className="space-y-1 text-sm text-emerald-950 list-disc pl-5">
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Corrections */}
              {feedback.corrections.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    <Sparkles className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <span>Suggested Corrections</span>
                  </div>
                  <div className="space-y-3">
                    {feedback.corrections.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-1.5"
                      >
                        {item.segment && (
                          <p className="text-sm font-semibold text-slate-900">
                            Sound focus: <span className="text-blue-800">{item.segment}</span>
                          </p>
                        )}
                        {item.issue && (
                          <p className="text-xs sm:text-sm text-rose-800">
                            <span className="font-semibold">What happened:</span> {item.issue}
                          </p>
                        )}
                        {item.howToFix && (
                          <p className="text-xs sm:text-sm text-slate-800">
                            <span className="font-semibold">How to fix:</span> {item.howToFix}
                          </p>
                        )}
                        {item.hindiTip && (
                          <p className="text-xs sm:text-sm font-devanagari text-blue-900 bg-blue-50/70 border border-blue-100 rounded-md px-2.5 py-1.5">
                            <span className="font-semibold">हिंदी टिप:</span> {item.hindiTip}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retry Focus Cue */}
              {feedback.retryTip && (
                <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-950">
                  <RotateCcw className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" aria-hidden="true" />
                  <p>
                    <span className="font-semibold">Next try focus:</span> {feedback.retryTip}
                  </p>
                </div>
              )}

              {/* Session Attempt History (when user retries to track improvement) */}
              {attempts.length > 1 && (
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-500">Your attempts this session:</span>
                  {attempts.map((att, idx) => (
                    <span
                      key={att.id}
                      className={`px-2 py-0.5 rounded-md border tabular-nums ${
                        idx === 0
                          ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {att.practicedChunk
                        ? `Part ${att.practicedChunk}: ${att.feedback.accuracyScore}%`
                        : `Try #${attempts.length - idx}: ${att.feedback.accuracyScore}%`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Recording Dock (always visible whether in Full Word or Chunk Drill mode) */}
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-col items-center text-center gap-2">
          {isAnalyzing ? (
            <div className="py-1.5 flex items-center justify-center gap-2.5">
              <Loader2 className="w-5 h-5 text-blue-700 animate-spin shrink-0" aria-hidden="true" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {activeChunk
                    ? `Checking your “${activeChunk.chunk}” sound…`
                    : analyzingMode === 'advanced'
                      ? 'Advanced Accuracy: Deep phonetic analysis…'
                      : 'Fast Check: Scoring your German pronunciation…'}
                </p>
                <p className="text-xs text-slate-500">
                  {analyzingMode === 'advanced'
                    ? 'Inspecting umlauts, ch/r sounds, prefix, infix & ending precision'
                    : 'Quick check of each syllable & sound accuracy'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    void startRecording();
                  }
                }}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[46px] text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                    <span>Stop &amp; Check Accuracy ({elapsedSec}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {activeChunk
                        ? `Record Just “${activeChunk.chunk}”`
                        : feedback
                          ? 'Record Full Word Again'
                          : 'Start Recording My Voice'}
                    </span>
                  </>
                )}
              </button>

              {isRecording ? (
                <div className="w-full max-w-xs space-y-1">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-75"
                      style={{ width: `${Math.max(8, micLevel)}%` }}
                    />
                  </div>
                  <p className="text-xs text-rose-700 font-medium">
                    Listening… speak clearly, then tap Stop (auto-stops at {MAX_RECORDING_SECONDS}s)
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {activeChunk
                    ? `Teacher Drill: Say just “${activeChunk.chunk}” (${activeChunk.targetDevanagari}) clearly, then tap Stop.`
                    : `Listen once first, then record “${target.text}” and tap Stop.`}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
