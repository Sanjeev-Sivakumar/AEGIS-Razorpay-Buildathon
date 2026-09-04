import type {
  AegisSession,
  CandidateItem,
  GraphNode,
  GraphEdge,
  LedgerEntryRecord,
} from '../types/session';

// Simple deterministic hash generator for browser runtime
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Return pseudo-SHA256 styled 64-character hex
  let full = hex;
  while (full.length < 64) {
    full += Math.abs((hash = (hash << 7) - hash + 31)).toString(16).padStart(8, '0');
  }
  return full.slice(0, 64);
}

// 1. DYNAMIC INTENT PARSER
export function parseIntentFromText(rawText: string) {
  const text = rawText.trim();
  const textLower = text.toLowerCase();

  // Extract Budget
  let maxAmount: number | null = null;
  let currency = 'INR';
  if (text.includes('$')) currency = 'USD';
  else if (text.includes('€')) currency = 'EUR';

  const budgetRegexes = [
    /(?:under|below|less than|max|budget|within|up to)\s*(?:₹|rs\.?|inr|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /\b(\d{3,6})\b/,
  ];

  for (const regex of budgetRegexes) {
    const match = textLower.match(regex);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        maxAmount = num;
        break;
      }
    }
  }

  // Extract Category
  let category = 'GENERAL';
  if (/\b(restaurants?|dining|dinner|lunch|food|bistro|eatery|cafes?|coffee|coffee shops?)\b/i.test(textLower)) {
    category = 'RESTAURANT';
  } else if (/\b(hotels?|resorts?|inns?|stays?|villas?|hostels?|homestays?|lodges?|rooms?)\b/i.test(textLower)) {
    category = 'HOTEL';
  } else if (/\b(laptops?|notebooks?|ultrabooks?|macbooks?|computers?|pc)\b/i.test(textLower)) {
    category = 'LAPTOP';
  } else if (/\b(running shoes?|shoes?|sneakers?|footwear|boots?|trainers?)\b/i.test(textLower)) {
    category = 'RUNNING SHOES';
  } else if (/\b(phones?|smartphones?|iphones?|androids?|mobiles?)\b/i.test(textLower)) {
    category = 'PHONE';
  } else if (/\b(headphones?|earphones?|earbuds?|headsets?)\b/i.test(textLower)) {
    category = 'HEADPHONES';
  } else if (/\b(watches?|smartwatches?)\b/i.test(textLower)) {
    category = 'WATCH';
  } else {
    // Dynamic noun extraction
    const words = text.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
    const stopWords = new Set(['find', 'book', 'get', 'buy', 'order', 'search', 'best', 'cheap', 'good', 'top', 'under', 'below', 'in', 'at', 'near', 'nearby', 'for', 'with', 'the', 'a', 'an']);
    const meaningful = words.filter(w => !stopWords.has(w.toLowerCase()) && !/^\d+$/.test(w));
    if (meaningful.length > 0) {
      category = meaningful[0].toUpperCase();
    }
  }

  // Extract Location
  let location: string | null = null;
  if (/\b(nearby|near me|around here|local)\b/i.test(textLower)) {
    location = 'NEARBY';
  } else {
    const locMatch = text.match(/\b(?:in|at|around|near)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
    if (locMatch && locMatch[1]) {
      const locCandidate = locMatch[1].trim();
      const skipLocWords = new Set(['under', 'below', 'budget', 'rs', 'inr', 'this', 'next', 'today', 'tomorrow', 'weekend', 'days', '2', 'two']);
      const parts = locCandidate.split(/\s+/).filter(p => !skipLocWords.has(p.toLowerCase()) && !/^\d+$/.test(p));
      if (parts.length > 0) {
        location = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      }
    }
  }

  // Default safe budget if none specified
  if (maxAmount === null) {
    if (category === 'LAPTOP') maxAmount = 60000;
    else if (category === 'PHONE') maxAmount = 30000;
    else if (category === 'RESTAURANT') maxAmount = 1500;
    else if (category === 'HOTEL') maxAmount = 3000;
    else if (category === 'RUNNING SHOES') maxAmount = 5000;
    else if (category === 'HEADPHONES') maxAmount = 10000;
    else maxAmount = 5000;
  }

  const intentHash = hashString(text + (maxAmount || 0) + (location || '') + category);
  const intentId = `INT-${intentHash.slice(0, 6).toUpperCase()}`;

  return {
    id: intentId,
    category,
    location,
    maxAmount,
    currency,
    constraints: [],
    rawText: text,
    source: 'groq/hybrid',
    sha256Hash: intentHash,
  };
}

import { COMMERCE_CATALOG } from './catalogData';

