import React from 'react';

export type EdgeState = 'inactive' | 'active' | 'success' | 'blocked';

interface ArchitectureEdgeProps {
  state?: EdgeState;
  direction?: 'down' | 'right' | 'split-down' | 'merge-down';
  className?: string;
  length?: number;
  label?: string;
}

export const ArchitectureEdge: React.FC<ArchitectureEdgeProps> = ({
  state = 'inactive',
  direction = 'down',
  className = '',
  label,
}) => {
  const getColors = () => {
    switch (state) {
      case 'active':
        return {
          stroke: '#06B6D4',
          glow: 'rgba(6, 182, 212, 0.4)',
          pulse: true,
        };
      case 'success':
        return {
          stroke: '#10B981',
          glow: 'rgba(16, 185, 129, 0.4)',
          pulse: false,
        };
      case 'blocked':
        return {
          stroke: '#F43F5E',
          glow: 'rgba(244, 63, 94, 0.4)',
          pulse: false,
        };
      case 'inactive':
      default:
        return {
          stroke: '#94A3B8',
          glow: 'none',
          pulse: false,
        };
    }
  };

  const { stroke, pulse } = getColors();

  if (direction === 'down') {
    return (
      <div className={`flex flex-col items-center justify-center my-0.5 relative ${className}`}>
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line
            x1="12"
            y1="0"
            x2="12"
            y2="24"
            stroke={stroke}
            strokeWidth="2"
            strokeDasharray={state === 'active' ? '4 3' : 'none'}
            className={state === 'active' ? 'animate-data-flow' : ''}
          />
          <polygon
            points="8,20 16,20 12,26"
            fill={stroke}
          />
          {pulse && (
            <circle cx="12" cy="12" r="3" fill="#38BDF8">
              <animate
                attributeName="cy"
                values="2;22;2"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </svg>
        {label && (
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
            {label}
          </span>
        )}
      </div>
    );
  }

  if (direction === 'split-down') {
    return (
      <div className={`w-full flex justify-center items-center my-1 ${className}`}>
        <svg width="100%" height="32" viewBox="0 0 240 32" preserveAspectRatio="none" fill="none">
          {/* Top center down stem */}
          <line x1="120" y1="0" x2="120" y2="14" stroke={stroke} strokeWidth="2" />
          {/* Horizontal crossbar */}
          <line x1="40" y1="14" x2="200" y2="14" stroke={stroke} strokeWidth="2" />
          {/* Left drop down */}
          <line x1="40" y1="14" x2="40" y2="28" stroke={stroke} strokeWidth="2" />
          <polygon points="36,24 44,24 40,30" fill={stroke} />
          {/* Right drop down */}
          <line x1="200" y1="14" x2="200" y2="28" stroke={stroke} strokeWidth="2" />
          <polygon points="196,24 204,24 200,30" fill={stroke} />
        </svg>
      </div>
    );
  }

  if (direction === 'merge-down') {
    return (
      <div className={`w-full flex justify-center items-center my-1 ${className}`}>
        <svg width="100%" height="32" viewBox="0 0 240 32" preserveAspectRatio="none" fill="none">
          {/* Left drop down to crossbar */}
          <line x1="40" y1="0" x2="40" y2="16" stroke={stroke} strokeWidth="2" />
          {/* Right drop down to crossbar */}
          <line x1="200" y1="0" x2="200" y2="16" stroke={stroke} strokeWidth="2" />
          {/* Crossbar */}
          <line x1="40" y1="16" x2="200" y2="16" stroke={stroke} strokeWidth="2" />
          {/* Bottom center out */}
          <line x1="120" y1="16" x2="120" y2="30" stroke={stroke} strokeWidth="2" />
          <polygon points="116,26 124,26 120,32" fill={stroke} />
        </svg>
      </div>
    );
  }

  // default right
  return (
    <div className={`flex items-center justify-center mx-1 relative ${className}`}>
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <line
          x1="0"
          y1="10"
          x2="26"
          y2="10"
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray={state === 'active' ? '4 3' : 'none'}
          className={state === 'active' ? 'animate-data-flow' : ''}
        />
        <polygon points="24,6 24,14 30,10" fill={stroke} />
      </svg>
    </div>
  );
};
