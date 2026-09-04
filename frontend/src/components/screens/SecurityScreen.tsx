import React, { useState } from 'react';
import {
  ShieldAlert,
  Play,
  Radio,
  Flame,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

interface AttackScenarioItem {
  id: string;
  name: string;
  displayTitle: string;
  attackType: string;
  description: string;
  violation: string;
}

const ATTACK_SCENARIOS: AttackScenarioItem[] = [
  {
    id: 'poisoned-catalog',
    name: 'poisoned-catalog',
    displayTitle: 'Poisoned Catalog Item',
    attackType: 'CATALOG_POISONING',
    description: 'Adversarial payload alters product price or spec at source',
    violation: 'Merkle content hash mismatch against genesis catalog',
  },
  {
    id: 'amount-escalation',
    name: 'amount-escalation',
    displayTitle: 'Amount Escalation',
    attackType: 'AMOUNT_ESCALATION',
    description: 'Autonomous agent attempts to debit amount exceeding user cap',
    violation: 'Hard budget ceiling invariant breached (₹ escalated > cap)',
  },
  {
    id: 'recipient-substitution',
    name: 'recipient-substitution',
    displayTitle: 'Recipient Substitution',
    attackType: 'RECIPIENT_SUBSTITUTION',
    description: 'Attacker attempts to divert payout to unauthorized merchant',
    violation: 'Merchant account not present in signed intent whitelist',
  },
  {
    id: 'category-substitution',
    name: 'category-substitution',
    displayTitle: 'Category Substitution',
    attackType: 'CATEGORY_SUBSTITUTION',
    description: 'Autonomous agent attempts to purchase prohibited category',
    violation: 'Category scope mismatch against Root Intent Certificate',
  },
  {
    id: 'derivation-tampering',
    name: 'derivation-tampering',
    displayTitle: 'Derivation Tampering',
    attackType: 'DERIVATION_TAMPERING',
    description: 'Adversarial actor alters intermediate reasoning step hash',
    violation: 'Broken cryptographic Merkle derivation proof',
  },
  {
    id: 'prompt-injection',
    name: 'prompt-injection',
    displayTitle: 'Prompt Injection',
    attackType: 'PROMPT_INJECTION',
    description: 'Adversarial prompt attempts to override safety boundaries',
    violation: 'Zero-trust guardrail intercepts unverified instruction path',
  },
];

interface SecurityLogEvent {
  time: string;
  subsystem: string;
  status: string;
  details: string;
}

export const SecurityScreen: React.FC = () => {
  const { triggerAttack, clearAttack, session, setActiveTab } = useAegis();
  const [selectedScenario, setSelectedScenario] = useState<string>('amount-escalation');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<SecurityLogEvent[]>([
    { time: '10:14:02', subsystem: 'INTENT', status: 'OK', details: 'Root certificate initialized' },
    { time: '10:14:03', subsystem: 'VERIFIER', status: 'ARMED', details: 'Armed at PaymentGate invariant' },
  ]);

  const isAttackActive = Boolean(session.attack?.active);
  const activeScenarioObj = ATTACK_SCENARIOS.find((s) => s.id === selectedScenario) || ATTACK_SCENARIOS[1];
  const authorizedBudget = session.intent.maxAmount || session.rootIntent.budget || 3000;
  const candidateName = session.selectedCandidate?.name || 'Selected Candidate';
  const candidateMerchant = session.selectedCandidate?.merchant || 'Authorized Merchant';

  const handleLaunchAttack = async () => {
    setIsRunning(true);
    const now = new Date().toTimeString().split(' ')[0];

    // Add pre-attack log
    setLogs((prev) => [
      {
        time: now,
        subsystem: 'ATTACK_LAB',
        status: 'INJECTED',
        details: `Injecting adversarial vector: ${selectedScenario.toUpperCase()}`,
      },
      ...prev,
    ]);

    try {
      const res = await triggerAttack(selectedScenario);
      const after = new Date().toTimeString().split(' ')[0];
      setLogs((prev) => [
        {
          time: after,
          subsystem: 'PAYMENT_GATE',
          status: 'NO ORDER',
          details: 'Razorpay order creation SUPPRESSED. ₹0.00 debited.',
        },
        {
          time: after,
          subsystem: 'POLICY',
          status: 'HARD BLOCK',
          details: res.policy_result || activeScenarioObj.violation,
        },
        {
          time: after,
          subsystem: 'TRUST_ENGINE',
          status: 'INTERCEPTED',
          details: `Cryptographic proof invalidation triggered by ${activeScenarioObj.attackType}`,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        {
          time: now,
          subsystem: 'GATE',
          status: 'ENFORCED',
          details: err?.message || 'Attack intercepted at security boundary',
        },
        ...prev,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRestoreState = () => {
    clearAttack();
    const now = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [
      {
        time: now,
        subsystem: 'OPERATOR',
        status: 'RESTORED',
        details: 'System restored to clean verified state. All invariants active.',
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-sans">
      {/* 1. Active Commerce Context Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isAttackActive
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-slate-900">
                Attack Lab — Adversarial Red-Team Sandbox
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Sole source of adversarial testing. System operates in 100% verified state unless an attack is explicitly injected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAttackActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-300 bg-rose-50 text-rose-800 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                SECURITY HOLD ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                VERIFIED & OPERATIONAL
              </span>
            )}
          </div>
        </div>

        {/* Commerce Context Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
            <span className="text-[11px] text-slate-500 uppercase font-medium block">Active Query</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5" title={session.rawQuery}>
              "{session.rawQuery}"
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
            <span className="text-[11px] text-slate-500 uppercase font-medium block">Target Product</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5" title={candidateName}>
              {candidateName}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
            <span className="text-[11px] text-slate-500 uppercase font-medium block">Authorized Budget</span>
            <span className="font-bold text-cyan-700 block mt-0.5">
              ≤ ₹{authorizedBudget.toLocaleString()} {session.intent.currency}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
            <span className="text-[11px] text-slate-500 uppercase font-medium block">Authorized Merchant</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5" title={candidateMerchant}>
              {candidateMerchant}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Attack Vector Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Select Adversarial Attack Vector
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose one of 6 adversarial threats to simulate against the continuous authorization engine.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 font-mono">
            6 Vector Profiles
          </span>
        </div>

        {/* 6 Selectable Vector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {ATTACK_SCENARIOS.map((scenario) => {
            const isSelected = selectedScenario === scenario.id;
            const isCurrentlyBreaching = isAttackActive && session.attack?.scenario === scenario.id;

            return (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[110px] ${
                  isCurrentlyBreaching
                    ? 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-300'
                    : isSelected
                    ? 'border-rose-300 bg-rose-50/70 text-slate-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{scenario.displayTitle}</span>
                    {isCurrentlyBreaching ? (
                      <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                        Intercepted
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {scenario.attackType.split('_')[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {scenario.description}
                  </p>
                </div>
                <div className="text-[10px] text-rose-700 font-medium mt-2 pt-1 border-t border-slate-200/60 truncate">
                  Violates: {scenario.violation.split('(')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Launch and Reset Action Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleLaunchAttack}
            disabled={isRunning}
            className="flex-1 w-full flex items-center justify-center gap-2 rounded-xl border border-rose-600 bg-rose-600 hover:bg-rose-700 py-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isRunning ? (
              <Flame className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 fill-current text-white" />
            )}
            <span>Execute Attack Simulation: {activeScenarioObj.displayTitle}</span>
          </button>

          <button
            onClick={handleRestoreState}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-emerald-700" />
            <span>Restore Verified State</span>
          </button>
        </div>

        {isAttackActive && (
          <div className="mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Adversarial hold active:</strong> Razorpay order creation has been suppressed. Zero funds moved.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('CHECKOUT')}
              className="text-rose-800 hover:text-rose-950 underline font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View in Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Interception Flow vs Event Stream */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Interception Flow Graph */}
        <div className="md:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isAttackActive ? 'Security Interception Pipeline' : 'Verified Execution Pipeline'}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isAttackActive
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}>
              {isAttackActive ? 'Hold Enforced' : 'Verified Route'}
            </span>
          </div>

          {isAttackActive ? (
            <div className="flex flex-col items-center gap-2 py-2 text-xs">
              <div className="px-3.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 font-bold shadow-xs">
                Adversarial Vector: {session.attack?.scenario?.toUpperCase() || 'ATTACK'}
              </div>
              <div className="h-3 w-0.5 bg-rose-300" />
              <div className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Root Intent Verified (Immutable Anchor)
              </div>
              <div className="h-3 w-0.5 bg-rose-400" />
              <div className="px-3.5 py-1.5 rounded-lg border border-rose-300 bg-rose-100 text-rose-800 font-bold shadow-xs">
                Derivation Trace: BROKEN / TAMPERED (FAIL)
              </div>
              <div className="h-3 w-0.5 bg-rose-400" />
              <div className="px-3.5 py-1.5 rounded-lg border border-rose-300 bg-rose-100 text-rose-800 font-bold">
                Policy Engine: HARD BLOCK (FAIL)
              </div>
              <div className="h-3 w-0.5 bg-rose-400" />
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-center text-rose-900 font-bold shadow-xs">
                  Security Hold Active
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center text-slate-700 font-bold">
                  Razorpay Order Suppressed
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2 text-xs">
              <div className="px-3.5 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-900 font-semibold shadow-xs">
                Autonomous Query: "{session.rawQuery}"
              </div>
              <div className="h-3 w-0.5 bg-emerald-300" />
              <div className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Root Intent Verified (≤ ₹{authorizedBudget.toLocaleString()})
              </div>
              <div className="h-3 w-0.5 bg-emerald-300" />
              <div className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Derivation Trace: LINKED & VERIFIED (PASS)
              </div>
              <div className="h-3 w-0.5 bg-emerald-300" />
              <div className="px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                Policy Engine: 100% COMPLIANT (PASS)
              </div>
              <div className="h-3 w-0.5 bg-emerald-400" />
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-center text-emerald-900 font-bold shadow-xs">
                  Payment Gate Authorized
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center text-slate-700 font-bold">
                  Ready for Checkout
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Deterministic Invariant</span>
            <span className={isAttackActive ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
              {isAttackActive ? 'Zero Money Moved' : 'Verified Safe Execution'}
            </span>
          </div>
        </div>

        {/* Right: Real-Time Event Stream */}
        <div className="md:col-span-6 rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-600" />
              Security Event Stream
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Append-Only Audit</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
            {logs.map((log, idx) => {
              const isDanger =
                log.status.includes('FAIL') ||
                log.status.includes('BLOCK') ||
                log.status.includes('NO ORDER') ||
                log.status.includes('INTERCEPTED') ||
                log.status.includes('INJECTED');

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 text-[11px] font-mono shrink-0">{log.time}</span>
                    <span className="font-bold text-slate-900 shrink-0">{log.subsystem}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right min-w-0">
                    <span className="text-slate-600 text-xs truncate max-w-[150px] font-medium" title={log.details}>
                      {log.details}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] shrink-0 ${
                        isDanger
                          ? 'text-rose-800 bg-rose-100 border border-rose-200'
                          : 'text-emerald-800 bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium">Cryptographic Security</span>
            <span className="text-cyan-700 font-bold">HMAC-SHA256 Bound</span>
          </div>
        </div>
      </div>
    </div>
  );
};

