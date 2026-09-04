import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Eye,
  BrainCircuit,
  Scale,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Play,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { StateBadge } from '../components/StateBadge';
import type { AgentStateType, AgentRunResponse } from '../types';

interface StateStep {
  key: AgentStateType;
  name: string;
  phase: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  activeColor: string;
  details: string[];
  isLocked?: boolean;
}

const STEPS: StateStep[] = [
  {
    key: 'PERCEIVE',
    name: 'Perceive',
    phase: 'Phase 1: Active',
    icon: Eye,
    description: 'Intercepts raw user request, initializes session memory, and establishes root audit context.',
    activeColor: 'from-cyan-500 to-blue-500 text-cyan-400 border-cyan-500',
    details: [
      'Generates unique Session ID (AG-XXXX)',
      'Initializes in-memory session context',
      'Emits USER_REQUEST_RECEIVED event to SQLite',
      'Guarantees zero prompt leakage',
    ],
  },
  {
    key: 'ANALYZE',
    name: 'Analyze',
    phase: 'Phase 1: Active',
    icon: BrainCircuit,
    description: 'Extracts structured commerce parameters (category, location, budget) via Groq LLM or fallback.',
    activeColor: 'from-purple-500 to-indigo-500 text-purple-400 border-purple-500',
    details: [
      'Calls Groq AI with strict JSON schema',
      'Gracefully falls back to deterministic regex parser',
      'Validates constraints via Pydantic model',
      'Persists QueryIntent to SQLite',
    ],
  },
  {
    key: 'DECIDE',
    name: 'Decide',
    phase: 'Phase 1: Active',
    icon: Scale,
    description: 'Evaluates inventory matching category, location, and budget constraints to formulate action plan.',
    activeColor: 'from-blue-500 to-cyan-500 text-blue-400 border-blue-500',
    details: [
      'Queries active merchant offerings in SQLite',
      'Applies price thresholds (price <= max_budget)',
      'Generates explainable decision rationale',
      'Emits ACTION_DETERMINED event',
    ],
  },
  {
    key: 'ACT',
    name: 'Act',
    phase: 'Phase 1: Active',
    icon: Sparkles,
    description: 'Executes catalog discovery action, selects optimal offering, and formulates payment proposal.',
    activeColor: 'from-amber-500 to-yellow-500 text-amber-400 border-amber-500',
    details: [
      'Extracts candidate product attributes & merchant details',
      'Selects winning merchant offering for user request',
      'Creates PaymentProposal domain record in SQLite',
      'Emits PAYMENT_PROPOSED event',
    ],
  },
  {
    key: 'VERIFY',
    name: 'Verify',
    phase: 'Phase 2: Active',
    icon: ShieldCheck,
    description: 'Isolated verifier inspects Root Intent Certificate, Derivation Chain, and enforces 7 hard policy rules.',
    activeColor: 'from-indigo-500 to-purple-500 text-indigo-400 border-indigo-500',
    details: [
      'Validates canonical SHA-256 hash & HMAC signature',
      'Audits derivation sequence continuity and step hashes',
      'Enforces 7 deterministic policy rules (no LLM)',
      'Calculates multi-signal risk fusion score (0–100)',
    ],
    isLocked: false,
  },
  {
    key: 'PAY',
    name: 'Pay',
    phase: 'Phase 2: Active',
    icon: Layers,
    description: 'Absolute Payment Gate executes Razorpay Test Mode Order creation only on verified PASS.',
    activeColor: 'from-cyan-500 to-emerald-500 text-emerald-400 border-emerald-500',
    details: [
      'Enforces NO VERIFIED TRANSACTION = NO RAZORPAY ORDER',
      'Converts currency amount to integer paise',
      'Performs idempotency check against duplicate orders',
      'Emits RAZORPAY_ORDER_CREATED or ORDER_SKIPPED',
    ],
    isLocked: false,
  },
  {
    key: 'COMPLETED',
    name: 'Completed',
    phase: 'Phase 1 & 2: Active',
    icon: CheckCircle2,
    description: 'Finalizes execution, seals event timeline, and returns complete verified agent payload.',
    activeColor: 'from-emerald-500 to-teal-500 text-emerald-400 border-emerald-500',
    details: [
      'Updates session status to COMPLETED',
      'Seals chronological SQLite event trail',
      'Returns candidate proposal & Razorpay Order ID',
      'Emits SESSION_COMPLETED event',
    ],
  },
  // Future Phase Preview Steps
  {
    key: 'RESULT',
    name: 'Escalate / Lab',
    phase: 'Phase 4 Preview',
    icon: Lock,
    description: 'Adversarial attack laboratory and human-in-the-loop dispute resolution.',
    activeColor: 'from-indigo-900 to-slate-900 text-slate-500 border-slate-800',
    details: ['Reserved for Phase 4: Attack Lab'],
    isLocked: true,
  },
  {
    key: 'RESULT',
    name: 'Result',
    phase: 'Phases 4-5 Preview',
    icon: Lock,
    description: 'Immutable shared cryptographic ledger confirmation.',
    activeColor: 'from-indigo-900 to-slate-900 text-slate-500 border-slate-800',
    details: ['Reserved for Phases 4-5: Shared Ledger'],
    isLocked: true,
  },
];

