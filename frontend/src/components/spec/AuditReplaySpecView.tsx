import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

interface AuditTxItem {
  id: string;
  amount: number;
  status: 'VERIFIED' | 'BLOCKED';
  risk: number;
  policy: 'PASS' | 'BLOCK';
  payment: 'CREATED' | 'NONE';
  ledger: '✓';
  steps: Array<{ num: string; name: string; status: '✓' | '✕' }>;
}

export const AuditReplaySpecView: React.FC = () => {
  const { session, triggerReplay } = useAegis();
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [highlightStep, setHighlightStep] = useState<number>(-1);

  // Dynamically derive audit transactions from active session ledger and candidates
  const candidateTxs: AuditTxItem[] = (session.candidates || []).slice(1, 3).map((cand, idx) => ({
    id: `TX-ALT-0${idx + 1}`,
    amount: cand.price,
    status: cand.price <= session.rootIntent.budget ? 'VERIFIED' : 'BLOCKED',
    risk: cand.price <= session.rootIntent.budget ? 12 : 88,
    policy: cand.price <= session.rootIntent.budget ? 'PASS' : 'BLOCK',
    payment: cand.price <= session.rootIntent.budget ? 'CREATED' : 'NONE',
    ledger: '✓',
    steps: [
      { num: '01', name: 'ROOT INTENT', status: '✓' },
      { num: '02', name: 'GROWTH', status: '✓' },
      { num: '03', name: 'PROPOSAL', status: '✓' },
      { num: '04', name: 'DERIVATION', status: cand.price <= session.rootIntent.budget ? '✓' : '✕' },
      { num: '05', name: 'TRUST', status: cand.price <= session.rootIntent.budget ? '✓' : '✕' },
      { num: '06', name: 'PAYMENT', status: cand.price <= session.rootIntent.budget ? '✓' : '✕' },
      { num: '07', name: 'LEDGER', status: '✓' },
    ],
  }));

  const ledgerTxs: AuditTxItem[] = (session.ledger?.entries || []).map((e) => ({
    id: e.id,
    amount: e.amount,
    status: (e.status || (e.outcome === 'AUTHORIZED' ? 'VERIFIED' : 'BLOCKED')) as 'VERIFIED' | 'BLOCKED',
    risk: e.risk,
    policy: e.policy,
    payment: e.payment,
    ledger: '✓',
    steps: e.steps,
  }));

  // Ensure both verified active and attack simulated are represented
  const hasBlocked = ledgerTxs.some((t) => t.status === 'BLOCKED');
  const previewAttackTx: AuditTxItem = {
    id: `TX-ATTACK-${(session.intent.intentId || session.intent.id).replace('INT-', '')}`,
    amount: session.attack?.proposedAmount || Math.round(session.rootIntent.budget * 3.5),
    status: 'BLOCKED',
    risk: 100,
    policy: 'BLOCK',
    payment: 'NONE',
    ledger: '✓',
    steps: [
      { num: '01', name: 'ROOT INTENT', status: '✓' },
      { num: '02', name: 'GROWTH', status: '✓' },
      { num: '03', name: 'PROPOSAL', status: '✓' },
      { num: '04', name: 'DERIVATION', status: '✕' },
      { num: '05', name: 'TRUST', status: '✕' },
      { num: '06', name: 'PAYMENT', status: '✕' },
      { num: '07', name: 'LEDGER', status: '✓' },
    ],
  };

  const allTxs = [
    ...ledgerTxs,
    ...(hasBlocked ? [] : [previewAttackTx]),
    ...candidateTxs,
  ];

  // Fallback if empty
  const transactions: AuditTxItem[] = allTxs.length > 0 ? allTxs : [previewAttackTx];

  const currentTxId = selectedTxId || transactions[0]?.id || 'TX-CLEAN-01';
  const activeTx = transactions.find((t) => t.id === currentTxId) || transactions[0];

  const handleReplayFromRoot = async () => {
    setIsReplaying(true);
    setHighlightStep(0);

    for (let i = 0; i < 7; i++) {
      await new Promise((r) => setTimeout(r, 220));
      setHighlightStep(i);
    }

    try {
      await triggerReplay(currentTxId);
    } catch {
      // Handled in context
    } finally {
      setTimeout(() => {
        setIsReplaying(false);
        setHighlightStep(-1);
      }, 500);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto font-mono text-xs text-slate-800 space-y-4">
      {/* Outer Shell */}
      <div className="rounded-xl border border-slate-300/80 bg-white shadow-sm overflow-hidden">
        {/* TOP BAR / BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-900 text-white font-mono">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold tracking-wider">AEGIS</span>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-200 tracking-wide">AUDIT & REPLAY</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <span>Merkle Chain Depth:</span>
            <span className="text-cyan-300 font-bold">8 Blocks</span>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-slate-50/50">
          {/* 1. LEDGER INTEGRITY SECTION */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-5">
            <div className="text-center border-b border-slate-100 pb-2">
              <div className="text-sm font-black text-slate-900 uppercase tracking-widest">
                LEDGER INTEGRITY
              </div>
            </div>

            {/* Visual Block Chain SVG & ASCII */}
            <div className="py-2 flex flex-col items-center justify-center">
              {/* ASCII / Graphic representation: GENESIS ────●────●────●────●────●────●────●──── HEAD */}
              <div className="w-full max-w-2xl px-4 overflow-x-auto">
                <div className="flex items-center justify-between min-w-[520px]">
                  <span className="px-3 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] uppercase">
                    GENESIS
                  </span>

                  {/* 7 Interconnected Block Nodes */}
                  {[1, 2, 3, 4, 5, 6, 7].map((blockNum) => (
                    <React.Fragment key={blockNum}>
                      <div className="flex-1 h-0.5 bg-slate-300 min-w-[20px]" />
                      <div className="flex flex-col items-center relative group cursor-pointer">
                        {/* Node circle */}
                        <div className="w-4 h-4 rounded-full bg-slate-800 border-2 border-cyan-400 flex items-center justify-center shadow-xs group-hover:scale-125 transition-transform">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                        </div>
                        {/* Vertical line connector */}
                        <div className="w-px h-3 bg-slate-300 my-0.5" />
                        {/* Checkmark indicator */}
                        <span className="text-emerald-600 font-bold text-xs">✓</span>
                        {/* Tooltip on hover */}
                        <span className="absolute -top-7 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          Block #{blockNum}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}

                  <div className="flex-1 h-0.5 bg-slate-300 min-w-[20px]" />

                  <span className="px-3 py-1 rounded bg-cyan-50 border border-cyan-300 text-cyan-800 font-bold text-[11px] uppercase">
                    HEAD
                  </span>
                </div>
              </div>

              {/* Status Counters */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">HASH CHAIN STATUS:</span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ VALID
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">BLOCKS VERIFIED:</span>
                  <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    8
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SPLIT SECTION: AUDIT STREAM vs DECISION REPLAY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: AUDIT STREAM */}
            <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                  <span>Audit Stream</span>
                  <span className="text-slate-400">Append-Only Transactions</span>
                </div>

                {/* Transaction list */}
                <div className="space-y-2 font-mono">
                  {transactions.map((tx) => {
                    const isSelected = currentTxId === tx.id;
                    const isVerified = tx.status === 'VERIFIED';

                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setSelectedTxId(tx.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-50/60 shadow-xs'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-bold ${
                              isVerified ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isVerified ? '✓' : '✕'}
                          </span>
                          <span className="font-bold text-slate-900">{tx.id}</span>
                          <span className="text-slate-600">₹{tx.amount.toLocaleString()}</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dividing Rule and Matrix Summary Table */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="grid grid-cols-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1">
                  <div>Risk</div>
                  <div>Policy</div>
                  <div>Payment</div>
                  <div>Ledger</div>
                </div>

                {/* Primary Row (Selected Tx) */}
                <div className={`grid grid-cols-4 text-center py-1.5 rounded border font-mono text-xs ${
                  activeTx.status === 'VERIFIED'
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-rose-50/60 border-rose-200'
                }`}>
                  <div className={activeTx.status === 'VERIFIED' ? 'text-slate-700 font-semibold' : 'text-rose-700 font-bold'}>
                    {activeTx.risk < 10 ? `0${activeTx.risk}` : activeTx.risk}
                  </div>
                  <div className={activeTx.status === 'VERIFIED' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    {activeTx.policy}
                  </div>
                  <div className={activeTx.status === 'VERIFIED' ? 'text-slate-800 font-semibold' : 'text-slate-600 font-medium'}>
                    {activeTx.payment}
                  </div>
                  <div className="text-emerald-600 font-bold">{activeTx.ledger}</div>
                </div>

                {/* Secondary Comparison Row */}
                {transactions.filter(t => t.id !== activeTx.id).slice(0, 1).map((compTx) => (
                  <div key={compTx.id} className={`grid grid-cols-4 text-center py-1.5 rounded border font-mono text-xs opacity-75 ${
                    compTx.status === 'VERIFIED'
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-rose-50/60 border-rose-200'
                  }`}>
                    <div className={compTx.status === 'VERIFIED' ? 'text-slate-700 font-semibold' : 'text-rose-700 font-bold'}>
                      {compTx.risk < 10 ? `0${compTx.risk}` : compTx.risk}
                    </div>
                    <div className={compTx.status === 'VERIFIED' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {compTx.policy}
                    </div>
                    <div className={compTx.status === 'VERIFIED' ? 'text-slate-800 font-semibold' : 'text-slate-600 font-medium'}>
                      {compTx.payment}
                    </div>
                    <div className="text-emerald-600 font-bold">{compTx.ledger}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: DECISION REPLAY */}
            <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                  <span>Decision Replay</span>
                  <span className="text-cyan-800 font-mono font-bold">Target: {currentTxId}</span>
                </div>

                {/* 7-Step Trajectory Flow */}
                <div className="space-y-1.5 font-mono py-1 max-w-sm mx-auto">
                  {activeTx.steps.map((step, idx) => {
                    const isPassed = step.status === '✓';
                    const isHighlighted = highlightStep === idx;

                    return (
                      <React.Fragment key={step.num}>
                        <div
                          className={`flex items-center justify-between px-3 py-1.5 rounded border transition-all ${
                            isHighlighted
                              ? 'border-cyan-500 bg-cyan-100 scale-105 shadow-xs'
                              : isPassed
                              ? 'border-slate-200 bg-slate-50'
                              : 'border-rose-200 bg-rose-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-[11px]">{step.num}</span>
                            <span className="font-bold text-slate-800">{step.name}</span>
                          </div>

                          <span
                            className={`font-bold ${
                              isPassed ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>

                        {/* Connecting Line between steps */}
                        {idx < activeTx.steps.length - 1 && (
                          <div className="flex justify-start pl-6 text-slate-300 font-mono text-[10px] leading-none py-0.5">
                            │
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* ACTION: REPLAY FROM ROOT */}
              <button
                type="button"
                onClick={handleReplayFromRoot}
                disabled={isReplaying}
                className="w-full py-2.5 rounded border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isReplaying ? 'animate-pulse' : ''}`} />
                <span>{isReplaying ? 'Replaying Trajectory...' : '[ REPLAY FROM ROOT ]'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
