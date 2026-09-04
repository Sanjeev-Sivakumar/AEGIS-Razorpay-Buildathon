import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Database, ShieldCheck, CheckCircle2, XCircle, RefreshCw, Hash, ArrowUpRight, Search } from 'lucide-react';
import type { LedgerEntry, LedgerVerificationResult } from '../types';

interface LedgerViewerProps {
  onSelectForReplay?: (transactionId: string) => void;
}

export const LedgerViewer: React.FC<LedgerViewerProps> = ({ onSelectForReplay }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<LedgerVerificationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLedgerTail(25);
      setEntries(data);
      if (data.length > 0 && !selectedEntry) {
        setSelectedEntry(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load ledger', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyLedgerChain();
      setVerificationResult(res);
    } catch (err: any) {
      console.error('Chain verification error', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      e.transaction_id.toLowerCase().includes(q) ||
      (e.recipient && e.recipient.toLowerCase().includes(q)) ||
      e.outcome.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Bar: Verification Status & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-700">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Append-Only Cryptographic Audit Ledger
              <span className="text-xs font-mono font-normal text-slate-500">
                ({entries.length} blocks persisted)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic SHA-256 hash-chained blocks storing every authorization, intervention, and defense block.
            </p>
          </div>
        </div>

        {/* Verification Action */}
        <div className="flex items-center gap-3">
          {verificationResult && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                verificationResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {verificationResult.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  CHAIN VALID ({verificationResult.entries_checked} blocks)
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  TAMPER DETECTED ({verificationResult.broken_entries.length} broken)
                </>
              )}
            </div>
          )}

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Verifying Cryptography...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Verify Chain Integrity
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by block ID, transaction ID, recipient, or outcome..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-xs placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={loadLedger}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Ledger Table & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Block ID</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Policy / Risk</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Razorpay Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredEntries.map((e) => {
                  const isAuth = e.outcome === 'AUTHORIZED';
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEntry(e)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedEntry?.id === e.id ? 'bg-cyan-50/70' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-cyan-700 font-bold">{e.id}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isAuth
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {e.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={e.policy_result === 'PASS' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {e.policy_result}
                        </span>
                        <span className="text-slate-500 ml-1.5 font-sans">({e.risk_score})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {e.amount ? `₹${e.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {e.razorpay_order_id ? (
                          <span className="text-emerald-700 font-bold">{e.razorpay_order_id}</span>
                        ) : (
                          <span className="text-slate-400 italic">None (Blocked)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onSelectForReplay && (
                          <button
                            onClick={(evt) => {
                              evt.stopPropagation();
                              onSelectForReplay(e.transaction_id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-700 hover:text-cyan-800 font-sans font-semibold cursor-pointer"
                          >
                            Replay <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Block Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Hash className="w-4 h-4 text-cyan-600" />
            Block Cryptographic Proof
          </h3>

          {selectedEntry ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Block Identifier</span>
                <p className="font-mono text-cyan-700 font-bold mt-0.5">{selectedEntry.id}</p>
                <p className="text-slate-600 mt-1 font-medium">Transaction ID: {selectedEntry.transaction_id}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Parent Block Hash</span>
                <p className="font-mono text-slate-700 break-all text-[11px] mt-0.5 font-medium">
                  {selectedEntry.previous_hash}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Current Block Hash</span>
                <p className="font-mono text-emerald-700 break-all text-[11px] mt-0.5 font-bold">
                  {selectedEntry.current_hash}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="text-slate-900 font-semibold">{selectedEntry.recipient || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-900 font-semibold">{selectedEntry.product_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Committed At:</span>
                  <span className="text-slate-700 font-mono font-medium">
                    {new Date(selectedEntry.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {onSelectForReplay && (
                <button
                  onClick={() => onSelectForReplay(selectedEntry.transaction_id)}
                  className="w-full py-2 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Inspect Complete Decision Replay
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Select a block from the ledger to inspect its proof.</p>
          )}
        </div>
      </div>
    </div>
  );
};
