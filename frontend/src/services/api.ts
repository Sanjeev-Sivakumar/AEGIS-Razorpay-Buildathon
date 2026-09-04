import axios from 'axios';
import type {
  SystemHealth,
  QueryIntent,
  AgentSession,
  AgentEvent,
  AgentRunResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const api = {
  // System Health
  getHealth: async (): Promise<SystemHealth> => {
    const res = await apiClient.get<SystemHealth>('/health');
    return res.data;
  },

  // Intent Operations
  createIntent: async (text: string): Promise<QueryIntent> => {
    const res = await apiClient.post<QueryIntent>('/intent/create', { text });
    return res.data;
  },
  getIntent: async (id: string): Promise<QueryIntent> => {
    const res = await apiClient.get<QueryIntent>(`/intent/${id}`);
    return res.data;
  },
  listIntents: async (limit: number = 10): Promise<QueryIntent[]> => {
    const res = await apiClient.get<QueryIntent[]>(`/intent?limit=${limit}`);
    return res.data;
  },

  // Agent Operations
  runAgent: async (input: string): Promise<AgentRunResponse> => {
    const res = await apiClient.post<AgentRunResponse>('/agent/run', { input });
    return res.data;
  },
  getSession: async (sessionId: string): Promise<AgentSession> => {
    const res = await apiClient.get<AgentSession>(`/agent/${sessionId}`);
    return res.data;
  },
  getSessionEvents: async (sessionId: string): Promise<AgentEvent[]> => {
    const res = await apiClient.get<AgentEvent[]>(`/agent/${sessionId}/events`);
    return res.data;
  },
  listSessions: async (limit: number = 20): Promise<AgentSession[]> => {
    const res = await apiClient.get<AgentSession[]>(`/agent/sessions?limit=${limit}`);
    return res.data;
  },
  listAllEvents: async (state?: string, limit: number = 50): Promise<AgentEvent[]> => {
    const url = state ? `/agent/events?state=${state}&limit=${limit}` : `/agent/events?limit=${limit}`;
    const res = await apiClient.get<AgentEvent[]>(url);
    return res.data;
  },

  // Phase 2: Trust Engine & Commerce
  getRootIntent: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/trust/root-intent/${id}`);
    return res.data;
  },
  getDerivationChain: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/trust/derivation/${id}`);
    return res.data;
  },
  getAuthorization: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/commerce/payment/${id}`);
    return res.data;
  },
  listProposals: async (limit: number = 20): Promise<any[]> => {
    const res = await apiClient.get(`/commerce/payment/proposals?limit=${limit}`);
    return res.data;
  },

  // Phase 3: Growth Intelligence
  predictGrowth: async (query: string, productId: string) => {
    const res = await apiClient.post('/growth/predict', { query, product_id: productId });
    return res.data;
  },
  rankGrowth: async (query: string, productIds: string[]) => {
    const res = await apiClient.post('/growth/rank', { query, product_ids: productIds });
    return res.data;
  },
  simulateCounterfactual: async (query: string, productId: string) => {
    const res = await apiClient.post('/growth/simulate', { query, product_id: productId });
    return res.data;
  },
  applyOptimization: async (query: string, productId: string, scenarioChange?: string) => {
    const res = await apiClient.post('/growth/optimize', {
      query,
      product_id: productId,
      scenario_change: scenarioChange,
    });
    return res.data;
  },
  getMerchantGrowth: async (merchantId: string) => {
    const res = await apiClient.get(`/growth/merchant/${merchantId}`);
    return res.data;
  },

  // Phase 4: Attack Lab, Audit Ledger & Decision Replay
  listAttackScenarios: async () => {
    const res = await apiClient.get('/security/scenarios');
    return res.data;
  },
  runAttack: async (scenario: string, customInstruction?: string) => {
    const res = await apiClient.post('/security/attack/run', {
      scenario,
      custom_instruction: customInstruction,
    });
    return res.data;
  },
  listAttacks: async (limit: number = 20) => {
    const res = await apiClient.get(`/security/attacks?limit=${limit}`);
    return res.data;
  },
  getAttack: async (attackId: string) => {
    const res = await apiClient.get(`/security/attack/${attackId}`);
    return res.data;
  },
  getLedgerTail: async (limit: number = 20) => {
    const res = await apiClient.get(`/ledger?limit=${limit}`);
    return res.data;
  },
  getLedgerEntry: async (transactionId: string) => {
    const res = await apiClient.get(`/ledger/${transactionId}`);
    return res.data;
  },
  verifyLedgerChain: async () => {
    const res = await apiClient.post('/ledger/verify');
    return res.data;
  },
  getDecisionReplay: async (transactionId: string) => {
    const res = await apiClient.get(`/replay/${transactionId}`);
    return res.data;
  },

  // Phase 5: Observability, KPIs & Demo Automation
  getDemoKpis: async () => {
    const res = await apiClient.get('/demo/kpis');
    return res.data;
  },
  getDemoStatus: async () => {
    const res = await apiClient.get('/demo/status');
    return res.data;
  },
  runFullDemo: async () => {
    const res = await apiClient.post('/demo/full');
    return res.data;
  },
  runGrowthDemo: async () => {
    const res = await apiClient.post('/demo/growth');
    return res.data;
  },
  runAttackDemo: async (scenario: string = 'amount-escalation') => {
    const res = await apiClient.post(`/demo/attack?scenario=${encodeURIComponent(scenario)}`);
    return res.data;
  },

  // Razorpay Test API & Test Matrix
  getRazorpayConfig: async () => {
    const res = await apiClient.get('/commerce/razorpay/config');
    return res.data;
  },
  createRazorpayOrder: async (amount: number, currency: string = 'INR', receipt?: string) => {
    const res = await apiClient.post('/commerce/razorpay/create-order', { amount, currency, receipt });
    return res.data;
  },
  verifyRazorpayPayment: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    authorization_id?: string;
  }) => {
    const res = await apiClient.post('/commerce/razorpay/verify', payload);
    return res.data;
  },
  getRazorpayTestMatrix: async () => {
    const res = await apiClient.get('/commerce/razorpay/test-matrix');
    return res.data;
  },
};

