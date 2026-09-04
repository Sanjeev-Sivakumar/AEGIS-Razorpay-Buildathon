import React from 'react';
import {
  Shield,
  TrendingUp,
  Cpu,
  Lock,
  Database,
  RotateCcw,
  CreditCard,
  Ban,
  Network,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ArchitectureNode } from './ArchitectureNode';
import { ArchitectureEdge } from './ArchitectureEdge';
import { useAegis } from '../../context/AegisContext';
import type { AegisTab } from '../../context/AegisContext';

interface SystemArchitectureProps {
  onNavigateTab?: (tab: AegisTab) => void;
  className?: string;
}

export const SystemArchitecture: React.FC<SystemArchitectureProps> = ({
  onNavigateTab,
  className = '',
}) => {
  const { archState, setInspector, activeMode, session } = useAegis();

  const handleInspect = (
    title: string,
    subtitle: string,
    badge: string,
    badgeType: 'neutral' | 'success' | 'warning' | 'danger',
    fields: Array<{ label: string; value: string | number | boolean }>,
    targetTab?: AegisTab
  ) => {
    setInspector({
      title,
      subtitle,
      badge,
      badgeType,
      fields,
      actionLabel: targetTab ? `View ${targetTab} Subsystem` : undefined,
      onAction: targetTab && onNavigateTab ? () => onNavigateTab(targetTab) : undefined,
    });
  };

  // Derive edge states from node states
  const aegisToSplitEdge = archState.aegis === 'active' || archState.growth === 'active' || archState.trust === 'active'
    ? 'active'
    : archState.aegis === 'success'
    ? 'success'
    : 'inactive';

  const growthEdge = archState.growth === 'active' ? 'active' : archState.growth === 'success' ? 'success' : 'inactive';
  const trustEdge = archState.trust === 'blocked' ? 'blocked' : archState.trust === 'active' ? 'active' : archState.trust === 'success' ? 'success' : 'inactive';

  const decisionEdge = archState.decision === 'blocked' ? 'blocked' : archState.decision === 'active' ? 'active' : archState.decision === 'success' ? 'success' : 'inactive';

  const isBlocked = archState.activePath === 'fail' || archState.paymentGate === 'blocked' || Boolean(session.attack?.active);

  const ledgerEdge = archState.ledger === 'active' ? 'active' : archState.ledger === 'success' ? 'success' : 'inactive';

  const candidateLabel = session.selectedCandidate?.name || session.proposal?.productName || 'Active Candidate';
  const activeAmountStr = `₹${(session.proposal?.amount || session.selectedCandidate?.price || session.rootIntent.budget).toLocaleString()}`;

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm font-sans ${className}`}
    >
      {/* Background Watermark/Grid overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />

      {/* Mode / Title Header Indicator */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <div className="flex items-center gap-2.5">
          <Network className="w-4 h-4 text-cyan-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Autonomous Commerce Operating System
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 font-medium">
            <span className={`w-2 h-2 rounded-full ${activeMode === 'LIVE' ? 'bg-emerald-500' : 'bg-cyan-500 animate-pulse'}`} />
            Mode: {activeMode}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-medium">Core Visual Backbone</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* 1. AEGIS Root Node */}
        <div className="w-72">
          <ArchitectureNode
            label="AEGIS Core"
            sublabel="Autonomous Controller"
            metric="ONLINE"
            icon={Shield}
            state={archState.aegis}
            badge="v0.5"
            onClick={() =>
              handleInspect(
                'AEGIS OS CORE',
                'Controller & Coordination Runtime',
                'ONLINE',
                'success',
                [
                  { label: 'Runtime Engine', value: 'FastAPI / Python' },
                  { label: 'Security Boundary', value: 'Isolated Payment Gate' },
                  { label: 'Cryptographic Mode', value: 'HMAC-SHA256 Root Bound' },
                  { label: 'Policy Verifier', value: 'Deterministic Enforcement' },
                ],
                'COMMAND'
              )
            }
          />
        </div>

        {/* Edge: Aegis -> Split to Growth & Trust */}
        <div className="w-full max-w-md my-1">
          <ArchitectureEdge direction="split-down" state={aegisToSplitEdge} />
        </div>

        {/* 2. Parallel Dual-Track Row: GROWTH & TRUST */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-2">
          {/* Track 1: Growth Engine */}
          <div className="flex flex-col items-center">
            <ArchitectureNode
              label="Growth Engine"
              sublabel="Catalog & Relational GNN"
              metric={archState.growth === 'active' ? 'RANKING' : 'OPTIMAL'}
              icon={TrendingUp}
              state={archState.growth}
              badge="98% Fit"
              onClick={() =>
                handleInspect(
                  'GROWTH ENGINE',
                  'GraphSAGE Relational Discovery',
                  archState.growth === 'active' ? 'RANKING' : 'OPTIMAL',
                  'success',
                  [
                    { label: 'GNN Backbone', value: 'GraphSAGE 2-Hop Aggregation' },
                    { label: 'Intent Category', value: session.rootIntent.category },
                    { label: 'Target Product', value: candidateLabel },
                    { label: 'Selection Probability', value: `${session.selectedCandidate?.selectionProbability || session.selectedCandidate?.selectionScore || 98}%` },
                    { label: 'Counterfactual Recs', value: `${session.growthAnalysis?.interventions?.length || 4} Available` },
                  ],
                  'GROWTH'
                )
              }
            />
          </div>

          {/* Track 2: Trust Engine */}
          <div className="flex flex-col items-center">
            <ArchitectureNode
              label="Trust Engine"
              sublabel="Cryptographic Security"
              metric={archState.trust === 'blocked' ? 'BLOCKED' : 'VERIFIED'}
              icon={Lock}
              state={archState.trust}
              badge={archState.trust === 'blocked' ? 'Violation' : 'Valid'}
              onClick={() =>
                handleInspect(
                  'TRUST ENGINE',
                  'Cryptographic Verification & Derivation',
                  archState.trust === 'blocked' ? 'BLOCKED' : 'VERIFIED',
                  archState.trust === 'blocked' ? 'danger' : 'success',
                  [
                    { label: 'Root Intent Cert', value: 'IMMUTABLE' },
                    { label: 'Derivation Trace', value: archState.trust === 'blocked' ? 'FAIL / BROKEN' : 'PASS / LINKED' },
                    { label: 'Policy Evaluation', value: archState.trust === 'blocked' ? 'FAIL / VIOLATION' : 'PASS / ALLOWED' },
                    { label: 'Mathematical Risk', value: archState.trust === 'blocked' ? '100 / 100' : '08 / 100' },
                  ],
                  'TRUST'
                )
              }
            />
          </div>
        </div>

        {/* Edge: Merge from Growth & Trust -> Decision */}
        <div className="w-full max-w-md my-1">
          <ArchitectureEdge direction="merge-down" state={growthEdge === 'active' || trustEdge === 'active' ? 'active' : growthEdge === 'success' && trustEdge === 'success' ? 'success' : trustEdge === 'blocked' ? 'blocked' : 'inactive'} />
        </div>

        {/* 3. DECISION Node */}
        <div className="w-72">
          <ArchitectureNode
            label="Decision"
            sublabel="Proposal Synthesis"
            metric={archState.decision === 'blocked' ? 'REJECTED' : 'EVALUATED'}
            icon={Cpu}
            state={archState.decision}
            onClick={() =>
              handleInspect(
                'DECISION SYNTHESIS',
                'Growth Candidate & Policy Fusion',
                archState.decision === 'blocked' ? 'BLOCKED' : 'READY',
                archState.decision === 'blocked' ? 'danger' : 'success',
                [
                  { label: 'Candidate', value: candidateLabel },
                  { label: 'Proposed Amount', value: activeAmountStr },
                  { label: 'Verification', value: archState.decision === 'blocked' ? 'FAIL' : 'PASS' },
                  { label: 'Execution Path', value: archState.decision === 'blocked' ? 'ROUTE TO HOLD' : 'ROUTE TO PAYMENT' },
                ]
              )
            }
          />
        </div>

        {/* Edge: Decision -> Payment Gate */}
        <ArchitectureEdge direction="down" state={decisionEdge} />

        {/* 4. PAYMENT GATE (Visual Centerpiece) */}
        <div className="w-full max-w-md">
          <div
            onClick={() =>
              handleInspect(
                'PAYMENT GATE INVARIANT',
                'Cryptographic Order Authorization Barrier',
                archState.activePath === 'fail' ? 'HOLD ACTIVE' : archState.activePath === 'pass' ? 'AUTHORIZED' : 'ARMED',
                archState.activePath === 'fail' ? 'danger' : archState.activePath === 'pass' ? 'success' : 'neutral',
                [
                  { label: 'Hard Invariant', value: 'NO VERIFICATION = NO ORDER' },
                  { label: 'Active Gate Path', value: archState.activePath.toUpperCase() },
                  { label: 'Razorpay Mode', value: 'TEST MODE ONLY' },
                  { label: 'Bypass Resistance', value: '100% Deterministic' },
                ]
              )
            }
            className="cursor-pointer"
          >
            <div
              className={`rounded-xl border p-4 text-center transition-all ${
                archState.paymentGate === 'blocked'
                  ? 'border-rose-300 bg-rose-50'
                  : archState.paymentGate === 'success'
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Payment Gate Invariant
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border uppercase font-medium ${
                    archState.activePath === 'fail'
                      ? 'bg-rose-100 border-rose-200 text-rose-800'
                      : archState.activePath === 'pass'
                      ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {archState.activePath === 'fail'
                    ? 'HOLD ACTIVE'
                    : archState.activePath === 'pass'
                    ? 'AUTHORIZED'
                    : 'ARMED'}
                </span>
              </div>

              <div className="py-1">
                <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  Cryptographic Barrier
                </div>
                <div className="text-sm font-semibold tracking-wide text-slate-900 mt-0.5">
                  {archState.activePath === 'fail' ? (
                    <span className="text-rose-700 flex items-center justify-center gap-1.5 font-bold">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Verification Failed: Order Creation Aborted
                    </span>
                  ) : archState.activePath === 'pass' ? (
                    <span className="text-emerald-700 flex items-center justify-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Root & Chain Verified: Order Permitted
                    </span>
                  ) : (
                    <span className="text-slate-900">
                      No Verification = No Razorpay Order
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Execution Route: Verified by Default, Security Hold on Attack */}
        {isBlocked ? (
          /* ADVERSARIAL HOLD ROUTE (Active only during attack) */
          <div className="flex flex-col items-center w-full max-w-sm my-1">
            <ArchitectureEdge direction="down" state="blocked" label="INTERCEPTED" />
            <div className="w-72">
              <ArchitectureNode
                label="Security Hold"
                sublabel="Zero Money Moved"
                metric="ENFORCED"
                icon={Ban}
                state="blocked"
                badge="Suppressed"
                onClick={() =>
                  handleInspect(
                    'SECURITY HOLD BARRIER',
                    'Deterministic Payment Suppression',
                    'ACTIVATED',
                    'danger',
                    [
                      { label: 'Interception Reason', value: session.attack?.attackType || 'Adversarial Tampering' },
                      { label: 'Order Suppressed', value: true },
                      { label: 'Money Moved', value: '₹0.00 (Guaranteed)' },
                      { label: 'Audit Commit', value: 'Logged to Ledger' },
                    ],
                    'SECURITY'
                  )
                }
              />
            </div>
            <ArchitectureEdge direction="down" state="blocked" label="INCIDENT LOG" />
          </div>
        ) : (
          /* VERIFIED PASS ROUTE (Default Autonomous Commerce Flow) */
          <div className="flex flex-col items-center w-full max-w-sm my-1">
            <ArchitectureEdge
              direction="down"
              state={archState.activePath === 'pass' ? 'success' : 'active'}
              label="VERIFIED PASS"
            />
            <div className="w-72">
              <ArchitectureNode
                label="Payment Execution"
                sublabel="Razorpay Test Mode"
                metric={session.payment.status === 'AUTHORIZED' || archState.activePath === 'pass' ? 'READY' : 'STANDBY'}
                icon={CreditCard}
                state={archState.payment === 'blocked' ? 'idle' : archState.payment === 'idle' ? 'success' : archState.payment}
                badge="Test Mode"
                onClick={() =>
                  handleInspect(
                    'PAYMENT EXECUTION',
                    'Razorpay API (Test Mode)',
                    session.payment.status === 'AUTHORIZED' ? 'ORDER READY' : 'STANDBY',
                    'success',
                    [
                      { label: 'Gateway Target', value: 'api.razorpay.com' },
                      { label: 'Test Order ID', value: session.payment.orderId || `order_${session.intent.category.toLowerCase()}_test` },
                      { label: 'Amount Debited', value: `${activeAmountStr}.00` },
                      { label: 'Authorization', value: 'PASS Verified' },
                    ],
                    'CHECKOUT'
                  )
                }
              />
            </div>
            <ArchitectureEdge direction="down" state={ledgerEdge} label="AUDIT COMMIT" />
          </div>
        )}

        {/* 6. LEDGER Node */}
        <div className="w-72">
          <ArchitectureNode
            label="Ledger"
            sublabel="SHA-256 Hash Chain"
            metric="VERIFIED"
            icon={Database}
            state={archState.ledger}
            badge="Append-Only"
            onClick={() =>
              handleInspect(
                'CRYPTOGRAPHIC AUDIT LEDGER',
                'Append-Only Merkle Audit Trail',
                'VERIFIED',
                'success',
                [
                  { label: 'Hash Algorithm', value: 'SHA-256' },
                  { label: 'Integrity Check', value: 'GENESIS ─ HEAD VALID' },
                  { label: 'Immutability', value: 'Strictly Enforced' },
                  { label: 'Entries Persisted', value: '25+ Blocks' },
                ],
                'EVIDENCE'
              )
            }
          />
        </div>

        {/* Edge: Ledger -> Replay */}
        <ArchitectureEdge direction="down" state={archState.replay === 'active' ? 'active' : 'inactive'} />

        {/* 7. REPLAY Node */}
        <div className="w-72">
          <ArchitectureNode
            label="Replay"
            sublabel="Forensic Timeline"
            metric={archState.replay === 'active' ? 'ACTIVE' : 'READY'}
            icon={RotateCcw}
            state={archState.replay}
            badge="Deterministic"
            onClick={() =>
              handleInspect(
                'DECISION FORENSIC REPLAY',
                'Step-by-step Causal Reconstruction',
                archState.replay === 'active' ? 'REPLAYING' : 'READY',
                'success',
                [
                  { label: 'Replay Mode', value: 'Deterministic' },
                  { label: 'Causal Chain', value: '01 Intent → 07 Ledger' },
                  { label: 'Forensic Audit', value: 'Tamper Traceable' },
                ],
                'EVIDENCE'
              )
            }
          />
        </div>
      </div>
    </div>
  );
};