export const AgentBrain: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<StateStep>(STEPS[0]);
  const [testPrompt, setTestPrompt] = useState('Find me a hotel in Goa under ₹3000 this weekend');
  const [currentRunningStep, setCurrentRunningStep] = useState<AgentStateType | null>(null);
  const [runResult, setRunResult] = useState<AgentRunResponse | null>(null);

  const runMutation = useMutation({
    mutationFn: (input: string) => api.runAgent(input),
    onMutate: () => {
      // Simulate visual state progression
      setCurrentRunningStep('PERCEIVE');
      setTimeout(() => setCurrentRunningStep('ANALYZE'), 600);
      setTimeout(() => setCurrentRunningStep('DECIDE'), 1200);
      setTimeout(() => setCurrentRunningStep('ACT'), 1800);
    },
    onSuccess: (data) => {
      setCurrentRunningStep('COMPLETED');
      setRunResult(data);
      const matched = STEPS.find((s) => s.key === 'COMPLETED');
      if (matched) setSelectedStep(matched);
    },
    onError: () => {
      setCurrentRunningStep('FAILED');
    },
  });

  const handleSimulate = () => {
    if (!testPrompt.trim() || runMutation.isPending) return;
    runMutation.mutate(testPrompt.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              AEGIS AGENT BRAIN
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Finite State Machine architecture and cognitive loop lifecycle visualizer.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Current Simulation State:</span>
          <StateBadge state={currentRunningStep || 'IDLE'} size="md" />
        </div>
      </div>

      {/* Simulator Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 border border-purple-500/20">
        <div className="flex-1 w-full">
          <label className="text-[11px] font-mono text-purple-400 block mb-1">
            SIMULATION INPUT PROMPT
          </label>
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter intent prompt to trace through state machine..."
            className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSimulate}
          disabled={runMutation.isPending || !testPrompt.trim()}
          className="w-full sm:w-auto px-5 py-2.5 mt-5 sm:mt-0 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {runMutation.isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>STEPPING...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>TRIGGER BRAIN CYCLE</span>
            </>
          )}
        </button>
      </div>

      {/* State Machine Flowchart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Lifecycle State Flowchart
          </h3>
          <span className="text-[11px] font-mono text-cyan-400">
            Click any state to inspect internals
          </span>
        </div>

        {/* Pipeline Step Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = currentRunningStep === step.key;
            const isSelected = selectedStep.key === step.key;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setSelectedStep(step)}
                className={`relative rounded-xl p-3 text-left transition-all duration-200 border flex flex-col justify-between ${
                  step.isLocked
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-40 hover:opacity-60'
                    : isCurrent
                    ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105 z-10'
                    : isSelected
                    ? 'bg-slate-800/90 border-slate-600 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Active Indicator dot */}
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400">0{idx + 1}</span>
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-cyan-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="font-mono font-bold text-xs text-white">{step.name}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[9px] font-mono text-slate-400">
                  {step.phase}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected State Deep Dive Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: State Specification */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
                <selectedStep.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>State: {selectedStep.key}</span>
                  <StateBadge state={selectedStep.key} size="sm" />
                </h3>
                <span className="text-xs font-mono text-slate-400">{selectedStep.phase}</span>
              </div>
            </div>
            {selectedStep.isLocked && (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                LOCKED FOR FUTURE PHASES
              </span>
            )}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {selectedStep.description}
          </p>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Execution Responsibilities & Invariants:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedStep.details.map((d, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 font-sans"
                >
                  <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 col: Live Memory Snapshot */}
        <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-3">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Active Memory Inspector</span>
          </h3>

          {runResult ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">ACTIVE SESSION</div>
                <div className="text-cyan-400 font-bold">{runResult.session_id}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">PARSED INTENT</div>
                <div className="text-white">
                  Cat: <span className="text-purple-300">{runResult.intent.category || 'N/A'}</span>
                </div>
                <div className="text-white">
                  Loc: <span className="text-cyan-300">{runResult.intent.location || 'N/A'}</span>
                </div>
                <div className="text-white">
                  Budget: <span className="text-emerald-300">₹{runResult.intent.max_budget || 'None'}</span>
                </div>
                <div className="text-slate-400 text-[10px] pt-1">
                  Source: <span className="text-emerald-400 uppercase font-bold">{runResult.intent.source}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">DISCOVERED MATCHES</div>
                <div className="text-emerald-400 font-bold">
                  {runResult.result?.candidates_count || 0} Candidates
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs py-8 text-center leading-relaxed">
              No active session in memory. Trigger a cycle above to inspect runtime parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
