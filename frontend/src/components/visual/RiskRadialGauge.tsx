import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X } from 'lucide-react';

interface RiskRadialGaugeProps {
  isBlocked?: boolean;
  className?: string;
}

export const RiskRadialGauge: React.FC<RiskRadialGaugeProps> = ({
  isBlocked = false,
  className = '',
}) => {
  // Contributing checks from Section 14
  const checks = [
    {
      id: 'root',
      name: 'Root Intent',
      passed: true,
      penalty: 0,
      startDeg: 178,
      endDeg: 137,
    },
    {
      id: 'derivation',
      name: 'Derivation',
      passed: !isBlocked,
      penalty: isBlocked ? 30 : 0,
      startDeg: 133,
      endDeg: 92,
    },
    {
      id: 'policy',
      name: 'Policy Engine',
      passed: !isBlocked,
      penalty: isBlocked ? 30 : 0,
      startDeg: 88,
      endDeg: 47,
    },
    {
      id: 'verifier',
      name: 'Verifier',
      passed: !isBlocked,
      penalty: isBlocked ? 32 : 0,
      startDeg: 43,
      endDeg: 2,
    },
  ];

  // Mathematically composed risk score: Base 08 + failing penalties
  const baseResidual = 8;
  const failingPenaltySum = checks.reduce((acc, c) => acc + c.penalty, 0);
  const totalRiskScore = baseResidual + failingPenaltySum; // 8 or 100

  // SVG Geometry
  const cx = 150;
  const cy = 125;
  const outerR = 95;
  const innerR = 72;

  // Polar to Cartesian conversion
  const polarToCartesian = (radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy - radius * Math.sin(angleInRadians),
    };
  };

  // Generate SVG donut arc path
  const createArcPath = (startAngle: number, endAngle: number) => {
    const p1 = polarToCartesian(outerR, startAngle);
    const p2 = polarToCartesian(outerR, endAngle);
    const p3 = polarToCartesian(innerR, endAngle);
    const p4 = polarToCartesian(innerR, startAngle);

    return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 0 0 ${p4.x} ${p4.y} Z`;
  };

  // Needle angle (180 deg = score 0, 0 deg = score 100)
  const needleAngle = 180 - (totalRiskScore / 100) * 180;
  const needleLength = 65;
  const needleTip = polarToCartesian(needleLength, needleAngle);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Risk Provenance Gauge
          </span>
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
              isBlocked
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {isBlocked ? (
              <>
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>Critical Risk</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Safe Residual</span>
              </>
            )}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-900">
          Score: {String(totalRiskScore).padStart(2, '0')} / 100
        </span>
      </div>

      {/* Radial Arc SVG Gauge */}
      <div className="flex flex-col items-center justify-center pt-1">
        <svg viewBox="0 0 300 150" className="w-full max-w-[280px] h-auto overflow-visible">
          {/* Subtle background track */}
          <path
            d={createArcPath(180, 0)}
            fill="#F1F5F9"
          />

          {/* 4 Contributing Arcs */}
          {checks.map((chk) => (
            <path
              key={chk.id}
              d={createArcPath(chk.startDeg, chk.endDeg)}
              fill={chk.passed ? '#10B981' : '#F43F5E'}
              className="transition-colors duration-500"
            />
          ))}

          {/* Arc Zone Tick Marks */}
          <line x1={cx - outerR - 4} y1={cy} x2={cx - innerR + 4} y2={cy} stroke="#94A3B8" strokeWidth="1.5" />
          <line x1={cx + innerR - 4} y1={cy} x2={cx + outerR + 4} y2={cy} stroke="#94A3B8" strokeWidth="1.5" />
          <line x1={cx} y1={cy - outerR - 4} x2={cx} y2={cy - innerR + 4} stroke="#94A3B8" strokeWidth="1.5" />

          {/* Labels around the perimeter */}
          <text x="26" y={cy - 12} fill="#059669" fontSize="8" fontWeight="bold">
            Root
          </text>
          <text x="76" y="24" fill={checks[1].passed ? '#059669' : '#E11D48'} fontSize="8" fontWeight="bold">
            Derivation
          </text>
          <text x="180" y="24" fill={checks[2].passed ? '#059669' : '#E11D48'} fontSize="8" fontWeight="bold">
            Policy
          </text>
          <text x="246" y={cy - 12} fill={checks[3].passed ? '#059669' : '#E11D48'} fontSize="8" fontWeight="bold">
            Verifier
          </text>

          {/* Gauge Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={isBlocked ? '#BE123C' : '#0F172A'}
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r="8" fill="#0F172A" />
          <circle cx={cx} cy={cy} r="4" fill="#F8FAFC" />

          {/* Score Readout Inside Hub Arc */}
          <text
            x={cx}
            y={cy - 14}
            textAnchor="middle"
            fill={isBlocked ? '#BE123C' : '#0F172A'}
            fontSize="14"
            fontWeight="bold"
          >
            {String(totalRiskScore).padStart(2, '0')}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="#64748B"
            fontSize="8"
            fontWeight="600"
          >
            {isBlocked ? 'HIGH RISK' : 'LOW RISK'}
          </text>
        </svg>
      </div>

      {/* Provenance Arithmetic Breakdown Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
        {checks.map((chk) => (
          <div
            key={chk.id}
            className={`p-1.5 rounded border text-center text-xs transition-colors ${
              chk.passed
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                : 'border-rose-200 bg-rose-50/70 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-center gap-1 font-semibold text-[11px]">
              {chk.passed ? (
                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              ) : (
                <X className="w-3 h-3 text-rose-600 stroke-[2.5]" />
              )}
              <span className="truncate">{chk.name}</span>
            </div>
            <div className={`text-[10px] font-bold mt-0.5 ${chk.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
              {chk.passed ? 'Pass (0)' : `Fail (+${chk.penalty})`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
