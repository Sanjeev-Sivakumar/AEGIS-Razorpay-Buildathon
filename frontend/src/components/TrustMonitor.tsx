import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface TrustMonitorProps {
  authorization?: {
    id: string;
    decision: 'PASS' | 'REVIEW' | 'BLOCK';
    policy_result: string;
    risk_score: number;
    risk_level: 'SAFE' | 'REVIEW' | 'HIGH' | 'BLOCK';
    razorpay_order_id: string | null;
    reason: string;
  } | null;
  isBlocked?: boolean;
}

export const TrustMonitor: React.FC<TrustMonitorProps> = ({ authorization, isBlocked = false }) => {
  if (!authorization) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-slate-200 text-sm tracking-wider uppercase">Trust Engine Monitor</h3>
        </div>
        <p className="text-xs text-slate-500">Awaiting transaction proposal from agent core to evaluate cryptographic trust and policies.</p>
      </div>
    );
  }

  const isPass = authorization.decision === 'PASS';
  const riskScore = authorization.risk_score;
  const riskLevel = authorization.risk_level;

  const complianceItems = [
    { label: 'Intent Integrity', pass: true },
    { label: 'Derivation Integrity', pass: !isBlocked && isPass },
    { label: 'Amount Compliance', pass: !isBlocked && isPass },
    { label: 'Category Compliance', pass: !isBlocked && isPass },
    { label: 'Recipient Integrity', pass: !isBlocked && isPass },
    { label: 'Policy Compliance', pass: authorization.policy_result === 'PASS' },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'SAFE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'REVIEW':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'BLOCK':
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  const getRiskBarColor = (score: number) => {
    if (score <= 24) return 'bg-emerald-500';
    if (score <= 49) return 'bg-amber-500';
    if (score <= 74) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  return (
    <div className={`border rounded-xl p-5 backdrop-blur-sm transition-all duration-300 ${
      isPass
        ? 'bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
        : 'bg-slate-900/80 border-rose-500/30 shadow-lg shadow-rose-950/20'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isPass ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
          )}
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wider uppercase">
              Aegis Trust Monitor
            </h3>
            <p className="text-[11px] text-slate-400">Autonomous Financial Authorization Boundary</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-md border tracking-wider ${
            isPass ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}>
            {authorization.decision}
          </span>
        </div>
      </div>

      {/* Grid: Compliance Checks + Risk Fusion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Compliance Checklist */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Policy & Cryptographic Integrity
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {complianceItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                {item.pass ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Score Fusion Meter */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Risk Fusion Score
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskColor(riskLevel)}`}>
              {riskLevel}
            </span>
          </div>

          <div className="my-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 text-[11px]">Aggregated Anomaly</span>
              <span className="font-bold text-slate-200">{riskScore} / 100</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getRiskBarColor(riskScore)}`}
                style={{ width: `${Math.max(4, riskScore)}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>0 SAFE</span>
            <span>25 REVIEW</span>
            <span>50 HIGH</span>
            <span>75+ BLOCK</span>
          </div>
        </div>
      </div>

      {/* Razorpay Invariant Output */}
      <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
        isPass
          ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
      }`}>
        <div className="flex items-center gap-2">
          {isPass ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="font-semibold">
              {isPass ? 'Razorpay Test Order Generated' : 'Razorpay Order Prevented by Invariant'}
            </div>
            <div className="text-[11px] opacity-80">
              {isPass
                ? `Order ID: ${authorization.razorpay_order_id || 'order_active_test'}`
                : 'No verified transaction = No payment execution'}
            </div>
          </div>
        </div>

        {isPass && authorization.razorpay_order_id && (
          <span className="font-mono text-[11px] bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700/60">
            {authorization.razorpay_order_id}
          </span>
        )}
      </div>
    </div>
  );
};
