import React from 'react';
import { Shield, Play, Loader2 } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

export const TopBar: React.FC = () => {
  const {
    activeMode,
    setActiveMode,
    isDemoRunning,
    demoPhase,
    runFullDemo,
    session,
  } = useAegis();

  const targetLabel = session.selectedCandidate?.name || session.intent.category || 'Autonomous';

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 h-14 flex items-center justify-between font-sans shadow-xs">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wide text-slate-900">
            AEGIS
          </span>
          <span className="text-xs text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200 bg-slate-100">
            Command Center
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 ml-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>

          <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
            Test Mode
          </span>

          <span className="text-xs text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-full font-medium max-w-[200px] truncate">
            Target: {targetLabel}
          </span>
        </div>
      </div>

      {/* Center: Live Demo Phase Indicator */}
      {isDemoRunning && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-300 bg-cyan-50 text-cyan-900 text-xs shadow-xs animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
          <span className="text-slate-600">Demo Running:</span>
          <span className="font-bold text-cyan-800 uppercase">{demoPhase}</span>
        </div>
      )}

      {/* Right Controls: Full Demo Runner + Mode Switcher */}
      <div className="flex items-center gap-3">
        {/* Full Demo Runner */}
        <button
          onClick={runFullDemo}
          disabled={isDemoRunning}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
        >
          {isDemoRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Run Full Demo</span>
        </button>

        {/* Mode Toggle with light segmented control */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            onClick={() => setActiveMode('LIVE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeMode === 'LIVE'
                ? 'bg-white text-emerald-800 border border-slate-200/80 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Live</span>
          </button>
          <button
            onClick={() => setActiveMode('REPLAY')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeMode === 'REPLAY'
                ? 'bg-white text-cyan-800 border border-slate-200/80 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-600" />
            <span>Replay</span>
          </button>
        </div>
      </div>
    </header>
  );
};
