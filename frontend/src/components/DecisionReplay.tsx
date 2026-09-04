import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { DecisionReplay as DecisionReplayType } from '../types';
import { Play } from 'lucide-react';

interface DecisionReplayProps {
  transactionId?: string;
  onClear?: () => void;
}

export const DecisionReplay: React.FC<DecisionReplayProps> = ({ transactionId: initialId, onClear }) => {
  const [targetId, setTargetId] = useState<string>(initialId || '');
  const [replay, setReplay] = useState<DecisionReplayType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialId) {
      setTargetId(initialId);
      loadReplay(initialId);
    }
  }, [initialId]);

  const loadReplay = async (idToFetch: string) => {
    if (!idToFetch.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDecisionReplay(idToFetch.trim());
      setReplay(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Error loading decision replay');
      setReplay(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadReplay(targetId);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Forensic Decision Replay
              <span className="text-xs font-mono font-normal text-slate-500">
                (Deterministic Audit Trail)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconstruct the step-by-step causal chain from user intent to growth selection, trust verification, and ledger block.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter Transaction, Proposal, or Attack ID..."
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 w-64 shadow-xs placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs py-2 px-3.5 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Replay
            </button>
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  setTargetId('');
                  setReplay(null);
                  onClear();
                }}
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {error && (
          <p className="text-xs text-rose-700 mt-3 bg-rose-50 p-2.5 rounded border border-rose-200">
            {error}
          </p>
        )}
      </div>

      {/* Trajectory Display */}
      {replay && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Target Identifier</span>
              <h3 className="text-base font-bold text-slate-900 font-mono">{replay.transaction_id}</h3>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Final Decision</span>
                <p className={`text-sm font-bold ${replay.final_decision === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {replay.final_decision}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Razorpay Payment</span>
                <p className="text-sm font-bold text-slate-800 font-mono">
                  {replay.payment_created ? (
                    <span className="text-emerald-700">CREATED ({replay.razorpay_order_id})</span>
                  ) : (
                    <span className="text-amber-700">ZERO (ORDER NOT CREATED)</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Chronological Vertical Timeline */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {replay.steps.map((step, idx) => {
              const isPass = step.status === 'VALID' || step.status === 'PASS' || step.status === 'CREATED' || step.status === 'RECORDED' || step.status === 'COMPUTED' || step.status === 'PROPOSED';
              const isBlock = step.status === 'BLOCK' || step.status === 'BROKEN' || step.status === 'BLOCKED' || step.status === 'INVALID';

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      isPass
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : isBlock
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'bg-amber-50 border-amber-500 text-amber-800'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Step Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {step.stage}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isBlock
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>

                    {/* Step Details Key-Value List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                      {Object.entries(step.details).map(([k, v]) => (
                        <div key={k} className="flex items-baseline gap-2">
                          <span className="text-slate-500 font-mono text-[11px] min-w-[110px]">{k}:</span>
                          <span className="text-slate-800 font-mono text-[11px] truncate">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
