import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldAlert, ShieldCheck, Play, RefreshCw, CheckCircle2, XCircle, Lock, ArrowRight } from 'lucide-react';

interface AttackScenario {
  name: string;
  display_title: string;
  description: string;
  attack_type: string;
}

interface AttackRecord {
  id: string;
  scenario_name: string;
  status: string;
  root_intent_valid: boolean;
  derivation_valid: boolean;
  verification_result: string;
  policy_result: string;
  risk_score: number;
  payment_created: boolean;
  explanation: string;
  ledger_entry_id?: string | null;
  created_at: string;
}

interface AttackLabProps {
  onSelectForReplay?: (transactionId: string) => void;
}

export const AttackLab: React.FC<AttackLabProps> = ({ onSelectForReplay }) => {
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('amount-escalation');
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [recentAttacks, setRecentAttacks] = useState<AttackRecord[]>([]);
  const [latestResult, setLatestResult] = useState<AttackRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
    loadRecentAttacks();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await api.listAttackScenarios();
      setScenarios(data);
      if (data.length > 0 && !selectedScenario) {
        setSelectedScenario(data[0].name);
      }
    } catch (err: any) {
      console.error('Failed to load attack scenarios', err);
    }
  };

  const loadRecentAttacks = async () => {
    try {
      const data = await api.listAttacks(10);
      setRecentAttacks(data);
    } catch (err: any) {
      console.error('Failed to load recent attacks', err);
    }
  };

  const handleRunAttack = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await api.runAttack(selectedScenario, customInstruction.trim() || undefined);
      setLatestResult(res);
      await loadRecentAttacks();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Simulation error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Absolute Security Boundary */}
      <div className="bg-gradient-to-r from-red-950/40 via-amber-950/20 to-slate-900 border border-red-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Aegis Attack Lab & Defense Sandbox</h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 rounded-full uppercase">
                Zero Money Moved
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Deterministic Trust boundary testing. Even if adversarial instructions manipulate an LLM or Growth model,
              the isolated <span className="text-amber-300 font-mono">PaymentGate</span> invariant guarantees:
              <strong className="text-white ml-1">NO VERIFIED TRANSACTION = NO RAZORPAY ORDER</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Attack Execution & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scenario Configuration */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-md">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Select Attack Scenario
            </h3>

            <div className="space-y-2">
              {scenarios.map((sc) => (
                <button
                  key={sc.name}
                  onClick={() => setSelectedScenario(sc.name)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedScenario === sc.name
                      ? 'bg-red-500/10 border-red-500/50 text-white shadow-inner'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-white">{sc.display_title}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {sc.attack_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sc.description}</p>
                </button>
              ))}
            </div>

            {/* Custom Instruction Input (Optional) */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Custom Adversarial Payload (Optional)
              </label>
              <textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Override simulation payload with custom adversarial string..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500/50 font-mono"
              />
            </div>

            {/* Execute Button */}
            <div className="mt-4">
              <button
                onClick={handleRunAttack}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-all cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Defense Interception...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Simulate & Intercept Attack
                  </>
                )}
              </button>
              {error && (
                <p className="text-xs text-red-400 mt-2 bg-red-950/30 p-2 rounded border border-red-900/50">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interception Result */}
        <div className="lg:col-span-7 space-y-4">
          {latestResult ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                      {latestResult.status}
                    </span>
                    <h4 className="text-base font-bold text-white">{latestResult.scenario_name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Record ID: {latestResult.id}</p>
                </div>

                {onSelectForReplay && (
                  <button
                    onClick={() => onSelectForReplay(latestResult.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Forensic Replay
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Invariant Zero Razorpay Order Callout */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Zero Razorpay Order Invariant
                    </h5>
                    <p className="text-xs text-slate-300">
                      PaymentGate rejected settlement. No Razorpay order was ever requested or created.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ORDER: NONE
                  </span>
                </div>
              </div>

              {/* Metric Indicators Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Policy Result</span>
                  <div className="text-sm font-bold text-red-400 mt-1 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> {latestResult.policy_result}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Risk Score</span>
                  <div className="text-sm font-bold text-amber-400 mt-1">
                    {latestResult.risk_score} / 100
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Root Intent</span>
                  <div className="text-sm font-bold mt-1 text-emerald-400 flex items-center gap-1">
                    {latestResult.root_intent_valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Valid
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" /> Invalid
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Derivation</span>
                  <div className="text-sm font-bold mt-1 flex items-center gap-1 text-red-400">
                    {latestResult.derivation_valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Linked
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" /> Broken
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Forensic Explanation */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Defense Forensic Analysis
                </span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{latestResult.explanation}</p>
                {latestResult.ledger_entry_id && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Cryptographic Block:</span>
                    <span className="text-cyan-400">{latestResult.ledger_entry_id}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <ShieldAlert className="w-10 h-10 text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">Ready to Test Adversarial Interception</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select an attack scenario from the left and click "Simulate & Intercept Attack" to inspect the
                deterministic policy enforcement in action.
              </p>
            </div>
          )}

          {/* Recent Attacks History */}
          {recentAttacks.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Recent Attack Interceptions
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {recentAttacks.map((atk) => (
                  <div
                    key={atk.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span className="font-semibold text-white">{atk.scenario_name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">({atk.id})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold">{atk.policy_result}</span>
                      <span className="text-slate-400">Risk: {atk.risk_score}</span>
                      {onSelectForReplay && (
                        <button
                          onClick={() => onSelectForReplay(atk.id)}
                          className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          Replay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
