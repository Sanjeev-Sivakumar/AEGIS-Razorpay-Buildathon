import React from 'react';
import { useAegis } from '../context/AegisContext';
import { TopBar } from '../components/common/TopBar';
import { SideNav } from '../components/common/SideNav';
import { Footer } from '../components/common/Footer';
import { MicroInspector } from '../components/visual/MicroInspector';
import { CommandScreen } from '../components/screens/CommandScreen';
import { GrowthScreen } from '../components/screens/GrowthScreen';
import { TrustScreen } from '../components/screens/TrustScreen';
import { SecurityScreen } from '../components/screens/SecurityScreen';
import { CommerceScreen } from '../components/screens/CommerceScreen';
import { EvidenceScreen } from '../components/screens/EvidenceScreen';
import { CheckoutScreen } from '../components/screens/CheckoutScreen';

export const OSCommandCenter: React.FC = () => {
  const { activeTab, setActiveTab, inspector, setInspector } = useAegis();

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'COMMAND':
        return <CommandScreen onNavigateTab={setActiveTab} />;
      case 'GROWTH':
        return <GrowthScreen />;
      case 'TRUST':
        return <TrustScreen />;
      case 'SECURITY':
        return <SecurityScreen />;
      case 'COMMERCE':
        return <CommerceScreen />;
      case 'EVIDENCE':
        return <EvidenceScreen />;
      case 'CHECKOUT':
        return <CheckoutScreen />;
      default:
        return <CommandScreen onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Top Technical Bar */}
      <TopBar />

      {/* Main OS Body: SideNav + Active Screen Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Compact Navigation Rail */}
        <SideNav />

        {/* Primary Visualization Canvas */}
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto bg-[#F8FAFC]">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Floating Micro-Inspector Tooltip */}
      <MicroInspector inspector={inspector} onClose={() => setInspector(null)} />

      {/* Required Technical Footer */}
      <Footer />
    </div>
  );
};
