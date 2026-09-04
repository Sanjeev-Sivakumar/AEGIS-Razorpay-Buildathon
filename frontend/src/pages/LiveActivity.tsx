import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Filter, ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { api } from '../services/api';
import { StateBadge } from '../components/StateBadge';

const FILTER_STATES = ['ALL', 'PERCEIVE', 'ANALYZE', 'DECIDE', 'ACT', 'COMPLETED', 'FAILED'];

export const LiveActivity: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);

  const { data: events, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['allEvents', selectedState],
    queryFn: () => api.listAllEvents(selectedState === 'ALL' ? undefined : selectedState, 100),
    refetchInterval: isLivePolling ? 3000 : false,
  });

  const toggleExpand = (id: string) => {
    setExpandedEventId(expandedEventId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              LIVE ACTIVITY FEED
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Continuous stream of AgentEvent state transitions and cryptographic audit records from SQLite.
          </p>
        </div>

        {/* Polling Toggle & Manual Refresh */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLivePolling(!isLivePolling)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
              isLivePolling
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLivePolling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {isLivePolling ? 'AUTO-POLLING (3s)' : 'PAUSED'}
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* State Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-mono text-slate-400 shrink-0">Filter by State:</span>
        {FILTER_STATES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedState(st)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              selectedState === st
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-sm">
            Streaming agent events from SQLite...
          </div>
        ) : events && events.length > 0 ? (
          events.map((evt) => {
            const isExpanded = expandedEventId === evt.id;
            return (
              <div
                key={evt.id}
                className="glass-panel rounded-xl p-4 transition-all duration-150 hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <StateBadge state={evt.state} size="sm" />
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      {evt.session_id}
                    </span>
                    <span className="text-xs font-mono text-slate-300 font-semibold">
                      {evt.event_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span>{new Date(evt.created_at).toLocaleTimeString()}</span>
                    <button
                      type="button"
                      onClick={() => toggleExpand(evt.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Inspect Payload"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 font-sans leading-relaxed">
                  {evt.message}
                </p>

                {/* Expandable JSON Payload Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Event Payload (SQLite JSON Record)</span>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-sm">
            No events found for the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
