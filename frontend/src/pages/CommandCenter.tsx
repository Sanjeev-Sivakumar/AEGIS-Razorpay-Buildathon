import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  Search,
  ShieldAlert,
  Database,
  Lock,
  Zap,
  BarChart3,
  GitFork,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { StateBadge } from '../components/StateBadge';
import { TrustMonitor } from '../components/TrustMonitor';
import { RootIntentViewer } from '../components/RootIntentViewer';
import { DerivationViewer } from '../components/DerivationViewer';
import { TransactionResult } from '../components/TransactionResult';
import { GrowthPredictionCard } from '../components/GrowthPredictionCard';
import { CounterfactualPanel } from '../components/CounterfactualPanel';
import { CommerceGraph } from '../components/CommerceGraph';
import { AttackLab } from '../components/AttackLab';
import { LedgerViewer } from '../components/LedgerViewer';
import { DecisionReplay } from '../components/DecisionReplay';
import { AgentBrain } from '../components/AgentBrain';
import { LiveActivityStream } from '../components/LiveActivityStream';
import { DemoScriptPanel } from '../components/DemoScriptPanel';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import type { AgentRunResponse, LedgerEntry, SystemKpiData, SystemComponentStatuses } from '../types';

const SAMPLE_PROMPTS = [
  'Find me a hotel in Goa under ₹3000 this weekend',
  'Aegis Velocity running shoes under ₹2500',
  'ZenBook 14 laptop under ₹50000',
  'Resort in Candolim with swimming pool under ₹3000',
];

type ActiveTab =
  | 'overview'
  | 'growth'
  | 'graph'
  | 'counterfactual'
  | 'trust'
  | 'attack_lab'
  | 'ledger'
  | 'replay';

