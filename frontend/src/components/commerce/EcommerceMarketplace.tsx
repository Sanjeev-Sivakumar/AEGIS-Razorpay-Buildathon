import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Star,
  Building,
  Clock,
  Truck,
  ArrowRight,
  ShoppingBag,
  Info,
  X,
  ShieldCheck,
  Tag,
  CreditCard,
  Laptop,
  Footprints,
  Smartphone,
  Headphones,
} from 'lucide-react';
import { useAegis } from '../../context/AegisContext';
import type { CandidateItem } from '../../types/session';
import { PRESET_CATEGORIES } from '../../runtime/catalogData';

interface EcommerceMarketplaceProps {
  onNavigateTab?: (tab: any) => void;
}

export const EcommerceMarketplace: React.FC<EcommerceMarketplaceProps> = ({ onNavigateTab }) => {
  const { session, runQuery, selectProduct, buyNowProduct } = useAegis();
  const [popupProduct, setPopupProduct] = useState<CandidateItem | null>(null);

  const candidates = session.candidates || [];
  const selectedCandidate = session.selectedCandidate;
  const currentCategory = session.intent.category;

  // Close popup modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopupProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCardClick = (candidate: CandidateItem) => {
    selectProduct(candidate);
    setPopupProduct(candidate);
  };

  const handleClosePopup = () => {
    setPopupProduct(null);
  };

  const handleBuyNowFromPopup = (candidate: CandidateItem) => {
    buyNowProduct(candidate);
    setPopupProduct(null);
    if (onNavigateTab) {
      onNavigateTab('CHECKOUT');
    }
  };

  const handleSelectOnly = (candidate: CandidateItem) => {
    selectProduct(candidate);
    setPopupProduct(null);
  };

  const handleCategorySwitch = (presetQuery: string) => {
    runQuery(presetQuery);
  };

  const renderCategoryIcon = (category: string) => {
    const cat = category.toUpperCase();
    switch (cat) {
      case 'HOTEL':
        return <Building className="w-3.5 h-3.5 shrink-0" />;
      case 'LAPTOP':
        return <Laptop className="w-3.5 h-3.5 shrink-0" />;
      case 'RUNNING SHOES':
        return <Footprints className="w-3.5 h-3.5 shrink-0" />;
      case 'PHONE':
      case 'SMARTPHONE':
        return <Smartphone className="w-3.5 h-3.5 shrink-0" />;
      case 'HEADPHONES':
        return <Headphones className="w-3.5 h-3.5 shrink-0" />;
      default:
        return <Tag className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 font-sans text-slate-900">
      {/* 1. Header Bar: Marketplace Title & Category Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Autonomous Commerce Marketplace
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
              6 AI-Ranked Candidates
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Intent Query: <span className="text-cyan-700 font-semibold font-mono">"{session.rawQuery}"</span>
            {' '}·{' '}Budget Ceiling: <span className="text-emerald-700 font-bold font-mono">{session.intent.currency} {session.rootIntent.budget.toLocaleString()}</span>
          </p>
        </div>

        {/* Category Working Presets (Clean Light-Themed Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {PRESET_CATEGORIES.map((preset) => {
            const isActive =
              currentCategory === preset.category ||
              (preset.category === 'PHONE' && currentCategory === 'SMARTPHONE');
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleCategorySwitch(preset.sampleQuery)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-xs border border-cyan-600'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:text-slate-900'
                }`}
              >
                {renderCategoryIcon(preset.category)}
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Candidate Cards Grid (Clean, Essential-Only, Not Text Heavy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((candidate) => {
          const isSelected = selectedCandidate?.id === candidate.id;
          const isAiOptimal = candidate.rank === 1;

          return (
            <div
              key={candidate.id}
              onClick={() => handleCardClick(candidate)}
              className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col bg-white ${
                isSelected
                  ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/10'
                  : 'border-slate-200 hover:border-cyan-400 hover:shadow-md hover:bg-slate-50/30'
              }`}
            >
              {/* Product / Hotel Image */}
              <div className="relative w-full h-40 bg-slate-100 overflow-hidden shrink-0">
                <img
                  src={
                    candidate.image ||
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'
                  }
                  alt={candidate.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
                  }}
                />

                {/* Top Badge Overlay */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                  {/* AI Selected / Rank Badge */}
                  {isAiOptimal ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>AI SELECTED</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 backdrop-blur-xs text-slate-700 border border-slate-200 shadow-xs">
                      Rank #{candidate.rank}
                    </span>
                  )}

                  {/* AI Match Score Badge */}
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold backdrop-blur-xs border shadow-xs ${
                      isAiOptimal
                        ? 'bg-emerald-50/95 text-emerald-800 border-emerald-300'
                        : 'bg-white/95 text-cyan-800 border-cyan-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-cyan-600" />
                    <span>{candidate.selectionScore}% Match</span>
                  </span>
                </div>

                {/* Location / Key Tag Pill */}
                {candidate.location && (
                  <div className="absolute bottom-2 left-2.5 pointer-events-none">
                    <span className="px-2 py-0.5 rounded bg-white/90 backdrop-blur-xs text-[10px] font-medium text-slate-700 border border-slate-200/80 shadow-xs">
                      {candidate.location}
                    </span>
                  </div>
                )}
              </div>

              {/* Clean Card Summary Body (Essential Metrics Only) */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                <div className="space-y-1">
                  {/* Merchant & Rating Row */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium truncate max-w-[170px]">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{candidate.merchant}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{candidate.rating || 4.8}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({(candidate.reviewsCount || 850).toLocaleString()})
                      </span>
                    </span>
                  </div>

                  {/* Product Title */}
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-1">
                    {candidate.name}
                  </h4>
                </div>

                {/* Price & Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Price</span>
                    <span className="text-base font-black text-emerald-700 font-mono">
                      {candidate.currency} {candidate.price.toLocaleString()}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 group-hover:text-cyan-800 transition-colors">
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. PRODUCT CARD POP-UP MODAL (Showing Description & Important Details) */}
      {popupProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleClosePopup}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div className="relative w-full h-48 bg-slate-100 overflow-hidden shrink-0">
              <img
                src={
                  popupProduct.image ||
                  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'
                }
                alt={popupProduct.name}
                className="w-full h-full object-cover"
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClosePopup}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 shadow-md transition-all cursor-pointer z-10"
                aria-label="Close product popup"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {popupProduct.rank === 1 ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>AI SELECTED OPTIMAL</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/90 backdrop-blur-xs text-slate-800 border border-slate-200 shadow-sm">
                    Rank #{popupProduct.rank} Candidate
                  </span>
                )}

                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-50 text-cyan-900 border border-cyan-200 shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-600" />
                  <span>{popupProduct.selectionScore}% Match</span>
                </span>
              </div>

              {popupProduct.location && (
                <div className="absolute bottom-3 left-3">
                  <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-xs font-medium text-slate-800 border border-slate-200/80 shadow-xs">
                    {popupProduct.location}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Body: Scrollable, Clean & Essential Only */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Merchant & Rating Row */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Building className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{popupProduct.merchant}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{popupProduct.rating || 4.8}</span>
                  </span>
                  <span className="text-slate-400">
                    ({(popupProduct.reviewsCount || 850).toLocaleString()} reviews)
                  </span>
                </div>
              </div>

              {/* Product Title */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {popupProduct.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{popupProduct.category}</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Aegis Whitelist Verified</span>
                  </span>
                </div>
              </div>

              {/* Price & Delivery Highlights */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified Total Price</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {popupProduct.currency} {popupProduct.price.toLocaleString()}
                  </span>
                </div>
                <div className="text-right space-y-0.5 text-xs">
                  <div className="flex items-center gap-1 text-slate-700 font-medium justify-end">
                    <Clock className="w-3 h-3 text-cyan-600" />
                    <span>{popupProduct.availability || 'In Stock'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] justify-end">
                    <Truck className="w-3 h-3 text-emerald-600" />
                    <span>{popupProduct.delivery || 'Instant digital delivery'}</span>
                  </div>
                </div>
              </div>

              {/* PRODUCT DESCRIPTION CALLOUT (Prominent & Clean) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <Info className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Product Description</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {popupProduct.description}
                </p>
              </div>

              {/* Key Important Specifications (Clean Highlights Only) */}
              {popupProduct.attributes && Object.keys(popupProduct.attributes).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Important Highlights
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(popupProduct.attributes).slice(0, 4).map(([key, val]) => (
                      <div
                        key={key}
                        className="p-2 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5"
                      >
                        <span className="text-[10px] font-semibold text-slate-400 truncate">{key}</span>
                        <span className="font-semibold text-slate-800 truncate">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleBuyNowFromPopup(popupProduct)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md cursor-pointer transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>Buy Now — {popupProduct.currency} {popupProduct.price.toLocaleString()}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectOnly(popupProduct)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-semibold text-xs border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
              >
                Select Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
