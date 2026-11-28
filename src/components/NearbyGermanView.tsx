import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Search,
  Sparkles,
  Turtle,
  Volume2,
  X,
} from 'lucide-react';
import type {
  NearbyMode,
  NearbySentenceResult,
  NearbyWordResult,
} from '../types/nearby';
import { playGermanAudio } from '../utils/audioPlayer';
import {
  INITIAL_SAMPLE_NEARBY_SENTENCE,
  INITIAL_SAMPLE_NEARBY_WORD,
  MAX_NEARBY_SENTENCE_INPUT,
  MAX_NEARBY_WORD_INPUT,
  PRESET_NEARBY_SENTENCES,
  PRESET_NEARBY_WORDS,
  getConfidenceLabel,
  normalizeNearbySentenceResult,
  normalizeNearbyWordResult,
  validateNearbyInput,
} from '../utils/nearbyGerman';
import { stripArticleAndPunctuation } from '../utils/sentenceTranslator';
import { SpeakCheckButton } from '../context/PronunciationCheckContext';

interface NearbyGermanViewProps {
  onLookupWordInDictionary: (word: string) => void;
}

type SpeechRecLang = 'de-DE' | 'hi-IN' | 'en-IN';

interface BrowserSpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
}

export function NearbyGermanView({ onLookupWordInDictionary }: NearbyGermanViewProps) {
  const [mode, setMode] = useState<NearbyMode>('word');
  const [wordQuery, setWordQuery] = useState(INITIAL_SAMPLE_NEARBY_WORD.query);
  const [sentenceQuery, setSentenceQuery] = useState(INITIAL_SAMPLE_NEARBY_SENTENCE.query);
  const [wordResult, setWordResult] = useState<NearbyWordResult>(INITIAL_SAMPLE_NEARBY_WORD);
  const [sentenceResult, setSentenceResult] = useState<NearbySentenceResult>(
    INITIAL_SAMPLE_NEARBY_SENTENCE,
  );
  const [selectedSentenceIdx, setSelectedSentenceIdx] = useState(0);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Voice input state (Web Speech API primary + MediaRecorder Gemini transcribe fallback)
  const [speechLang, setSpeechLang] = useState<SpeechRecLang>('de-DE');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Audio playback & copy state
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const activeQuery = mode === 'word' ? wordQuery : sentenceQuery;
  const maxLen = mode === 'word' ? MAX_NEARBY_WORD_INPUT : MAX_NEARBY_SENTENCE_INPUT;

  const setActiveQuery = (value: string) => {
    if (mode === 'word') {
      setWordQuery(value);
    } else {
      setSentenceQuery(value);
    }
  };

  useEffect(() => {
    return () => {
      try {
        speechRecRef.current?.abort();
      } catch {
        // Ignore cleanup errors
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const runNearbyLookup = async (rawQuery: string, targetMode: NearbyMode) => {
    const err = validateNearbyInput(rawQuery, targetMode);
    if (err) {
      setValidationError(err);
      return;
    }

    const cleaned = rawQuery.trim();
    setValidationError(null);
    setApiError(null);
    setAudioNotice(null);
    setIsSearching(true);

    try {
      const response = await fetch('/api/nearby-german', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleaned, mode: targetMode }),
      });

      const payload = (await response.json()) as {
        result?: Record<string, unknown>;
        error?: string;
      };

      if (!response.ok || !payload.result) {
        setApiError(payload.error || 'Could not find nearby German matches right now.');
        return;
      }

      if (targetMode === 'word') {
        const normalized = normalizeNearbyWordResult(
          payload.result as Partial<NearbyWordResult>,
          cleaned,
        );
        if (normalized.candidates.length === 0) {
          setApiError('No close German words found. Try adding another syllable or sound.');
          return;
        }
        setWordResult(normalized);
      } else {
        const normalized = normalizeNearbySentenceResult(
          payload.result as Partial<NearbySentenceResult>,
          cleaned,
        );
        if (normalized.candidates.length === 0) {
          setApiError('No close German sentences found. Try typing a few more sounds or words.');
          return;
        }
        setSentenceResult(normalized);
        setSelectedSentenceIdx(0);
      }
    } catch {
      setApiError('Network error while searching nearby German matches. Please retry.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runNearbyLookup(activeQuery, mode);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void runNearbyLookup(activeQuery, mode);
    }
  };

  const stopVoiceCapture = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const startFallbackMediaRecorder = async (targetMode: NearbyMode) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceNotice(
        'Voice recording is not supported in this browser. Type the rough spelling instead.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 200) {
          setVoiceNotice('Recording was too short. Tap Speak again and say the German sound clearly.');
          return;
        }

        setIsTranscribing(true);
        setVoiceNotice(null);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const str = typeof reader.result === 'string' ? reader.result : '';
              const idx = str.indexOf(',');
              resolve(idx >= 0 ? str.slice(idx + 1) : str);
            };
            reader.onerror = () => reject(new Error('Failed to read audio'));
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: blob.type || 'audio/webm',
              mode: targetMode,
            }),
          });
          const data = (await res.json()) as { transcript?: string; error?: string };
          if (!res.ok || !data.transcript) {
            setVoiceNotice(data.error || 'Could not transcribe audio. Try speaking again or typing.');
            return;
          }

          if (targetMode === 'word') {
            setWordQuery(data.transcript);
          } else {
            setSentenceQuery(data.transcript);
          }
          setValidationError(null);
          void runNearbyLookup(data.transcript, targetMode);
        } catch {
          setVoiceNotice('Could not transcribe audio right now. Try typing the rough spelling.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsListening(true);
      setVoiceNotice('Listening… tap Stop when you finish speaking.');
    } catch {
      setVoiceNotice(
        'Microphone access was denied. Allow microphone permission in your browser or type the rough spelling.',
      );
      setIsListening(false);
    }
  };

  const handleToggleSpeak = () => {
    if (isListening) {
      stopVoiceCapture();
      return;
    }

    setVoiceNotice(null);
    setValidationError(null);
    setApiError(null);

    const win = window as WindowWithSpeechRecognition;
    const SpeechRecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      void startFallbackMediaRecorder(mode);
      return;
    }

    try {
      const recognition = new SpeechRecCtor();
      recognition.lang = speechLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      speechRecRef.current = recognition;

      let gotResult = false;
      const targetMode = mode;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
        if (transcript) {
          gotResult = true;
          if (targetMode === 'word') {
            setWordQuery(transcript);
          } else {
            setSentenceQuery(transcript);
          }
          setValidationError(null);
          void runNearbyLookup(transcript, targetMode);
        }
      };

      recognition.onerror = (ev) => {
        setIsListening(false);
        speechRecRef.current = null;
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          setVoiceNotice(
            'Microphone permission was blocked. Allow microphone access or type the rough spelling.',
          );
        } else if (ev.error === 'no-speech') {
          setVoiceNotice('No speech detected. Tap Speak again and say the German word or sentence.');
        } else {
          // Automatically fall back to server transcription if browser speech engine fails
          void startFallbackMediaRecorder(targetMode);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        speechRecRef.current = null;
        if (!gotResult) {
          // Keep any error message already set
        }
      };

      recognition.start();
      setIsListening(true);
    } catch {
      void startFallbackMediaRecorder(mode);
    }
  };

  const handlePlayGerman = async (text: string, key: string, slow: boolean, ipa?: string) => {
    const clean = text.trim();
    if (!clean) return;
    setPlayingKey(key);
    setAudioNotice(null);
    const result = await playGermanAudio(clean, { slow, ipa });
    setPlayingKey((curr) => (curr === key ? null : curr));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleSelectPreset = (preset: string) => {
    setActiveQuery(preset);
    setValidationError(null);
    setVoiceNotice(null);
    void runNearbyLookup(preset, mode);
  };

  const activeSentenceCandidate =
    sentenceResult.candidates[selectedSentenceIdx] ?? sentenceResult.candidates[0];

  return (
    <section aria-labelledby="nearby-german-title" className="space-y-6">
      {/* Input & Voice Finder Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Phonetic &amp; Voice Matcher · Speak or Type Roughly</span>
            </div>
            <h1
              id="nearby-german-title"
              className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
            >
              Find Nearby German Word or Sentence
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Not sure how a German word or sentence is spelled? Speak it or type the rough sound
              (in English letters or हिंदी) and get the most probable real German match with audio.
            </p>
          </div>

          {/* Mode Toggle: Nearby Word vs Nearby Sentence */}
          <div
            role="tablist"
            aria-label="Choose word or sentence matching"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start lg:self-auto shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'word'}
              onClick={() => {
                setMode('word');
                setValidationError(null);
                setApiError(null);
              }}
              className={`px-3.5 py-2 min-h-[36px] text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                mode === 'word'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nearby Word
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sentence'}
              onClick={() => {
                setMode('sentence');
                setValidationError(null);
                setApiError(null);
              }}
              className={`px-3.5 py-2 min-h-[36px] text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                mode === 'sentence'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nearby Sentence
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="nearby-german-input" className="text-xs font-semibold text-slate-700">
              {mode === 'word'
                ? 'Speak or type how the German word sounds'
                : 'Speak or type how the German sentence sounds'}
            </label>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-400">Mic accent:</span>
                <select
                  aria-label="Microphone accent language"
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value as SpeechRecLang)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="de-DE">German (de-DE)</option>
                  <option value="en-IN">English / Phonetic (en-IN)</option>
                  <option value="hi-IN">Hindi (hi-IN)</option>
                </select>
              </label>
              <span className="text-slate-400 tabular-nums">
                {activeQuery.length}/{maxLen}
              </span>
            </div>
          </div>

          <div className="relative">
            <textarea
              id="nearby-german-input"
              rows={mode === 'word' ? 1 : 2}
              value={activeQuery}
              onChange={(e) => {
                setActiveQuery(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'word'
                  ? 'e.g. ent shul di gung, kranken hows, free zeur, or आपो-टेके'
                  : 'e.g. ish moeshte ain kaffe bitte, wo ist de bahn hof'
              }
              aria-invalid={Boolean(validationError)}
              className="w-full pr-10 px-4 py-3 text-base bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 resize-y focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {activeQuery && (
              <button
                type="button"
                onClick={() => {
                  setActiveQuery('');
                  setValidationError(null);
                  setApiError(null);
                }}
                aria-label="Clear rough spelling input"
                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {validationError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {validationError}
            </p>
          )}
          {voiceNotice && (
            <p
              role="status"
              className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2"
            >
              {voiceNotice}
            </p>
          )}
          {apiError && (
            <p
              role="alert"
              className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2"
            >
              {apiError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              disabled={isTranscribing || isSearching}
              onClick={handleToggleSpeak}
              aria-pressed={isListening}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium border rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Transcribing…</span>
                </>
              ) : isListening ? (
                <>
                  <MicOff className="w-4 h-4" aria-hidden="true" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <span>Speak German Sound</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSearching || isTranscribing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Finding Matches…</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {mode === 'word'
                      ? 'Find Probable German Word'
                      : 'Find Probable German Sentence'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick-try Rough Phonetic Presets */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500">
            {mode === 'word'
              ? 'Try a rough word spelling or Hindi sound:'
              : 'Try a rough German sentence spelling:'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(mode === 'word' ? PRESET_NEARBY_WORDS : PRESET_NEARBY_SENTENCES).map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isSearching}
                onClick={() => handleSelectPreset(preset)}
                className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-60 font-devanagari"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {audioNotice && (
        <p
          role="status"
          className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2"
        >
          {audioNotice}
        </p>
      )}

      {/* MODE 1 RESULTS: PROBABLE NEARBY GERMAN WORDS */}
      {mode === 'word' && (
        <div
          aria-label="Probable German word matches"
          aria-busy={isSearching}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Probable German Words for “{wordResult.query}”
            </h2>
            <span className="text-xs text-slate-500">{wordResult.detectedAs}</span>
          </div>

          {isSearching && (
            <div
              role="status"
              className="flex items-center gap-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
              <span>Matching your spelling/sound against German vocabulary…</span>
            </div>
          )}

          <div
            className={`grid grid-cols-1 gap-4 ${
              wordResult.candidates.length === 1
                ? 'max-w-2xl'
                : wordResult.candidates.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {wordResult.candidates.map((cand, idx) => {
              const conf = getConfidenceLabel(cand.confidence);
              const normalKey = `nw-n-${idx}-${cand.germanWord}`;
              const slowKey = `nw-s-${idx}-${cand.germanWord}`;
              const isBest = idx === 0;

              return (
                <article
                  key={`${cand.germanWord}-${idx}`}
                  className={`bg-white border rounded-xl p-5 flex flex-col justify-between ${
                    isBest ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className={`font-semibold ${conf.textClass}`}>{conf.label}</span>
                      <span className="text-slate-500 truncate">
                        {cand.article ? `${cand.article} · ` : ''}
                        {cand.partOfSpeech}
                      </span>
                    </div>

                    <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                      {cand.article && (
                        <span className="text-slate-400 font-normal text-lg mr-1">
                          {cand.article}
                        </span>
                      )}
                      {cand.germanWord}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="font-devanagari text-lg font-semibold text-blue-800">
                        {cand.devanagari}
                      </span>
                      {cand.ipa && (
                        <span className="font-mono text-xs text-slate-500">{cand.ipa}</span>
                      )}
                    </div>

                    <dl className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-sm">
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-xs text-slate-500 shrink-0">English:</dt>
                        <dd className="text-slate-800 font-medium">{cand.englishMeaning}</dd>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-xs text-slate-500 shrink-0">हिंदी:</dt>
                        <dd className="font-devanagari text-slate-900 font-medium">
                          {cand.hindiMeaning}
                        </dd>
                      </div>
                    </dl>

                    {cand.matchReason && (
                      <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                        {cand.matchReason}
                      </p>
                    )}

                    {cand.exampleGerman && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
                        <p className="font-medium text-slate-800">{cand.exampleGerman}</p>
                        {cand.exampleEnglish && (
                          <p className="text-slate-500 mt-0.5">{cand.exampleEnglish}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={playingKey !== null}
                        onClick={() =>
                          // Always speak bare German word without der/die/das
                          handlePlayGerman(cand.germanWord, normalKey, false, cand.ipa)
                        }
                        aria-label={`Listen to ${cand.germanWord} at normal speed`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md cursor-pointer"
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
                        onClick={() =>
                          handlePlayGerman(cand.germanWord, slowKey, true, cand.ipa)
                        }
                        aria-label={`Listen to ${cand.germanWord} slowly`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-md cursor-pointer"
                      >
                        {playingKey === slowKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Turtle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Slow</span>
                      </button>

                      <SpeakCheckButton
                        targetText={cand.germanWord}
                        devanagari={cand.devanagari}
                        ipa={cand.ipa}
                        variant="compact"
                        className="min-h-[34px]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onLookupWordInDictionary(cand.germanWord)}
                      aria-label={`Open full pronunciation breakdown for ${cand.germanWord}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/60 hover:bg-blue-50 border border-blue-200/70 rounded-md transition-colors duration-150 cursor-pointer"
                    >
                      <span>Open Full Breakdown in Dictionary</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2 RESULTS: PROBABLE NEARBY GERMAN SENTENCES */}
      {mode === 'sentence' && activeSentenceCandidate && (
        <div
          aria-label="Probable German sentence matches"
          aria-busy={isSearching}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Probable German Sentence for “{sentenceResult.query}”
            </h2>
            <span className="text-xs text-slate-500">{sentenceResult.detectedAs}</span>
          </div>

          {isSearching && (
            <div
              role="status"
              className="flex items-center gap-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
              <span>Reconstructing probable German sentence and word meanings…</span>
            </div>
          )}

          {/* Switch between alternative probable sentences if multiple returned */}
          {sentenceResult.candidates.length > 1 && (
            <div
              role="tablist"
              aria-label="Select probable German sentence match"
              className="flex flex-wrap gap-2"
            >
              {sentenceResult.candidates.map((cand, idx) => {
                const isSelected = idx === selectedSentenceIdx;
                const conf = getConfidenceLabel(cand.confidence);
                return (
                  <button
                    key={`${cand.germanSentence}-${idx}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedSentenceIdx(idx)}
                    className={`px-3.5 py-2 min-h-[38px] text-xs font-medium rounded-lg border transition-colors duration-150 text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">Match {idx + 1}:</span>{' '}
                    <span className={isSelected ? 'text-blue-100' : conf.textClass}>
                      {conf.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Probable Sentence Detail Card */}
          <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className={`font-semibold ${getConfidenceLabel(activeSentenceCandidate.confidence).textClass}`}
                >
                  {getConfidenceLabel(activeSentenceCandidate.confidence).label}
                </span>
                <span aria-hidden="true">·</span>
                <span>Corrected German sentence</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(activeSentenceCandidate.germanSentence, 'sent-copy')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                {copiedKey === 'sent-copy' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy German</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs text-slate-500">
                  Your rough input: <span className="text-slate-700">“{sentenceResult.query}”</span>
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 leading-snug">
                  {activeSentenceCandidate.germanSentence}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={playingKey !== null}
                  onClick={() =>
                    handlePlayGerman(activeSentenceCandidate.germanSentence, 'ns-normal', false)
                  }
                  aria-label="Listen to probable German sentence at normal speed"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {playingKey === 'ns-normal' ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>Listen Normal (1.0×)</span>
                </button>

                <button
                  type="button"
                  disabled={playingKey !== null}
                  onClick={() =>
                    handlePlayGerman(activeSentenceCandidate.germanSentence, 'ns-slow', true)
                  }
                  aria-label="Listen to probable German sentence slowly"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-60 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {playingKey === 'ns-slow' ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Turtle className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>Listen Slowly (0.65×)</span>
                </button>

                <SpeakCheckButton
                  targetText={activeSentenceCandidate.germanSentence}
                  devanagari={activeSentenceCandidate.devanagariSentence}
                  variant="primary"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Devanagari Pronunciation</div>
                <p className="mt-1 font-devanagari text-xl sm:text-2xl font-semibold text-blue-800">
                  {activeSentenceCandidate.devanagariSentence}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs font-medium text-slate-500">English: </span>
                    <span className="text-slate-900 font-medium">
                      {activeSentenceCandidate.englishMeaning}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500">हिंदी: </span>
                    <span className="font-devanagari text-slate-900 font-medium">
                      {activeSentenceCandidate.hindiMeaning}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">How it matched</div>
                  <p className="mt-0.5 text-slate-700 leading-relaxed">
                    {activeSentenceCandidate.matchReason}
                  </p>
                </div>
              </div>
            </div>

            {/* Word-by-Word Breakdown of the Probable German Sentence */}
            {activeSentenceCandidate.words.length > 0 && (
              <section aria-labelledby="nearby-wbw-heading" className="pt-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4
                    id="nearby-wbw-heading"
                    className="font-display text-lg font-semibold text-slate-900"
                  >
                    Word-by-Word Meaning
                  </h4>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {activeSentenceCandidate.words.length} words
                  </span>
                </div>

                <ol className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSentenceCandidate.words.map((item, idx) => {
                    const speakWord = stripArticleAndPunctuation(item.german) || item.german;
                    const lookupTarget =
                      stripArticleAndPunctuation(item.baseForm || item.german) || speakWord;
                    const wNormKey = `nsw-n-${idx}-${item.german}`;
                    const wSlowKey = `nsw-s-${idx}-${item.german}`;

                    return (
                      <li
                        key={`${item.german}-${idx}`}
                        className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                            <span className="font-mono tabular-nums text-slate-400">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate">{item.role}</span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-display text-xl font-semibold text-slate-900">
                              {item.article && (
                                <span className="text-slate-400 font-normal text-sm mr-1">
                                  {item.article}
                                </span>
                              )}
                              {item.german}
                            </span>
                            {item.devanagari && (
                              <span className="font-devanagari text-sm font-semibold text-blue-800">
                                ({item.devanagari})
                              </span>
                            )}
                          </div>

                          <dl className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1 text-sm">
                            <div className="flex items-baseline gap-1.5">
                              <dt className="text-xs text-slate-500 shrink-0">English:</dt>
                              <dd className="text-slate-800 font-medium">{item.english}</dd>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <dt className="text-xs text-slate-500 shrink-0">हिंदी:</dt>
                              <dd className="font-devanagari text-slate-900 font-medium">
                                {item.hindi}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={playingKey !== null}
                              onClick={() => handlePlayGerman(speakWord, wNormKey, false)}
                              aria-label={`Play ${speakWord} at normal speed`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                            >
                              {playingKey === wNormKey ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Volume2 className="w-3 h-3" aria-hidden="true" />
                              )}
                              <span>Play</span>
                            </button>
                            <button
                              type="button"
                              disabled={playingKey !== null}
                              onClick={() => handlePlayGerman(speakWord, wSlowKey, true)}
                              aria-label={`Play ${speakWord} slowly`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer disabled:opacity-50"
                            >
                              {playingKey === wSlowKey ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Turtle className="w-3 h-3" aria-hidden="true" />
                              )}
                              <span>Slow</span>
                            </button>
                            <SpeakCheckButton
                              targetText={speakWord}
                              devanagari={item.devanagari}
                              variant="compact"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => onLookupWordInDictionary(lookupTarget)}
                            aria-label={`Open ${lookupTarget} in Dictionary`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap cursor-pointer"
                          >
                            <span>Dictionary</span>
                            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
