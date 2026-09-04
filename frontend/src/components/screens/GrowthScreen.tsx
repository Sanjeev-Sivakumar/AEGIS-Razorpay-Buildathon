import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Sliders,
  CheckCircle2,
  Search,
  Layout,
  BarChart3,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAegis } from '../../context/AegisContext';
import type { CounterfactualSimulationResult, OptimizationApplyResult } from '../../types';
import { GrowthIntelligenceSpecView } from '../spec/GrowthIntelligenceSpecView';

const PRESET_QUERIES = [
  'hotel in Goa under 3000',
  'waterproof hiking boots · ₹4000 · 2 days',
  'running shoes under 2500',
  'laptop under 50000',
];

export const GrowthScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, runQuery } = useAegis();
  const [viewMode, setViewMode] = useState<'SPEC' | 'ANALYTICS'>('SPEC');
  const [queryInput, setQueryInput] = useState(session.rawQuery);

  const activeCandidate = session.selectedCandidate;
  const activeProductId = activeCandidate?.id || 'PRD-01';

  // Growth Prediction Query
  const { data: prediction } = useQuery({
    queryKey: ['growthPrediction', session.rawQuery, activeProductId],
    queryFn: () => api.predictGrowth(session.rawQuery, activeProductId),
    enabled: !!activeProductId,
  });

  // Counterfactual Simulation Query
  const { data: cfSimulation } = useQuery<CounterfactualSimulationResult>({
    queryKey: ['counterfactualSim', session.rawQuery, activeProductId],
    queryFn: () => api.simulateCounterfactual(session.rawQuery, activeProductId),
    enabled: !!activeProductId,
  });

  // Ranking Query
  const candidateIds = session.candidates.map(c => c.id);
  const { data: rankingData } = useQuery({
    queryKey: ['growthRanking', session.rawQuery, candidateIds.join(',')],
    queryFn: () =>
      api.rankGrowth(session.rawQuery, candidateIds.length > 0 ? candidateIds : [activeProductId]),
  });

  // Optimize Mutation
  const optimizeMutation = useMutation({
    mutationFn: () =>
      api.applyOptimization(
        session.rawQuery,
        activeProductId,
        cfSimulation?.scenarios?.[0]?.change
      ),
    onSuccess: (data: OptimizationApplyResult) => {
      setAppliedOptimization(data);
      queryClient.invalidateQueries({ queryKey: ['growthPrediction'] });
      queryClient.invalidateQueries({ queryKey: ['counterfactualSim'] });
    },
  });

  const baselinePercent = session.growthAnalysis.baselineScore || 84;

  // Visual factor deltas
  const [attrSlider, setAttrSlider] = useState<number>(4); // 1-5
  const [delivSlider, setDelivSlider] = useState<number>(3); // 1-5
  const [metaSlider, setMetaSlider] = useState<number>(3); // 1-5
  const [appliedOptimization, setAppliedOptimization] = useState<OptimizationApplyResult | null>(null);

  const attrDelta = attrSlider;
  const delivDelta = delivSlider;
  const metaDelta = metaSlider;
  const totalUplift = attrDelta + delivDelta + metaDelta;
  const simulatedProb = Math.min(100, baselinePercent + totalUplift);

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    runQuery(queryInput.trim());
  };

  const rawProb = prediction?.selection_probability ?? (session.selectedCandidate ? session.selectedCandidate.selectionScore / 100 : 0.98);
  const currentProbPercent = Math.round(rawProb * (rawProb <= 1 ? 100 : 1));
  const currentRank = prediction?.rank ?? (session.selectedCandidate?.rank ?? 1);

  // Real context features
  const features = prediction?.context_features ?? {
    semantic_match: 0.91,
    price_fit: 0.98,
    attribute_quality: 0.76,
    delivery_fit: 0.88,
  };

  const signalBars = [
    { label: 'Semantic Match', shortLabel: 'Semantic', value: features.semantic_match, score: '.91', weight: 0.28, color: 'bg-cyan-600', fill: '#0891B2' },
    { label: 'Price Fit', shortLabel: 'Price', value: features.price_fit, score: '.98', weight: 0.26, color: 'bg-sky-500', fill: '#0EA5E9' },
    { label: 'Attributes Quality', shortLabel: 'Attributes', value: features.attribute_quality, score: '.76', weight: 0.16, color: 'bg-teal-500', fill: '#14B8A6' },
    { label: 'Delivery Fit', shortLabel: 'Delivery', value: features.delivery_fit, score: '.88', weight: 0.16, color: 'bg-indigo-500', fill: '#6366F1' },
    { label: 'Graph Relevance', shortLabel: 'Graph', value: 0.84, score: '.84', weight: 0.14, color: 'bg-blue-600', fill: '#2563EB' },
  ];

  // Mathematical derivation of stacked bar segments
  const rawContribs = signalBars.map((s) => s.value * s.weight);
  const totalRawContrib = rawContribs.reduce((a, b) => a + b, 0);
  const rawPercentages = rawContribs.map((c) => (c / totalRawContrib) * currentProbPercent);
  
  const roundedSegments = rawPercentages.slice(0, 4).map((p) => Math.round(p * 10) / 10);
  const lastSegment = Math.round((currentProbPercent - roundedSegments.reduce((a, b) => a + b, 0)) * 10) / 10;
  const segmentPercentages = [...roundedSegments, lastSegment];

  const fallbackCandidates = session.candidates.length > 0
    ? session.candidates.map((c, idx) => ({
        product_id: c.id,
        product_name: c.name,
        selection_probability: c.selectionScore ? c.selectionScore / 100 : (idx === 0 ? 0.96 : Math.max(0.6, 0.88 - idx * 0.04)),
        rank: c.rank || idx + 1,
        isYou: c.isYou || c.id === activeCandidate?.id || idx === 0,
      }))
    : [
        { product_id: 'HOTEL-GOA-01', product_name: 'Goa Grand Heritage Resort & Spa', selection_probability: 0.96, rank: 1, isYou: true },
        { product_id: 'HOTEL-GOA-02', product_name: 'Calangute Ocean Wave Suite', selection_probability: 0.88, rank: 2, isYou: false },
        { product_id: 'HOTEL-GOA-03', product_name: 'Baga Azure Boutique Retreat', selection_probability: 0.84, rank: 3, isYou: false },
        { product_id: 'HOTEL-GOA-04', product_name: 'Candolim Palm Grove Resort', selection_probability: 0.80, rank: 4, isYou: false },
        { product_id: 'HOTEL-GOA-05', product_name: 'Anjuna Bohemian Sanctuary', selection_probability: 0.76, rank: 5, isYou: false },
        { product_id: 'HOTEL-GOA-06', product_name: 'Vagator Cliffside Haven', selection_probability: 0.72, rank: 6, isYou: false },
      ];

  const rankingResults =
    rankingData?.results && rankingData.results.length > 0
      ? rankingData.results
      : fallbackCandidates;

  // Waterfall chart calculations
  const wfBase = baselinePercent; // 88
  const wfStep1 = wfBase + attrDelta; // 92
  const wfStep2 = wfStep1 + delivDelta; // 95
  const wfStep3 = wfStep2 + metaDelta; // 98
  const wfFinal = simulatedProb; // 98

  // Waterfall SVG scale parameters (Y: 80 to 100)
  const wfMinY = 80;
  const wfMaxY = 100;
  const wfRange = wfMaxY - wfMinY;
  const wfGraphH = 90;
  const wfTopPad = 22;
  const wfBottomY = wfTopPad + wfGraphH; // 112
  const getY = (val: number) => wfBottomY - ((Math.min(wfMaxY, Math.max(wfMinY, val)) - wfMinY) / wfRange) * wfGraphH;

  const yBase = getY(wfBase);
  const yStep1 = getY(wfStep1);
  const yStep2 = getY(wfStep2);
  const yStep3 = getY(wfStep3);
  const yFinal = getY(wfFinal);

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans">
      {/* View Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Growth Mode:
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
            {viewMode === 'SPEC'
              ? 'Executive Wireframe Specification (Active)'
              : 'Deep Provenance & Waterfall Analytics'}
          </span>
        </div>

        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode('SPEC')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'SPEC'
                ? 'bg-white text-cyan-800 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Wireframe Spec</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ANALYTICS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'ANALYTICS'
                ? 'bg-white text-cyan-800 border border-slate-200 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Deep Analytics</span>
          </button>
        </div>
      </div>

      {viewMode === 'SPEC' ? (
        <GrowthIntelligenceSpecView />
      ) : (
        <>
          {/* 1. Technical Query Trigger */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleQuerySubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-600 absolute left-3.5 top-3" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Query autonomous buyer agent..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none placeholder:text-slate-400 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-cyan-600 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
          >
            Discover & Predict
          </button>
        </form>

        <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-600 overflow-x-auto">
          <span className="text-slate-500 font-medium shrink-0">Presets:</span>
          {PRESET_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQueryInput(q);
                runQuery(q);
              }}
              className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 whitespace-nowrap cursor-pointer transition-colors font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Visualization: Selection Probability Gauge & Provenance Stacked Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2">
            Selection Probability Gauge & Provenance
          </div>

          {/* Large Visual Gauge */}
          <div className="flex flex-col items-center justify-center my-2">
            <div className="relative flex items-center justify-center">
              {/* SVG Circular Gauge */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-slate-100"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-cyan-600 transition-all duration-700 ease-out"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - currentProbPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {currentProbPercent}%
                </span>
                <span className="text-xs font-bold text-amber-700 mt-0.5">
                  Rank #{currentRank}
                </span>
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-600 font-medium">
              Autonomous Discovery Model Prediction
            </div>
          </div>
        </div>

        {/* METRIC PROVENANCE: Horizontal Stacked Bar adding up to exactly currentProbPercent (98%) */}
        <div className="mt-5 pt-4 border-t border-slate-100 max-w-2xl mx-auto">
          {/* Stacked Bar Container */}
          <div className="h-7 w-full bg-slate-100 rounded-lg p-0.5 border border-slate-200 flex overflow-hidden">
            {/* The active stacked portion spans currentProbPercent% of the total 100% width */}
            <div className="h-full flex rounded-md overflow-hidden" style={{ width: `${currentProbPercent}%` }}>
              {signalBars.map((sig, idx) => {
                const segPct = segmentPercentages[idx];
                const widthInStack = (segPct / currentProbPercent) * 100;
                return (
                  <div
                    key={idx}
                    className={`h-full ${sig.color} flex items-center justify-center text-[10px] font-semibold text-white truncate px-1 transition-all duration-500 border-r border-white/20 last:border-r-0`}
                    style={{ width: `${widthInStack}%` }}
                    title={`${sig.label}`}
                  >
                    <span className="truncate">{sig.shortLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Light Axis directly below the bar */}
          <div className="relative w-full h-7 mt-1">
            {/* Horizontal axis rule */}
            <div className="absolute top-1 left-0 right-0 h-px bg-slate-200" />

            {/* Standard scale ticks */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <div
                key={tick}
                className="absolute top-1 flex flex-col items-center -translate-x-1/2"
                style={{ left: `${tick}%` }}
              >
                <div className="w-px h-1.5 bg-slate-300" />
                <span className="text-[10px] text-slate-600 font-medium mt-0.5">{tick}%</span>
              </div>
            ))}

            {/* Prominent Provenance Total Tick at exactly currentProbPercent */}
            <div
              className="absolute top-0 flex flex-col items-center -translate-x-1/2 z-10"
              style={{ left: `${currentProbPercent}%` }}
            >
              <div className="w-0.5 h-2.5 bg-cyan-600" />
              <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-1 rounded border border-cyan-200 mt-0.5 shadow-2xs">
                {currentProbPercent}% Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column System: Ranking Chart vs Counterfactual Lab */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RANKING CHART */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-600" />
              Ranking Comparison
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Sorted by P(Select)</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {rankingResults.map((item: any, idx: number) => {
              const prob = item.selection_probability ?? (idx === 0 ? 0.98 : idx === 1 ? 0.84 : 0.72);
              const pct = Math.round(prob <= 1 ? prob * 100 : prob);
              const isYou = item.isYou || item.product_id === activeCandidate?.id || idx === 0;
              const nameToDisplay = item.product_name || item.name || `Candidate ${idx + 1}`;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={isYou ? 'text-cyan-800 font-bold' : 'text-slate-700 font-medium'}>
                      {nameToDisplay}{isYou ? ' (You)' : ''}
                    </span>
                    <span className="font-bold text-slate-900">
                      {pct}% · #{item.rank || idx + 1}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isYou
                          ? 'bg-cyan-600 shadow-xs'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COUNTERFACTUAL LAB & WATERFALL CHART */}
        <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Counterfactual Optimization Lab
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-800 font-medium">
              In-Memory
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold block">Current Baseline</span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">{baselinePercent}%</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 uppercase font-semibold block">Predicted Score</span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block transition-all duration-300">
                {simulatedProb}%
              </span>
              <span className="text-xs text-emerald-700 font-bold block">
                +{totalUplift} pts uplift
              </span>
            </div>
          </div>

          {/* METRIC PROVENANCE: Waterfall Chart showing exact physical stacking */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <svg viewBox="0 0 360 135" className="w-full h-auto">
              {/* Horizontal background guideline at baseline 88% and target */}
              <line x1="20" y1={yBase} x2="340" y2={yBase} stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="20" y1={yFinal} x2="340" y2={yFinal} stroke="#A7F3D0" strokeDasharray="3 3" strokeWidth="1" />

              {/* 1. Baseline Bar: ground to 88% */}
              <rect x="20" y={yBase} width="46" height={wfBottomY - yBase} rx="3" fill="#64748B" />
              <text x="43" y={yBase - 5} textAnchor="middle" fill="#334155" fontSize="10" fontWeight="bold">
                {wfBase}%
              </text>
              <text x="43" y={wfBottomY + 14} textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="600">
                Baseline
              </text>

              {/* Connector 1: Baseline top to Attr bottom */}
              <line x1="66" y1={yBase} x2="88" y2={yBase} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1.5" />

              {/* 2. Floating Bar 1: Attribute Detail (+attrDelta) */}
              <rect x="88" y={yStep1} width="46" height={Math.max(2, yBase - yStep1)} rx="3" fill="#6366F1" />
              <text x="111" y={yStep1 - 5} textAnchor="middle" fill="#4F46E5" fontSize="10" fontWeight="bold">
                +{attrDelta}
              </text>
              <text x="111" y={wfBottomY + 14} textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500">
                Attributes
              </text>

              {/* Connector 2: Attr top to Deliv bottom */}
              <line x1="134" y1={yStep1} x2="156" y2={yStep1} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1.5" />

              {/* 3. Floating Bar 2: Delivery Clarity (+delivDelta) */}
              <rect x="156" y={yStep2} width="46" height={Math.max(2, yStep1 - yStep2)} rx="3" fill="#0EA5E9" />
              <text x="179" y={yStep2 - 5} textAnchor="middle" fill="#0284C7" fontSize="10" fontWeight="bold">
                +{delivDelta}
              </text>
              <text x="179" y={wfBottomY + 14} textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500">
                Delivery
              </text>

              {/* Connector 3: Deliv top to Meta bottom */}
              <line x1="202" y1={yStep2} x2="224" y2={yStep2} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1.5" />

              {/* 4. Floating Bar 3: Product Metadata (+metaDelta) */}
              <rect x="224" y={yStep3} width="46" height={Math.max(2, yStep2 - yStep3)} rx="3" fill="#14B8A6" />
              <text x="247" y={yStep3 - 5} textAnchor="middle" fill="#0D9488" fontSize="10" fontWeight="bold">
                +{metaDelta}
              </text>
              <text x="247" y={wfBottomY + 14} textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500">
                Metadata
              </text>

              {/* Connector 4: Meta top to Final top */}
              <line x1="270" y1={yStep3} x2="292" y2={yFinal} stroke="#94A3B8" strokeDasharray="2 2" strokeWidth="1.5" />

              {/* 5. Final Ending Bar: ground to 98% */}
              <rect x="292" y={yFinal} width="48" height={wfBottomY - yFinal} rx="3" fill="#059669" />
              <text x="316" y={yFinal - 5} textAnchor="middle" fill="#047857" fontSize="10" fontWeight="bold">
                {wfFinal}%
              </text>
              <text x="316" y={wfBottomY + 14} textAnchor="middle" fill="#047857" fontSize="9" fontWeight="bold">
                Final Uplift
              </text>
            </svg>
          </div>

          {/* Interactive Sliders: strictly driving factor deltas */}
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Attribute Detail</span>
                <span className="text-indigo-700 font-bold">+{attrDelta} pts</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={attrSlider}
                onChange={(e) => setAttrSlider(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Delivery Clarity</span>
                <span className="text-indigo-700 font-bold">+{delivDelta} pts</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={delivSlider}
                onChange={(e) => setDelivSlider(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Product Metadata</span>
                <span className="text-indigo-700 font-bold">+{metaDelta} pts</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={metaSlider}
                onChange={(e) => setMetaSlider(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          <button
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending}
            className="w-full rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
          >
            {optimizeMutation.isPending ? 'Applying Intervention...' : 'Apply Optimization'}
          </button>

          {appliedOptimization && (
            <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">Optimized: +{(appliedOptimization.predicted_uplift * 100).toFixed(0)}% uplift committed!</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Model Signals & Feature Contributions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Model Signals / Selection Features
          </span>
          <span className="text-[11px] text-cyan-700 font-semibold">Normalized [0.0 - 1.0]</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {signalBars.map((sig, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-600 font-semibold block truncate">{sig.label}</span>
                <span className="text-xl font-bold text-cyan-700 mt-1 block">{sig.score}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full mt-3.5 overflow-hidden">
                <div
                  className="h-full bg-cyan-600 rounded-full"
                  style={{ width: `${sig.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Required Strict Disclaimer */}
        <p className="text-xs text-slate-500 italic pt-2 border-t border-slate-100 text-center">
          Contributing signals, not guaranteed outcomes.
        </p>
      </div>
    </>
  )}
</div>
);
};

