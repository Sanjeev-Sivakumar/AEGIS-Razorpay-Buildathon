import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Shield, Cpu, Activity, LayoutDashboard, Database, Zap } from 'lucide-react';
import { api } from '../services/api';

export const DashboardLayout: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10000,
  });

  const navItems = [
    { to: '/', label: 'Command Center', icon: LayoutDashboard },
    { to: '/brain', label: 'Agent Brain', icon: Cpu },
    { to: '/activity', label: 'Live Activity', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0F172A]/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  AEGIS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  PHASE 1 / 5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                The Growth-and-Trust Agent for Agentic Commerce
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* System Health Indicators */}
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">SQLite:</span>
              <span className={health?.sqlite === 'connected' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {health?.sqlite === 'connected' ? 'ONLINE' : 'CHECK'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">AI:</span>
              <span className={health?.groq === 'configured' ? 'text-emerald-400 font-bold' : 'text-yellow-400'}>
                {health?.groq === 'configured' ? 'GROQ' : 'FALLBACK'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-400 font-mono">
        AEGIS Autonomous Agent Core • Phase 1 Foundation • SQLite Persistence • Groq LLM + Fallback Engine
      </footer>
    </div>
  );
};
