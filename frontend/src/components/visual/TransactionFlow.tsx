import React from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

export interface FlowStep {
  key: string;
  label: string;
  status: 'pending' | 'active' | 'success' | 'blocked';
}

interface TransactionFlowProps {
  isBlocked?: boolean;
  activeStage?: string;
  className?: string;
}

export const TransactionFlow: React.FC<TransactionFlowProps> = ({
  isBlocked = false,
  activeStage,
  className = '',
}) => {
  const steps: FlowStep[] = [
    { key: 'query', label: 'Query', status: 'success' },
    { key: 'growth', label: 'Growth', status: 'success' },
    { key: 'product', label: 'Product', status: 'success' },
    { key: 'proposal', label: 'Proposal', status: 'success' },
    {
      key: 'trust',
      label: 'Trust',
      status: isBlocked ? 'blocked' : 'success',
    },
    {
      key: 'gate',
      label: isBlocked ? 'Hold' : 'Payment',
      status: isBlocked ? 'blocked' : 'success',
    },
    {
      key: 'settle',
      label: isBlocked ? 'No Order' : 'Razorpay',
      status: isBlocked ? 'blocked' : 'success',
    },
    { key: 'ledger', label: 'Ledger', status: 'success' },
  ];

  return (
    <div
      className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-sans shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-[620px]">
        {steps.map((step, idx) => {
          const isCurrent = activeStage ? step.key === activeStage : false;
          const isFail = step.status === 'blocked';
          const isSuccess = step.status === 'success';

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium tracking-wide transition-all ${
                  isFail
                    ? 'border-rose-200 bg-rose-50 text-rose-800 font-semibold shadow-xs'
                    : isCurrent
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-800 font-semibold animate-pulse'
                    : isSuccess
                    ? 'border-slate-200 bg-slate-50 text-slate-800 font-medium'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {isFail ? (
                  <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : isSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                )}
                <span>{step.label}</span>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex items-center text-slate-400 px-0.5">
                  <ArrowRight
                    className={`w-3.5 h-3.5 ${
                      isFail && idx >= 4 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
