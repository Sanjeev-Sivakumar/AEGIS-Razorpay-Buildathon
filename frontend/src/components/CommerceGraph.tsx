import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useAegis } from '../context/AegisContext';

interface GraphNode {
  id: string;
  label: string;
  type: 'query' | 'product' | 'merchant' | 'attribute' | 'competitor';
  data?: Record<string, any>;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

interface CommerceGraphProps {
  activeQuery?: string;
  activeProductId?: string;
  onSelectProduct?: (productId: string) => void;
}

export const CommerceGraph: React.FC<CommerceGraphProps> = ({
  onSelectProduct,
}) => {
  const { session } = useAegis();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Derive nodes dynamically from session graph
  const nodes: GraphNode[] = (session.graph?.nodes || []).map((n) => ({
    id: n.id,
    label: n.label,
    type: (n.type?.toLowerCase() as any) || 'product',
    x: n.x,
    y: n.y,
    data: {
      price: n.price,
      selection_probability: n.prob,
      merchant: n.merchant,
      trust_score: n.trustScore,
    },
  }));

  const edges: GraphEdge[] = (session.graph?.edges || []).map((e) => ({
    from: e.from,
    to: e.to,
    label: e.label,
  }));

  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'query':
        return 'fill-cyan-950 stroke-cyan-500 text-cyan-300';
      case 'product':
        return 'fill-indigo-950 stroke-indigo-500 text-indigo-300';
      case 'competitor':
        return 'fill-purple-950 stroke-purple-500 text-purple-300';
      case 'merchant':
        return 'fill-emerald-950 stroke-emerald-500 text-emerald-300';
      case 'attribute':
        return 'fill-amber-950 stroke-amber-500 text-amber-300';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-white tracking-wider">
            COMMERCE GRAPH & GRAPHSAGE AGGREGATION
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
          Interactive Entity Map
        </span>
      </div>

      <div className="relative w-full h-80 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden flex flex-col justify-between p-3">
        <svg className="w-full h-full">
          {/* Edges */}
          {edges.map((e, idx) => {
            const src = nodes.find((n) => n.id === e.from);
            const dst = nodes.find((n) => n.id === e.to);
            if (!src || !dst) return null;
            const isCompetitor = e.label === 'COMPETES_WITH';

            return (
              <g key={idx}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={dst.x}
                  y2={dst.y}
                  stroke={isCompetitor ? '#a855f7' : '#334155'}
                  strokeWidth={isCompetitor ? 1.5 : 1}
                  strokeDasharray={isCompetitor ? '4 4' : undefined}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id || session.selectedCandidate?.id === node.id;
            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => {
                  setSelectedNode(node);
                  if (node.type === 'product' || node.type === 'competitor') {
                    if (onSelectProduct) onSelectProduct(node.id);
                  }
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === 'query' ? 24 : node.type === 'product' ? 22 : 18}
                  className={`${getNodeColor(node.type)} ${
                    isSelected ? 'stroke-2 ring-2 ring-cyan-400' : 'stroke-1'
                  }`}
                />
                <text
                  x={node.x}
                  y={node.y + 32}
                  textAnchor="middle"
                  className="fill-slate-300 text-[10px] font-mono font-bold pointer-events-none"
                >
                  {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-900">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
            <span>Query</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Active Product</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Competitor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Merchant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Attribute</span>
          </div>
        </div>
      </div>

      {/* Selected Node Details Box */}
      {selectedNode?.data && (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-white">
            <span>{selectedNode.label}</span>
            <span className="font-mono text-cyan-400 text-[11px]">{selectedNode.data.selection_probability || ''}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-300">
            {selectedNode.data.price && (
              <div>Price: <span className="font-mono font-bold text-emerald-400">{selectedNode.data.price}</span></div>
            )}
            {selectedNode.data.rating && (
              <div>Rating: <span className="font-mono text-yellow-400">{selectedNode.data.rating} / 5.0</span></div>
            )}
            {selectedNode.data.merchant && (
              <div>Merchant: <span className="text-slate-200">{selectedNode.data.merchant}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