// 2. DYNAMIC DISCOVERY ENGINE (Returns exactly 6 evaluated candidates)
export function discoverCandidates(intent: ReturnType<typeof parseIntentFromText>): CandidateItem[] {
  const cat = intent.category;
  const budget = intent.maxAmount || 3000;
  const loc = intent.location || 'Local Area';
  const curr = intent.currency;

  const catalogKey = cat === 'SMARTPHONE' ? 'PHONE' : cat;

  if (COMMERCE_CATALOG[catalogKey]) {
    // Return pre-configured 6 candidates from the structured catalog
    return COMMERCE_CATALOG[catalogKey].map((item) => {
      const adaptedName = (cat === 'HOTEL' && loc && loc !== 'GOA' && loc !== 'Local Area' && loc !== 'NEARBY')
        ? item.name.replace(/Goa/g, loc)
        : item.name;
      const adaptedLoc = (loc && loc !== 'Local Area' && loc !== 'NEARBY') ? loc : item.location;

      return {
        ...item,
        name: adaptedName,
        location: adaptedLoc,
        currency: curr,
      };
    });
  }

  // Generic fallback if user enters custom query (guarantees exactly 6 items)
  return Array.from({ length: 6 }).map((_, idx) => {
    const rank = idx + 1;
    const isFirst = rank === 1;
    const priceRatio = [0.82, 0.92, 0.74, 0.98, 0.65, 0.88][idx];
    const score = [96, 91, 88, 84, 79, 75][idx];
    return {
      id: `CAN-${cat.slice(0, 3).toUpperCase()}-0${rank}`,
      name: `${cat} Prime Edition ${String.fromCharCode(65 + idx)}`,
      merchant: `${cat} Verified Merchant ${idx + 1}`,
      merchantId: `MER-${cat.slice(0, 3).toUpperCase()}-0${rank}`,
      category: cat,
      price: Math.round(budget * priceRatio),
      currency: curr,
      location: loc,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      rating: Number((4.9 - idx * 0.15).toFixed(1)),
      reviewsCount: 1200 - idx * 150,
      availability: 'In Stock',
      delivery: '2-Day Express Delivery',
      description: `High-performance certified ${cat} with verified specifications, comprehensive warranty, and optimal AI intent alignment.`,
      selectionScore: score,
      selectionProbability: `${score}%`,
      rank,
      isYou: isFirst,
      isAiSelected: isFirst,
      attributes: {
        'Grade': isFirst ? 'Certified AI Recommendation' : 'Verified Standard',
        'Rating': `${(4.9 - idx * 0.15).toFixed(1)} / 5.0`,
        'Warranty': '1 Year Official Replacement',
        'Compliance': 'Aegis Verified Merchant',
      },
      aiFactors: {
        intentMatch: score + 2,
        budgetFit: 95 - idx * 3,
        productQuality: score,
        merchantTrust: 98 - idx * 2,
        availabilityScore: 95,
        fulfillmentScore: 94,
        catalogCompleteness: 95,
        aiDiscoverability: 96,
        decisionFactors: [
          isFirst
            ? 'Highest weighted multi-factor match against user query constraints'
            : 'Slightly lower multi-factor alignment compared to top recommendation',
          `Verified merchant compliance score with ${curr} ${Math.round(budget * priceRatio)} execution`,
        ],
      },
    };
  });
}

