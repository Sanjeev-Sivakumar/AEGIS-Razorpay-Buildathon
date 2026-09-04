import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';
import { EcommerceMarketplace } from '../commerce/EcommerceMarketplace';

interface CommerceNode {
  id: string;
  label: string;
  type: string;
  radius?: number;
  x: number;
  y: number;
  price?: string;
  rank?: string;
  prob?: string;
  merchant?: string;
  trustScore?: string;
}

interface CommerceEdge {
  from: string;
  to: string;
  label: string;
  weight?: number;
}

export const CommerceScreen: React.FC = () => {
  const { setInspector, session, setActiveProductId, setActiveTab } = useAegis();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(session.selectedCandidate?.id || null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const nodes: CommerceNode[] = (session.graph?.nodes as CommerceNode[]) || [];
  const edges: CommerceEdge[] = (session.graph?.edges as CommerceEdge[]) || [];

  const getNodeColor = (type: CommerceNode['type'], isSelected: boolean, label?: string) => {
    const upper = (type || '').toUpperCase();
    const isAttackNode = label?.includes('ADVERSARIAL') || label?.includes('UNAUTHORIZED') || label?.includes('BREACH') || label?.includes('MISMATCH');

    if (isAttackNode) {
      return {
        fill: isSelected ? 'fill-rose-100' : 'fill-rose-50',
        stroke: isSelected ? 'stroke-rose-700' : 'stroke-rose-600',
        text: 'fill-rose-950',
      };
    }

    switch (upper) {
      case 'PRODUCT':
        return {
          fill: isSelected ? 'fill-cyan-100' : 'fill-cyan-50',
          stroke: isSelected ? 'stroke-cyan-700' : 'stroke-cyan-600',
          text: 'fill-slate-900',
        };
      case 'MERCHANT':
        return {
          fill: isSelected ? 'fill-emerald-100' : 'fill-emerald-50',
          stroke: isSelected ? 'stroke-emerald-700' : 'stroke-emerald-600',
          text: 'fill-slate-900',
        };
      case 'COMPETITOR':
        return {
          fill: isSelected ? 'fill-purple-100' : 'fill-purple-50',
          stroke: isSelected ? 'stroke-purple-700' : 'stroke-purple-600',
          text: 'fill-slate-900',
        };
      case 'ATTRIBUTE':
        return {
          fill: 'fill-amber-50',
          stroke: 'stroke-amber-600',
          text: 'fill-slate-900',
        };
      case 'DELIVERY':
        return {
          fill: 'fill-blue-50',
          stroke: 'stroke-blue-600',
          text: 'fill-slate-900',
        };
      case 'QUERY':
        return {
          fill: 'fill-slate-100',
          stroke: 'stroke-cyan-600',
          text: 'fill-cyan-900',
        };
      case 'CATEGORY':
      default:
        return {
          fill: 'fill-slate-50',
          stroke: 'stroke-slate-400',
          text: 'fill-slate-800',
        };
    }
  };

  const handleNodeClick = (node: CommerceNode) => {
    setSelectedNodeId(node.id);
    if ((node.type || '').toUpperCase() === 'PRODUCT') {
      setActiveProductId(node.id);
    }

    setInspector({
      title: node.type,
      subtitle: node.label,
      badge: node.rank || node.type,
      badgeType: (node.type || '').toUpperCase() === 'PRODUCT' ? 'success' : 'neutral',
      fields: [
        ...(node.price ? [{ label: 'Price', value: node.price }] : []),
        ...(node.rank ? [{ label: 'Rank', value: node.rank }] : []),
        ...(node.prob ? [{ label: 'P(Select)', value: node.prob }] : []),
        ...(node.merchant ? [{ label: 'Merchant', value: node.merchant }] : []),
        ...(node.trustScore ? [{ label: 'Trust Score', value: node.trustScore }] : []),
        { label: 'Node ID', value: node.id },
      ],
      actionLabel: (node.type || '').toUpperCase() === 'PRODUCT' ? 'Set Active Candidate' : undefined,
      onAction: (node.type || '').toUpperCase() === 'PRODUCT' ? () => setActiveProductId(node.id) : undefined,
    });
  };

  const filteredNodes = activeFilter === 'ALL'
    ? nodes
    : nodes.filter((n) => {
        const u = (n.type || '').toUpperCase();
        return u === activeFilter || u === 'QUERY' || u === 'PRODUCT';
      });

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-sans">
      {/* 1. Technical Graph Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-wide text-slate-900">
              Commerce Relational Graph
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              GraphSAGE topology: Product, Merchant, Attribute, Delivery, Competitors
            </p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['ALL', 'PRODUCT', 'MERCHANT', 'COMPETITOR', 'ATTRIBUTE'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                activeFilter === filter
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Primary Interactive SVG Graph Canvas */}
      <div className="relative rounded-xl border border-slate-200 bg-white p-4 overflow-hidden min-h-[440px] flex items-center justify-center shadow-sm">
        {/* Fine grid background */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />

        <svg
          viewBox="0 0 700 440"
          className="w-full h-full max-h-[500px] select-none"
        >
          {/* Edges */}
          <g className="edges">
            {edges.map((edge, idx) => {
              const source = nodes.find((n) => n.id === edge.from);
              const target = nodes.find((n) => n.id === edge.to);
              if (!source || !target) return null;

              const isHighlighted = selectedNodeId === edge.from || selectedNodeId === edge.to;
              const isAttackEdge = edge.label?.includes('BREACH') || edge.label?.includes('FRAUD') || edge.label?.includes('MISMATCH') || edge.label?.includes('TAMPER');
              const strokeColor = isAttackEdge ? '#E11D48' : isHighlighted ? '#0284C7' : '#CBD5E1';
              const strokeW = isAttackEdge ? 2.5 : isHighlighted ? 2.5 : 1.2;

              return (
                <g key={idx}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    strokeOpacity={isHighlighted || isAttackEdge ? 1 : 0.6}
                    strokeDasharray={isAttackEdge ? '3,3' : isHighlighted ? '4,4' : 'none'}
                    className={isHighlighted || isAttackEdge ? 'animate-data-flow' : ''}
                  />
                  {isAttackEdge && (
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 - 6}
                      textAnchor="middle"
                      className="text-[9px] fill-rose-700 font-bold uppercase tracking-wider"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {filteredNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const color = getNodeColor(node.type, isSelected, node.label);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  className="cursor-pointer transition-transform duration-150 hover:scale-110"
                >
                  {/* Outer active ring if selected */}
                  {isSelected && (
                    <circle
                      r={(node.radius || 30) + 6}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      className="animate-spin"
                      style={{ transformOrigin: '0 0' }}
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={node.radius || 30}
                    className={`${color.fill} ${color.stroke}`}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />

                  {/* Node Label Text */}
                  <text
                    y={node.price ? -4 : 4}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-900 font-semibold pointer-events-none"
                  >
                    {node.label.length > 18 ? `${node.label.substring(0, 16)}…` : node.label}
                  </text>

                  {/* Node Price or Metric */}
                  {node.price && (
                    <text
                      y={11}
                      textAnchor="middle"
                      className="text-[9px] fill-cyan-700 font-bold pointer-events-none"
                    >
                      {node.price} · {node.prob}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 text-xs text-slate-700 bg-white/95 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" /> You (Rank 1)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Competitor
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Merchant
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" /> Attribute
          </span>
          {session.attack?.active && (
            <span className="flex items-center gap-1.5 font-bold text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" /> Adversarial Breach
            </span>
          )}
        </div>
      </div>

      {/* 3. Autonomous Commerce Marketplace Section */}
      <EcommerceMarketplace onNavigateTab={setActiveTab} />
    </div>
  );
};
