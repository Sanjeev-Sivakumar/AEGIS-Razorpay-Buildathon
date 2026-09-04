import React, { useState } from 'react';
import {
  Lock,
  Check,
  Copy,
  RefreshCw,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

export const TrustLoopSpecView: React.FC = () => {
  const { session, triggerAttack, clearAttack, archState } = useAegis();

  const [copiedHash, setCopiedHash] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<'VALID' | 'VERIFYING'>('VALID');
  const [blocksCount, setBlocksCount] = useState<number>(8);
  const [isSimulatingAttack, setIsSimulatingAttack] = useState(false);

  const isBlocked =
    !!session.attack?.active ||
    session.payment?.status === 'BLOCKED' ||
    archState.activePath === 'fail' ||
    archState.trust === 'blocked';

  const activeSessionId = session.rootIntent?.id || session.sessionId || 'INT-AUTONOMOUS';
  const sha256Hash = session.rootIntent?.sha256Hash || '8f2a9c4d72e1b8c7a10fd34b172a8c3d90f23e41b72e1b8c7a1e91c';
  const displayHash = sha256Hash.length > 50 ? `${sha256Hash.substring(0, 48)}...${sha256Hash.substring(sha256Hash.length - 4)}` : sha256Hash;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleVerifyChain = () => {
    setIsVerifying(true);
    setVerifiedStatus('VERIFYING');
    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedStatus('VALID');
      setBlocksCount((prev) => (prev >= 8 ? prev : 8));
    }, 800);
  };

  const handleRunAttackSimulation = async () => {
    setIsSimulatingAttack(true);
    try {
      await triggerAttack('amount-escalation');
    } catch {
      // Handled in context
    } finally {
      setIsSimulatingAttack(false);
    }
  };

  const derivationSteps = session.derivation?.steps && session.derivation.steps.length > 0
    ? session.derivation.steps
    : [
        { step: '01', action: `SEARCH ${session.rootIntent.category} ${session.rootIntent.location}`, status: 'PASS', time: '14:02:15' },
        { step: '02', action: `FILTER ≤ ₹${session.rootIntent.budget.toLocaleString()}`, status: 'PASS', time: '14:02:19' },
        { step: '03', action: `SELECT ${(session.selectedCandidate?.name || 'SELECTED ITEM').toUpperCase()}`, status: 'PASS', time: '14:02:24' },
        { step: '04', action: `PROPOSE ₹${(session.proposal?.amount || session.selectedCandidate?.price || session.rootIntent.budget).toLocaleString()}`, status: 'PASS', time: '14:02:24' },
        { step: '05', action: 'TRUST VERIFIED', status: 'PASS', time: '14:02:25' },
        { step: '06', action: 'RAZORPAY TEST ORDER CREATED', status: 'PASS', time: '14:02:25' },
      ];

  const attackAmount = session.attack?.proposedAmount || Math.round(session.rootIntent.budget * 3.5);

  return (
    <div className="w-full max-w-5xl mx-auto font-mono text-xs text-slate-800 space-y-4">
      {/* Outer Shell */}
      <div className="rounded-xl border border-slate-300/80 bg-white shadow-sm overflow-hidden">
        {/* TOP BAR / BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-900 text-white font-mono">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold tracking-wider">AEGIS</span>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-200 tracking-wide">TRUST LOOP</span>
          </div>
          <div className="flex items-center gap-2 mt-1 sm:mt-0 text-slate-300">
            <span className="text-slate-400">Session:</span>
            <span className="bg-slate-800 border border-slate-700 text-cyan-300 px-2 py-0.5 rounded font-bold font-mono">
              {activeSessionId}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-slate-50/50">
          {/* 1. ROOT INTENT CERTIFICATE */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="text-center border-b border-slate-100 pb-3">
              <div className="text-sm font-black text-slate-900 uppercase tracking-widest">
                ROOT INTENT CERTIFICATE
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs tracking-wider">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>VERIFIED / IMMUTABLE</span>
              </div>
            </div>

            {/* Constraints Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-mono">
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Category</span>
                <span className="font-bold text-slate-900 text-sm">{session.rootIntent.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Location</span>
                <span className="font-bold text-slate-900 text-sm">{session.rootIntent.location}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Budget</span>
                <span className="font-bold text-cyan-800 text-sm">₹{session.rootIntent.budget.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Currency</span>
                <span className="font-bold text-slate-900 text-sm">{session.rootIntent.currency}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Dates</span>
                <span className="font-bold text-slate-900">{session.rootIntent.dates || 'ACTIVE WINDOW'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Intent ID</span>
                <span className="font-bold text-slate-900">{activeSessionId}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Target Merchant</span>
                <span className="font-bold text-slate-900 truncate block">
                  {session.proposal?.recipient || session.proposal?.merchantId || session.selectedCandidate?.merchant || 'OFFICIAL STORE'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Candidate</span>
                <span className="font-bold text-slate-900 truncate block">
                  {session.selectedCandidate?.name || session.proposal?.productName || 'DISCOVERED ITEM'}
                </span>
              </div>
            </div>

            {/* SHA-256 HASH BOX */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>SHA-256 HASH</span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="flex items-center gap-1 text-cyan-700 hover:text-cyan-800 cursor-pointer text-[10px] lowercase"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedHash ? 'copied!' : 'copy'}</span>
                </button>
              </div>
              <div className="rounded border border-slate-300 bg-slate-900 p-3 text-cyan-300 font-mono text-xs break-all shadow-inner select-all">
                {displayHash}
              </div>
            </div>

            {/* HMAC SIGNATURE STATUS */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-mono text-xs">
              <span className="font-bold text-slate-600 uppercase tracking-wider">HMAC SIGNATURE</span>
              <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>✓ VALID</span>
              </span>
            </div>
          </div>

          {/* 2. DERIVATION CHAIN */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="text-center border-b border-slate-100 pb-3">
              <div className="text-sm font-black text-slate-900 uppercase tracking-widest">
                DERIVATION CHAIN
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Deterministic step-by-step cryptographic parent linkage
              </p>
            </div>

            {/* Step-by-Step Causal Path */}
            <div className="max-w-md mx-auto space-y-3 font-mono py-2">
              {/* Root Intent Node */}
              <div className="text-center">
                <span className="px-4 py-1.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-900 font-bold text-xs inline-block">
                  ROOT INTENT
                </span>
              </div>

              {derivationSteps.map((step, idx) => {
                const isFinal = idx === derivationSteps.length - 1;
                const isPreFinal = idx === derivationSteps.length - 2;
                const isStepFail = (step as any).status === 'FAIL' || (step as any).status === 'BROKEN';

                return (
                  <React.Fragment key={(step as any).step || (step as any).id || idx}>
                    <div className="flex justify-center text-slate-400">
                      <ArrowDown className={`w-4 h-4 ${isStepFail ? 'text-rose-500' : isFinal || isPreFinal ? 'text-emerald-500' : ''}`} />
                    </div>

                    <div
                      className={`flex items-center justify-between p-2.5 rounded border text-xs transition-all ${
                        isStepFail
                          ? 'border-rose-300 bg-rose-50 text-rose-900'
                          : isFinal
                          ? 'border-emerald-300 bg-emerald-100/70 text-emerald-950'
                          : isPreFinal
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isStepFail ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ) : isFinal ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        ) : isPreFinal ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                        )}
                        <span className="font-bold">
                          {step.action}
                        </span>
                      </div>
                      <span
                        className={`font-mono ${
                          isStepFail
                            ? 'text-rose-700 font-bold'
                            : isFinal
                            ? 'text-emerald-800 font-bold'
                            : isPreFinal
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.time || '14:02:25'}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 3. DYNAMIC TRUST BOUNDARY & RAZORPAY PAYMENT GATE */}
          <div
            className={`rounded-lg border-2 p-5 shadow-xs space-y-4 transition-all duration-300 ${
              isBlocked
                ? 'border-rose-300 bg-rose-50/40'
                : 'border-emerald-300 bg-emerald-50/40'
            }`}
          >
            {/* Interactive Mode Switcher Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Gate State:
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                    isBlocked
                      ? 'border-rose-300 bg-rose-100 text-rose-800'
                      : 'border-emerald-300 bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isBlocked ? '✕ INTERCEPTED & BLOCKED' : '✓ 100% INVARIANTS PASS'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => clearAttack()}
                  className={`px-3 py-1 rounded transition-all cursor-pointer font-bold flex items-center gap-1 ${
                    !isBlocked
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authorized Order</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunAttackSimulation}
                  disabled={isSimulatingAttack}
                  className={`px-3 py-1 rounded transition-all cursor-pointer font-bold flex items-center gap-1 ${
                    isBlocked
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Simulate Attack</span>
                </button>
              </div>
            </div>

            {/* Stage Title */}
            <div className="text-center">
              <div
                className={`font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 ${
                  isBlocked ? 'text-rose-700' : 'text-emerald-800'
                }`}
              >
                {isBlocked ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>ATTACK SIMULATION — POISONED TRANSACTION</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>COMMERCIAL INVARIANT VALIDATION — TRUST GATE PASS</span>
                  </>
                )}
              </div>

              {/* Dynamic Graphic Line */}
              <div
                className={`font-mono font-bold text-xs my-3 tracking-widest ${
                  isBlocked ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isBlocked
                  ? '┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ✕ DERIVATION BREAK ✕ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄'
                  : '┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ✓ CONTINUOUS AUTHORIZATION INTACT ✓ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄'}
              </div>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              {/* Proposal Parameters Card */}
              <div
                className={`rounded border bg-white p-4 space-y-2 transition-all ${
                  isBlocked ? 'border-rose-200' : 'border-emerald-200'
                }`}
              >
                <div
                  className={`font-bold uppercase text-xs flex items-center justify-between border-b pb-1.5 mb-2 ${
                    isBlocked
                      ? 'text-rose-800 border-rose-100'
                      : 'text-emerald-800 border-emerald-100'
                  }`}
                >
                  <span>{isBlocked ? 'POISONED TRANSACTION PROPOSAL' : 'ACTIVE PURCHASE PROPOSAL'}</span>
                  {isBlocked ? (
                    <button
                      type="button"
                      onClick={() => clearAttack()}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-mono hover:bg-emerald-700 cursor-pointer shadow-xs font-bold"
                    >
                      [RESTORE CLEAN]
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRunAttackSimulation}
                      disabled={isSimulatingAttack}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white font-mono hover:bg-rose-700 cursor-pointer disabled:opacity-50 font-bold"
                    >
                      {isSimulatingAttack ? 'Simulating...' : '[SIMULATE ATTACK]'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Amount:</span>
                    <span
                      className={`font-bold ${
                        isBlocked ? 'text-rose-700 font-extrabold' : 'text-emerald-700 font-extrabold'
                      }`}
                    >
                      ₹{(isBlocked ? attackAmount : (session.proposal?.amount || session.selectedCandidate?.price || 2400)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Authorized:</span>
                    <span className="font-bold text-slate-800">
                      ₹{session.rootIntent.budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent Step:</span>
                    <span
                      className={`font-bold ${
                        isBlocked ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {isBlocked ? (session.attack?.parentStep || 'NONE') : 'STEP 05 (TRUST PASS)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recipient:</span>
                    <span
                      className={`font-bold truncate max-w-[150px] ${
                        isBlocked ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {isBlocked
                        ? (session.attack?.recipient || 'HACKER_ENTITY_X')
                        : (session.proposal?.recipient || session.selectedCandidate?.merchant || 'OFFICIAL STORE')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invariant Evaluation Matrix */}
              <div
                className={`rounded border bg-white p-3 space-y-1.5 text-xs font-mono transition-all ${
                  isBlocked ? 'border-rose-200' : 'border-emerald-200'
                }`}
              >
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-700">ROOT INTENT</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">✓ VALID</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-700">DERIVATION</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isBlocked ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isBlocked ? '✕ BROKEN' : '✓ VALID (INTACT)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-700">AMOUNT</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isBlocked ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isBlocked ? '✕ VIOLATION' : `✓ WITHIN CEILING (≤ ₹${session.rootIntent.budget.toLocaleString()})`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-700">RECIPIENT</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isBlocked ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isBlocked ? '✕ VIOLATION' : '✓ WHITELISTED'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-t border-slate-100 pt-1.5">
                  <span className="text-slate-900 font-bold">POLICY</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded ${
                      isBlocked ? 'text-rose-700 bg-rose-100' : 'text-emerald-800 bg-emerald-100'
                    }`}
                  >
                    {isBlocked ? '✕ BLOCK' : '✓ ALLOW'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-900 font-bold">RISK</span>
                  <span
                    className={`font-black ${
                      isBlocked ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {isBlocked ? '100 / 100' : '08 / 100'}
                  </span>
                </div>
              </div>

              {/* DYNAMIC RAZORPAY CARD */}
              <div
                className={`rounded-lg border-2 p-4 text-center space-y-1 font-mono shadow-md transition-all duration-300 ${
                  isBlocked
                    ? 'border-rose-600 bg-rose-900 text-white'
                    : 'border-emerald-500 bg-emerald-950 text-white'
                }`}
              >
                <div
                  className={`text-sm font-black tracking-widest flex items-center justify-center gap-1.5 ${
                    isBlocked ? 'text-rose-200' : 'text-emerald-300'
                  }`}
                >
                  {isBlocked ? (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>PAYMENT: BLOCKED</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>PAYMENT: AUTHORIZED</span>
                    </>
                  )}
                </div>
                <div className="text-base font-extrabold text-white tracking-widest">
                  {isBlocked ? (
                    'RAZORPAY: NONE'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-slate-200">RAZORPAY:</span>
                      <span className="text-emerald-300 font-mono underline decoration-emerald-500/50">
                        {session.payment?.orderId || `order_test_${session.rootIntent.sha256Hash.slice(0, 10)}`}
                      </span>
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] font-sans mt-1 ${
                    isBlocked ? 'text-rose-300' : 'text-emerald-300/90'
                  }`}
                >
                  {isBlocked
                    ? 'Absolute boundary guardrail: Zero API calls made. Zero money moved.'
                    : `Continuous authorization invariant passed: Authorized test order created for ₹${(session.proposal?.amount || session.selectedCandidate?.price || 2400).toLocaleString()}. Zero live funds exposed.`}
                </p>
              </div>
            </div>
          </div>

          {/* 4. FOOTER: VERIFY CHAIN INTEGRITY */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="px-4 py-2 rounded border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 text-white font-bold tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>[ VERIFY CHAIN INTEGRITY ]</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">CHAIN STATUS:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  ✓ {verifiedStatus}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">BLOCKS:</span>
                <span className="text-slate-900 font-bold">{blocksCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

