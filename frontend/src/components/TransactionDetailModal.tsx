import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import type { LedgerEntry } from '../types';

interface TransactionDetailModalProps {
  entry: LedgerEntry | null;
  onClose: () => void;
  onReplay: (transactionId: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ entry, onClose, onReplay }) => {
  if (!entry) return null;

  const isAuth = entry.outcome === 'AUTHORIZED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                isAuth ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {entry.outcome}
            </span>
            <h3 className="text-base font-bold text-white font-mono">{entry.transaction_id}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Attributes */}
        <div className="space-y-2.5 text-xs font-mono">
          <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Amount:</span>
            <span className="text-white font-bold">{entry.amount ? `₹${entry.amount.toLocaleString('en-IN')}` : 'N/A'} {entry.currency}</span>
          </div>

          <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Recipient / Merchant:</span>
            <span className="text-slate-200">{entry.recipient || entry.merchant_id || 'N/A'}</span>
          </div>

          <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Policy Evaluation:</span>
            <span className={entry.policy_result === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {entry.policy_result}
            </span>
          </div>

          <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Risk Score:</span>
            <span className="text-amber-400 font-bold">{entry.risk_score} / 100</span>
          </div>

          <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Razorpay Test Order:</span>
            <span className="text-slate-200 font-bold">
              {entry.razorpay_order_id ? (
                <span className="text-emerald-400">{entry.razorpay_order_id}</span>
              ) : (
                <span className="text-slate-500 italic">None (Order Blocked)</span>
              )}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Current Block Hash</span>
            <p className="text-[11px] text-cyan-400 break-all">{entry.current_hash}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex gap-3">
          <button
            onClick={() => {
              onClose();
              onReplay(entry.transaction_id);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Replay Decision Trajectory
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
