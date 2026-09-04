import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Activity, RefreshCw } from 'lucide-react';
import type { AgentEvent, LedgerEntry } from '../types';

interface LiveItem {
  id: string;
  time: string;
  tag: string;
  tagColor: string;
  message: string;
  state?: string;
}

export const LiveActivityStream: React.FC = () => {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadStream();
    const interval = setInterval(loadStream, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadStream = async () => {
    setIsLoading(true);
    try {
      const [events, ledger] = await Promise.all([
        api.listAllEvents(undefined, 20).catch(() => [] as AgentEvent[]),
        api.getLedgerTail(10).catch(() => [] as LedgerEntry[]),
      ]);

      const stream: LiveItem[] = [];

      // Process ledger commitments
      ledger.forEach((l: LedgerEntry) => {
        const timeStr = new Date(l.created_at).toLocaleTimeString('en-US', { hour12: false });
        if (l.outcome === 'AUTHORIZED') {
          stream.push({
            id: `ledger-${l.id}`,
            time: timeStr,
            tag: '[LEDGER]',
            tagColor: 'text-blue-400 border-blue-500/30 bg-blue-950/40',
            message: `Block committed: ₹${l.amount?.toLocaleString() || 0} to ${l.recipient || 'merchant'} (Order: ${l.razorpay_order_id || 'None'})`,
          });
        } else {
          stream.push({
            id: `ledger-atk-${l.id}`,
            time: timeStr,
            tag: '[ATTACK]',
            tagColor: 'text-red-400 border-red-500/30 bg-red-950/40',
            message: `Threat intercepted: ${l.attack_scenario || 'Adversarial transaction'} blocked by ${l.policy_result} policy`,
          });
        }
      });

      // Process agent events
      events.forEach((e) => {
        const timeStr = new Date(e.created_at).toLocaleTimeString('en-US', { hour12: false });
        let tag = '[AEGIS]';
        let tagColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40';

        if (e.event_type.includes('GROWTH')) {
          tag = '[GROWTH]';
          tagColor = 'text-purple-400 border-purple-500/30 bg-purple-950/40';
        } else if (e.event_type.includes('VERIF') || e.event_type.includes('CERT')) {
          tag = '[TRUST]';
          tagColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
        } else if (e.event_type.includes('POLICY')) {
          tag = '[POLICY]';
          tagColor = 'text-amber-400 border-amber-500/30 bg-amber-950/40';
        } else if (e.event_type.includes('PAYMENT')) {
          tag = '[PAYMENT]';
          tagColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
        } else if (e.event_type.includes('HOLD') || e.event_type.includes('ESCALAT')) {
          tag = '[ATTACK]';
          tagColor = 'text-red-400 border-red-500/30 bg-red-950/40';
        }

        stream.push({
          id: `ev-${e.id}`,
          time: timeStr,
          tag,
          tagColor,
          message: e.message,
          state: e.state,
        });
      });

      // Sort chronological descending
      setItems(stream.slice(0, 18));
    } catch (err) {
      console.error('Error loading live activity stream', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Activity className="w-4 h-4 text-cyan-400" />
          Live Operational Activity Stream
        </div>
        <button
          onClick={loadStream}
          disabled={isLoading}
          className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 font-mono text-xs">
        {items.length > 0 ? (
          items.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-2.5 p-2 rounded bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <span className="text-[11px] text-slate-500 shrink-0 select-none">{it.time}</span>
              <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold shrink-0 ${it.tagColor}`}>
                {it.tag}
              </span>
              <p className="text-slate-300 text-xs leading-tight break-words flex-1">{it.message}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            No live activity recorded yet. Run a transaction or attack to populate the event stream.
          </div>
        )}
      </div>
    </div>
  );
};
