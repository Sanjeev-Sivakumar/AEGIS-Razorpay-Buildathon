import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { NodeState } from '../../context/AegisContext';

interface ArchitectureNodeProps {
  label: string;
  sublabel?: string;
  metric?: string;
  state?: NodeState;
  icon?: LucideIcon;
  badge?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export const ArchitectureNode: React.FC<ArchitectureNodeProps> = ({
  label,
  sublabel,
  metric,
  state = 'idle',
  icon: Icon,
  badge,
  onClick,
  className = '',
  compact = false,
}) => {
  const getStateStyles = () => {
    switch (state) {
      case 'active':
        return {
          container: 'border-cyan-300 bg-cyan-50/80 shadow-sm',
          dot: 'bg-cyan-600 animate-ping',
          text: 'text-cyan-700',
          metric: 'text-cyan-800 font-bold',
        };
      case 'success':
        return {
          container: 'border-emerald-300 bg-emerald-50/80 shadow-sm',
          dot: 'bg-emerald-600',
          text: 'text-emerald-700',
          metric: 'text-emerald-800 font-bold',
        };
      case 'blocked':
      case 'error':
        return {
          container: 'border-rose-300 bg-rose-50/80 shadow-sm',
          dot: 'bg-rose-600',
          text: 'text-rose-700',
          metric: 'text-rose-800 font-bold',
        };
      case 'warning':
        return {
          container: 'border-amber-300 bg-amber-50/80 shadow-sm',
          dot: 'bg-amber-600',
          text: 'text-amber-700',
          metric: 'text-amber-800 font-bold',
        };
      case 'idle':
      default:
        return {
          container: 'border-slate-200 bg-white hover:border-slate-300 shadow-xs',
          dot: 'bg-slate-400',
          text: 'text-slate-600',
          metric: 'text-slate-700 font-medium',
        };
    }
  };

  const styles = getStateStyles();

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative rounded-xl border transition-all duration-200 select-none font-sans ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${styles.container} ${compact ? 'p-2.5' : 'p-3.5'} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {state === 'active' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${styles.dot}`} />
          </span>

          {Icon && <Icon className={`w-4 h-4 shrink-0 ${styles.text}`} />}

          <span className="text-xs font-bold tracking-wide uppercase truncate text-slate-900">
            {label}
          </span>
        </div>

        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 shrink-0">
            {badge}
          </span>
        )}
      </div>

      {(sublabel || metric) && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          {sublabel && <span className="text-slate-600 truncate font-medium">{sublabel}</span>}
          {metric && <span className={`ml-auto ${styles.metric}`}>{metric}</span>}
        </div>
      )}
    </div>
  );
};
