import React from 'react';
import { X } from 'lucide-react';
import type { InspectorPayload } from '../../context/AegisContext';

interface MicroInspectorProps {
  inspector: InspectorPayload | null;
  onClose: () => void;
}

export const MicroInspector: React.FC<MicroInspectorProps> = ({ inspector, onClose }) => {
  if (!inspector) return null;

  const getBadgeColor = (type?: 'neutral' | 'success' | 'warning' | 'danger') => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'danger':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'neutral':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <aside
      aria-label="Context Inspector"
      className="fixed bottom-6 right-6 z-50 w-72 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {inspector.title}
            </span>
            {inspector.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getBadgeColor(
                  inspector.badgeType
                )}`}
              >
                {inspector.badge}
              </span>
            )}
          </div>
          {inspector.subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {inspector.subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close Inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1 text-[11px]">
        {inspector.fields.map((field, idx) => (
          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 uppercase text-[10px] font-medium">{field.label}</span>
            <span className="font-semibold text-slate-900">
              {typeof field.value === 'boolean'
                ? field.value ? 'TRUE' : 'FALSE'
                : String(field.value)}
            </span>
          </div>
        ))}
      </div>

      {inspector.actionLabel && inspector.onAction && (
        <button
          onClick={() => {
            inspector.onAction?.();
            onClose();
          }}
          className="mt-3 w-full rounded-lg border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 py-1.5 text-xs font-bold text-white uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
        >
          {inspector.actionLabel}
        </button>
      )}
    </aside>
  );
};
