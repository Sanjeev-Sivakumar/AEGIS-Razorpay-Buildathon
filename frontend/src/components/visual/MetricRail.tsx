import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { SystemKpiData, SystemComponentStatuses } from '../../types';

interface MetricRailProps {
  selectionProb?: number;
  rank?: number | null;
  latencyMs?: number;
  riskScore?: number;
  className?: string;
}

export const MetricRail: React.FC<MetricRailProps> = ({
  selectionProb,
  rank,
  latencyMs,
  riskScore,
  className = '',
}) => {
  const { data: kpis } = useQuery<SystemKpiData>({
    queryKey: ['demoKpis'],
    queryFn: () => api.getDemoKpis(),
    refetchInterval: 4000,
  });

  const { data: status } = useQuery<SystemComponentStatuses>({
    queryKey: ['demoStatus'],
    queryFn: () => api.getDemoStatus(),
    refetchInterval: 5000,
  });

  const displaySelect = selectionProb !== undefined
    ? `${(selectionProb * (selectionProb <= 1 ? 100 : 1)).toFixed(0)}%`
    : kpis ? `${kpis.selection_probability}%` : '98%';

  const displayRank = rank ? `#${rank}` : '#1';
  const displayVerified = kpis?.verified_transactions ?? 12;
  const displayBlocked = kpis?.blocked_transactions ?? 3;
  const totalSessions = displayVerified + displayBlocked;
  const verifiedPct = totalSessions > 0 ? (displayVerified / totalSessions) * 100 : 80;
  const blockedPct = totalSessions > 0 ? (displayBlocked / totalSessions) * 100 : 20;

  const chainStatus = status?.audit_ledger === 'VERIFIED' ? 'VALID' : '100%';
  const displayLatency = latencyMs ? `${latencyMs.toFixed(0)}ms` : '38ms';
  const displayRisk = riskScore !== undefined ? String(riskScore).padStart(2, '0') : '08';
  const displayEvents = kpis ? String(kpis.total_records_audited) : '18';

  const metrics = [
    { label: 'Selection', value: displaySelect, accent: 'text-cyan-700', sub: null },
    { label: 'Rank', value: displayRank, accent: 'text-amber-700', sub: null },
    {
      label: 'Verified',
      value: displayVerified,
      accent: 'text-emerald-700',
      ratio: { verifiedPct, blockedPct, subLabel: `${verifiedPct.toFixed(0)}% pass` },
    },
    {
      label: 'Blocked',
      value: displayBlocked,
      accent: 'text-rose-700',
      ratio: { verifiedPct, blockedPct, subLabel: `${blockedPct.toFixed(0)}% hold` },
    },
    { label: 'Chain Status', value: chainStatus, accent: 'text-emerald-700', sub: null },
    { label: 'Latency', value: displayLatency, accent: 'text-slate-900', sub: null },
    { label: 'Risk', value: displayRisk, accent: Number(displayRisk) > 50 ? 'text-rose-700' : 'text-slate-900', sub: null },
    { label: 'Events', value: displayEvents, accent: 'text-slate-900', sub: null },
  ];

  return (
    <div
      className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm font-sans ${className}`}
    >
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 divide-x divide-slate-100 min-w-[640px]">
        {metrics.map((m, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center px-2 py-0.5 first:pl-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {m.label}
            </span>
            <span className={`text-sm font-bold tracking-tight mt-0.5 ${m.accent}`}>
              {m.value}
            </span>

            {/* METRIC PROVENANCE: Proportional pass/hold split bar for Verified & Blocked */}
            {m.ratio && (
              <div className="flex flex-col items-center mt-1">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${m.ratio.verifiedPct}%` }}
                    title={`Verified: ${m.ratio.verifiedPct.toFixed(0)}%`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${m.ratio.blockedPct}%` }}
                    title={`Blocked: ${m.ratio.blockedPct.toFixed(0)}%`}
                  />
                </div>
                <span className="text-[9px] font-semibold text-slate-600 mt-0.5">
                  {m.ratio.subLabel}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
