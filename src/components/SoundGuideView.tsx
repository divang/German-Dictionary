import { ArrowUpRight } from 'lucide-react';
import { SOUND_RULES } from '../data/soundRules';
import type { DictionaryEntry } from '../types/dictionary';
import { getDifficultyMeta } from '../utils/dictionary';

interface SoundGuideViewProps {
  curatedWords: DictionaryEntry[];
  onOpenWord: (wordId: string) => void;
}

export function SoundGuideView({ curatedWords, onOpenWord }: SoundGuideViewProps) {
  const wordById = new Map(curatedWords.map((w) => [w.id, w]));

  return (
    <section aria-labelledby="sound-guide-title" className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <p className="text-xs font-medium text-blue-700">Phonetics Reference</p>
        <h1
          id="sound-guide-title"
          className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
        >
          8 Essential German Sounds for Hindi Speakers
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 max-w-[70ch]">
          German spelling is remarkably consistent once you learn where it diverges from Hindi and
          English. Master these eight sound mechanics and you can pronounce almost any German word
          confidently on sight.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SOUND_RULES.map((rule, idx) => {
          const diffMeta = getDifficultyMeta(rule.difficulty);
          const examples = rule.exampleWordIds
            .map((id) => wordById.get(id))
            .filter((item): item is DictionaryEntry => Boolean(item));

          return (
            <article
              key={rule.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono font-medium text-slate-700">
                    {String(idx + 1).padStart(2, '0')}. {rule.symbol}
                  </span>
                  <span className={`font-medium ${diffMeta.textClass}`}>
                    <span aria-hidden="true">{diffMeta.symbol} </span>
                    {diffMeta.label}
                  </span>
                </div>

                <h2 className="mt-2 font-display text-xl font-semibold text-slate-900">
                  {rule.title}
                </h2>

                <div className="mt-1.5 flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-devanagari font-semibold text-blue-800">
                    {rule.hindiApprox}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-xs text-slate-500">{rule.ipa}</span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-700">{rule.summary}</p>

                <ol className="mt-3.5 space-y-1.5 list-decimal list-inside text-sm text-slate-800 bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
                  {rule.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="font-devanagari leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>

                <div className="mt-3.5 space-y-1.5 text-xs leading-relaxed text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Quick shortcut: </span>
                    <span className="font-devanagari">{rule.shortcut}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Watch out: </span>
                    <span className="font-devanagari">{rule.commonMistake}</span>
                  </p>
                </div>
              </div>

              {examples.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 mr-1">Try in dictionary:</span>
                  {examples.map((word) => (
                    <button
                      key={word.id}
                      type="button"
                      onClick={() => onOpenWord(word.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      <span>{word.word}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