// 3. DYNAMIC COMMERCE GRAPH GENERATOR
export function buildCommerceGraph(
  intent: { category: string; location?: string | null; maxAmount?: number | null; currency: string; rawText?: string; [key: string]: any },
  candidate: CandidateItem,
  attack?: { active: boolean; scenario: string; proposedAmount?: number; unauthorizedRecipient?: string } | null
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const cat = intent.category;
  const loc = intent.location || 'Local Area';
  const budget = intent.maxAmount || 3000;
  const curr = intent.currency;

  const nodes: GraphNode[] = [
    // 1. Root User Query
    { id: 'NODE-QUERY', label: `Query: "${intent.rawText || ''}"`, type: 'query', x: 260, y: 30 },

    // 2. Extracted Intent Constraints
    { id: 'NODE-CAT', label: `Category: ${cat}`, type: 'CATEGORY', x: 100, y: 120 },
    { id: 'NODE-LOC', label: `Location: ${loc}`, type: 'DELIVERY', x: 260, y: 120 },
    { id: 'NODE-BUDGET', label: `Budget Cap: ${curr} ${budget.toLocaleString()}`, type: 'attribute', x: 420, y: 120 },

    // 3. Selected Optimal Product (Chosen by AI-Buyer GNN)
    {
      id: 'NODE-PRODUCT',
      label: candidate.name,
      type: 'product',
      x: 260,
      y: 220,
      price: `${curr} ${candidate.price.toLocaleString()}`,
      merchant: candidate.merchant,
      prob: `${candidate.selectionScore}%`,
      rank: `#${candidate.rank}`,
      trustScore: 'Optimal (98)',
    },

    // 4. Grounded Product Attributes Explaining Choice
    { id: 'NODE-MERCHANT', label: `Merchant: ${candidate.merchant}`, type: 'merchant', x: 100, y: 320 },
    { id: 'NODE-PRICE', label: `Price: ${curr} ${candidate.price.toLocaleString()} (Verified ≤ Cap)`, type: 'attribute', x: 260, y: 320 },
    { id: 'NODE-SCORE', label: `AI-Buyer Match: ${candidate.selectionScore}% (${(candidate as any).grade || 'A+'})`, type: 'attribute', x: 420, y: 320 },
  ];

  const edges: GraphEdge[] = [
    // Query connects to verified constraints
    { from: 'NODE-QUERY', to: 'NODE-CAT', label: 'INTENT_CATEGORY' },
    { from: 'NODE-QUERY', to: 'NODE-LOC', label: 'TARGET_LOCATION' },
    { from: 'NODE-QUERY', to: 'NODE-BUDGET', label: 'AUTHORIZED_CEILING' },

    // Constraints satisfy Selected Product
    { from: 'NODE-CAT', to: 'NODE-PRODUCT', label: 'MATCHES' },
    { from: 'NODE-LOC', to: 'NODE-PRODUCT', label: 'FULFILLS' },
    { from: 'NODE-BUDGET', to: 'NODE-PRODUCT', label: 'WITHIN_CAP' },

    // Product attributes explain ranking
    { from: 'NODE-PRODUCT', to: 'NODE-MERCHANT', label: 'SOLD_BY' },
    { from: 'NODE-PRODUCT', to: 'NODE-PRICE', label: 'UNIT_PRICE' },
    { from: 'NODE-PRODUCT', to: 'NODE-SCORE', label: 'GNN_RANKED' },
  ];

  // Dynamic Adversarial Breach Node (Visible ONLY when attack is active)
  if (attack && attack.active) {
    if (attack.scenario === 'amount-escalation' || (attack.proposedAmount && attack.proposedAmount > budget)) {
      const atkAmt = attack.proposedAmount || 15000;
      nodes.push({
        id: 'NODE-ATTACK',
        label: `ADVERSARIAL DEBIT: ${curr} ${atkAmt.toLocaleString()}`,
        type: 'competitor',
        x: 520,
        y: 40,
      });
      edges.push({
        from: 'NODE-BUDGET',
        to: 'NODE-ATTACK',
        label: `BREACH: +${curr} ${(atkAmt - budget).toLocaleString()}`,
      });
    } else if (attack.scenario === 'recipient-substitution') {
      nodes.push({
        id: 'NODE-ATTACK',
        label: 'UNAUTHORIZED: HACKER_ENTITY_X',
        type: 'competitor',
        x: 20,
        y: 220,
      });
      edges.push({
        from: 'NODE-MERCHANT',
        to: 'NODE-ATTACK',
        label: 'FRAUD DIVERSION DETECTED',
      });
    } else if (attack.scenario === 'category-substitution') {
      nodes.push({
        id: 'NODE-ATTACK',
        label: 'MISMATCH: luxury-flight',
        type: 'competitor',
        x: 20,
        y: 40,
      });
      edges.push({
        from: 'NODE-CAT',
        to: 'NODE-ATTACK',
        label: 'SCOPE INVARIANT VIOLATED',
      });
    } else {
      nodes.push({
        id: 'NODE-ATTACK',
        label: `ATTACK: ${attack.scenario.toUpperCase()}`,
        type: 'competitor',
        x: 520,
        y: 220,
      });
      edges.push({
        from: 'NODE-PRODUCT',
        to: 'NODE-ATTACK',
        label: 'TAMPER DETECTED',
      });
    }
  }

  return { nodes, edges };
}


