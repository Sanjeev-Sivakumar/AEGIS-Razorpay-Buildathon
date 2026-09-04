import React from 'react';
import { GitCommit, CheckCircle2 } from 'lucide-react';
import type { DerivationChain } from '../types';

interface DerivationViewerProps {
  chain?: DerivationChain | null;
}

export const DerivationViewer: React.FC<DerivationViewerProps> = ({ chain }) => {
  if (!chain || !chain.steps || chain.steps.length === 0) {
    return null;
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'INTENT_CAPTURE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SEARCH_INVENTORY':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'FILTER_CONSTRAINTS':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'SELECT_OFFERING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PROPOSE_PAYMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm tracking-wider uppercase">
            Derivation Chain Timeline
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Hash Linked
          </span>
          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
            {chain.id}
          </span>
        </div>
      </div>

      <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 before:z-0">
        {chain.steps.map((step) => (
          <div key={step.id} className="relative z-10 flex items-start gap-3.5 pl-1">
            <div className="w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-700 shadow-xs">
              {step.sequence}
            </div>

            <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors rounded-lg p-3 flex-1 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border uppercase tracking-wider ${getActionBadgeColor(step.action)}`}>
                  {step.action}
                </span>
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                  Hash: {step.step_hash.substring(0, 10)}...
                </span>
              </div>

              <p className="text-slate-800 mb-2 font-medium">{step.description}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded font-mono">
                <span className="truncate mr-2">Prev: {step.previous_step_hash.substring(0, 12)}...</span>
                <span className="text-emerald-700 font-semibold shrink-0">Verified SHA-256</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
