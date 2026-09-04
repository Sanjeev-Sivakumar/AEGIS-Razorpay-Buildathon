import React from 'react';
import { Lock, CheckCircle2, XCircle, Check, X } from 'lucide-react';
import type { NodeState } from '../../context/AegisContext';

interface DecisionGateProps {
  state?: NodeState;
  activePath?: 'pass' | 'fail' | 'idle';
  onInspect?: () => void;
  className?: string;
}

export const DecisionGate: React.FC<DecisionGateProps> = ({
  state = 'idle',
  activePath = 'idle',
  onInspect,
  className = '',
}) => {
  const isPass = activePath === 'pass' || state === 'success';
  const isBlocked = activePath === 'fail' || state === 'blocked' || state === 'error';

  // Contributing verification checks for Trust Gate Provenance
  const gateChecks = [
    { id: 'root', label: 'Root Intent', passed: true },
    { id: 'derivation', label: 'Derivation', passed: !isBlocked },
    { id: 'policy', label: 'Policy Rules', passed: !isBlocked },
    { id: 'verifier', label: 'Verifier', passed: !isBlocked },
  ];

  return (
    <div className={`w-full max-w-md mx-auto font-sans ${className}`}>
      {/* Central Gate Container */}
      <div
        onClick={onInspect}
        role={onInspect ? 'button' : undefined}
        tabIndex={onInspect ? 0 : undefined}
        className={`relative rounded-xl border p-4 transition-all duration-300 text-center select-none ${
          onInspect ? 'cursor-pointer hover:border-cyan-500' : ''
        } ${
          isBlocked
            ? 'border-rose-300 bg-rose-50 shadow-sm'
            : isPass
            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
            : state === 'active'
            ? 'border-cyan-300 bg-cyan-50 shadow-sm'
            : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Payment Gate
            </span>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border uppercase font-medium tracking-tight ${
              isBlocked
                ? 'bg-rose-100 border-rose-200 text-rose-800'
                : isPass
                ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {isBlocked ? 'Hold Active' : isPass ? 'Verified' : 'Armed & Protected'}
          </span>
        </div>

        <div className="py-2">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-1">
            Deterministic Invariant
          </div>
          <div className="text-sm font-semibold tracking-wide text-slate-900">
            {isBlocked ? (
              <span className="text-rose-700 flex items-center justify-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4 text-rose-600" />
                Verification Failed: Order Creation Aborted
              </span>
            ) : isPass ? (
              <span className="text-emerald-700 flex items-center justify-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Root & Chain Verified: Order Permitted
              </span>
            ) : (
              <span className="text-slate-900">
                No Verification = No Razorpay Order
              </span>
            )}
          </div>
        </div>

        {/* METRIC PROVENANCE: 4-Check Inline Breakdown inside Gate Node */}
        <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-center gap-1.5">
          {gateChecks.map((chk) => (
            <span
              key={chk.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                chk.passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {chk.passed ? (
                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
              ) : (
                <X className="w-2.5 h-2.5 text-rose-600 stroke-[2.5]" />
              )}
              <span>{chk.label}</span>
            </span>
          ))}
        </div>

        {/* Verification Status Micro-badge */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                isBlocked ? 'bg-rose-500' : isPass ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            {isBlocked ? 'Policy: Block' : isPass ? 'Policy: Pass' : 'Policy: Armed'}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-700 font-medium">Razorpay Test Mode</span>
        </div>
      </div>

      {/* Bifurcation Tree */}
      <div className="grid grid-cols-2 gap-4 mt-2.5">
        {/* PASS Path */}
        <div className="flex flex-col items-center">
          <div className="h-4 w-0.5 bg-slate-200 relative">
            {isPass && (
              <span className="absolute top-0 left-[-3px] w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            )}
          </div>
          <div
            className={`w-full rounded-xl border p-2.5 text-center transition-all ${
              isPass
                ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                : 'border-slate-200 bg-white opacity-60'
            }`}
          >
            <div className={`text-xs font-semibold uppercase tracking-wider ${isPass ? 'text-emerald-800' : 'text-slate-500'}`}>
              Pass
            </div>
            <div className={`text-xs font-bold mt-0.5 ${isPass ? 'text-slate-900' : 'text-slate-600'}`}>
              Razorpay
            </div>
            <div className="text-[11px] text-slate-500">Test Mode</div>
          </div>
        </div>

        {/* FAIL Path */}
        <div className="flex flex-col items-center">
          <div className="h-4 w-0.5 bg-slate-200 relative">
            {isBlocked && (
              <span className="absolute top-0 left-[-3px] w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            )}
          </div>
          <div
            className={`w-full rounded-xl border p-2.5 text-center transition-all ${
              isBlocked
                ? 'border-rose-300 bg-rose-50 shadow-sm'
                : 'border-slate-200 bg-white opacity-60'
            }`}
          >
            <div className={`text-xs font-semibold uppercase tracking-wider ${isBlocked ? 'text-rose-800' : 'text-slate-500'}`}>
              Fail
            </div>
            <div className={`text-xs font-bold mt-0.5 ${isBlocked ? 'text-slate-900' : 'text-slate-600'}`}>
              Hold
            </div>
            <div className="text-[11px] text-slate-500">Zero Money Moved</div>
          </div>
        </div>
      </div>
    </div>
  );
};
