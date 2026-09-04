export interface CandidateAiFactors {
  intentMatch: number; // 0-100
  budgetFit: number; // 0-100
  productQuality: number; // 0-100
  merchantTrust: number; // 0-100
  availabilityScore: number; // 0-100
  fulfillmentScore: number; // 0-100
  catalogCompleteness: number; // 0-100
  aiDiscoverability: number; // 0-100
  decisionFactors: string[];
}

export interface CandidateItem {
  id: string;
  name: string;
  merchant: string;
  merchantId?: string;
  category: string;
  price: number;
  currency: string;
  location?: string;
  image?: string;
  rating?: number;
  reviewsCount?: number;
  availability?: string;
  attributes: Record<string, string>;
  delivery: string;
  description: string;
  selectionScore: number; // 0-100
  selectionProbability?: string;
  rank: number;
  isYou?: boolean;
  isAiSelected?: boolean;
  aiFactors?: CandidateAiFactors;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'query' | 'product' | 'merchant' | 'attribute' | 'competitor' | 'QUERY' | 'PRODUCT' | 'MERCHANT' | 'ATTRIBUTE' | 'COMPETITOR' | 'CATEGORY' | 'DELIVERY';
  x: number;
  y: number;
  radius?: number;
  price?: string;
  rank?: string;
  prob?: string;
  merchant?: string;
  trustScore?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  weight?: number;
}

export interface LedgerEntryRecord {
  id: string;
  transactionId: string;
  amount: number;
  outcome: 'AUTHORIZED' | 'BLOCKED';
  status?: 'VERIFIED' | 'BLOCKED';
  risk: number;
  policy: 'PASS' | 'BLOCK';
  payment: 'CREATED' | 'NONE';
  ledger?: '✓';
  currentHash: string;
  previousHash: string;
  time: string;
  description: string;
  steps: Array<{ num: string; name: string; status: '✓' | '✕' }>;
}

export interface AegisSession {
  sessionId?: string;
  rawQuery: string;
  intent: {
    id: string;
    intentId?: string;
    category: string;
    location: string | null;
    maxAmount: number | null;
    currency: string;
    constraints: Array<{ key: string; value: string }>;
    rawText: string;
    source: string;
    sha256Hash?: string;
  };
  candidates: CandidateItem[];
  selectedCandidate: CandidateItem | null;
  growthAnalysis: {
    baselineScore: number;
    simulatedScore: number;
    rank: number;
    currentProduct: {
      name: string;
      checklist: Array<{ label: string; valid: boolean; note?: string }>;
    };
    interventions: Array<{ id: string; label: string; upliftScore: number; active: boolean }>;
    signals: Array<{ label: string; score: number; raw: number }>;
  };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  rootIntent: {
    id: string;
    status: 'VERIFIED' | 'PENDING' | 'INVALID';
    category: string;
    location: string;
    budget: number;
    currency: string;
    dates: string;
    sha256Hash: string;
    hmacSignature: string;
    allowedMerchants: string[];
  };
  proposal: {
    id: string;
    amount: number;
    currency: string;
    recipient: string;
    merchant?: string;
    merchantId: string;
    productId: string;
    productName: string;
    category: string;
  } | null;
  derivation: {
    chainId: string;
    status: 'VALID' | 'BROKEN';
    steps: Array<{
      id: string;
      action: string;
      time: string;
      status: 'VALID' | 'BROKEN' | 'PASS' | 'FAIL';
      description?: string;
      step?: string;
    }>;
  };
  verification: {
    status: 'PASS' | 'FAIL';
    checks: Array<{ name: string; status: 'PASS' | 'FAIL'; detail: string }>;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCK';
    reason: string;
  };
  risk: {
    score: number;
    level: string;
    breakdown: Record<string, number>;
  };
  policy: {
    decision: 'PASS' | 'BLOCK';
    rules: Array<{ rule: string; passed: boolean; message: string }>;
  };
  payment: {
    status: 'AUTHORIZED' | 'BLOCKED' | 'HOLD' | 'IDLE';
    orderId: string | null;
    amount: number;
    currency: string;
    summary: string;
  };
  attack: {
    active: boolean;
    scenario: string | null;
    attackType: string | null;
    proposedAmount: number;
    authorizedAmount: number;
    parentStep: string;
    recipient: string;
    checks: {
      rootIntent: boolean;
      derivationBroken: boolean;
      amountViolation: boolean;
      recipientViolation: boolean;
      policyBlock: boolean;
      riskScore: number;
    };
    paymentBlocked: boolean;
    razorpayOrder: string | null;
  } | null;
  ledger: {
    chainStatus: 'VALID' | 'TAMPERED';
    blocksCount: number;
    entries: LedgerEntryRecord[];
  };
  mode: 'LIVE' | 'REPLAY';
  status: 'IDLE' | 'PARSING' | 'READY' | 'ERROR';
  statusMessage?: string;
  events: Array<{
    id: string;
    stage: string;
    time: string;
    message: string;
    type: string;
    status: 'SUCCESS' | 'BLOCKED' | 'INFO';
  }>;
}