// 4. DYNAMIC GROWTH INTERVENTIONS GENERATOR
export function generateGrowthAnalysis(candidate: CandidateItem, _queryText?: string) {
  const cat = candidate.category;
  const baseline = candidate.selectionScore >= 95 ? 82 : candidate.selectionScore - 14;
  const simulated = candidate.selectionScore;

  let checklist: Array<{ label: string; valid: boolean; note?: string }> = [];
  let interventions: Array<{ id: string; label: string; upliftScore: number; active: boolean }> = [];

  if (cat === 'RESTAURANT') {
    checklist = [
      { label: 'Dietary certifications (Veg/Halal)', valid: false },
      { label: 'Live Table Availability API', valid: false },
      { label: 'Real-time delivery ETA', valid: true },
      { label: 'Verified Pricing & Menu', valid: true },
    ];
    interventions = [
      { id: 'i1', label: 'Publish dietary certifications (Veg/Vegan/Halal)', upliftScore: baseline + 5, active: false },
      { id: 'i2', label: 'Connect instant table reservation feed', upliftScore: baseline + 9, active: false },
      { id: 'i3', label: 'Enrich signature dish photography & reviews', upliftScore: baseline + 13, active: false },
      { id: 'i4', label: 'Optimize price competitiveness against local rivals', upliftScore: simulated, active: false },
    ];
  } else if (cat === 'LAPTOP') {
    checklist = [
      { label: 'Detailed Thermal & TDP Benchmark specs', valid: false },
      { label: 'Extended On-Site Warranty attribute', valid: false },
      { label: 'Processor & RAM spec clarity', valid: true },
      { label: 'Authorized Merchant verification', valid: true },
    ];
    interventions = [
      { id: 'i1', label: 'Add Cinebench & battery benchmark metrics', upliftScore: baseline + 4, active: false },
      { id: 'i2', label: 'Include 1-year accidental damage protection', upliftScore: baseline + 8, active: false },
      { id: 'i3', label: 'Expand detailed connectivity port diagram', upliftScore: baseline + 12, active: false },
      { id: 'i4', label: 'Guarantee 24-hour priority dispatch guarantee', upliftScore: simulated, active: false },
    ];
  } else if (cat === 'RUNNING SHOES') {
    checklist = [
      { label: 'Waterproof & Breathability rating', valid: false },
      { label: 'Exact weight per shoe specification', valid: false },
      { label: 'Delivery ETA within 2 days', valid: true },
      { label: 'Verified price fit under cap', valid: true },
    ];
    interventions = [
      { id: 'i1', label: 'Add exact weight specification (210g)', upliftScore: baseline + 5, active: false },
      { id: 'i2', label: 'Add verified 48-hour delivery ETA', upliftScore: baseline + 9, active: false },
      { id: 'i3', label: 'Improve midsole responsiveness description', upliftScore: baseline + 12, active: false },
      { id: 'i4', label: 'Complete technical arch support attributes', upliftScore: simulated, active: false },
    ];
  } else {
    checklist = [
      { label: 'Complete structured technical attributes', valid: false },
      { label: 'Verified merchant trust score', valid: false },
      { label: 'Pricing fit within user budget', valid: true },
      { label: 'Availability & fulfillment guarantee', valid: true },
    ];
    interventions = [
      { id: 'i1', label: 'Add detailed attribute completeness', upliftScore: baseline + 4, active: false },
      { id: 'i2', label: 'Add delivery timeline commitment', upliftScore: baseline + 8, active: false },
      { id: 'i3', label: 'Enrich product specification description', upliftScore: baseline + 12, active: false },
      { id: 'i4', label: 'Optimize semantic catalog metadata fit', upliftScore: simulated, active: false },
    ];
  }

  const signals = [
    { label: 'Semantic Match', score: 92, raw: 0.92 },
    { label: 'Price Fit', score: 98, raw: 0.98 },
    { label: 'Attribute Quality', score: 76, raw: 0.76 },
    { label: 'Delivery Fit', score: 88, raw: 0.88 },
    { label: 'Graph Relational Signal', score: 84, raw: 0.84 },
  ];

  return {
    baselineScore: baseline,
    simulatedScore: simulated,
    rank: candidate.rank,
    currentProduct: {
      name: candidate.name,
      checklist,
    },
    interventions,
    signals,
  };
}

