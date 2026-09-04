export type AgentStateType =
  | 'IDLE'
  | 'PERCEIVE'
  | 'ANALYZE'
  | 'DECIDE'
  | 'ACT'
  | 'COMPLETED'
  | 'FAILED'
  | 'VERIFY'
  | 'PAY'
  | 'RESULT';

export interface SystemHealth {
  status: string;
  backend: string;
  sqlite: string;
  groq: string;
  database: string;
  environment: string;
  phase: string;
  version: string;
}

export interface QueryIntent {
  id: string;
  raw_text: string;
  category: string | null;
  location: string | null;
  max_budget: number | null;
  currency: string;
  attributes: Array<{ key: string; value: string }>;
  source: 'groq' | 'fallback';
  created_at: string;
}

export interface AgentEvent {
  id: string;
  session_id: string;
  event_type: string;
  state: AgentStateType;
  message: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AgentSession {
  id: string;
  status: string;
  current_state: AgentStateType;
  created_at: string;
  updated_at: string;
  events: AgentEvent[];
}

export interface AgentRunResponse {
  session_id: string;
  status: string;
  current_state: AgentStateType;
  intent: {
    category: string | null;
    location: string | null;
    max_budget: number | null;
    currency: string;
    attributes: Array<{ key: string; value: string }>;
    date_constraint?: string | null;
    source: string;
    raw_text: string;
  };
  events: AgentEvent[];
  result: {
    action?: string;
    execution_status?: string;
    candidates?: Array<{
      product_id: string;
      merchant_id: string;
      merchant_name: string;
      name: string;
      category: string;
      price: number;
      currency: string;
      description?: string;
      attributes?: Record<string, string>;
    }>;
    candidates_count?: number;
    proposal?: {
      id: string;
      amount: number;
      currency: string;
      recipient: string;
    };
    authorization?: {
      id: string;
      decision: 'PASS' | 'REVIEW' | 'BLOCK';
      policy_result: string;
      risk_score: number;
      risk_level: 'SAFE' | 'REVIEW' | 'HIGH' | 'BLOCK';
      razorpay_order_id: string | null;
      reason: string;
    };
    error?: string;
  };
}

export interface RootIntentCertificate {
  id: string;
  session_id: string;
  intent_id: string | null;
  category: string;
  location: string | null;
  max_amount: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  recipient_constraints: Record<string, any>;
  original_text: string;
  immutable_hash: string;
  signature: string;
  status: string;
  created_at: string;
}

export interface DerivationStep {
  id: string;
  chain_id: string;
  sequence: number;
  action: string;
  description: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  previous_step_hash: string;
  step_hash: string;
  created_at: string;
}

export interface DerivationChain {
  id: string;
  session_id: string;
  root_intent_id: string;
  status: string;
  final_hash: string | null;
  created_at: string;
  steps: DerivationStep[];
}

export interface PaymentProposal {
  id: string;
  session_id: string;
  root_intent_id: string;
  merchant_id: string;
  product_id: string;
  amount: number;
  currency: string;
  category: string;
  recipient: string;
  description?: string;
  derivation_chain_id?: string;
  created_at: string;
}

export interface PaymentAuthorization {
  id: string;
  payment_proposal_id: string;
  verification_id?: string | null;
  policy_result: string;
  risk_score: number;
  risk_level: 'SAFE' | 'REVIEW' | 'HIGH' | 'BLOCK';
  decision: 'PASS' | 'REVIEW' | 'BLOCK';
  reason: string;
  razorpay_order_id?: string | null;
  created_at: string;
}

// Phase 3: Growth Intelligence & Counterfactual Types
export interface GrowthContextFeatures {
  semantic_match: number;
  price_fit: number;
  attribute_quality: number;
  delivery_fit: number;
}

export interface GrowthPredictionResult {
  product_id: string;
  product_name?: string;
  merchant_name?: string;
  selection_probability: number;
  rank?: number | null;
  context_features: GrowthContextFeatures;
  model_version: string;
  device: string;
  latency_ms: number;
}

export interface CounterfactualScenario {
  change: string;
  action_type: string;
  target_field: string;
  predicted_probability: number;
  uplift: number;
  details: Record<string, any>;
}

export interface CounterfactualSimulationResult {
  product_id: string;
  product_name: string;
  query: string;
  baseline_probability: number;
  scenarios: CounterfactualScenario[];
  recommended_action: string;
  model_version: string;
}

export interface OptimizationApplyResult {
  optimization_id: string;
  product_id: string;
  action_type: string;
  target_field: string;
  baseline_probability: number;
  optimized_probability: number;
  predicted_uplift: number;
  applied_change: Record<string, any>;
  model_version: string;
  created_at: string;
}

// Phase 4: Attack Lab, Audit Ledger & Replay Types
export interface AttackScenario {
  name: string;
  display_title: string;
  description: string;
  attack_type: string;
}

export interface AttackResult {
  attack_id: string;
  scenario: string;
  status: string;
  root_intent_valid: boolean;
  derivation_valid: boolean;
  verification_result: string;
  policy_result: string;
  risk_score: number;
  payment_created: boolean;
  explanation: string;
  ledger_entry_id?: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  session_id?: string | null;
  root_intent_id?: string | null;
  merchant_id?: string | null;
  product_id?: string | null;
  amount?: number | null;
  currency: string;
  recipient?: string | null;
  outcome: string;
  risk_score: number;
  policy_result: string;
  verification_result: string;
  razorpay_order_id?: string | null;
  attack_scenario?: string | null;
  previous_hash: string;
  current_hash: string;
  created_at: string;
}

export interface LedgerVerificationResult {
  valid: boolean;
  entries_checked: number;
  broken_entries: string[];
  details?: string | null;
}

export interface ReplayStep {
  stage: string;
  title: string;
  status: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface DecisionReplay {
  transaction_id: string;
  outcome: string;
  final_decision: string;
  payment_created: boolean;
  razorpay_order_id?: string | null;
  steps: ReplayStep[];
}

// Phase 5: Demo & Observability Types
export interface SystemKpiData {
  selection_probability: number;
  selection_probability_label: string;
  verified_transactions: number;
  blocked_transactions: number;
  trust_score: number;
  trust_score_level: string;
  payment_gate_status: string;
  razorpay_mode: string;
  total_records_audited: number;
}

export interface SystemComponentStatuses {
  agent_core: string;
  growth_ml: string;
  graphsage: string;
  trust_engine: string;
  policy_engine: string;
  payment_gate: string;
  razorpay: string;
  audit_ledger: string;
  ledger_blocks_verified: number;
}

export interface FullDemoResponse {
  status: string;
  message: string;
  legitimate_purchase: Record<string, any>;
  attack_interception: Record<string, any>;
  ledger_verification: LedgerVerificationResult;
  decision_replay: Record<string, any>;
}
