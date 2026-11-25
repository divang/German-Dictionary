import type { SyllableBreakdown } from '../types/dictionary';
import { getDifficultyMeta, getLipDimensions, getTongueCoordinates } from '../utils/dictionary';

interface ArticulationDiagramProps {
  syllable: SyllableBreakdown;
}

export function ArticulationDiagram({ syllable }: ArticulationDiagramProps) {
  const { articulation } = syllable;
  const lipDims = getLipDimensions(articulation.lipShape);
  const tonguePos = getTongueCoordinates(articulation.tonguePosition);
  const diffMeta = getDifficultyMeta(syllable.difficulty);

  return (
    <aside
      aria-label={`Mouth and tongue guide for ${syllable.segment}`}
      className="bg-slate-50 border border-slate-200 rounded-xl p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200/80">
        <div>
          <p className="text-xs font-medium text-slate-500">Mouth &amp; Tongue Focus</p>
          <h3 className="mt-0.5 text-lg font-semibold text-slate-900 flex items-baseline gap-2">
            <span>{syllable.segment}</span>
            <span className="font-devanagari text-blue-700">{syllable.devanagari}</span>
            <span className="font-mono text-sm font-normal text-slate-500">
              {articulation.targetIpa}
            </span>
          </h3>
        </div>
        <span className={`text-xs font-medium ${diffMeta.textClass}`}>
          <span aria-hidden="true">{diffMeta.symbol} </span>
          {diffMeta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Panel 1: Lip Shape Visual */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">1. Lip Posture</div>
          <div className="my-3 flex items-center justify-center">
            <svg
              viewBox="0 0 120 76"
              className="w-28 h-[72px]"
              role="img"
              aria-label={articulation.lipLabel}
            >
              {/* Outer lip contour */}
              <ellipse
                cx="60"
                cy="38"
                rx={lipDims.rx + 14}
                ry={lipDims.ry + 10}
                fill="#EFF6FF"
                stroke="#1D4ED8"
                strokeWidth="2"
              />
              {/* Inner mouth opening */}
              <ellipse
                cx="60"
                cy="38"
                rx={lipDims.rx}
                ry={lipDims.ry}
                fill="#0F172A"
              />
              {/* Subtle lip corners */}
              <line
                x1={60 - lipDims.rx - 17}
                y1="38"
                x2={60 - lipDims.rx - 12}
                y2="38"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1={60 + lipDims.rx + 12}
                y1="38"
                x2={60 + lipDims.rx + 17}
                y2="38"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{articulation.lipLabel}</p>
        </div>

        {/* Panel 2: Tongue & Airflow Zone */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">2. Tongue &amp; Throat Zone</div>
          <div className="my-3 flex items-center justify-center">
            <svg
              viewBox="0 0 180 110"
              className="w-40 h-[84px]"
              role="img"
              aria-label={articulation.tongueLabel}
            >
              {/* Simplified side vocal-tract schematic */}
              {/* Roof of mouth (teeth -> hard palate -> soft palate -> throat) */}
              <path
                d="M 38 66 Q 52 30 96 30 Q 138 30 148 64 L 148 98"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Upper front teeth mark */}
              <path
                d="M 40 66 L 44 74 L 49 66"
                fill="#F8FAFC"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
              {/* Lower jaw & tongue base */}
              <path
                d="M 36 86 Q 82 98 134 94"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Zone guide labels */}
              <text x="34" y="20" fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans, sans-serif">
                Front
              </text>
              <text x="128" y="20" fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans, sans-serif">
                Throat
              </text>
              {/* Active articulation focus zone */}
              <circle
                cx={tonguePos.cx}
                cy={tonguePos.cy}
                r="14"
                fill="#DBEAFE"
                opacity="0.85"
              />
              <circle cx={tonguePos.cx} cy={tonguePos.cy} r="6" fill="#1D4ED8" />
            </svg>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{articulation.tongueLabel}</p>
        </div>
      </div>

      {/* Hindi Anchor Summary */}
      <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-xs font-medium text-slate-500">Hindi Anchor</span>
        <span className="font-devanagari font-medium text-slate-900">
          {articulation.hindiAnchor}
        </span>
      </div>
    </aside>
  );
}
