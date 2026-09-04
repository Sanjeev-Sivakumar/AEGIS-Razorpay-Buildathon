import React from 'react';
import { Tag, Building } from 'lucide-react';

interface CandidateCardProps {
  candidate: {
    product_id: string;
    merchant_id: string;
    merchant_name: string;
    name: string;
    category: string;
    price: number;
    currency: string;
    description?: string;
    attributes?: Record<string, string>;
  };
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  return (
    <div className="glass-panel rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-slate-100 text-base line-clamp-1">{candidate.name}</h4>
        <span className="font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
          {candidate.currency} {candidate.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
        <span className="flex items-center gap-1">
          <Building className="w-3.5 h-3.5 text-cyan-400" />
          {candidate.merchant_name}
        </span>
        <span className="flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-purple-400" />
          {candidate.category.toUpperCase()}
        </span>
      </div>

      {candidate.description && (
        <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
          {candidate.description}
        </p>
      )}

      {candidate.attributes && Object.keys(candidate.attributes).length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
          {Object.entries(candidate.attributes).map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
            >
              <span className="text-slate-500">{k}:</span> {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
