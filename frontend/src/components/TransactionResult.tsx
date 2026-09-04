import React from 'react';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface TransactionResultProps {
  proposal?: {
    id: string;
    amount: number;
    currency: string;
    recipient: string;
  } | null;
  authorization?: {
    id: string;
    decision: 'PASS' | 'REVIEW' | 'BLOCK';
    policy_result: string;
    risk_score: number;
    risk_level: 'SAFE' | 'REVIEW' | 'HIGH' | 'BLOCK';
    razorpay_order_id: string | null;
    reason: string;
  } | null;
  candidate?: {
    name: string;
    merchant_name: string;
    price: number;
    currency: string;
  } | null;
}

export const TransactionResult: React.FC<TransactionResultProps> = ({
  proposal,
  authorization,
  candidate,
}) => {
  if (!proposal && !authorization) {
    return null;
  }

  const isPass = authorization?.decision === 'PASS';

  return (
    <div className={`border rounded-xl p-5 backdrop-blur-sm ${
      isPass
        ? 'bg-slate-900/80 border-emerald-500/30'
        : 'bg-slate-900/80 border-rose-500/30'
    }`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className={`w-5 h-5 ${isPass ? 'text-emerald-400' : 'text-rose-400'}`} />
          <h3 className="font-semibold text-slate-200 text-sm tracking-wider uppercase">
            Autonomous Commerce Execution
          </h3>
        </div>

        <span className={`px-2.5 py-1 text-xs font-bold rounded border ${
          isPass
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        }`}>
          {authorization?.decision || 'PENDING'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Offering Details */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Proposed Purchase</div>
          <div className="font-bold text-slate-100 text-sm truncate">
            {candidate?.name || 'Selected Offering'}
          </div>
          <div className="text-xs text-slate-400">
            Merchant: <span className="text-slate-200">{proposal?.recipient || candidate?.merchant_name || 'N/A'}</span>
          </div>
        </div>

        {/* Financial Amount */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Financial Amount</div>
          <div className="font-bold text-emerald-400 text-base">
            {proposal?.currency || 'INR'} {proposal?.amount ? proposal.amount.toLocaleString() : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {proposal?.id || 'Proposal'}
          </div>
        </div>

        {/* Razorpay Test Order */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Razorpay Test Gate</div>
          {isPass && authorization?.razorpay_order_id ? (
            <div>
              <div className="text-xs font-bold text-emerald-400 font-mono truncate">
                {authorization.razorpay_order_id}
              </div>
              <div className="text-[10px] text-emerald-600">Created via Test API</div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-rose-400">ORDER NOT CREATED</div>
              <div className="text-[10px] text-rose-600">Prevented by Gate Policy</div>
            </div>
          )}
        </div>
      </div>

      {/* Rationale Note */}
      {authorization?.reason && (
        <div className="text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 text-slate-400 flex items-start gap-2">
          {isPass ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{authorization.reason}</span>
        </div>
      )}
    </div>
  );
};
