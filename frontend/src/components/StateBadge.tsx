import React from 'react';
import type { AgentStateType } from '../types';

interface StateBadgeProps {
  state: AgentStateType | string;
  size?: 'sm' | 'md' | 'lg';
}

const STATE_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  IDLE: { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-700' },
  PERCEIVE: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-700/50' },
  ANALYZE: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-700/50' },
  DECIDE: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-700/50' },
  ACT: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-700/50' },
  COMPLETED: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-700/50' },
  FAILED: { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-700/50' },
  VERIFY: { bg: 'bg-indigo-950/40', text: 'text-indigo-400/60', border: 'border-indigo-800/30' },
  PAY: { bg: 'bg-teal-950/40', text: 'text-teal-400/60', border: 'border-teal-800/30' },
  RESULT: { bg: 'bg-gray-800/40', text: 'text-gray-400/60', border: 'border-gray-700/30' },
};

export const StateBadge: React.FC<StateBadgeProps> = ({ state, size = 'md' }) => {
  const config = STATE_CONFIG[state.toUpperCase()] || STATE_CONFIG.IDLE;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-mono',
    md: 'px-2.5 py-1 text-xs font-mono font-medium',
    lg: 'px-3 py-1.5 text-sm font-mono font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {state.toUpperCase()}
    </span>
  );
};
