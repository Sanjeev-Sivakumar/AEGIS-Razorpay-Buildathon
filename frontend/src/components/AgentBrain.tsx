import React from 'react';
import { Brain, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';

interface AgentBrainProps {
  currentState?: string;
  isAttackScenario?: boolean;
}

const PRIMARY_STAGES = [
  { id: 'PERCEIVE', label: 'PERCEIVE', desc: 'Capture Request' },
  { id: 'UNDERSTAND', label: 'UNDERSTAND', desc: 'RIC Certificate' },
  { id: 'GROW', label: 'GROW', desc: 'GraphSAGE Ranking' },
  { id: 'DECIDE', label: 'DECIDE', desc: 'Candidate Selection' },
  { id: 'ACT', label: 'ACT', desc: 'Formulate Proposal' },
  { id: 'VERIFY', label: 'VERIFY', desc: 'Trust Boundary' },
  { id: 'PAY', label: 'PAY / HOLD', desc: 'Payment Gate' },
  { id: 'LEARN', label: 'LEARN', desc: 'Audit Sealed' },
];

export const AgentBrain: React.FC<AgentBrainProps> = ({ currentState = 'IDLE', isAttackScenario = false }) => {
  const normState = currentState.toUpperCase();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Autonomous Agent Decision Brain
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-normal">
                Single Unified Loop
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict deterministic state progression with isolated payment guardrail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Current State:</span>
          <span className="px-2.5 py-1 rounded bg-slate-950 text-cyan-300 border border-slate-800 font-bold">
            {normState}
          </span>
        </div>
      </div>

      {/* Directional Flow Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
        {PRIMARY_STAGES.map((st, idx) => {
          const isActive = normState === st.id || (st.id === 'PAY' && (normState === 'HOLD' || normState === 'PAY'));
          const isPast = ['COMPLETED', 'LEARN'].includes(normState) || normState === 'IDLE';

          return (
            <div
              key={st.id}
              className={`relative rounded-lg p-3 border transition-all text-center flex flex-col justify-between ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/80 text-white shadow-md shadow-cyan-950/50 scale-[1.02]'
                  : isPast
                  ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  : 'bg-slate-950/30 border-slate-800/40 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>0{idx + 1}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono tracking-tight">{st.label}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{st.desc}</p>
              </div>
              {idx < PRIMARY_STAGES.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-slate-700 z-10">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Branch Callout: Normal vs Adversarial Path */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-300">Legitimate Purchase Path:</span>
            <p className="text-slate-300 mt-0.5 text-[11px]">
              VERIFY (Pass) → PAYMENT GATE (Authorize) → RAZORPAY (Order Created) → LEDGER (Sealed)
            </p>
          </div>
        </div>

        <div
          className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-all ${
            isAttackScenario
              ? 'bg-red-950/40 border border-red-500/60 ring-1 ring-red-500/40'
              : 'bg-red-950/20 border border-red-500/20'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-300">Adversarial Defense Interception:</span>
            <p className="text-slate-300 mt-0.5 text-[11px]">
              VERIFY (Fail) → HOLD (Break-Glass) → ZERO PAYMENT (Order Blocked) → LEDGER (Attack Prevented)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