export const CommandCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [promptInput, setPromptInput] = useState('');
  const [activeResult, setActiveResult] = useState<AgentRunResponse | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('PRD-GOA-01');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [replayTargetId, setReplayTargetId] = useState<string>('');
  const [selectedEntryModal, setSelectedEntryModal] = useState<LedgerEntry | null>(null);

  // Real-time Queries
  const { data: kpis } = useQuery<SystemKpiData>({
    queryKey: ['demoKpis'],
    queryFn: () => api.getDemoKpis(),
    refetchInterval: 4000,
  });

  const { data: sysStatus } = useQuery<SystemComponentStatuses>({
    queryKey: ['demoStatus'],
    queryFn: () => api.getDemoStatus(),
    refetchInterval: 5000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.listSessions(10),
    refetchInterval: 5000,
  });

  const activeSessionId = activeResult?.session_id || (sessions && sessions.length > 0 ? sessions[0].id : null);

  const { data: rootCert } = useQuery({
    queryKey: ['rootCert', activeSessionId],
    queryFn: () => (activeSessionId ? api.getRootIntent(activeSessionId) : null),
    enabled: !!activeSessionId,
  });

  const { data: derivChain } = useQuery({
    queryKey: ['derivChain', activeSessionId],
    queryFn: () => (activeSessionId ? api.getDerivationChain(activeSessionId) : null),
    enabled: !!activeSessionId,
  });

  const { data: recentIntents } = useQuery({
    queryKey: ['intents'],
    queryFn: () => api.listIntents(5),
    refetchInterval: 5000,
  });

  const activeQuery =
    promptInput.trim() ||
    (recentIntents && recentIntents.length > 0 ? recentIntents[0].raw_text : 'hotel in Goa under 3000');
  const activeProdId =
    activeResult?.result?.candidates && activeResult.result.candidates.length > 0
      ? activeResult.result.candidates[0].product_id
      : selectedProductId;

  const { data: growthPred, isLoading: growthLoading } = useQuery({
    queryKey: ['growthPrediction', activeQuery, activeProdId],
    queryFn: () => api.predictGrowth(activeQuery, activeProdId),
    enabled: !!activeProdId,
  });

  const { data: cfSim, isLoading: cfLoading } = useQuery({
    queryKey: ['counterfactualSim', activeQuery, activeProdId],
    queryFn: () => api.simulateCounterfactual(activeQuery, activeProdId),
    enabled: !!activeProdId,
  });

  // Run agent mutation
  const runMutation = useMutation({
    mutationFn: (input: string) => api.runAgent(input),
    onSuccess: (data) => {
      setActiveResult(data);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['intents'] });
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
      queryClient.invalidateQueries({ queryKey: ['demoKpis'] });
      queryClient.invalidateQueries({ queryKey: ['demoStatus'] });
    },
  });

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || runMutation.isPending) return;
    runMutation.mutate(promptInput.trim());
  };

  const handleSelectForReplay = (id: string) => {
    setReplayTargetId(id);
    setActiveTab('replay');
  };

  const isAgentActive = runMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 1. Security Boundary Hard Invariant Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">
                  Payment Gate Protected
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                  Razorpay Test Mode
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Only verified transaction proposals can create Razorpay Test Mode orders. Growth and LLM reasoning cannot authorize payment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <span className="text-slate-400">Invariant:</span>
            <span className="text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
              NO VERIFIED TX = NO RAZORPAY ORDER
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Header & Global Status Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AEGIS COMMAND CENTER
            </span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Phase 5 / 5
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Growth-and-Trust Agent for Agentic Commerce — Mission Control & Decision Replay.
          </p>
        </div>

        {/* Global Agent Status Pill */}
        <div className="flex items-center gap-2">
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border-slate-800">
            <div className="relative">
              <span
                className={`w-3 h-3 rounded-full block ${
                  isAgentActive ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`w-3 h-3 rounded-full block absolute top-0 left-0 ${
                  isAgentActive ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
              />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Agent Brain State</div>
              <div className="text-xs font-mono font-bold text-white tracking-wider">
                {isAgentActive ? 'EXECUTING (ACTIVE)' : activeResult?.current_state || 'READY / IDLE'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* KPI 1: AI Buyer Selection Probability */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">AI Selection Prob</span>
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {kpis ? `${kpis.selection_probability}%` : '41.0%'}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Current candidate selection probability</p>
        </div>

        {/* KPI 2: Verified Transactions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Verified TX</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {kpis ? kpis.verified_transactions : '0'}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Authorized & Razorpay sealed</p>
        </div>

        {/* KPI 3: Blocked Transactions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-red-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Blocked TX</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {kpis ? kpis.blocked_transactions : '0'}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Adversarial attacks intercepted</p>
        </div>

        {/* KPI 4: Trust Score */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Trust Score</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {kpis ? `${kpis.trust_score}/100` : '96/100'}
          </div>
          <p className="text-[10px] text-purple-400/80 mt-1 font-semibold">{kpis?.trust_score_level || 'OPTIMAL'} SYSTEM RESILIENCE</p>
        </div>

        {/* KPI 5: Payment Safety */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Payment Gate</span>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono uppercase">
            PROTECTED
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">Test Mode: Zero live capture</p>
        </div>
      </div>

      {/* 4. Live System Status Bar */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">AEGIS STATUS:</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Agent Core:</span>
            <span className="text-white font-semibold">{sysStatus?.agent_core || 'ONLINE'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Growth ML:</span>
            <span className="text-white font-semibold">{sysStatus?.growth_ml || 'ONLINE'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">GraphSAGE:</span>
            <span className="text-white font-semibold">{sysStatus?.graphsage || 'ONLINE'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Trust Engine:</span>
            <span className="text-white font-semibold">{sysStatus?.trust_engine || 'ONLINE'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Policy Engine:</span>
            <span className="text-white font-semibold">{sysStatus?.policy_engine || 'ONLINE'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Payment Gate:</span>
            <span className="text-emerald-400 font-bold">{sysStatus?.payment_gate || 'PROTECTED'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-slate-400">Razorpay:</span>
            <span className="text-cyan-300 font-bold">{sysStatus?.razorpay || 'TEST MODE'}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-slate-400">Audit Ledger:</span>
            <span className="text-blue-300 font-bold">{sysStatus?.audit_ledger || 'VERIFIED'}</span>
          </span>
        </div>
      </div>

      {/* 5. Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Command Center
        </button>

        <button
          onClick={() => setActiveTab('growth')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'growth'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Growth Intelligence
        </button>

        <button
          onClick={() => setActiveTab('counterfactual')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'counterfactual'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Counterfactual Lab
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'graph'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          Commerce Graph
        </button>

        <button
          onClick={() => setActiveTab('trust')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'trust'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Trust Monitor
        </button>

        <button
          onClick={() => setActiveTab('attack_lab')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'attack_lab'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Attack Lab (Zero-Bypass)
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Audit Ledger
        </button>

        <button
          onClick={() => setActiveTab('replay')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'replay'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Forensic Replay
          {replayTargetId && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
        </button>
      </div>

      {/* 6. TAB CONTENT VIEWS */}

      {/* TAB: OVERVIEW / COMMAND CENTER */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Agent Brain Visualizer */}
          <AgentBrain
            currentState={isAgentActive ? 'ACT' : activeResult?.current_state || 'IDLE'}
            isAttackScenario={activeResult?.result?.authorization?.decision === 'BLOCK'}
          />

          {/* Demo Script Walkthrough Guide */}
          <DemoScriptPanel
            onStepSelect={(stepTab) => setActiveTab(stepTab as ActiveTab)}
            onDemoCompleted={() => {
              queryClient.invalidateQueries({ queryKey: ['demoKpis'] });
              queryClient.invalidateQueries({ queryKey: ['demoStatus'] });
              queryClient.invalidateQueries({ queryKey: ['sessions'] });
            }}
          />

          {/* Interactive Agent Run Prompt Bar */}
          <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20 glow-cyan space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Sparkles className="w-4 h-4" />
              <span>DISPATCH AUTONOMOUS AGENT QUERY</span>
            </div>

            <form onSubmit={handleRun} className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="e.g. Find me a hotel in Goa under ₹3000 this weekend"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={isAgentActive || !promptInput.trim()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-cyan-950/50 transition-all cursor-pointer shrink-0"
              >
                {isAgentActive ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Executing Loop...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    Run Autonomous Agent
                  </>
                )}
              </button>
            </form>

            {/* Prompt Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-mono mr-1">Examples:</span>
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPromptInput(p)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Active Transaction / Execution Result */}
          {activeResult && (
            <TransactionResult
              proposal={activeResult.result.proposal}
              authorization={activeResult.result.authorization}
              candidate={
                activeResult.result.candidates && activeResult.result.candidates.length > 0
                  ? activeResult.result.candidates[0]
                  : null
              }
            />
          )}

          {/* Live Activity Stream & Recent Sessions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <LiveActivityStream />
            </div>

            <div className="lg:col-span-5 glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Recent Agent Sessions
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">SQLite Persisted</span>
              </div>

              {sessionsLoading ? (
                <div className="text-center py-6 text-slate-500 text-xs">Loading sessions...</div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {sessions.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectForReplay(s.id)}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono text-cyan-400 font-bold">{s.id}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {s.events.length} steps • {new Date(s.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StateBadge state={s.current_state} size="sm" />
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  No sessions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: GROWTH INTELLIGENCE */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Deep Learning Growth Intelligence
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Hybrid selection probability architecture: MiniLM query encoder + GraphSAGE relational message passing + multi-feature fusion MLP.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GrowthPredictionCard prediction={growthPred} isLoading={growthLoading} />
            <CounterfactualPanel
              simulation={cfSim}
              productId={activeProdId}
              query={activeQuery}
              isLoading={cfLoading}
            />
          </div>
        </div>
      )}

      {/* TAB: COUNTERFACTUAL LAB */}
      {activeTab === 'counterfactual' && (
        <div className="space-y-6">
          <CounterfactualPanel
            simulation={cfSim}
            productId={activeProdId}
            query={activeQuery}
            isLoading={cfLoading}
          />
        </div>
      )}

      {/* TAB: COMMERCE GRAPH */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <CommerceGraph
            activeQuery={activeQuery}
            activeProductId={activeProdId}
            onSelectProduct={(id) => setSelectedProductId(id)}
          />
        </div>
      )}

      {/* TAB: TRUST MONITOR */}
      {activeTab === 'trust' && (
        <div className="space-y-6">
          <TrustMonitor
            authorization={activeResult?.result?.authorization}
            isBlocked={activeResult?.result?.authorization?.decision === 'BLOCK'}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rootCert && <RootIntentViewer certificate={rootCert} />}
            {derivChain && <DerivationViewer chain={derivChain} />}
          </div>
        </div>
      )}

      {/* TAB: ATTACK LAB */}
      {activeTab === 'attack_lab' && (
        <div className="space-y-6">
          <AttackLab onSelectForReplay={handleSelectForReplay} />
        </div>
      )}

      {/* TAB: AUDIT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <LedgerViewer onSelectForReplay={handleSelectForReplay} />
        </div>
      )}

      {/* TAB: FORENSIC REPLAY */}
      {activeTab === 'replay' && (
        <div className="space-y-6">
          <DecisionReplay
            transactionId={replayTargetId}
            onClear={() => setReplayTargetId('')}
          />
        </div>
      )}

      {/* 7. Closing Statement & System Mission Taglines */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center space-y-2">
        <p className="text-xs text-slate-300 font-medium max-w-3xl mx-auto italic">
          "Aegis doesn't just help an AI agent find something to buy. It makes the merchant discoverable, proves that the purchase remains grounded in the user's intent, and prevents the agent from moving money when that proof breaks."
        </p>
        <p className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-widest">
          One Agent. One Decision Loop. One Trust Gate.
        </p>
      </div>

      {/* Transaction Detail Inspector Modal */}
      {selectedEntryModal && (
        <TransactionDetailModal
          entry={selectedEntryModal}
          onClose={() => setSelectedEntryModal(null)}
          onReplay={(txId) => {
            setSelectedEntryModal(null);
            handleSelectForReplay(txId);
          }}
        />
      )}
    </div>
  );
};