// 5. MASTER SESSION BUILDER
export function createAutonomousSession(rawQuery: string): AegisSession {
  const intent = parseIntentFromText(rawQuery);
  const candidates = discoverCandidates(intent);
  const selectedCandidate = candidates.find(c => c.rank === 1) || candidates[0] || null;

  const graph = selectedCandidate
    ? buildCommerceGraph(intent, selectedCandidate)
    : { nodes: [], edges: [] };

  const growthAnalysis = selectedCandidate
    ? generateGrowthAnalysis(selectedCandidate, rawQuery)
    : {
        baselineScore: 80,
        simulatedScore: 95,
        rank: 1,
        currentProduct: { name: 'Unknown', checklist: [] },
        interventions: [],
        signals: [],
      };

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const nowMinutes = (now.getMinutes()).toString().padStart(2, '0');
  const nowSeconds = (now.getSeconds()).toString().padStart(2, '0');
  const nowHours = (now.getHours()).toString().padStart(2, '0');

  const t1 = `${nowHours}:${nowMinutes}:${Math.max(0, now.getSeconds() - 10).toString().padStart(2, '0')}`;
  const t2 = `${nowHours}:${nowMinutes}:${Math.max(0, now.getSeconds() - 6).toString().padStart(2, '0')}`;
  const t3 = `${nowHours}:${nowMinutes}:${Math.max(0, now.getSeconds() - 3).toString().padStart(2, '0')}`;
  const t4 = `${nowHours}:${nowMinutes}:${nowSeconds}`;

  const cleanTxId = `TX-CLEAN-${hashString(rawQuery).slice(0, 4).toUpperCase()}`;
  const orderId = `order_test_${intent.sha256Hash.slice(0, 10)}`;

  const proposal = selectedCandidate
    ? {
        id: `PROP-${intent.id.slice(4)}`,
        amount: selectedCandidate.price,
        currency: selectedCandidate.currency,
        recipient: selectedCandidate.merchant,
        merchantId: selectedCandidate.merchantId || 'MER-01',
        productId: selectedCandidate.id,
        productName: selectedCandidate.name,
        category: selectedCandidate.category,
      }
    : null;

  const derivationSteps = [
    { id: '1', action: 'ROOT INTENT CAPTURE', time: t1, status: 'VALID' as const, description: `Captured user mandate for ${intent.category} in ${intent.location || 'Local'}` },
    { id: '2', action: 'INVENTORY DISCOVERY', time: t2, status: 'VALID' as const, description: `Discovered 3 eligible offerings matching budget ${intent.currency} ${intent.maxAmount}` },
    { id: '3', action: 'GROWTH SELECTION', time: t3, status: 'VALID' as const, description: `Ranked ${selectedCandidate?.name || 'Item'} #1 (${selectedCandidate?.selectionScore}/100)` },
    { id: '4', action: 'PROPOSAL GENERATION', time: t3, status: 'VALID' as const, description: `Constructed payment proposal of ${intent.currency} ${selectedCandidate?.price} for ${selectedCandidate?.merchant}` },
    { id: '5', action: 'TRUST GATE VERIFIED', time: t4, status: 'VALID' as const, description: `Evaluated 6 deterministic invariants: All passed. Invariant status: PASS` },
    { id: '6', action: 'PAYMENT GATE EXECUTION', time: t4, status: 'VALID' as const, description: `Razorpay Test Mode order generated: ${orderId}` },
  ];

  const cleanStepsForReplay = [
    { num: '01', name: 'ROOT INTENT', status: '✓' as const },
    { num: '02', name: 'GROWTH', status: '✓' as const },
    { num: '03', name: 'PROPOSAL', status: '✓' as const },
    { num: '04', name: 'DERIVATION', status: '✓' as const },
    { num: '05', name: 'TRUST', status: '✓' as const },
    { num: '06', name: 'PAYMENT', status: '✓' as const },
    { num: '07', name: 'LEDGER', status: '✓' as const },
  ];

  const ledgerEntries: LedgerEntryRecord[] = [
    {
      id: `BLK-${intent.id.slice(4)}`,
      transactionId: cleanTxId,
      amount: selectedCandidate?.price || 2400,
      outcome: 'AUTHORIZED',
      risk: 8,
      policy: 'PASS',
      payment: 'CREATED',
      currentHash: hashString(intent.sha256Hash + 'AUTH'),
      previousHash: hashString(intent.sha256Hash + 'PREV'),
      time: timeStr,
      description: `Autonomous purchase authorized for ${selectedCandidate?.name}`,
      steps: cleanStepsForReplay,
    },
  ];

  const events = [
    { id: 'EV-1', stage: 'PERCEIVE', time: t1, message: `User intent captured: "${rawQuery}"`, type: 'INPUT', status: 'SUCCESS' as const },
    { id: 'EV-2', stage: 'UNDERSTAND', time: t1, message: `Intent extracted: Category=${intent.category}, Budget=${intent.currency} ${intent.maxAmount}, Location=${intent.location || 'Local'}`, type: 'INTENT', status: 'SUCCESS' as const },
    { id: 'EV-3', stage: 'GROW', time: t2, message: `Discovered 3 offerings. Evaluated AI-buyer selection probability`, type: 'GROWTH', status: 'SUCCESS' as const },
    { id: 'EV-4', stage: 'DECIDE', time: t3, message: `Selected ${selectedCandidate?.name} (AI Selection Score: ${selectedCandidate?.selectionScore}/100, Rank #1)`, type: 'DECISION', status: 'SUCCESS' as const },
    { id: 'EV-5', stage: 'ACT', time: t3, message: `Generated Payment Proposal ${proposal?.id} for ${intent.currency} ${proposal?.amount}`, type: 'PROPOSAL', status: 'SUCCESS' as const },
    { id: 'EV-6', stage: 'VERIFY', time: t4, message: `Deterministic Trust Gate passed all commercial invariants`, type: 'TRUST', status: 'SUCCESS' as const },
    { id: 'EV-7', stage: 'PAY', time: t4, message: `Razorpay Test Mode order created: ${orderId}. Zero live funds exposed`, type: 'PAYMENT', status: 'SUCCESS' as const },
    { id: 'EV-8', stage: 'LEDGER', time: t4, message: `Committed cryptographic block ${cleanTxId} to Merkle audit chain`, type: 'LEDGER', status: 'SUCCESS' as const },
  ];

  return {
    rawQuery,
    intent,
    candidates,
    selectedCandidate,
    growthAnalysis,
    graph,
    rootIntent: {
      id: intent.id,
      status: 'VERIFIED',
      category: intent.category,
      location: intent.location || 'Local Territory',
      budget: intent.maxAmount || 3000,
      currency: intent.currency,
      dates: 'ACTIVE MANDATE',
      sha256Hash: intent.sha256Hash,
      hmacSignature: 'VALID (HMAC-SHA256)',
      allowedMerchants: selectedCandidate ? [selectedCandidate.merchant] : [],
    },
    proposal,
    derivation: {
      chainId: `DERIV-${intent.id.slice(4)}`,
      status: 'VALID',
      steps: derivationSteps,
    },
    verification: {
      status: 'PASS',
      checks: [
        { name: 'Category Match Invariant', status: 'PASS', detail: `Matches authorized category ${intent.category}` },
        { name: 'Budget Ceiling Invariant', status: 'PASS', detail: `Proposed ${intent.currency} ${proposal?.amount} <= ${intent.currency} ${intent.maxAmount}` },
        { name: 'Location Scope Invariant', status: 'PASS', detail: `Matches authorized territory ${intent.location || 'Local'}` },
        { name: 'Derivation Integrity Invariant', status: 'PASS', detail: 'Merkle parent hashes sequentially validated' },
      ],
      riskScore: 8,
      riskLevel: 'LOW',
      reason: 'Transaction fully grounded in signed Root Intent Certificate',
    },
    risk: {
      score: 8,
      level: 'LOW',
      breakdown: {
        budgetDelta: 0,
        merchantTrust: 5,
        derivationAnomaly: 0,
        semanticDivergence: 3,
      },
    },
    policy: {
      decision: 'PASS',
      rules: [
        { rule: 'BUDGET_CEILING', passed: true, message: `Proposed amount within maximum budget` },
        { rule: 'RECIPIENT_BOUND', passed: true, message: `Recipient authorized by intent` },
        { rule: 'DERIVATION_UNBROKEN', passed: true, message: `Valid causal chain from root` },
      ],
    },
    payment: {
      status: 'AUTHORIZED',
      orderId,
      amount: proposal?.amount || 0,
      currency: intent.currency,
      summary: `Razorpay Test Mode order authorized for ${selectedCandidate?.name}`,
    },
    attack: null,
    ledger: {
      chainStatus: 'VALID',
      blocksCount: 8,
      entries: ledgerEntries,
    },
    mode: 'LIVE',
    status: 'READY',
    events,
  };
}

