import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle2,
  XCircle,
  Layout,
  Network,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAegis } from '../../context/AegisContext';
import { DecisionGate } from '../visual/DecisionGate';
import { DerivationLineGraph } from '../visual/DerivationLineGraph';
import { RiskRadialGauge } from '../visual/RiskRadialGauge';
import type { RootIntentCertificate } from '../../types';
import { TrustLoopSpecView } from '../spec/TrustLoopSpecView';

export const TrustScreen: React.FC = () => {
  const { archState, latestRun, latestAttack, session, setActiveTab } = useAegis();
  const [viewMode, setViewMode] = useState<'SPEC' | 'GRAPH'>('SPEC');
  const [selectedStage, setSelectedStage] = useState<string>('DERIVATION');

  const activeSessionId =
    session.rootIntent.id || latestAttack?.attack_id || latestRun?.session_id || 'SESS-DEMO-01';

  // Live Root Intent Certificate Query
  const { data: rootCert } = useQuery<RootIntentCertificate>({
    queryKey: ['rootCert', activeSessionId],
    queryFn: () => api.getRootIntent(activeSessionId),
    retry: false,
  });

  const isBlocked =
    !!session.attack?.active ||
    session.payment?.status === 'BLOCKED' ||
    archState.activePath === 'fail' ||
    archState.trust === 'blocked';

  // Pipeline stages
  const pipelineStages = [
    { id: 'ROOT', title: 'Root Intent', status: 'PASS', score: 'Valid' },
    { id: 'DERIVATION', title: 'Derivation', status: isBlocked ? 'FAIL' : 'PASS', score: isBlocked ? 'Broken' : 'Valid' },
    { id: 'POLICY', title: 'Policy Engine', status: isBlocked ? 'FAIL' : 'PASS', score: isBlocked ? 'Blocked' : 'Allow' },
    { id: 'VERIFIER', title: 'Verifier', status: isBlocked ? 'FAIL' : 'PASS', score: isBlocked ? 'Tampered' : 'Verified' },
    { id: 'RISK', title: 'Risk Engine', status: isBlocked ? 'FAIL' : 'PASS', score: isBlocked ? 'High (100)' : 'Low (08)' },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto font-sans">
      {/* View Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Trust View:
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
            {viewMode === 'SPEC'
              ? 'Trust Loop Architecture Specification (Active)'
              : 'Detailed Security Execution Graph & Gate'}
          </span>
        </div>

        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode('SPEC')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'SPEC'
                ? 'bg-white text-cyan-800 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Trust Loop Spec</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('GRAPH')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'GRAPH'
                ? 'bg-white text-cyan-800 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Execution Graph</span>
          </button>
        </div>
      </div>

      {viewMode === 'SPEC' ? (
        <TrustLoopSpecView />
      ) : (
        <>
          {/* 1. Header: Security Execution Graph */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-slate-900">
                Trust Security Execution Graph
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                End-to-end cryptographic verification boundary
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold ${
                isBlocked
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {isBlocked ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Interception Active</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>All Gates Verified</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 5-Stage Execution Graph Rail */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {pipelineStages.map((stage, idx) => {
            const isStageFail = stage.status === 'FAIL';
            const isSelected = selectedStage === stage.id;

            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-50 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>0{idx + 1}</span>
                  {isStageFail ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                  {stage.title}
                </div>
                <div
                  className={`text-xs font-semibold mt-1 ${
                    isStageFail ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {stage.score}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Middle Row: Root Intent Certificate & Risk Provenance Radial Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* ROOT INTENT CERTIFICATE (Compact Visual) */}
        <div className="md:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="text-xs font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
                <Key className="w-4 h-4 text-cyan-600" />
                Root Intent Certificate
              </span>
              <span className="text-xs px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Signed & Immutable
              </span>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Category & Location</span>
                <span className="font-bold text-slate-900">{session.rootIntent.category} · {session.rootIntent.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Budget Ceiling</span>
                <span className="font-bold text-cyan-700">≤ ₹{session.rootIntent.budget.toLocaleString()} {session.rootIntent.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Recipient Scope</span>
                <span className="text-slate-800 font-bold truncate max-w-[170px]">
                  {session.candidates.map(c => c.merchant).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(', ') || session.proposal?.recipient || session.proposal?.merchantId || 'Verified Outlets'}
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium block">Cryptographic SHA-256 Hash</span>
                <span className="text-xs text-emerald-700 font-mono break-all font-bold mt-1 block">
                  {rootCert?.immutable_hash || session.rootIntent.sha256Hash}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 text-center font-medium pt-2">
            Tamper-evident user contract persisted at inception
          </div>
        </div>

        {/* METRIC PROVENANCE: Risk Score Radial Arc Gauge */}
        <div className="md:col-span-6">
          <RiskRadialGauge isBlocked={isBlocked} />
        </div>
      </div>

      {/* 3. DERIVATION LINE GRAPH (Full Width) */}
      <div className="w-full">
        <DerivationLineGraph isBlocked={isBlocked} />
      </div>

      {/* 4. PAYMENT GATE: Visual Centerpiece */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <DecisionGate state={isBlocked ? 'blocked' : 'success'} activePath={isBlocked ? 'fail' : 'pass'} />
      </div>

      {/* 5. CONTINUOUS AUTHORIZATION STATUS & ROUTING */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-700" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Continuous Authorization Policy Rules
              </span>
              <p className="text-xs text-slate-500">
                Invariants continuously enforced on candidate selection prior to payment gate
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            isBlocked
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            {isBlocked ? 'HOLD ACTIVE — ORDER BLOCKED' : '100% INVARIANTS PASS'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className={`p-3 rounded-lg border ${
            isBlocked && session.attack?.scenario === 'amount-escalation'
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">Budget Ceiling</span>
              {isBlocked && session.attack?.scenario === 'amount-escalation' ? (
                <XCircle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-slate-600 text-[11px]">
              ≤ ₹{(session.intent.maxAmount || session.rootIntent.budget).toLocaleString()} max limit
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${
            isBlocked && session.attack?.scenario === 'recipient-substitution'
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">Merchant Whitelist</span>
              {isBlocked && session.attack?.scenario === 'recipient-substitution' ? (
                <XCircle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-slate-600 text-[11px] truncate">
              {session.selectedCandidate?.merchant || 'Authorized Outlets'}
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${
            isBlocked && session.attack?.scenario === 'category-substitution'
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">Category Scope</span>
              {isBlocked && session.attack?.scenario === 'category-substitution' ? (
                <XCircle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-slate-600 text-[11px]">
              {session.intent.category} (Prohibited: None)
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${
            isBlocked && session.attack?.scenario === 'derivation-tampering'
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">Merkle Derivation</span>
              {isBlocked && session.attack?.scenario === 'derivation-tampering' ? (
                <XCircle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-slate-600 text-[11px]">
              Root-to-candidate link intact
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Current Status: <strong>{isBlocked ? 'Security Hold Active — Order creation blocked' : 'Payment Gate Ready — Deterministic verification successful'}</strong>
          </span>
          <button
            onClick={() => setActiveTab(isBlocked ? 'SECURITY' : 'CHECKOUT')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isBlocked
                ? 'bg-rose-100 hover:bg-rose-200 text-rose-900'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <span>{isBlocked ? 'Review Threat in Attack Lab' : 'Proceed to Checkout'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )}
</div>
);
};
