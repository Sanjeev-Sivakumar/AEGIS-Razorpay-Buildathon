import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { AgentRunResponse, DecisionReplay as DecisionReplayType } from '../types';
import type { AegisSession, CandidateItem } from '../types/session';
import { createAutonomousSession, simulateAttackOnSession, resetSessionAttack, selectCandidateInSession } from '../runtime/sessionEngine';

export type AegisTab = 'COMMAND' | 'GROWTH' | 'COMMERCE' | 'SECURITY' | 'TRUST' | 'EVIDENCE' | 'CHECKOUT';
export type OperatingMode = 'LIVE' | 'REPLAY';

export type NodeState = 'idle' | 'active' | 'success' | 'warning' | 'blocked' | 'error';

export interface ArchitectureState {
  aegis: NodeState;
  growth: NodeState;
  trust: NodeState;
  decision: NodeState;
  paymentGate: NodeState;
  payment: NodeState;
  hold: NodeState;
  ledger: NodeState;
  replay: NodeState;
  activePath: 'pass' | 'fail' | 'idle';
}

export interface InspectorPayload {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'neutral' | 'success' | 'warning' | 'danger';
  fields: Array<{ label: string; value: string | number | boolean }>;
  actionLabel?: string;
  onAction?: () => void;
}

interface AegisContextValue {
  // Primary unified source of truth
  session: AegisSession;
  setSession: React.Dispatch<React.SetStateAction<AegisSession>>;
  runQuery: (queryText: string) => Promise<void>;
  resetSession: () => void;

  activeTab: AegisTab;
  setActiveTab: (tab: AegisTab) => void;
  activeMode: OperatingMode;
  setActiveMode: (mode: OperatingMode) => void;
  
  // Backward compatible accessors
  activeProductId: string;
  setActiveProductId: (id: string) => void;
  activeQuery: string;
  setActiveQuery: (q: string) => void;
  latestRun: AgentRunResponse | null;
  setLatestRun: (run: AgentRunResponse | null) => void;
  latestAttack: any | null;
  setLatestAttack: (atk: any | null) => void;
  latestReplay: DecisionReplayType | null;
  setLatestReplay: (rep: DecisionReplayType | null) => void;
  
  // Visual Architecture State
  archState: ArchitectureState;
  setArchState: React.Dispatch<React.SetStateAction<ArchitectureState>>;
  resetArchitecture: () => void;
  
  // Intro Sequence
  introActive: boolean;
  introStep: number;
  
  // Full Demo Runner
  isDemoRunning: boolean;
  demoPhase: string | null;
  runFullDemo: () => Promise<void>;
  
  // Micro Inspector
  inspector: InspectorPayload | null;
  setInspector: (data: InspectorPayload | null) => void;
  
  // Actions
  triggerAttack: (scenarioName: string) => Promise<any>;
  clearAttack: () => void;
  triggerReplay: (txId: string) => Promise<any>;
  runAcceptDemo: (queryText?: string) => Promise<void>;
  runBlockDemo: (scenarioName?: string) => Promise<any>;
  selectProduct: (candidate: CandidateItem) => void;
  buyNowProduct: (candidate: CandidateItem) => void;
}

const defaultArchState: ArchitectureState = {
  aegis: 'idle',
  growth: 'idle',
  trust: 'idle',
  decision: 'idle',
  paymentGate: 'idle',
  payment: 'idle',
  hold: 'idle',
  ledger: 'idle',
  replay: 'idle',
  activePath: 'idle',
};

const AegisContext = createContext<AegisContextValue | undefined>(undefined);

