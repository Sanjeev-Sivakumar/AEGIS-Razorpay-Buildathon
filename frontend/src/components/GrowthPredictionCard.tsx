import React from 'react';
import { TrendingUp, Cpu } from 'lucide-react';
import type { GrowthPredictionResult } from '../types';

interface GrowthPredictionCardProps {
  prediction?: GrowthPredictionResult | null;
  isLoading?: boolean;
}

export const GrowthPredictionCard: React.FC<GrowthPredictionCardProps> = ({
  prediction,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-5 border-slate-800 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-slate-800/60 rounded mb-4"></div>
        <div className="h-20 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-panel rounded-2xl p-5 border-slate-800 flex flex-col items-center justify-center py-10 text-center">
        <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
        <div className="text-sm font-semibold text-slate-300">Growth Intelligence Armed</div>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select a product or run an agent intent to compute the AI-Buyer selection probability.
        </p>
      </div>
    );
  }

  const prob = prediction.selection_probability;
  const probPct = (prob * 100).toFixed(1);
  const probColor =
    prob >= 0.35 ? 'text-emerald-400' : prob >= 0.2 ? 'text-amber-400' : 'text-rose-400';
  const probBadge =
    prob >= 0.35
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
      : prob >= 0.2
      ? 'bg-amber-950/60 text-amber-300 border-amber-800'
      : 'bg-rose-950/60 text-rose-300 border-rose-800';

  const ctx = prediction.context_features || {
    semantic_match: 0.8,
    price_fit: 0.9,
    attribute_quality: 0.75,
    delivery_fit: 0.85,
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border-cyan-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-white tracking-wider">
            AI-BUYER SELECTION INTELLIGENCE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            {prediction.device.toUpperCase()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            {prediction.model_version}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-950 border border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono text-slate-400">PREDICTED SELECTION PROBABILITY</div>
          <div className={`text-3xl font-black font-mono tracking-tight mt-1 ${probColor}`}>
            {probPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Product: <span className="text-slate-300 font-medium">{prediction.product_name || prediction.product_id}</span>
          </div>
        </div>

        <div className="text-right">
          {prediction.rank && (
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono border bg-cyan-950 text-cyan-300 border-cyan-700">
              RANK #{prediction.rank}
            </div>
          )}
          <div className={`mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${probBadge}`}>
            {prob >= 0.35 ? 'High Probability' : prob >= 0.2 ? 'Moderate' : 'Low Affinity'}
          </div>
        </div>
      </div>

      {/* Context Indicators */}
      <div className="space-y-2 pt-1">
        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>CONTEXT & FEATURE SIGNALS</span>
          <span className="text-slate-500 font-mono text-[9px]">Latency: {prediction.latency_ms}ms</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Semantic Match</span>
              <span className="font-mono text-cyan-400">{(ctx.semantic_match * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${ctx.semantic_match * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Price Fit</span>
              <span className="font-mono text-emerald-400">{(ctx.price_fit * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${ctx.price_fit * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Attribute Completeness</span>
              <span className="font-mono text-indigo-400">{(ctx.attribute_quality * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${ctx.attribute_quality * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Delivery Fit</span>
              <span className="font-mono text-purple-400">{(ctx.delivery_fit * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${ctx.delivery_fit * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-slate-500 italic text-center pt-1">
        * Predicted AI-Buyer Selection Probability (Model Simulation, Not Guaranteed Purchase).
      </div>
    </div>
  );
};
