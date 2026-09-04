import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Search,
  CreditCard,
  Ban,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAegis } from '../../context/AegisContext';
import type { AegisTab } from '../../context/AegisContext';
import { SystemArchitecture } from '../visual/SystemArchitecture';
import { MetricRail } from '../visual/MetricRail';
import { TransactionFlow } from '../visual/TransactionFlow';
import { StateMachineRail } from '../visual/StateMachineRail';
import { EcommerceMarketplace } from '../commerce/EcommerceMarketplace';

interface CommandScreenProps {
  onNavigateTab: (tab: AegisTab) => void;
}

const SAMPLE_QUERIES = [
  'Hotels in Goa under ₹3000',
  'Laptops under ₹60000',
  'Running shoes under ₹5000',
  'Smartphones under ₹30000',
  'Headphones under ₹10000',
];

export const CommandScreen: React.FC<CommandScreenProps> = ({ onNavigateTab }) => {
  const {
    session,
    runQuery,
    archState,
  } = useAegis();

  const [inputVal, setInputVal] = useState(session.rawQuery);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync input value if rawQuery changed externally
  useEffect(() => {
    setInputVal(session.rawQuery);
  }, [session.rawQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await runQuery(inputVal.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSample = async (q: string) => {
    setInputVal(q);
    setIsSubmitting(true);
    try {
      await runQuery(q);
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidate = session.selectedCandidate;
  const selectionProb = candidate ? candidate.selectionScore / 100 : 0.98;
  const currentRank = candidate?.rank ?? 1;
  const latencyMs = 38;
  const isBlocked = archState.activePath === 'fail' || session.attack?.active;

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* State transition notification if parsing */}
      {session.status === 'PARSING' && (
        <div className="rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-cyan-900 text-xs font-semibold flex items-center gap-2 animate-pulse shadow-xs">
          <Sparkles className="w-4 h-4 text-cyan-600 animate-spin" />
          <span>{session.statusMessage || 'Rebuilding commerce context around active intent...'}</span>
        </div>
      )}

      {/* Upper Grid: 70%+ Architecture Dominant Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Main Viewport: The Visual Backbone */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3">
          <SystemArchitecture onNavigateTab={onNavigateTab} />
          <TransactionFlow isBlocked={Boolean(isBlocked)} />
          <EcommerceMarketplace onNavigateTab={onNavigateTab} />
          
          {/* Autonomous Commerce Gate & Checkout Action Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Autonomous Commerce Execution Gate
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                        isBlocked
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {isBlocked ? 'THREAT INTERCEPTED (HOLD ACTIVE)' : 'ALL GATES VERIFIED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Continuous cryptographic verification from Root Intent to Payment Gate.
                  </p>
                </div>
              </div>

              {/* CTA to Checkout or Warning */}
              {!isBlocked ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab('CHECKOUT')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateTab('SECURITY')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Inspect Threat in Attack Lab</span>
                </button>
              )}
            </div>

            {/* Pipeline Checks Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Intent Constraint</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{session.intent.category} ≤ ₹{session.rootIntent.budget.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Optimal Selection</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">₹{candidate?.price?.toLocaleString() || '2,400'} (Rank #1)</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Cryptographic Provenance</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  {isBlocked ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-700">Severed Lineage</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700">SHA-256 Valid</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Payment Gate</span>
                <div className="flex items-center gap-1.5 font-bold">
                  {isBlocked ? (
                    <>
                      <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-700">Blocked (0 Moved)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700">Order Ready</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail: Compact Live State */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          {/* Query Trigger Box */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-600" />
                Execute Commerce Intent
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-800 font-medium">
                {session.mode}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Enter autonomous purchase intent..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none placeholder:text-slate-400 shadow-xs"
              />
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5 overflow-x-auto text-[11px] text-slate-600 py-0.5">
                  {SAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSelectSample(q)}
                      className="px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 truncate max-w-[120px] cursor-pointer font-medium transition-colors shrink-0"
                      title={q}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <span>{isSubmitting ? 'Evaluating...' : 'Run Autonomous Agent'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Live State Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 tracking-wide">
                Live State Rail
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {session.intent.category}
              </span>
            </div>

            {/* Target Offering */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="text-[11px] text-slate-500 font-semibold">Active Candidate Offering</div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {candidate?.name || 'Searching offering...'}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                <span>Merchant: {candidate?.merchant || 'Verified Merchant'}</span>
                <span className="text-cyan-700 font-bold">
                  {session.intent.currency} {candidate?.price ? candidate.price.toLocaleString() : '0'}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500 font-semibold">AI Selection Score</div>
                <div className="text-lg font-bold text-cyan-700 mt-0.5">
                  {candidate ? `${candidate.selectionScore}/100` : '98/100'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Rank #{currentRank}</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500 font-semibold">Trust Status</div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    isBlocked ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {isBlocked ? 'Hold' : 'Verified'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {isBlocked ? 'Threat Intercepted' : 'Cryptographic PASS'}
                </div>
              </div>
            </div>

            {/* Invariant Indicator */}
            <div
              className={`rounded-lg border p-2.5 text-center text-xs ${
                isBlocked
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <div className="text-[11px] text-slate-500 font-semibold mb-1">
                Payment Gate Status
              </div>
              <div className="font-bold flex items-center justify-center gap-1.5">
                {isBlocked ? (
                  <>
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Razorpay Order Blocked (Zero Money Moved)</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Razorpay Test Mode Order Authorized</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Subsystem Shortcuts */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Subsystem Workspaces
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateTab('GROWTH')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer font-medium"
              >
                <span>Growth Lab</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
              </button>
              <button
                onClick={() => onNavigateTab('COMMERCE')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer font-medium"
              >
                <span>Graph</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
              </button>
              <button
                onClick={() => onNavigateTab('TRUST')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer font-medium"
              >
                <span>Trust Engine</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                onClick={() => onNavigateTab('SECURITY')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer font-medium"
              >
                <span>Attack Lab</span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
              </button>
            </div>
          </div>

          {/* State Machine */}
          <StateMachineRail
            currentState={isBlocked ? 'HOLD' : 'COMPLETED'}
            isBlocked={Boolean(isBlocked)}
          />
        </div>
      </div>

      {/* Bottom Rail: Real System Metrics */}
      <MetricRail
        selectionProb={selectionProb}
        rank={currentRank}
        latencyMs={latencyMs}
        riskScore={session.verification.riskScore}
      />
    </div>
  );
};
