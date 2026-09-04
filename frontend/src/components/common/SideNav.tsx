import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ShieldAlert,
  Lock,
  Share2,
  FileCheck,
  CreditCard,
} from 'lucide-react';
import { useAegis } from '../../context/AegisContext';
import type { AegisTab } from '../../context/AegisContext';

interface NavItem {
  key: AegisTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'COMMAND', label: 'Commerce OS', icon: LayoutDashboard },
  { key: 'GROWTH', label: 'Growth Lab', icon: TrendingUp },
  { key: 'COMMERCE', label: 'Commerce Graph', icon: Share2 },
  { key: 'SECURITY', label: 'Attack Lab', icon: ShieldAlert },
  { key: 'TRUST', label: 'Trust Engine', icon: Lock },
  { key: 'EVIDENCE', label: 'Evidence', icon: FileCheck },
  { key: 'CHECKOUT', label: 'Checkout', icon: CreditCard },
];

export const SideNav: React.FC = () => {
  const { activeTab, setActiveTab, session, archState } = useAegis();
  const isAttackActive = Boolean(session.attack?.active || archState.activePath === 'fail');

  return (
    <nav
      aria-label="Operating System Navigation"
      className="w-16 md:w-48 shrink-0 border-r border-slate-200 bg-white py-4 px-2.5 flex flex-col gap-1 select-none font-sans"
    >
      <div className="hidden md:block px-2.5 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        Workspaces
      </div>

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.key;

        return (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs tracking-wide transition-all cursor-pointer ${
              isActive
                ? 'bg-cyan-50 text-cyan-900 border border-cyan-200/80 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
            }`}
            title={item.label}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive
                  ? 'text-cyan-700'
                  : item.key === 'SECURITY' && isAttackActive
                  ? 'text-rose-600 animate-pulse'
                  : 'text-slate-500'
              }`}
            />
            <span className="hidden md:inline flex-1 text-left">{item.label}</span>

            {/* Dynamic Status Badges */}
            {item.key === 'SECURITY' && isAttackActive && (
              <span className="hidden md:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                ACTIVE
              </span>
            )}
            {item.key === 'CHECKOUT' && (
              <span
                className={`hidden md:inline text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  isAttackActive
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isAttackActive ? 'HOLD' : 'READY'}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

