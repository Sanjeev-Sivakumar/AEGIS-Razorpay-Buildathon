import React from 'react';
import { KeyRound, Check, FileCheck, Copy } from 'lucide-react';
import type { RootIntentCertificate } from '../types';

interface RootIntentViewerProps {
  certificate?: RootIntentCertificate | null;
}

export const RootIntentViewer: React.FC<RootIntentViewerProps> = ({ certificate }) => {
  const [copied, setCopied] = React.useState(false);

  if (!certificate) {
    return null;
  }

  const handleCopyHash = () => {
    navigator.clipboard.writeText(certificate.immutable_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-slate-200 text-sm tracking-wider uppercase">
            Root Intent Certificate
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
            <KeyRound className="w-3 h-3" />
            HMAC-SHA256 Signed
          </span>
          <span className="font-mono text-xs text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
            {certificate.id}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3.5 text-xs">
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Category</span>
          <span className="text-slate-200 font-medium capitalize">{certificate.category}</span>
        </div>
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Location</span>
          <span className="text-slate-200 font-medium">{certificate.location || 'Any / Global'}</span>
        </div>
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Max Budget</span>
          <span className="text-emerald-400 font-bold">
            {certificate.currency} {certificate.max_amount ? certificate.max_amount.toLocaleString() : 'Open'}
          </span>
        </div>
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase font-semibold block">Status</span>
          <span className="text-indigo-300 font-medium">{certificate.status}</span>
        </div>
      </div>

      {/* Original Intent Prompt */}
      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-3 text-xs">
        <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
          Root Intent Prompt
        </span>
        <p className="text-slate-300 italic">"{certificate.original_text}"</p>
      </div>

      {/* Cryptographic Hash Bar */}
      <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400">
        <span className="truncate mr-2">
          <span className="text-slate-600 select-none">SHA256: </span>
          {certificate.immutable_hash}
        </span>
        <button
          onClick={handleCopyHash}
          className="p-1 hover:text-slate-200 transition-colors text-slate-500 hover:bg-slate-800 rounded shrink-0"
          title="Copy Hash"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
