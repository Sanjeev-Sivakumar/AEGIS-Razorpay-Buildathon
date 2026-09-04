// Verification script for dynamic runtime across arbitrary natural language queries
import {
  parseIntentFromText,
  discoverCandidates,
  buildCommerceGraph,
  generateGrowthAnalysis,
  createAutonomousSession,
  simulateAttackOnSession
} from '../src/runtime/sessionEngine.ts';

console.log('=== STARTING AEGIS DYNAMIC RUNTIME SUITE ===\n');

const testCases = [
  {
    query: 'Restaurants nearby under 3000',
    expectedCategory: 'RESTAURANT',
    expectedBudget: 3000,
    forbiddenWords: ['hotel', 'goastay', 'beach', 'laptop', 'shoe']
  },
  {
    query: 'laptop under 50000',
    expectedCategory: 'LAPTOP',
    expectedBudget: 50000,
    forbiddenWords: ['hotel', 'goastay', 'restaurant', 'shoe']
  },
  {
    query: 'running shoes under 2500',
    expectedCategory: 'RUNNING SHOES',
    expectedBudget: 2500,
    forbiddenWords: ['hotel', 'goastay', 'restaurant', 'laptop']
  },
  {
    query: 'hotel in Goa under 3000',
    expectedCategory: 'HOTEL',
    expectedBudget: 3000,
    forbiddenWords: ['restaurant', 'laptop', 'shoe']
  }
];

let allPassed = true;

for (const tc of testCases) {
  console.log(`Testing Query: "${tc.query}"`);
  const session = createAutonomousSession(tc.query);

  // 1. Intent validation
  if (session.intent.category !== tc.expectedCategory) {
    console.error(`❌ Category mismatch: Expected ${tc.expectedCategory}, got ${session.intent.category}`);
    allPassed = false;
  } else {
    console.log(`  ✓ Intent Category: ${session.intent.category}`);
  }

  if (session.rootIntent.budget !== tc.expectedBudget) {
    console.error(`❌ Budget mismatch: Expected ${tc.expectedBudget}, got ${session.rootIntent.budget}`);
    allPassed = false;
  } else {
    console.log(`  ✓ Root Intent Budget: ₹${session.rootIntent.budget}`);
  }

  // 2. Candidates validation
  const candNames = session.candidates.map(c => c.name.toLowerCase()).join(' ');
  const selectedName = session.selectedCandidate?.name || '';
  console.log(`  ✓ Discovered ${session.candidates.length} candidates: [${session.candidates.map(c => c.name).join(', ')}]`);
  console.log(`  ✓ Selected Candidate: ${selectedName} (₹${session.selectedCandidate?.price})`);

  // Check forbidden words (leakage check)
  for (const forbidden of tc.forbiddenWords) {
    if (candNames.includes(forbidden)) {
      console.error(`❌ Hardcoded leakage detected! Candidate contains "${forbidden}"`);
      allPassed = false;
    }
  }

  // 3. Graph topology
  console.log(`  ✓ Commerce Graph: ${session.graph.nodes.length} nodes, ${session.graph.edges.length} edges`);

  // 4. Derivation steps
  const derivationSummary = session.derivation.steps.map(s => s.action).join(' -> ');
  console.log(`  ✓ Derivation Chain: ${derivationSummary}`);

  // 5. Attack Simulation on session
  const attackedSession = simulateAttackOnSession(session, 'amount-escalation');
  const attackAmount = attackedSession.attack?.proposedAmount || 0;
  const isBudgetExceeded = attackAmount > session.rootIntent.budget;
  console.log(`  ✓ Attack Simulation: Proposed ₹${attackAmount} vs Cap ₹${session.rootIntent.budget} (Exceeded: ${isBudgetExceeded})`);
  console.log(`  ✓ Attack Interception: Risk ${attackedSession.attack?.checks.riskScore}/100, Payment Blocked: ${attackedSession.attack?.paymentBlocked}`);

  if (!isBudgetExceeded || !attackedSession.attack?.paymentBlocked) {
    console.error(`❌ Attack simulation did not scale or block properly!`);
    allPassed = false;
  }

  console.log('');
}

if (allPassed) {
  console.log('🎉 ALL DYNAMIC RUNTIME TESTS PASSED! ZERO HARDCODED/STATIC LEAKAGE DETECTED.');
} else {
  console.error('💥 SOME TESTS FAILED');
  process.exit(1);
}
