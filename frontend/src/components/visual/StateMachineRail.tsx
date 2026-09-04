import React from 'react';
import { ChevronRight } from 'lucide-react';

const AGENT_LIFECYCLE_STATES = [
  'PERCEIVE',
  'UNDERSTAND',
  'GROW',
  'DECIDE',
  'ACT',
  'VERIFY',
  'PAY',
  'LEARN',
];

interface StateMachineRailProps {
  currentState?: string;
  isBlocked?: boolean;
  className?: string;
}

export const StateMachineRail: React.FC<StateMachineRailProps> = ({
  currentState = 'VERIFY',
  isBlocked = false,
  className = '',
}) => {
  return (
    <div
      className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 font-sans shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-[620px]">
        {AGENT_LIFECYCLE_STATES.map((stateName, idx) => {
          const isActive = currentState.toUpperCase() === stateName;
          const isPassed = !isActive && AGENT_LIFECYCLE_STATES.indexOf(currentState.toUpperCase()) > idx;
          const isFailedState = isBlocked && (stateName === 'VERIFY' || stateName === 'PAY');

          return (
            <React.Fragment key={stateName}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] tracking-wide uppercase transition-all ${
                  isFailedState
                    ? 'border border-rose-200 bg-rose-50 text-rose-800 font-semibold shadow-xs'
                    : isActive
                    ? 'border border-cyan-300 bg-cyan-50 text-cyan-800 font-semibold shadow-xs'
                    : isPassed
                    ? 'border border-slate-200 bg-slate-50 text-slate-800 font-medium'
                    : 'border border-transparent text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isFailedState
                      ? 'bg-rose-500'
                      : isActive
                      ? 'bg-cyan-500 animate-ping'
                      : isPassed
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
                  }`}
                />
                <span>{stateName}</span>
              </div>

              {idx < AGENT_LIFECYCLE_STATES.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
