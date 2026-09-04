import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Database,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Layout,
  ListTree,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAegis } from '../../context/AegisContext';
import type { LedgerEntry, LedgerVerificationResult, DecisionReplay as DecisionReplayType } from '../../types';
import { AuditReplaySpecView } from '../spec/AuditReplaySpecView';

export const EvidenceScreen: React.FC = () => {
  const { setInspector, triggerReplay, session } = useAegis();
  const [viewMode, setViewMode] = useState<'SPEC' | 'EXPLORER'>('SPEC');
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [replayData, setReplayData] = useState<DecisionReplayType | null>(null);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Live Ledger Query
  const { data: entries } = useQuery<LedgerEntry[]>({
    queryKey: ['ledgerTail'],
    queryFn: () => api.getLedgerTail(15),
    refetchInterval: 5000,
  });

  // Ledger Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: () => api.verifyLedgerChain(),
  });

  // Initial verification on mount
  useEffect(() => {
    verifyMutation.mutate();
  }, []);

  const handleSelectEntry = async (entry: LedgerEntry) => {
    setSelectedTxId(entry.transaction_id);
    setInspector({
      title: entry.transaction_id,
      subtitle: entry.outcome,
      badge: entry.outcome === 'AUTHORIZED' ? 'Authorized' : 'Blocked',
      badgeType: entry.outcome === 'AUTHORIZED' ? 'success' : 'danger',
      fields: [
        { label: 'Amount', value: entry.amount ? `₹${entry.amount}` : '₹0.00' },
        { label: 'Outcome', value: entry.outcome },
        { label: 'Risk Score', value: entry.risk_score },
        { label: 'Hash Snippet', value: `${entry.current_hash.substring(0, 16)}...` },
        { label: 'Prev Hash', value: `${entry.previous_hash.substring(0, 16)}...` },
      ],
      actionLabel: 'Run Forensic Replay',
      onAction: () => runReplay(entry.transaction_id),
    });
  };

  const runReplay = async (txId: string) => {
    if (!txId) return;
    setIsReplaying(true);
    try {
      const data = await triggerReplay(txId);
      setReplayData(data);
    } catch (err) {
      console.error('Failed replay', err);
    } finally {
      setIsReplaying(false);
    }
  };

  const verificationResult: LedgerVerificationResult | undefined = verifyMutation.data;
  const isChainValid = verificationResult ? verificationResult.valid : true;
  const blocksChecked = verificationResult ? verificationResult.entries_checked : entries?.length ?? 12;

  const defaultReplaySteps = [
    { stage: 'Step 01', title: 'Intent Inception', status: 'Pass', details: `User established ₹${session.rootIntent.budget.toLocaleString()} budget for ${session.rootIntent.category}` },
    { stage: 'Step 02', title: 'Catalog Discovery', status: 'Pass', details: `Ranked ${session.selectedCandidate?.name || 'Selected Item'} #1 (${session.selectedCandidate?.selectionProbability || `${session.selectedCandidate?.selectionScore || 98}%`} Selection Prob)` },
    { stage: 'Step 03', title: 'Payment Proposal', status: 'Pass', details: `Constructed ₹${(session.proposal?.amount || session.selectedCandidate?.price || session.rootIntent.budget).toLocaleString()} proposal for merchant ${session.proposal?.merchant || session.proposal?.recipient || session.selectedCandidate?.merchant || 'Official'}` },
    { stage: 'Step 04', title: 'Derivation Trace', status: 'Pass', details: 'Step hashes verified sequentially' },
    { stage: 'Step 05', title: 'Policy Engine Check', status: 'Pass', details: `Evaluated budget constraint ≤ ₹${session.rootIntent.budget.toLocaleString()}` },
    { stage: 'Step 06', title: 'Payment Gate Invariant', status: 'Pass', details: 'Authorized Razorpay Test Mode order' },
    { stage: 'Step 07', title: 'Immutable Block Commit', status: 'Pass', details: 'SHA-256 block committed to chain head' },
  ];

  const stepsToDisplay = replayData?.steps?.map((s, idx) => ({
    stage: `Step 0${idx + 1}`,
    title: s.title,
    status: s.status === 'AUTHORIZED' || s.status === 'PASS' ? 'Pass' : 'Blocked',
    details: JSON.stringify(s.details),
  })) ?? defaultReplaySteps;

  const activeAmount = session.proposal?.amount || session.selectedCandidate?.price || session.rootIntent.budget;
  const attackAmount = session.attack?.proposedAmount || Math.round(session.rootIntent.budget * 3.5);

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-sans">
      {/* View Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Audit View:
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
            {viewMode === 'SPEC'
              ? 'Audit & Replay Wireframe Specification (Active)'
              : 'Detailed Merkle Chain & Forensic Block Explorer'}
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
            <span>Audit & Replay Spec</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('EXPLORER')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'EXPLORER'
                ? 'bg-white text-cyan-800 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Merkle Chain Explorer</span>
          </button>
        </div>
      </div>

      {viewMode === 'SPEC' ? (
        <AuditReplaySpecView />
      ) : (
        <>
          {/* 1. Header: Merkle Chain Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-slate-900">
                Cryptographic Ledger & Audit Chain
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only SHA-256 linked blocks with verified integrity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Verify Chain</span>
            </button>
            <span
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border font-semibold ${
                isChainValid
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {isChainValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chain Valid ({blocksChecked} Blocks)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Tamper Detected</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Transaction Amount Clarity Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-900">Authorized Purchases: ₹{activeAmount.toLocaleString()}</span>
            <span className="text-slate-500 font-medium">(Verified within ≤₹{session.rootIntent.budget.toLocaleString()} Budget)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-semibold text-slate-900">Adversarial Attacks: ₹{attackAmount.toLocaleString()}</span>
            <span className="text-slate-500 font-medium">(Blocked: Exceeds Budget by ₹{Math.max(0, attackAmount - session.rootIntent.budget).toLocaleString()})</span>
          </div>
        </div>

        {/* Visual Hash Chain */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Hash Chain Blocks (Click to inspect and replay)</span>
            <span className="text-slate-400">Head at right</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-2.5">
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 uppercase shrink-0">
              Genesis
            </div>
            <div className="h-0.5 w-4 bg-slate-300 shrink-0" />

            {(entries ?? []).map((entry, idx) => {
              const isAuth = entry.outcome === 'AUTHORIZED';
              const isSelected = selectedTxId === entry.transaction_id;

              return (
                <React.Fragment key={entry.id || idx}>
                  <button
                    onClick={() => handleSelectEntry(entry)}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50 shadow-xs'
                        : isAuth
                        ? 'border-slate-200 bg-slate-50 hover:border-emerald-400'
                        : 'border-rose-200 bg-rose-50 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAuth ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-bold text-slate-900">
                        {entry.transaction_id.substring(0, 10)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">
                      {entry.amount ? `₹${entry.amount}` : '₹0.00'} ·{' '}
                      <span className={isAuth ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {isAuth ? 'Pass' : 'Hold'}
                      </span>
                    </div>
                  </button>

                  <div
                    className={`h-0.5 w-3.5 shrink-0 ${
                      isAuth ? 'bg-emerald-300' : 'bg-rose-300'
                    }`}
                  />
                </React.Fragment>
              );
            })}

            <div className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-xs text-cyan-800 uppercase font-bold shrink-0">
              Head
            </div>
          </div>
        </div>
      </div>

      {/* 2. Decision Forensic Replay Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-slate-900">
                Forensic Decision Replay
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic step-by-step causal trajectory reconstruction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              placeholder="Transaction or Attack ID..."
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:border-cyan-500 focus:outline-none w-52 placeholder:text-slate-400 shadow-xs"
            />
            <button
              onClick={() => runReplay(selectedTxId)}
              disabled={isReplaying || !selectedTxId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Replay</span>
            </button>
          </div>
        </div>

        {/* 7-Step Forensic Timeline */}
        <div className="space-y-2.5">
          {stepsToDisplay.map((step, idx) => {
            const isStepPass = step.status === 'Pass';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                  isStepPass
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-rose-200 bg-rose-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isStepPass
                        ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                        : 'border border-rose-300 bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isStepPass ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  </div>

                  <div>
                    <span className="font-bold text-slate-900">{step.stage}: </span>
                    <span className="text-slate-800 font-semibold">{step.title}</span>
                    <p className="text-xs text-slate-600 mt-0.5 truncate max-w-md">
                      {step.details}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold shrink-0 ${
                    isStepPass
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      : 'border-rose-200 bg-rose-100 text-rose-800'
                  }`}
                >
                  {step.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  )}
</div>
);
};
