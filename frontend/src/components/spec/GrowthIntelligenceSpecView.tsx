import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

export const GrowthIntelligenceSpecView: React.FC = () => {
  const { session, runQuery } = useAegis();
  
  const [queryInput, setQueryInput] = useState<string>(session.rawQuery);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    session.selectedCandidate?.id || ''
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [appliedFix, setAppliedFix] = useState<boolean>(false);

  // Sync state if session changes
  useEffect(() => {
    setQueryInput(session.rawQuery);
    setSelectedProductId(session.selectedCandidate?.id || '');
    setAppliedFix(false);
  }, [session.rawQuery, session.selectedCandidate?.id]);

  const candidate = session.candidates.find(c => c.id === selectedProductId) || session.selectedCandidate;
  const growth = session.growthAnalysis;

  // Dynamic interventions toggles
  const [activeInterventions, setActiveInterventions] = useState<Record<string, boolean>>({});

  const baseline = growth.baselineScore;
  const targetSimulated = growth.simulatedScore;

  // Calculate current uplift from active interventions
  const activeCount = Object.values(activeInterventions).filter(Boolean).length;
  const totalInterventions = growth.interventions.length || 4;
  const upliftRange = targetSimulated - baseline;
  const calculatedScore = appliedFix
    ? targetSimulated
    : Math.min(targetSimulated, baseline + Math.round((activeCount / totalInterventions) * upliftRange));

  const deltaPts = calculatedScore - baseline;
  const deltaPct = Math.round(((calculatedScore - baseline) / baseline) * 100);
  const currentRank = calculatedScore >= targetSimulated - 2 ? 1 : calculatedScore >= baseline + 6 ? 2 : 3;

  const handleAnalyze = async () => {
    if (!queryInput.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      await runQuery(queryInput.trim());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBestFix = () => {
    const allActive: Record<string, boolean> = {};
    growth.interventions.forEach(item => {
      allActive[item.id] = true;
    });
    setActiveInterventions(allActive);
    setAppliedFix(true);
  };

  const toggleIntervention = (id: string) => {
    setActiveInterventions(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const allActive = growth.interventions.every(i => next[i.id]);
      setAppliedFix(allActive);
      return next;
    });
  };

  // Competitor list: ensure candidate is displayed first, followed by others
  const displayCandidates = session.candidates.length > 0
    ? session.candidates
    : [
        { id: '1', name: candidate?.name || 'Selected Offering', price: 2400, selectionScore: calculatedScore, rank: 1, isYou: true, merchant: 'Verified Partner', category: session.intent.category, currency: session.intent.currency, delivery: 'Fast', description: '', attributes: {} },
        { id: '2', name: 'Competitor A', price: 2700, selectionScore: 88, rank: 2, isYou: false, merchant: 'Rival Store', category: session.intent.category, currency: session.intent.currency, delivery: '3 days', description: '', attributes: {} },
        { id: '3', name: 'Competitor B', price: 2100, selectionScore: 82, rank: 3, isYou: false, merchant: 'Alt Co', category: session.intent.category, currency: session.intent.currency, delivery: '2 days', description: '', attributes: {} },
      ];

  return (
    <div className="w-full max-w-6xl mx-auto font-mono text-xs text-slate-800 space-y-4">
      {/* Outer Shell */}
      <div className="rounded-xl border border-slate-300/80 bg-white shadow-sm overflow-hidden">
        {/* TOP BAR / BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-900 text-white font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold tracking-wider">AEGIS</span>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-200 tracking-wide">GROWTH INTELLIGENCE</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">Target Offering:</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              aria-label="Target offering selector"
              className="bg-slate-800 border border-slate-700 text-cyan-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 font-mono cursor-pointer max-w-[240px] truncate"
            >
              {session.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({session.intent.currency} {c.price.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5 space-y-5 bg-slate-50/50">
          {/* 1. AI BUYER QUERY SECTION */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-600" />
              <span>AI Buyer Query (Active Natural Language Input)</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Enter arbitrary AI buyer query..."
                  className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>[ANALYZE]</span>
                )}
              </button>
            </div>
          </div>

          {/* 2. SPLIT ROW: AI BUYER SELECTION vs COUNTERFACTUAL SIMULATOR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: AI BUYER SELECTION */}
            <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                  <span>AI Buyer Selection</span>
                  <span className="text-cyan-700 font-mono">Predicted Selection Score</span>
                </div>

                {/* BEFORE vs AFTER Columns */}
                <div className="grid grid-cols-2 gap-4 text-center my-3">
                  {/* BEFORE */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/80">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">BEFORE</div>
                    <div className="text-2xl font-black text-slate-700 mt-1">{baseline}%</div>
                    <div className="mt-2 text-slate-400 font-mono tracking-widest text-[11px]">
                      ██████░░░
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-2">Rank #3</div>
                  </div>

                  {/* AFTER */}
                  <div className="p-3 rounded-lg border border-cyan-200 bg-cyan-50/60 shadow-xs">
                    <div className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">AFTER</div>
                    <div className="text-2xl font-black text-cyan-700 mt-1 transition-all duration-300">
                      {calculatedScore}%
                    </div>
                    <div className="mt-2 text-cyan-600 font-mono tracking-widest text-[11px]">
                      {calculatedScore >= 95
                        ? '█████████░'
                        : calculatedScore >= 88
                        ? '████████░░'
                        : '███████░░░'}
                    </div>
                    <div className="text-xs font-bold text-cyan-800 mt-2">
                      Rank #{currentRank}
                    </div>
                  </div>
                </div>
              </div>

              {/* UPLIFT BADGES */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{deltaPts} pts
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-100 text-cyan-900 font-black text-xs">
                  ▲ +{deltaPct}%
                </span>
              </div>
            </div>

            {/* RIGHT: COUNTERFACTUAL SIMULATOR */}
            <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Counterfactual Simulator
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                  Active Offering: {candidate?.name}
                </span>
              </div>

              {/* Current Product Attributes Checklist */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase mb-2">Current Product Attributes</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {growth.currentProduct.checklist.map((item, idx) => {
                    const isValid = item.valid || appliedFix || activeCount > 0;
                    return (
                      <div key={idx} className="flex items-center justify-between pr-2">
                        <span className="text-slate-600 truncate mr-1">{item.label}:</span>
                        {isValid ? (
                          <span className="text-emerald-700 font-bold shrink-0">✓ Valid</span>
                        ) : (
                          <span className="text-rose-600 font-bold shrink-0">✗ Missing</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SIMULATE INTERVENTIONS */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase mb-2">Simulate Interventions</div>
                <div className="space-y-1.5">
                  {growth.interventions.map((inv) => {
                    const isActive = activeInterventions[inv.id] || appliedFix;
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => toggleIntervention(inv.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded border text-xs font-mono transition-all cursor-pointer ${
                          isActive
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-bold'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-left truncate mr-2">
                          <span className="font-bold">{isActive ? '[✓]' : '[+]'}</span>
                          <span className="truncate">{inv.label}</span>
                        </span>
                        <span className="text-cyan-700 font-bold shrink-0">→ {inv.upliftScore}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* APPLY BEST FIX ACTION */}
              <button
                type="button"
                onClick={handleApplyBestFix}
                className="w-full py-2.5 rounded border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>[ APPLY BEST FIX ]</span>
              </button>
            </div>
          </div>

          {/* 3. MERCHANT / COMPETITOR RANKING */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
              <span>Merchant / Competitor Ranking for "{session.rawQuery}"</span>
              <span className="text-slate-400">Category: {session.intent.category}</span>
            </div>

            <div className="space-y-2.5 font-mono">
              {displayCandidates.map((c, idx) => {
                const isYou = c.id === candidate?.id || c.isYou;
                const score = isYou ? calculatedScore : c.selectionScore;
                const rankNum = isYou ? currentRank : idx + 1;

                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <div className="flex items-center gap-2 truncate">
                        <span className={isYou ? 'text-cyan-800' : 'text-slate-600'}>
                          {isYou ? 'YOU: ' : ''}{c.name}
                        </span>
                        {isYou && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-500 text-[11px] hidden sm:inline">
                          {session.intent.currency} {c.price.toLocaleString()}
                        </span>
                        <span className={isYou ? 'text-emerald-700 font-black' : 'text-slate-700'}>
                          {score}%
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${isYou ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          #{rankNum}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded transition-all duration-500 ${
                          isYou
                            ? 'bg-gradient-to-r from-cyan-600 to-emerald-600'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. SPLIT ROW: MODEL SIGNALS vs COMMERCE GRAPH */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* MODEL SIGNALS */}
            <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Model Signals</span>
                <span className="text-slate-400">Normalized [0.0 - 1.0]</span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {growth.signals.map((sig, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-700">{sig.label}</span>
                      <span className="font-bold text-cyan-700">{sig.raw.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                        style={{ width: `${sig.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMMERCE GRAPH VISUALIZATION */}
            <div className="lg:col-span-6 rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-2 flex flex-col justify-between">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Commerce Graph: {session.intent.category}</span>
                <span className="text-cyan-700 font-mono">Relational Fit</span>
              </div>

              {/* Dynamic SVG Commerce Graph */}
              <div className="relative w-full h-44 bg-slate-900 rounded-lg p-2 overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 400 170" className="w-full h-full">
                  {/* Edges */}
                  <line x1="200" y1="85" x2="310" y2="35" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="200" y1="85" x2="310" y2="135" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="200" y1="85" x2="80" y2="85" stroke="#38BDF8" strokeWidth="1.5" />
                  <line x1="80" y1="85" x2="80" y2="140" stroke="#64748B" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="200" y1="85" x2="200" y2="145" stroke="#34D399" strokeWidth="1.5" />

                  {/* Competitor Top */}
                  <circle cx="310" cy="35" r="14" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
                  <text x="310" y="39" textAnchor="middle" fill="#CBD5E1" fontSize="9" fontFamily="monospace">Comp</text>

                  {/* Competitor Bottom */}
                  <circle cx="310" cy="135" r="14" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
                  <text x="310" y="139" textAnchor="middle" fill="#CBD5E1" fontSize="9" fontFamily="monospace">Alt</text>

                  {/* Attribute Left */}
                  <circle cx="80" cy="85" r="14" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
                  <text x="80" y="89" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace">Attr</text>

                  {/* Merchant Node */}
                  <circle cx="80" cy="140" r="12" fill="#0F172A" stroke="#64748B" strokeWidth="1" />
                  <text x="80" y="143" textAnchor="middle" fill="#94A3B8" fontSize="7" fontFamily="monospace">Store</text>

                  {/* Category Node */}
                  <circle cx="200" cy="145" r="12" fill="#1E293B" stroke="#34D399" strokeWidth="1.5" />
                  <text x="200" y="149" textAnchor="middle" fill="#34D399" fontSize="8" fontFamily="monospace">Fit</text>

                  {/* CENTER: YOU */}
                  <circle cx="200" cy="85" r="22" fill="#0369A1" stroke="#38BDF8" strokeWidth="2.5" />
                  <circle cx="200" cy="85" r="28" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.4" className="animate-ping" />
                  <text x="200" y="89" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    YOU
                  </text>
                </svg>
              </div>

              <div className="text-[11px] text-slate-500 text-center font-mono">
                Graph Relational Fit for {session.intent.category} ({candidate?.name})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