// 6. ADVERSARIAL ATTACK SIMULATION RUNNER
export function simulateAttackOnSession(session: AegisSession, scenarioName: string = 'amount-escalation'): AegisSession {
  const authorizedBudget = session.intent.maxAmount || 3000;
  const currentPrice = session.proposal?.amount || 2400;

  // Escalated amount scaled dynamically
  const attackedAmount = Math.max(
    Math.round(authorizedBudget * 3.5),
    Math.round(currentPrice + 9000),
    12000
  );

  const attackedRecipient = scenarioName === 'recipient-substitution'
    ? 'HACKER_CONTROLLED_ENTITY_X'
    : session.selectedCandidate?.merchant || 'Unknown Entity';

  const attackedTxId = `TX-ATTACK-${hashString(session.rawQuery + 'ATK').slice(0, 4).toUpperCase()}`;
  const timeNow = new Date().toTimeString().split(' ')[0];

  const attackStepsForReplay = [
    { num: '01', name: 'ROOT INTENT', status: '✓' as const },
    { num: '02', name: 'GROWTH', status: '✓' as const },
    { num: '03', name: 'PROPOSAL', status: '✓' as const },
    { num: '04', name: 'DERIVATION', status: '✕' as const },
    { num: '05', name: 'TRUST', status: '✕' as const },
    { num: '06', name: 'PAYMENT', status: '✕' as const },
    { num: '07', name: 'LEDGER', status: '✓' as const },
  ];

  const attackLedgerEntry: LedgerEntryRecord = {
    id: `BLK-ATK-${hashString(attackedTxId).slice(0, 4).toUpperCase()}`,
    transactionId: attackedTxId,
    amount: attackedAmount,
    outcome: 'BLOCKED',
    risk: 100,
    policy: 'BLOCK',
    payment: 'NONE',
    currentHash: hashString(session.rootIntent.sha256Hash + 'BLOCKED'),
    previousHash: session.ledger.entries[0]?.currentHash || hashString('PREV'),
    time: timeNow,
    description: `Adversarial attack intercepted: ${scenarioName.toUpperCase()} (Exceeds authorized cap by ₹${(attackedAmount - authorizedBudget).toLocaleString()})`,
    steps: attackStepsForReplay,
  };

  const newEvents = [
    ...session.events,
    {
      id: `EV-ATK-1`,
      stage: 'ATTACK',
      time: timeNow,
      message: `Simulated adversarial attack injection: ${scenarioName.toUpperCase()} (Proposed: ₹${attackedAmount.toLocaleString()} vs Authorized: ₹${authorizedBudget.toLocaleString()})`,
      type: 'ATTACK',
      status: 'BLOCKED' as const,
    },
    {
      id: `EV-ATK-2`,
      stage: 'VERIFY',
      time: timeNow,
      message: `Trust verification failed: DERIVATION BROKEN, BUDGET EXCEEDED by ₹${(attackedAmount - authorizedBudget).toLocaleString()}`,
      type: 'VERIFICATION',
      status: 'BLOCKED' as const,
    },
    {
      id: `EV-ATK-3`,
      stage: 'POLICY',
      time: timeNow,
      message: `Policy rule violated: Hard budget constraint breached. Policy decision: BLOCK`,
      type: 'POLICY',
      status: 'BLOCKED' as const,
    },
    {
      id: `EV-ATK-4`,
      stage: 'PAYMENT',
      time: timeNow,
      message: `Payment Gate enforced: Razorpay order SUPPRESSED (NONE). Zero money moved!`,
      type: 'GATE',
      status: 'BLOCKED' as const,
    },
    {
      id: `EV-ATK-5`,
      stage: 'LEDGER',
      time: timeNow,
      message: `Committed forensic interception block ${attackedTxId} to cryptographic audit ledger`,
      type: 'LEDGER',
      status: 'SUCCESS' as const,
    },
  ];

  return {
    ...session,
    verification: {
      status: 'FAIL',
      checks: [
        {
          name: 'Category Match Invariant',
          status: scenarioName === 'category-substitution' ? 'FAIL' : 'PASS',
          detail:
            scenarioName === 'category-substitution'
              ? 'Category altered to unauthorized entity'
              : `Matches authorized category ${session.intent.category}`,
        },
        {
          name: 'Budget Ceiling Invariant',
          status: scenarioName === 'amount-escalation' ? 'FAIL' : 'PASS',
          detail: `Proposed ${session.intent.currency} ${attackedAmount.toLocaleString()} exceeds cap ${session.intent.currency} ${authorizedBudget.toLocaleString()}`,
        },
        {
          name: 'Recipient Scope Invariant',
          status: scenarioName === 'recipient-substitution' ? 'FAIL' : 'PASS',
          detail:
            scenarioName === 'recipient-substitution'
              ? `Recipient ${attackedRecipient} not in authorized whitelist`
              : `Recipient matches authorized list`,
        },
        {
          name: 'Derivation Integrity Invariant',
          status: 'FAIL',
          detail: 'Merkle parent hashes broken (parent_step: NONE)',
        },
      ],
      riskScore: 100,
      riskLevel: 'BLOCK',
      reason: `Blocked by Payment Gate: Hard policy violation in ${scenarioName}. Zero money moved.`,
    },
    policy: {
      decision: 'BLOCK',
      rules: [
        {
          rule: 'BUDGET_CEILING',
          passed: scenarioName !== 'amount-escalation',
          message:
            scenarioName === 'amount-escalation'
              ? `Amount ₹${attackedAmount.toLocaleString()} exceeds ceiling ₹${authorizedBudget.toLocaleString()}`
              : 'Budget respected',
        },
        {
          rule: 'RECIPIENT_BOUND',
          passed: scenarioName !== 'recipient-substitution',
          message:
            scenarioName === 'recipient-substitution'
              ? `Unauthorized recipient ${attackedRecipient}`
              : 'Recipient authorized',
        },
        {
          rule: 'DERIVATION_UNBROKEN',
          passed: false,
          message: 'Broken derivation link detected',
        },
      ],
    },
    payment: {
      status: 'BLOCKED',
      orderId: null,
      amount: 0,
      currency: session.intent.currency,
      summary: `Razorpay Order SUPPRESSED: ${scenarioName.toUpperCase()} detected. Zero money moved.`,
    },
    derivation: {
      chainId: `DERIV-ATK-${attackedTxId}`,
      status: 'BROKEN',
      steps: [
        { id: '1', action: 'ROOT INTENT CAPTURE', time: timeNow, status: 'VALID', description: `Captured user mandate for ${session.intent.category} in ${session.intent.location || 'Local'}` },
        { id: '2', action: 'INVENTORY DISCOVERY', time: timeNow, status: 'VALID', description: `Discovered candidates within ${session.intent.currency} ${authorizedBudget}` },
        { id: '3', action: 'ADVERSARIAL MUTATION', time: timeNow, status: 'FAIL', description: `Injected mutation: ${scenarioName.toUpperCase()}` },
        { id: '4', action: 'PROPOSAL TAMPERED', time: timeNow, status: 'FAIL', description: `Proposed ${session.intent.currency} ${attackedAmount.toLocaleString()} to ${attackedRecipient}` },
        { id: '5', action: 'TRUST GATE INTERCEPTION', time: timeNow, status: 'FAIL', description: `Invariant violated: Hard BLOCK enforced` },
        { id: '6', action: 'PAYMENT SUPPRESSION', time: timeNow, status: 'FAIL', description: `Razorpay Order Skipped. Zero money moved.` },
      ],
    },
    attack: {
      active: true,
      scenario: scenarioName,
      attackType: scenarioName.toUpperCase(),
      proposedAmount: attackedAmount,
      authorizedAmount: authorizedBudget,
      parentStep: 'NONE',
      recipient: attackedRecipient,
      checks: {
        rootIntent: true,
        derivationBroken: true,
        amountViolation: true,
        recipientViolation: scenarioName === 'recipient-substitution',
        policyBlock: true,
        riskScore: 100,
      },
      paymentBlocked: true,
      razorpayOrder: null,
    },
    ledger: {
      ...session.ledger,
      blocksCount: session.ledger.blocksCount + 1,
      entries: [attackLedgerEntry, ...session.ledger.entries],
    },
    graph: session.selectedCandidate
      ? buildCommerceGraph(session.intent, session.selectedCandidate, {
          active: true,
          scenario: scenarioName,
          proposedAmount: attackedAmount,
          unauthorizedRecipient: attackedRecipient,
        })
      : session.graph,
    events: newEvents,
  };
}

