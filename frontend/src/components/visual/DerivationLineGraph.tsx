import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ShieldAlert, ShieldCheck } from 'lucide-react';

interface DerivationStepData {
  index: number;
  name: string;
  action: string;
  valid: boolean;
  score: number; // 0 to 100
  hashStatus: string;
}

interface DerivationLineGraphProps {
  isBlocked?: boolean;
  className?: string;
}

export const DerivationLineGraph: React.FC<DerivationLineGraphProps> = ({
  isBlocked = false,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const steps: DerivationStepData[] = [
    { index: 1, name: 'ROOT', action: 'Intent Inception', valid: true, score: 100, hashStatus: 'SHA-256 Valid' },
    { index: 2, name: 'SEARCH', action: 'Catalog Discovery', valid: true, score: 100, hashStatus: 'Hash Match' },
    { index: 3, name: 'FILTER', action: 'Constraint Fit', valid: true, score: 100, hashStatus: 'Hash Match' },
    { index: 4, name: 'SELECT', action: 'Growth Ranking', valid: true, score: 100, hashStatus: 'Hash Match' },
    { index: 5, name: 'PROPOSE', action: 'Proposal Synthesizer', valid: !isBlocked, score: isBlocked ? 0 : 100, hashStatus: isBlocked ? 'Tamper Detected' : 'Hash Match' },
    { index: 6, name: 'VERIFY', action: 'Policy Evaluation', valid: !isBlocked, score: isBlocked ? 0 : 100, hashStatus: isBlocked ? 'Policy Block' : 'Verified' },
    { index: 7, name: 'PAYMENT', action: 'Payment Authorization', valid: !isBlocked, score: isBlocked ? 0 : 100, hashStatus: isBlocked ? 'Hold Enforced' : 'Authorized' },
  ];

  // SVG dimensions
  const width = 500;
  const height = 180;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 40;
  const graphWidth = width - padLeft - padRight;
  const graphHeight = height - padTop - padBottom;

  const getCoordinates = (stepIdx: number, score: number) => {
    const x = padLeft + (stepIdx / (steps.length - 1)) * graphWidth;
    const y = padTop + graphHeight - (score / 100) * graphHeight;
    return { x, y };
  };

  const points = steps.map((s, idx) => getCoordinates(idx, s.score));

  // Build SVG path
  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x},${padTop + graphHeight} L ${points[0].x},${padTop + graphHeight} Z`;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 tracking-wide">
              Derivation Integrity Line Graph
            </span>
            <span
              className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded border ${
                isBlocked
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {isBlocked ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Chain Fractured</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chain Intact</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic verification confidence across sequential intent stages
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 100% Valid
          </span>
          {isBlocked && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Tamper Drop
            </span>
          )}
        </div>
      </div>

      {/* Primary SVG Line Graph */}
      <div className="relative w-full bg-slate-50 rounded-lg p-2 border border-slate-200/80 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          <defs>
            <linearGradient id="derivGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="derivRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {[100, 50, 0].map((level) => {
            const y = padTop + graphHeight - (level / 100) * graphHeight;
            return (
              <g key={level}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path
            d={areaD}
            fill={isBlocked ? 'url(#derivRedGrad)' : 'url(#derivGreenGrad)'}
            className="transition-all duration-500"
          />

          {/* Main Connected Graph Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isBlocked ? '#E11D48' : '#059669'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />

          {/* Data Points on the line */}
          {points.map((pt, idx) => {
            const step = steps[idx];
            const isPointBlocked = isBlocked && idx >= 4;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Active Outer Ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 8 : 6}
                  fill={isPointBlocked ? '#FEE2E2' : '#D1FAE5'}
                  stroke={isPointBlocked ? '#E11D48' : '#059669'}
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Inner Core Point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 3.5 : 2.5}
                  fill={isPointBlocked ? '#E11D48' : '#059669'}
                />

                {/* Fracture Warning Pulse on Step 5 if blocked */}
                {isBlocked && idx === 4 && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="none"
                    stroke="#E11D48"
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* X-Axis Labels */}
                <text
                  x={pt.x}
                  y={padTop + graphHeight + 18}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isPointBlocked ? 'fill-rose-700 font-bold' : 'fill-slate-700'
                  }`}
                >
                  {step.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && (
          <div className="absolute top-3 right-3 bg-white/95 border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs z-10 animate-in fade-in duration-150">
            <div className="font-semibold text-slate-900">
              {steps[hoveredIndex].name} — {steps[hoveredIndex].action}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-0.5">
              <span className="text-slate-500">Integrity:</span>
              <span
                className={`font-semibold ${
                  steps[hoveredIndex].score > 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {steps[hoveredIndex].score}%
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">{steps[hoveredIndex].hashStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Footer Banner */}
      {isBlocked ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              Tamper Detected at Step 05 (PROPOSE): Adversarial Value Mutation
            </span>
          </div>
          <span className="text-[11px] font-medium text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-xs">
            Zero Money Moved
          </span>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 flex items-center gap-2 text-xs text-emerald-900">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Every intent transformation links cryptographically to the previous hash. All 7 steps verified.
          </span>
        </div>
      )}
    </div>
  );
};
