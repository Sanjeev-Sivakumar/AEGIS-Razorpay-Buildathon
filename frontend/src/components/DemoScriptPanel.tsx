import React, { useState } from 'react';
import { api } from '../services/api';
import { Play, CheckCircle2, RefreshCw, Layers } from 'lucide-react';
import type { FullDemoResponse } from '../types';

interface DemoScriptPanelProps {
  onStepSelect?: (stepKey: string) => void;
  onDemoCompleted?: (data: FullDemoResponse) => void;
}

const DEMO_STEPS = [
  { step: '01', title: 'Growth', desc: 'Candidate discovery & selection probability', tab: 'growth' },
  { step: '02', title: 'Optimize', desc: 'Counterfactual catalog intervention & uplift', tab: 'counterfactual' },
  { step: '03', title: 'Purchase', desc: 'User intent capture & proposal formulation', tab: 'commerce' },
  { step: '04', title: 'Trust', desc: 'Root intent verification & policy checks', tab: 'trust' },
  { step: '05', title: 'Payment', desc: 'PaymentGate authorization & Razorpay order', tab: 'commerce' },
  { step: '06', title: 'Attack', desc: 'Adversarial amount escalation simulation', tab: 'attack_lab' },
  { step: '07', title: 'Ledger', desc: 'Cryptographic hash chain commitment', tab: 'ledger' },
  { step: '08', title: 'Replay', desc: '7-stage chronological causal trajectory', tab: 'replay' },
];

export const DemoScriptPanel: React.FC<DemoScriptPanelProps> = ({ onStepSelect, onDemoCompleted }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [demoResult, setDemoResult] = useState<FullDemoResponse | null>(null);
  const [activeStep, setActiveStep] = useState<string>('01');

  const handleRunFullDemo = async () => {
    setIsRunning(true);
    try {
      const res = await api.runFullDemo();
      setDemoResult(res);
      setActiveStep('08');
      if (onDemoCompleted) {
        onDemoCompleted(res);
      }
    } catch (err) {
      console.error('Failed to run full demo', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Judge Walkthrough & Demo Flow
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Follow the guided 8-stage story demonstrating growth, trust, defense, and auditability.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunFullDemo}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-md transition-all cursor-pointer"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Running Unified Story...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Complete Demo Story
            </>
          )}
        </button>
      </div>

      {/* 8-Step Story Sequence Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {DEMO_STEPS.map((s) => {
          const isSelected = activeStep === s.step;
          return (
            <button
              key={s.step}
              onClick={() => {
                setActiveStep(s.step);
                if (onStepSelect) onStepSelect(s.tab);
              }}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500/80 text-white shadow-inner'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className={isSelected ? 'text-purple-400 font-bold' : 'text-slate-500'}>{s.step}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
              <h4 className="text-xs font-bold font-mono text-white">{s.title}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{s.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Demo Outcome Banner */}
      {demoResult && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-semibold">
              Demo Story Completed: Legitimate purchase authorized (Order: {demoResult.legitimate_purchase.razorpay_order_id}), Attack blocked (Zero money moved), Ledger verified.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {demoResult.ledger_verification.entries_checked} blocks verified
          </span>
        </div>
      )}
    </div>
  );
};