export const AegisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AegisTab>('COMMAND');
  const [activeMode, setActiveMode] = useState<OperatingMode>('LIVE');
  
  // Master Single Source of Truth
  const [session, setSession] = useState<AegisSession>(() =>
    createAutonomousSession('hotel in Goa under 3000')
  );

  const [archState, setArchState] = useState<ArchitectureState>(defaultArchState);
  const [introActive, setIntroActive] = useState<boolean>(true);
  const [introStep, setIntroStep] = useState<number>(0);

  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [demoPhase, setDemoPhase] = useState<string | null>(null);

  const [latestRun, setLatestRun] = useState<AgentRunResponse | null>(null);
  const [latestAttack, setLatestAttack] = useState<any | null>(null);
  const [latestReplay, setLatestReplay] = useState<DecisionReplayType | null>(null);
  const [inspector, setInspector] = useState<InspectorPayload | null>(null);

  const resetArchitecture = useCallback(() => {
    setArchState(defaultArchState);
  }, []);

  // Backward compatible setters that also update session
  const setActiveQuery = useCallback((q: string) => {
    setSession((prev) => {
      if (prev.rawQuery === q) return prev;
      return createAutonomousSession(q);
    });
  }, []);

  const setActiveProductId = useCallback((_id: string) => {
    // Synchronized via selectedCandidate
  }, []);

  // 1. MASTER QUERY EXECUTION: Invalidates stale state and rebuilds commerce context
  const runQuery = useCallback(async (queryText: string) => {
    const cleanText = queryText.trim();
    if (!cleanText) return;

    setActiveMode('LIVE');
    setSession((prev) => ({
      ...prev,
      status: 'PARSING',
      statusMessage: 'Rebuilding commerce context around active intent...',
    }));

    // Invalidate stale state and generate fresh autonomous session
    const newSession = createAutonomousSession(cleanText);

    // Call backend API if available to trigger SQLite events and sync
    try {
      const backendRes = await api.runAgent(cleanText);
      if (backendRes) {
        setLatestRun(backendRes);
        if (backendRes.result?.authorization?.razorpay_order_id) {
          newSession.payment.orderId = backendRes.result.authorization.razorpay_order_id;
        }
      }
    } catch {
      // Standalone/Offline resilient: autonomous session handles everything
    }

    setSession(newSession);
    setArchState({
      aegis: 'active',
      growth: 'success',
      trust: 'success',
      decision: 'success',
      paymentGate: 'success',
      payment: 'success',
      hold: 'idle',
      ledger: 'success',
      replay: 'idle',
      activePath: 'pass',
    });
  }, []);

  // 2. RESET FUNCTION
  const resetSession = useCallback(() => {
    resetArchitecture();
    setActiveMode('LIVE');
    setLatestAttack(null);
    setLatestReplay(null);
    setSession(createAutonomousSession('hotel in Goa under 3000'));
  }, [resetArchitecture]);

  // 3. ATTACK SIMULATION RUNNER: Evaluates against active proposal, isolated from clean state
  const triggerAttack = useCallback(async (scenarioName: string) => {
    resetArchitecture();
    setArchState({
      aegis: 'active',
      growth: 'active',
      trust: 'blocked',
      decision: 'blocked',
      paymentGate: 'blocked',
      payment: 'idle',
      hold: 'blocked',
      ledger: 'active',
      replay: 'idle',
      activePath: 'fail',
    });

    let activeAttack: any = null;
    // Mutate session in isolated attack state
    setSession((prev) => {
      const attacked = simulateAttackOnSession(prev, scenarioName);
      activeAttack = attacked.attack;
      setLatestAttack(attacked.attack);
      return attacked;
    });

    // Optionally call backend attack API
    try {
      await api.runAttack(scenarioName);
    } catch {
      // Handled in autonomous session
    }

    setArchState((prev) => ({
      ...prev,
      hold: 'blocked',
      ledger: 'success',
    }));

    return activeAttack || session.attack;
  }, [resetArchitecture, session.attack]);

  // 4. CLEAR / RESTORE VERIFIED STATE
  const clearAttack = useCallback(() => {
    setLatestAttack(null);
    setSession((prev) => resetSessionAttack(prev));
    setArchState({
      aegis: 'active',
      growth: 'success',
      trust: 'success',
      decision: 'success',
      paymentGate: 'success',
      payment: 'success',
      hold: 'idle',
      ledger: 'success',
      replay: 'idle',
      activePath: 'pass',
    });
  }, []);

  // 4. REPLAY TRIGGER
  const triggerReplay = useCallback(async (txId: string) => {
    setActiveMode('REPLAY');
    const matchedEntry = session.ledger.entries.find((e) => e.id === txId || (e as any).transactionId === txId);
    const isPass = matchedEntry ? matchedEntry.status === 'VERIFIED' || (matchedEntry as any).outcome === 'AUTHORIZED' : true;

    setArchState({
      aegis: 'active',
      growth: 'active',
      trust: isPass ? 'success' : 'blocked',
      decision: isPass ? 'success' : 'blocked',
      paymentGate: isPass ? 'success' : 'blocked',
      payment: isPass ? 'success' : 'idle',
      hold: isPass ? 'idle' : 'blocked',
      ledger: 'success',
      replay: 'active',
      activePath: isPass ? 'pass' : 'fail',
    });

    try {
      const data = await api.getDecisionReplay(txId);
      setLatestReplay(data);
      return data;
    } catch {
      return matchedEntry;
    }
  }, [session.ledger.entries]);

  // Dual Demo Runners for Razorpay Acceptance & Blocking
  const runAcceptDemo = useCallback(async (queryText?: string) => {
    const q = queryText || session.rawQuery || 'hotel in Goa under 3000';
    await runQuery(q);
  }, [runQuery, session.rawQuery]);

  const runBlockDemo = useCallback(async (scenarioName: string = 'amount-escalation') => {
    return await triggerAttack(scenarioName);
  }, [triggerAttack]);

  // E-Commerce Marketplace Product Selection
  const selectProduct = useCallback((candidate: CandidateItem) => {
    setLatestAttack(null);
    setSession((prev) => selectCandidateInSession(prev, candidate));
  }, []);

  // E-Commerce Marketplace BUY NOW Flow: Product -> Purchase Proposal -> TRUST
  const buyNowProduct = useCallback((candidate: CandidateItem) => {
    setLatestAttack(null);
    setArchState({
      aegis: 'active',
      growth: 'success',
      trust: 'success',
      decision: 'success',
      paymentGate: 'success',
      payment: 'success',
      hold: 'idle',
      ledger: 'success',
      replay: 'idle',
      activePath: 'pass',
    });
    setSession((prev) => selectCandidateInSession(prev, candidate));
    setActiveTab('TRUST');
  }, [setActiveTab]);

  // 5. CANONICAL FULL DEMO RUNNER
  const runFullDemo = useCallback(async () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    resetArchitecture();

    // Canonical hotel demo
    const canonicalHotelSession = createAutonomousSession('hotel in Goa under 3000');
    setSession(canonicalHotelSession);

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    try {
      // 1. GROWTH
      setDemoPhase('GROWTH');
      setArchState((prev) => ({ ...prev, aegis: 'active', growth: 'active' }));
      await sleep(900);

      // 2. SELECTION
      setDemoPhase('SELECTION');
      setArchState((prev) => ({ ...prev, growth: 'success', decision: 'active' }));
      await sleep(900);

      // 3. TRUST
      setDemoPhase('TRUST');
      setArchState((prev) => ({ ...prev, trust: 'success' }));
      await sleep(900);

      // 4. PAYMENT GATE & PASS
      setDemoPhase('PAYMENT');
      setArchState((prev) => ({ ...prev, paymentGate: 'success', payment: 'success', activePath: 'pass' }));
      await sleep(1000);

      // 5. LEDGER
      setDemoPhase('LEDGER');
      setArchState((prev) => ({ ...prev, ledger: 'success' }));
      await sleep(900);

      // 6. ATTACK & INTERCEPTION
      setDemoPhase('ATTACK');
      setArchState((prev) => ({
        ...prev,
        trust: 'blocked',
        decision: 'blocked',
        paymentGate: 'blocked',
        payment: 'idle',
        hold: 'blocked',
        activePath: 'fail',
      }));

      // Apply attack to canonical session
      setSession((prev) => simulateAttackOnSession(prev, 'amount-escalation'));
      await sleep(1200);
    } finally {
      setIsDemoRunning(false);
      setDemoPhase(null);
    }
  }, [isDemoRunning, resetArchitecture]);

  // Initial intro animation on first load
  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('aegis_intro_seen');
    if (hasSeenIntro) {
      setIntroActive(false);
      return;
    }

    const steps = [
      () => setArchState((prev) => ({ ...prev, aegis: 'active' })),
      () => setArchState((prev) => ({ ...prev, growth: 'active' })),
      () => setArchState((prev) => ({ ...prev, trust: 'active' })),
      () => setArchState((prev) => ({ ...prev, decision: 'active' })),
      () => setArchState((prev) => ({ ...prev, paymentGate: 'active' })),
      () => setArchState((prev) => ({ ...prev, payment: 'success', activePath: 'pass' })),
      () => setArchState((prev) => ({ ...prev, ledger: 'success' })),
      () => {
        setArchState(defaultArchState);
        setIntroActive(false);
        sessionStorage.setItem('aegis_intro_seen', 'true');
      },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setIntroStep(currentStep);
        steps[currentStep]();
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <AegisContext.Provider
      value={{
        session,
        setSession,
        runQuery,
        resetSession,
        activeTab,
        setActiveTab,
        activeMode,
        setActiveMode,
        activeProductId: session.selectedCandidate?.id || 'PRD-01',
        setActiveProductId,
        activeQuery: session.rawQuery,
        setActiveQuery,
        latestRun,
        setLatestRun,
        latestAttack,
        setLatestAttack,
        latestReplay,
        setLatestReplay,
        archState,
        setArchState,
        resetArchitecture,
        introActive,
        introStep,
        isDemoRunning,
        demoPhase,
        runFullDemo,
        inspector,
        setInspector,
        triggerAttack,
        clearAttack,
        triggerReplay,
        runAcceptDemo,
        runBlockDemo,
        selectProduct,
        buyNowProduct,
      }}
    >
      {children}
    </AegisContext.Provider>
  );
};

export const useAegis = (): AegisContextValue => {
  const context = useContext(AegisContext);
  if (!context) {
    throw new Error('useAegis must be used within an AegisProvider');
  }
  return context;
};
