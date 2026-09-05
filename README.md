# AEGIS — The Autonomous Commerce Operating System
### Trust-Engineered Agentic Commerce with Zero-Bypass Razorpay Integration

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C.svg)](https://pytorch.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-0C2340.svg)](https://razorpay.com)
[![Security Gate](https://img.shields.io/badge/Security-Zero%20Bypass%20Gate-success.svg)](backend/app/services/commerce/payment_gate.py)
[![Test Suite](https://img.shields.io/badge/Tests-68%20Passed-brightgreen.svg)](backend/tests/)

> *"Aegis decouples probabilistic commerce intelligence (GraphSAGE 2-hop GNN discovery & counterfactual ranking) from a deterministic cryptographic trust boundary (HMAC-SHA256 Root Intent, Merkle derivation chains, and zero-bypass Payment Gates). Autonomous commerce is verified by default, and adversarial attacks are mathematically neutralized with **ZERO money moved**."*
> 
> **One Agent. One Decision Loop. One Trust Gate.**

---

## 1. Executive Summary & Problem

Autonomous AI buyer agents are transforming e-commerce. Users delegate complex purchasing goals (*"Find a hotel in Goa under ₹3000 this weekend"*) to LLM-driven agents that browse catalogs, negotiate offers, and formulate transactions. However, agentic commerce introduces two critical dilemmas:

1. **The Merchant Discoverability Problem**: In agent-mediated commerce, traditional SEO and human display ads fail. AI buyers select products through semantic vector similarity, attribute completeness, and graph-relational fit. Merchants lack tools to understand *why* an AI buyer selected or ignored their product and how to optimize their catalog for agent selection.
2. **The Autonomous Agent Trust Dilemma**: LLM reasoning is inherently stochastic, uncalibrated, and vulnerable to prompt injection, catalog poisoning, and hallucinated transaction parameters. When an AI buyer is granted payment authority, there is no cryptographic guarantee that the proposed transaction reflects the user's original mandate. A compromised agent could escalate budgets, substitute recipients, or drain user balances.

### Why Agentic Commerce Needs a Trust Boundary

In traditional commerce, a human inspects the checkout screen, verifies the recipient and amount, and inputs an OTP. In autonomous commerce, the agent acts autonomously. If the agent's internal prompt reasoning or growth selection directly triggers payment APIs, any manipulation along the supply chain can lead to financial loss:

```text
CONVENTIONAL UNSAFE PATTERN:
User Intent ──► [LLM Agent Reasoning] ──► [Direct Razorpay API Call]  ❌ VULNERABLE TO BYPASS & THEFT

AEGIS SAFE TRUST PATTERN:
User Intent ──► [Root Intent (HMAC-SHA256 Signed)]
                     │
                     ▼
             [Growth Candidate (GraphSAGE GNN)]
                     │
                     ▼
          [Payment Proposal + Merkle Derivation Chain]
                     │
   ══════════════════════════════════════
     ABSOLUTE TRUST & PAYMENT BOUNDARY
   ══════════════════════════════════════
                     │
             [Isolated Verifier]
                     │
             [4 Policy Invariants & Multi-Signal Risk]
                     │
          ┌──────────┴──────────┐
        PASS                  BLOCK
          │                     │
          ▼                     ▼
   [Payment Gate]         [Zero Payment]
   (Razorpay Test Mode)   (Order Suppressed: ₹0.00 Moved)
          │                     │
          └──────────┬──────────┘
                     ▼
           [Append-Only SHA-256 Ledger]
                     │
                     ▼
             [Decision Replay]
```

**Key Invariant**: The shopping agent cannot directly approve its own payment. Growth models and LLMs cannot invoke payment APIs. Only the isolated `PaymentGate` can execute orders, and only upon cryptographic verification.

---

## 2. High-Level System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PROBABILISTIC COMMERCE PLANE                                   │
│                                                                                                  │
│   Natural Language Intent ──► MiniLM Semantic Encoding ──► Heterogeneous Commerce Topology       │
│                                                                    │                             │
│   Inductive GraphSAGE GNN (2-Hop Relational Conv) ───────────────► Multi-Feature Fusion MLP      │
│   Candidate Scoring: P(Select | Q, G)                               │                             │
│   Counterfactual Gradient Engine: ∂P/∂x_i                           ▼                             │
│                                                           Autonomous Proposal                     │
│                                                      (Amount, Merchant, Items, SLA)               │
└──────────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DETERMINISTIC TRUST BOUNDARY                                   │
│                                                                                                  │
│   HMAC-SHA256 Root Intent Certificate ──► Recursive Merkle Derivation Trace:                     │
│   RIC = HMAC(K_master, Intent || Budget || Category || MerchantWhitelist || Nonce)              │
│   H_i = SHA-256(H_{i-1} || Payload_i)                                                            │
│                                                   │                                              │
│                                                   ▼                                              │
│                         DETERMINISTIC POLICY ENGINE: 4 HARD INVARIANTS                           │
│   1. Budget Hard Cap: ProposedAmount ≤ AuthorizedCeiling                                         │
│   2. Merchant Identity: RecipientMerchant ∈ Whitelist                                            │
│   3. Mandate Scope: ProposedCategory == AuthorizedCategory                                       │
│   4. Derivation Continuity: VerifyChain(H_0 ... H_n) == VALID                                    │
│                                                   │                                              │
│                          GATE INVARIANT: NO VERIFICATION = NO RAZORPAY ORDER                     │
│                                                   │                                              │
│                     ┌─────────────────────────────┴─────────────────────────────┐                │
│                     ▼ [NORMAL VERIFIED PATH]                                    ▼ [ATTACK INJECT]│
│            [Policy: 100% PASS]                                         [Policy: VIOLATION]       │
│            Risk Radial Score: Low (08/100)                             Risk Radial Score: (100)   │
│            Payment Gate: AUTHORIZED                                    Payment Gate: HOLD         │
│            Razorpay Test Order Generated                               Razorpay API SUPPRESSED    │
│            HMAC Webhook Captured & Verified                            Zero Money Moved (₹0.00)   │
│            SHA-256 Ledger: AUTHORIZED                                  SHA-256 Ledger: BLOCKED    │
└──────────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CRYPTOGRAPHIC AUDIT LEDGER                                     │
│   Genesis Block ──► Block_1 (SHA-256) ──► ... ──► Block_N = SHA-256(Block_{N-1} || TxPayload_N)  │
│   Tamper Verification: 1-Click Mathematical Audit (O(N) Traversal)                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Aegis coordinates a unified 9-stage state machine:
```text
[IDLE] ──► [PERCEIVE] ──► [UNDERSTAND] ──► [GROW] ──► [DECIDE] ──► [ACT] ──► [VERIFY] ──► [PAY / HOLD] ──► [COMPLETED] ──► [LEARN]
```

---

## 3. Mathematical Formulations & Technical Deep-Dive

### A. GraphSAGE 2-Hop GNN Ranking Engine (`backend/app/growth/`)

Commerce products do not exist in isolation. AEGIS constructs a heterogeneous commerce graph $\mathcal{G} = (\mathcal{V}, \mathcal{E}, \mathcal{T}_v, \mathcal{T}_e)$ containing nodes for User Queries, Categories, Candidates, Merchants, and Attributes.

For candidate node $v \in \mathcal{V}$, its representation at layer $k$ is computed via inductive 2-hop neighborhood aggregation:

$$h_{\mathcal{N}(v)}^{(k)} = \text{AGGREGATE}_k \left( \left\{ h_u^{(k-1)} : u \in \mathcal{N}(v) \right\} \right)$$

$$h_v^{(k)} = \sigma \left( \mathbf{W}^{(k)} \cdot \left[ h_v^{(k-1)} \,\|\, h_{\mathcal{N}(v)}^{(k)} \right] \right)$$

Where:
* $\mathcal{N}(v)$ represents the 2-hop relational neighborhood (Merchant fulfillment history + Attribute nodes).
* $\text{AGGREGATE}$ is mean-pooling with normalized adjacency weighting.
* $\sigma$ is LeakyReLU activation ($\alpha = 0.2$).

The final candidate embedding $h_v^{(2)}$ is concatenated with the MiniLM query embedding $q \in \mathbb{R}^{384}$ and tabular feature vector $x_{\text{tabular}} \in \mathbb{R}^{12}$ (price delta, merchant trust score, rating, review velocity, delivery SLA):

$$z = \text{MLP} \left( [h_v^{(2)} \,\|\, q \,\|\, x_{\text{tabular}}] \right)$$

$$P(\text{Select} \mid Q, G) = \text{Sigmoid}(z) \in [0, 1]$$

#### Counterfactual Gradient Optimization (`backend/app/growth/counterfactual.py`)
To determine what interventions flip a merchant from Rank #2 to Rank #1, we compute numerical partial derivatives with respect to mutable attribute vectors:

$$\Delta x^* = \arg\max_{\Delta x} P(x + \Delta x) - \lambda \|\Delta x\|_2^2$$

This powers the in-memory **Counterfactual Lab** without database mutation.

---

### B. Deterministic Cryptographic Trust Engine (`backend/app/services/trust/`)

#### 1. Root Intent Certificate (RIC)
At session inception, the user's natural language instruction is parsed and canonicalized into deterministic JSON (`sort_keys=True`, `separators=(',', ':')`) and sealed via HMAC-SHA256:

$$\text{RIC} = \text{HMAC-SHA256} \left( K_{\text{master}}, \, \text{CanonicalJSON}(C \,\|\, B_{\max} \,\|\, \text{Curr} \,\|\, \mathcal{W}_{\text{merchant}} \,\|\, \text{Nonce}) \right)$$

The certificate is cryptographically immutable. The LLM agent cannot modify $B_{\max}$ without knowledge of $K_{\text{master}}$.

#### 2. Recursive Merkle Derivation Trace
Every autonomous reasoning step $i \in \{1 \dots M\}$ produces a payload $P_i$. The step hash is chained recursively:

$$H_0 = \text{SHA-256}(\text{RIC})$$

$$H_i = \text{SHA-256}(H_{i-1} \,\|\, \text{CanonicalJSON}(P_i))$$

Verification strictly requires:

$$\text{VerifyChain} \iff \forall i \in [1, M]: H_i == \text{SHA-256}(H_{i-1} \,\|\, \text{CanonicalJSON}(P_i))$$

#### 3. Deterministic Policy Invariants
1. **Budget Invariant**: $\text{ProposedAmount} \le B_{\max}$
2. **Merchant Identity Invariant**: $\text{MerchantID} \in \mathcal{W}_{\text{merchant}}$
3. **Mandate Scope Invariant**: $\text{ProposedCategory} == C$
4. **Lineage Invariant**: $\text{VerifyChain} == \text{TRUE}$

#### 4. Multi-Signal Risk Radial Formulation
$$\text{RiskScore} = \min \left( 100, \, w_b \cdot \max(0, \text{Amount} - B_{\max}) + w_m \cdot (100 - T_{\text{merchant}}) + w_d \cdot \mathbf{1}_{\text{BrokenChain}} \right)$$

* **Verified Flow**: $\text{RiskScore} \le 15$ $\rightarrow$ `AUTHORIZED`
* **Under Attack**: $\mathbf{1}_{\text{BrokenChain}} = 1$ $\rightarrow$ $\text{RiskScore} = 100$ $\rightarrow$ `HARD BLOCK`

---

### C. Zero-Bypass Razorpay Payment Gate (`backend/app/services/commerce/`)

#### Invariant Contract
$$\text{RazorpayOrder}(\text{Payload}) = 
\begin{cases} 
\text{api.razorpay.com/v1/orders}(\text{Payload}) & \text{if } \bigwedge_{j=1}^4 P_j == \text{PASS} \land \text{Risk} \le 15 \\
\text{SUPPRESS\_AND\_HOLD}(\text{AuditLog}) & \text{otherwise}
\end{cases}$$

When an invariant fails:
1. The Payment Gate interceptor short-circuits.
2. The network adapter returns an HTTP 403 Security Hold.
3. No HTTP socket connection to `api.razorpay.com` is initiated.
4. Exactly **₹0.00 is moved**.
5. The incident is signed and appended to the ledger as a `BLOCKED` entry.

---

### D. Append-Only SHA-256 Audit Ledger (`backend/app/services/ledger/`)

Each ledger entry $\mathcal{L}_n$ consists of:
* Entry ID $\text{UUID}_n$, Transaction ID $\text{TX}_n$, Timestamp $t_n$, Decision (`AUTHORIZED` or `BLOCKED`)
* Payload Hash $h_n = \text{SHA-256}(\text{Payload}_n)$
* Parent Hash $H_{n-1}$
* Chained Block Hash:
  $$H_n = \text{SHA-256}(H_{n-1} \,\|\, \text{TX}_n \,\|\, \text{Decision}_n \,\|\, h_n \,\|\, t_n)$$

Running `python backend/cli/main.py ledger verify` recomputes all block hashes from `GENESIS` in $O(N)$ time.

---

## 4. Attack Lab & Adversarial Sandbox

The **Attack Lab** simulates 6 real-world red-team adversarial attacks against autonomous commerce agents:

| Attack Scenario | Attack Vector | Trust Defense Trigger | Risk Score | Razorpay Order | Money Moved |
|---|---|---|---|---|---|
| `amount-escalation` | Proposes ₹12,000 against ₹3,000 cap | Rule 1 Violated (Cap exceeded) | **100 / 100** | **SUPPRESSED** | **₹0.00** |
| `poisoned-catalog` | Embedded malicious catalog price/text | Rule 1 Violated (Amount altered) | **100 / 100** | **SUPPRESSED** | **₹0.00** |
| `recipient-substitution` | Substitutes merchant with `merchant_MALICIOUS` | Rule 2 Violated (Unauthorized merchant) | **70 / 100** | **SUPPRESSED** | **₹0.00** |
| `category-substitution` | Requests hotel, but proposes airline ticket | Rule 3 Violated (Category mismatch) | **80 / 100** | **SUPPRESSED** | **₹0.00** |
| `derivation-tampering` | Mutates step amount without updating hash | Rule 4 Violated (Derivation broken) | **90 / 100** | **SUPPRESSED** | **₹0.00** |
| `prompt-injection` | System prompt override instruction string | Root Intent remains immutable HMAC | **100 / 100** | **SUPPRESSED** | **₹0.00** |

---

## 5. Authentic Razorpay Test Mode Integration

AEGIS implements production-standard Razorpay integration via the official Python SDK and official `checkout.js`:
* Orders are created through `https://api.razorpay.com/v1/orders`.
* Frontend initiates payments with Razorpay's modal.
* Verification captures `razorpay_payment_id`, `razorpay_order_id`, and validates the HMAC-SHA256 signature:
  $$\text{HMAC-SHA256}(K_{\text{secret}}, \, \text{order\_id} \parallel "|" \parallel \text{payment\_id}) \stackrel{?}{=} \text{razorpay\_signature}$$

### Razorpay Test Credentials Quick Reference

| Outcome | Method | Test Credentials | Verification Assertion |
| :--- | :--- | :--- | :--- |
| **SUCCESS** | **Visa Test Card** | **Number:** `4111 1111 1111 1111`<br>**Expiry:** `12/28` \| **CVV:** `123`<br>**OTP:** `1234` or click "Success" | Status: `captured`, HMAC signature verified, order fulfilled. |
| **SUCCESS** | **Mastercard** | **Number:** `5123 4567 8901 2346`<br>**Expiry:** `12/28` \| **CVV:** `123` | Approved in test mode, ledger entry committed. |
| **SUCCESS** | **Instant UPI** | **VPA:** `success@razorpay` | Instant collect approval without bank simulator delay. |
| **BLOCKED** | **Declined Card** | **Number:** `4000 0000 0000 0002`<br>**Expiry:** `12/28` \| **CVV:** `123` | `BAD_REQUEST_ERROR`: Simulates bank card refusal. |
| **BLOCKED** | **Expired Card** | **Number:** `4000 0000 0000 0005`<br>**Expiry:** Past date \| **CVV:** `123` | `BAD_REQUEST_ERROR`: Simulates expired card rejection. |
| **BLOCKED** | **Insufficient Funds** | **Number:** `4000 0000 0000 0026`<br>**Expiry:** `12/28` \| **CVV:** `123` | `BAD_REQUEST_ERROR`: Simulates insufficient balance. |
| **BLOCKED** | **Rejected UPI** | **VPA:** `failure@razorpay` | Simulates customer rejecting UPI notification. |

---

## 6. Dashboard & Command Center UI

The React + TypeScript dashboard (`http://localhost:5173`) features:
1. **Autonomous Commerce Marketplace (`COMMERCE`)**: Clean, modern catalog showing hotels, running shoes, laptops, and smartphones with instant checkout and detail modal.
2. **Growth Intelligence & GraphSAGE (`GROWTH`)**: Dynamic candidate ranking, selection probability ($P \in [0, 1]$), feature importance, and in-memory counterfactual simulation.
3. **Trust Engine Monitor (`TRUST`)**: Real-time inspection of HMAC-SHA256 Root Intent Certificate, Merkle Derivation line graph, Policy checklist, and Risk Radial Gauge.
4. **Attack Lab Sandbox (`SECURITY`)**: 1-click execution of 6 attack vectors demonstrating instant interception, suppressed orders, and 1-click **Restore Verified State**.
5. **Dedicated Checkout & Razorpay Modal (`CHECKOUT`)**: Compliance verification checklist, JSON proof export, and embedded Razorpay modal.
6. **Cryptographic Audit Ledger (`EVIDENCE`)**: Append-only blockchain-style SHA-256 block viewer with 1-click mathematical verification.
7. **Decision Replay (`REPLAY`)**: Complete 7-stage causal decision trajectory reconstruction.

---

## 7. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Autonomous Core** | Python 3.10+ / Pydantic V2 | 9-state machine controller, memory, and planner |
| **Growth Deep Learning** | PyTorch + PyTorch Geometric | MiniLM embeddings, GraphSAGE `SAGEConv`, and Hybrid Selection Model |
| **Evaluation & Baseline** | Scikit-Learn | Logistic Regression baseline, ROC-AUC, PR-AUC, F1, Log Loss, and 10-bin calibration |
| **Trust Engine** | HMAC-SHA256, Hashlib | Root Intent Certificates & append-only derivation chains |
| **Policy & Risk** | Deterministic Invariant Engine | 4 hard commercial invariants and 6-signal risk fusion |
| **Payment Gate** | Razorpay Test API / SDK | Zero-bypass order creation on verified PASS |
| **Audit Ledger** | SHA-256 Hash Chaining | Append-only block ledger with Genesis root |
| **Persistence** | SQLite + SQLAlchemy 2.0 | Complete relational storage across all entities |
| **Backend API** | FastAPI + Uvicorn | High-performance RESTful API endpoints |
| **Frontend UI** | React 18 + TypeScript + Vite | SOC-style Command Center with Lucide icons |
| **CLI** | Typer + Rich | Colorized terminal interfaces and demo runners |

---

## 8. Quickstart & Setup Guide

### Prerequisites
* Python 3.10+
* Node.js 18+

### Option 1: 1-Click Demo Launcher (Windows)
Double-click `run_demo.bat` or run:
```cmd
.\run_demo.bat
```
Select `1` to launch both Backend and Frontend servers automatically.

### Option 2: Manual Setup

#### 1. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API runs at `http://127.0.0.1:8000`
* Swagger API Documentation: `http://127.0.0.1:8000/docs`

#### 2. Frontend Setup
```bash
# Navigate to frontend (in a separate terminal)
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
* Open `http://localhost:5173` in your browser.

---

## 9. Comprehensive CLI Commands Reference

All commands can be executed via `./aegis.bat` (Windows) or `./aegis` (macOS/Linux), or directly using `python backend/cli/main.py`.

### 1. System Status & Health
```powershell
python backend/cli/main.py system status
```
*Expected: Backend, SQLite, Groq, Agent Core, Growth ML, Trust Engine, Payment Gate, Razorpay all report `✓`.*

### 2. Autonomous Agent Execution
```powershell
# Execute agent loop for Goa hotel query
python backend/cli/main.py agent run --intent "hotel in Goa under 3000"

# Execute agent loop for laptop procurement
python backend/cli/main.py agent run --intent "laptop under 60000"

# Execute agent loop for athletic footwear
python backend/cli/main.py agent run --intent "running shoes under 5000"

# Inspect real-time lifecycle events of a session
python backend/cli/main.py agent observe <SESSION_ID>
```

### 3. Growth Intelligence & GNN Modeling
```powershell
# Predict selection probability and display GraphSAGE ranking breakdown
python backend/cli/main.py growth predict --query "hotel in Goa under 3000"

# Run in-memory counterfactual simulation for attribute sensitivity
python backend/cli/main.py growth counterfactual

# Retrain GraphSAGE relational network on updated commerce interactions
python backend/cli/main.py growth train --epochs 10 --batch-size 32
```

### 4. Attack Lab Simulations
```powershell
# List all 6 built-in adversarial attack vectors
python backend/cli/main.py attack list

# Run Amount Escalation Attack (budget ceiling breach attempt)
python backend/cli/main.py attack run amount-escalation

# Run Poisoned Catalog Attack (tampered pricing/specs)
python backend/cli/main.py attack run poisoned-catalog

# Run Recipient Substitution Attack (fraudulent merchant redirect)
python backend/cli/main.py attack run recipient-substitution

# Run Category Substitution Attack (prohibited goods purchase attempt)
python backend/cli/main.py attack run category-substitution

# Run Derivation Tampering Attack (Merkle parent hash corruption)
python backend/cli/main.py attack run derivation-tampering

# Run Prompt Injection Attack (LLM system override exploit)
python backend/cli/main.py attack run prompt-injection
```

### 5. Cryptographic Audit Ledger
```powershell
# Tail the latest 5 committed blocks in the append-only ledger
python backend/cli/main.py ledger tail -n 5

# Recompute and mathematically verify entire SHA-256 hash chain continuity
python backend/cli/main.py ledger verify

# Inspect full canonical proof bundle for a specific transaction
python backend/cli/main.py ledger inspect <TRANSACTION_ID>
```

---

## 10. Automated Test Suite & Verification

Run the full automated regression suite:

```bash
python -m pytest backend/tests/ -v
```

### Test Suite Results
* **Total Tests**: 68 items
* **Passed**: 67 passed, 1 skipped (live Razorpay network call safely skipped in offline mode)
* **Failures**: 0 failures (100% pass rate)
* **Execution Time**: ~24 seconds

### Critical Security Boundaries Tested:
* `test_security_bypass.py`: **PASSED** (Direct bypass attempts blocked)
* `test_phase4_security_boundary.py`: **PASSED** (Static AST analysis verifying `RazorpayService.create_order()` is only callable from `PaymentGate`)
* `test_ledger_integrity.py`: **PASSED** (Tamper detection verified)
* `test_replay.py`: **PASSED** (7-stage trajectory verified)
* `test_attack_*.py` (6 files): **ALL PASSED**

### Frontend Production Build Verification:
```bash
cd frontend && npm run build
```
Output:
```text
✓ built in 1.26s (0 TypeScript errors)
```

---


## 11. Project Directory Structure

```text
Razorpay/
├── README.md                     # Definitive Project Documentation (This File)
├── Razorpay Buildathon.pdf       # Hackathon Presentation Slide Deck (PDF)
├── Razorpay Buildathon.pptx      # Hackathon Presentation Slide Deck (PowerPoint)
├── Demo_video.mov                # Full System Demonstration Video
├── run_demo.bat                  # 1-Click Interactive Demo Launcher (Windows)
├── aegis.bat                     # Windows CLI Executable Wrapper
├── aegis                         # Linux / macOS CLI Executable Wrapper
├── docker-compose.yml            # Container Orchestration
├── .env.example                  # Environment Variables Template
├── .gitignore                    # Git Ignore Rules
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py               # FastAPI Application Entrypoint
│   │   ├── agent/                # 9-State Autonomous Core (Controller, Planner, Memory)
│   │   ├── ai/                   # Groq LLM Client & Fallback Parsing
│   │   ├── api/                  # REST API Endpoints (Agent, Commerce, Growth, Trust, etc.)
│   │   ├── config/               # Settings & Environment Configuration
│   │   ├── db/                   # SQLAlchemy Models & SQLite Engine
│   │   ├── growth/               # GraphSAGE GNN, MiniLM, Counterfactual Lab, Encoders
│   │   ├── schemas/              # Pydantic V2 Request / Response Schemas
│   │   ├── security/             # Attack Lab & 6 Adversarial Scenarios
│   │   └── services/
│   │       ├── commerce/         # Razorpay Service & Zero-Bypass Payment Gate
│   │       ├── ledger/           # Append-Only SHA-256 Merkle Audit Ledger
│   │       ├── replay/           # 7-Stage Causal Trajectory Decision Replay
│   │       └── trust/            # HMAC Root Intent, Merkle Derivation, Policy & Risk
│   ├── cli/                      # Rich/Typer Interactive Terminal CLI Commands
│   ├── models/                   # Pre-Trained Weights (aegis-selection-v1.pt)
│   └── tests/                    # 68 Automated Unit, Security & Integration Tests
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── components/           # UI Components (AttackLab, CommerceGraph, etc.)
│   │   │   ├── commerce/         # Autonomous Marketplace Catalog
│   │   │   ├── payment/          # Razorpay Modal Integration
│   │   │   ├── screens/          # Dedicated Views (Command, Growth, Trust, Security, etc.)
│   │   │   ├── visual/           # Interactive Graph, Decision Gate, Risk Gauge
│   │   ├── context/              # Aegis React Context & State Management
│   │   ├── pages/                # Command Center Views
│   │   ├── runtime/              # Commerce Session Engine & Catalog Data
│   │   └── services/             # Axios API Client
│   └── public/                   # Static Assets & Icons
│
└── data/
    └── seed/                     # Initial Commerce Catalog & Merchant Seed Data
```

---

## 13. License & Authors

Submitted for the **Razorpay Agentic Commerce Hackathon (Buildathon)**.  
Built with rigor, mathematical precision, and payment safety as first principles.