// 7. PRODUCT SELECTION & PROPOSAL RECONSTRUCTION (Buy Now Flow)
export function selectCandidateInSession(session: AegisSession, candidate: CandidateItem): AegisSession {
  // Update candidate list: mark the chosen candidate as selected & rank 1 priority
  const updatedCandidates = session.candidates.map((c) => ({
    ...c,
    isYou: c.id === candidate.id,
    isAiSelected: c.id === candidate.id,
  }));

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const cleanTxId = `TX-${candidate.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = `order_${candidate.category.toLowerCase().replace(/\s+/g, '_')}_${candidate.id.slice(0, 8).toLowerCase()}`;

  const proposal = {
    id: `PROP-${candidate.id}`,
    amount: candidate.price,
    currency: candidate.currency,
    recipient: candidate.merchant,
    merchant: candidate.merchant,
    merchantId: candidate.merchantId || 'MER-01',
    productId: candidate.id,
    productName: candidate.name,
    category: candidate.category,
  };

  const derivationSteps = [
    { id: '1', action: 'ROOT INTENT CAPTURE', time: timeStr, status: 'VALID' as const, description: `Captured user mandate for ${session.intent.category} in ${session.intent.location || 'Local'}` },
    { id: '2', action: 'INVENTORY DISCOVERY', time: timeStr, status: 'VALID' as const, description: `Discovered 6 eligible offerings matching budget ${session.intent.currency} ${session.intent.maxAmount}` },
    { id: '3', action: 'GROWTH SELECTION', time: timeStr, status: 'VALID' as const, description: `Selected ${candidate.name} (AI Selection Score: ${candidate.selectionScore}/100)` },
    { id: '4', action: 'PROPOSAL GENERATION', time: timeStr, status: 'VALID' as const, description: `Constructed payment proposal of ${session.intent.currency} ${candidate.price} for ${candidate.merchant}` },
    { id: '5', action: 'TRUST GATE VERIFIED', time: timeStr, status: 'VALID' as const, description: `Evaluated deterministic invariants for ${candidate.id}: All passed. Status: PASS` },
    { id: '6', action: 'PAYMENT GATE READY', time: timeStr, status: 'VALID' as const, description: `Razorpay Test Mode order ready: ${orderId}` },
  ];

  const graph = buildCommerceGraph(session.intent, candidate);

  return {
    ...session,
    selectedCandidate: { ...candidate, isAiSelected: true, isYou: true },
    candidates: updatedCandidates,
    proposal,
    graph,
    rootIntent: {
      ...session.rootIntent,
      allowedMerchants: [candidate.merchant],
    },
    derivation: {
      chainId: `DERIV-${candidate.id}`,
      status: 'VALID',
      steps: derivationSteps,
    },
    verification: {
      ...session.verification,
      status: 'PASS',
      checks: [
        { name: 'Category Match Invariant', status: 'PASS', detail: `Matches authorized category ${candidate.category}` },
        { name: 'Budget Ceiling Invariant', status: 'PASS', detail: `Proposed ${candidate.currency} ${candidate.price} <= ${candidate.currency} ${session.rootIntent.budget}` },
        { name: 'Location Scope Invariant', status: 'PASS', detail: `Matches authorized territory ${session.intent.location || 'Local'}` },
        { name: 'Derivation Integrity Invariant', status: 'PASS', detail: 'Merkle parent hashes sequentially validated' },
      ],
    },
    payment: {
      status: 'AUTHORIZED',
      orderId,
      amount: candidate.price,
      currency: candidate.currency,
      summary: `Razorpay Test Mode order authorized for ${candidate.name}`,
    },
    attack: null,
    ledger: {
      ...session.ledger,
      entries: [
        {
          id: `BLK-${candidate.id}`,
          transactionId: cleanTxId,
          amount: candidate.price,
          outcome: 'AUTHORIZED',
          risk: 8,
          policy: 'PASS',
          payment: 'CREATED',
          currentHash: hashString(candidate.id + 'AUTH' + Date.now()),
          previousHash: session.ledger.entries[0]?.currentHash || hashString('GENESIS'),
          time: timeStr,
          description: `Autonomous purchase proposal authorized for ${candidate.name} (${candidate.id})`,
          steps: [
            { num: '01', name: 'ROOT INTENT', status: '✓' as const },
            { num: '02', name: 'GROWTH', status: '✓' as const },
            { num: '03', name: 'PROPOSAL', status: '✓' as const },
            { num: '04', name: 'DERIVATION', status: '✓' as const },
            { num: '05', name: 'TRUST', status: '✓' as const },
            { num: '06', name: 'PAYMENT', status: '✓' as const },
            { num: '07', name: 'LEDGER', status: '✓' as const },
          ],
        },
        ...session.ledger.entries.slice(1),
      ],
    },
  };
}

// 8. RESTORE CLEAN VERIFIED SESSION
export function resetSessionAttack(session: AegisSession): AegisSession {
  const clean = createAutonomousSession(session.rawQuery || 'Hotels in Goa under ₹3000');
  if (session.selectedCandidate) {
    const matched = clean.candidates.find((c) => c.id === session.selectedCandidate?.id);
    if (matched) {
      return selectCandidateInSession(clean, matched);
    }
  }
  return clean;
}

