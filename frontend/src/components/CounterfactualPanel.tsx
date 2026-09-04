import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Sliders } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { CounterfactualSimulationResult, OptimizationApplyResult } from '../types';

interface CounterfactualPanelProps {
  simulation?: CounterfactualSimulationResult | null;
  productId?: string;
  query?: string;
  isLoading?: boolean;
}

export const CounterfactualPanel: React.FC<CounterfactualPanelProps> = ({
  simulation,
  productId,
  query,
  isLoading = false,
}) => {
  const queryClient = useQueryClient();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [appliedResult, setAppliedResult] = useState<OptimizationApplyResult | null>(null);

  const optimizeMutation = useMutation({
    mutationFn: () => {
      if (!productId || !query) throw new Error("Missing parameters");
      return api.applyOptimization(query, productId, selectedScenario || undefined);
    },
    onSuccess: (data) => {
      setAppliedResult(data);
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['growthPrediction'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-5 border-slate-800 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="glass-panel rounded-2xl p-5 border-slate-800 flex flex-col items-center justify-center py-10 text-center">
        <Sliders className="w-8 h-8 text-slate-600 mb-2" />
        <div className="text-sm font-semibold text-slate-300">Counterfactual Lab Ready</div>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Run a counterfactual simulation to evaluate candidate catalog optimizations and predicted selection uplift.
        </p>
      </div>
    );
  }

  const baseProb = (simulation.baseline_probability * 100).toFixed(1);

  return (
    <div className="glass-panel rounded-2xl p-5 border-purple-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono font-bold text-white tracking-wider">
            COUNTERFACTUAL OPTIMIZATION LAB
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300">
          In-Memory Simulation
        </span>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono text-slate-400 block">BASELINE PROBABILITY</span>
          <span className="text-xl font-bold font-mono text-yellow-400">{baseProb}%</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-400 block">RECOMMENDED ACTION</span>
          <span className="text-xs font-bold text-emerald-300">{simulation.recommended_action}</span>
        </div>
      </div>

      {appliedResult && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-300">Optimization Applied!</div>
              <div className="text-[10px] text-slate-300">
                {appliedResult.action_type} on {appliedResult.target_field}
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-slate-400">{(appliedResult.baseline_probability * 100).toFixed(1)}%</span>
            <span className="mx-1 text-slate-500">→</span>
            <span className="text-emerald-400 font-bold">{(appliedResult.optimized_probability * 100).toFixed(1)}%</span>
            <span className="text-[10px] text-emerald-300 ml-1">
              ({(appliedResult.predicted_uplift * 100 >= 0 ? '+' : '') + (appliedResult.predicted_uplift * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Candidate Scenarios List */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono text-slate-400">CANDIDATE INTERVENTIONS</div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {simulation.scenarios.map((scen, idx) => {
            const isSelected = selectedScenario === scen.change;
            const isTop = idx === 0;
            const upliftPct = (scen.uplift * 100 >= 0 ? '+' : '') + (scen.uplift * 100).toFixed(1) + '%';

            return (
              <div
                key={idx}
                onClick={() => setSelectedScenario(scen.change)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/30'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{scen.change}</span>
                    {isTop && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        BEST UPLIFT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {scen.action_type} • {scen.target_field}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">
                    {(scen.predicted_probability * 100).toFixed(1)}%
                  </div>
                  <div className={`text-[10px] font-mono font-bold ${scen.uplift >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {upliftPct}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={() => optimizeMutation.mutate()}
          disabled={optimizeMutation.isPending || !productId}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {optimizeMutation.isPending ? (
            <span>Applying & Re-scoring...</span>
          ) : (
            <>
              <span>Apply {selectedScenario ? `"${selectedScenario}"` : "Optimal Action"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
