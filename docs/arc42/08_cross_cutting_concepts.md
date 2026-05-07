# 8. Cross-cutting Concepts

Concepts that apply across multiple building blocks.

## 8.1 "Glass Box" Observability (Multi-Agent Visibility)

To ensure the reliability of the multi-agent system, we implement three layers of visibility:

### 8.1.1 Logging & Monitoring
- **Trace Persistence:** Every user interaction generates a root `agent_traces` record.
- **Span Detail:** Every node execution (agent action) is logged as an `agent_spans` record.
- **Metadata:** Logs capture raw input, output, model version, latency, and granular token costs (Prompt, Completion, Cached).

### 8.1.2 Visualization (Metacognitive Trace)
- **Real-time UI:** The frontend renders a live "thinking" state, showing which agent node is currently active (e.g., "MATE is grading evidence...").
- **Intent Visualization:** Query reconstructions and Router decisions are visible to provide transparency into the "why" behind an answer.

### 8.1.3 Performance Metrics
- **Node-level Analysis:** We track the latency and cost of each specialized agent to identify bottlenecks.
- **Meta-Grading Success Rate:** We monitor how often the `grade` node rejects evidence to identify gaps in the knowledge base.

### 8.1.4 Data Erasure & Observability

To comply with Law 91/2025 §11 (right to erasure), user-generated content in observability data is scrubbed upon erasure request:
- `agent_spans.input` and `agent_spans.output` (JSONB) are set to `NULL` — these contain user query text and LLM responses.
- `agent_traces.userId` and `agent_traces.conversationId` are set to `NULL` to remove linking.
- `agent_traces.isAnonymized` is set to `1` to explicitly mark the trace as anonymized.
- Aggregate metrics (token counts, costs, latency, feedback scores) are preserved for system performance analysis.

## 8.2 Agent Memory & Context Engineering

VMG MATE manages information across multiple memory tiers to ensure a self-improving, personalized user experience.

### 8.2.1 Memory Taxonomy

| Type | Implementation in MATE | Purpose |
| :--- | :--- | :--- |
| **Working Memory** | `AgentState` / Scratchpad | Immediate notes and sub-queries used during a single reasoning cycle. |
| **Short-Term Memory** | `context_summary` | The context of the current session, distilled via the `summarize` node. |
| **Long-Term Memory** | `user_memories` table | Persistent facts and preferences (e.g., "User prefers PDF exports") retrieved at session start. |
| **Persona Memory** | System Prompts | Ensures MATE maintains a consistent "Expert Academic Assistant" persona. |
| **Episodic Memory** | `agent_traces` | Records past successes and failures (e.g., failed searches) to improve future planning. |
| **Entity Memory** | Structured RAG / URASys | Extracting and indexing specific entities (Places, Policies, People) from documents. |

### 8.2.2 Self-Improvement Loop (The Knowledge Agent)

To enable continuous learning, VMG MATE implements a **Knowledge Agent** pattern:
1. **Observation:** A background `Memory Extractor` node observes the finalized conversation.
2. **Extraction:** It identifies valuable facts or user preferences (e.g., "User is interested in IELTS level 7.5").
3. **Persistence:** Extracted facts are stored in the `user_memories` table, rewritten in the third person.
4. **Augmentation:** Future sessions retrieve these memories and inject them into the `AgentState`, allowing MATE to be proactive (e.g., "Since you are preparing for IELTS 7.5...").

### 8.2.3 Iterative Planning & Correction (CRAG Loop)

VMG MATE implements **Corrective RAG (CRAG)** — an inline verification and correction loop that detects insufficient evidence and triggers re-retrieval.

For a detailed breakdown of each node's logic, academic provenance, and rationale (including why CRAG was chosen over Naive RAG, Self-RAG, ReAct, and RECAP), see **§5.2.3 Node Deep-Dive** and **§5.2.4 Overall Architecture: The CRAG Loop**.

#### CRAG Data Flow

```
retrieve ──→ grade ──→ [relevant?] ──→ compress ──→ generate
                      → [irrelevant?] ──→ rewrite ──→ router_expand ──→ retrieve (↻ loop)
                      → [max retries?] ──→ compress ──→ generate (best-effort)
```

1. **Retrieve** (k=10 per query): Broad initial recall using hybrid vector + keyword search.
2. **Grade** (Meta-Grader): A lightweight evaluator scores claim↔evidence alignment. Outputs `is_relevant: YES/NO` with reasoning.
3. **Rewrite** (corrective action): Generates improved queries (synonyms, alternative phrasings) when grade returns NO.
4. **Loop back** to `router_expand` → `retrieve` with the new queries, up to `MAX_ITERATIONS` (3).
5. **Best-effort synthesis**: After exhausting retries, compresses whatever evidence exists rather than returning empty.

#### Why Always Grade

Prior to the fix, the `retrieve→grade` edge conditionally skipped grading when retrieved content exceeded 3000 tokens (token compression threshold). This **bypassed the CRAG loop entirely** for large document sets — the system would compress irrelevant content and fail silently. The fix ensures `retrieve` **always** routes to `grade`, making the corrective loop reliable regardless of document size.

#### Key Properties
- **Claim-level verification**: Grade decomposes the question into atomic claims and checks each against evidence
- **Reconstructed queries**: Grade uses reconstructed intent (`rewrittenQuestions`/`subQueries`) instead of raw user message, enabling accurate context-aware grading
- **Iterative refinement**: Each rewrite loop broadens the search with improved queries, increasing recall progressively

### 8.2.4 Mitigation of Context Failures

To prevent common agentic failures, MATE employs the following architectural "guards":

- **Context Poisoning (Hallucination Loops):** Prevented by the **Meta-Grader** node. It validates retrieved evidence before it enters the synthesis stage. Low-quality evidence is quarantined, and a `rewrite` loop is triggered.
- **Context Distraction (History Overload):** Mitigated by the **Summarization Pipeline**. By periodically compressing the context, we prevent the "Lost in the Middle" syndrome and ensure the LLM focuses on the current goal.
- **Context Confusion (Tool Overload):** Controlled by the **Router/Expand** node. Instead of exposing all knowledge silos, the router selects only relevant `targetCollections` based on the query intent.
- **Context Clash (Contradictory Input):** Resolved by **Query Reconstruction**. The `analyze_query` node reconciles previous instructions with new user inputs to generate a singular, consistent `rewrittenQuestions` set.

## 8.6 Automated Testing Strategy

Testing is a cross-cutting concern spanning all layers of the Clean Architecture. The testing strategy follows the principle: **test behavior visible to users, not implementation details**.

### 8.6.1 Testing Layers

| Layer | Test Type | Environment | What to Test |
|-------|----------|-------------|-------------|
| **Domain** | Unit (pure functions) | jsdom | All entities, value objects, services. No mocking needed. |
| **Application** | Unit (mocked ports) | jsdom | Use cases with mocked adapters. Test success, failure, and edge paths. |
| **Adapters** | Integration (real services) | node | Real Qdrant, real Postgres, real LLM calls. Smoke-test connectivity. |
| **Components** | Unit (React Testing Library) | jsdom | Render output and user interactions. Mock sub-components, never test CSS classes. |
| **API Routes** | Unit (mocked Next.js) | jsdom | Route handlers with mocked Supabase, adapters, and env vars. |

### 8.6.2 Component Test Rules

- **User-centric queries only**: `screen.getByText`, `screen.getByRole`, `screen.getByLabelText`, `screen.getByPlaceholderText`
- **Forbidden**: `document.querySelector`, `document.querySelectorAll`, `document.body.textContent`, assertions on component props/state
- **Acceptable only when no text exists**: `container.querySelector` for presentational elements (skeletons, icons)

### 8.6.3 Test Description Convention

Every test title follows Given-When-Then:

```
it('given <precondition>, [when <action>,] <expected outcome>')
```

Examples:
- `'given an empty input, disables the submit button'`
- `'given a user message, does not show the report button'`
- `'given a click handler, when user clicks suggestion, calls it with the label'`

### 8.6.4 Build Pipeline Integration

Tests are mandatory before compilation:

```bash
pnpm lint:strict && pnpm test:unit && pnpm test:integration && next build
```

- `lint:strict`: ESLint with `--max-warnings 0`
- `test:unit`: Vitest in jsdom (fast, mocked, 67 test files)
- `test:integration`: Vitest in node with `.env.local` (real services, 5 test files)
- `next build`: TypeScript compilation + Next.js production build

### 8.6.5 Vercel Build Compatibility

Vercel's build environment resolves `react-dom` to the **production CJS bundle** (`react-dom/cjs/react-dom-test-utils.production.js`). This causes a conflict with `@testing-library/react@16`:

- **Root cause**: `react-dom-test-utils.production.js` calls `React.act(callback)`, but React 19.2.5 production builds do not attach `act` as a writable function on the namespace object.
- **Symptom**: All 67 test suites fail with `TypeError: React.act is not a function` or `TypeError: Cannot redefine property: act`.
- **Why local passes**: Local development resolves the ESM development version of `react-dom`, which has a working `act`.

**Fix**: Use Vitest's `alias` config to redirect ALL imports of `react-dom/test-utils` to a mock file that imports the real module but overrides `act` with React's own `act` export (available in Vitest's bundled ESM environment, even when Vercel resolves CJS).

```typescript
// vitest.config.ts — test.alias
alias: {
  'react-dom/test-utils': path.resolve(__dirname, './src/test/__mocks__/react-dom-test-utils.ts'),
}
```

```typescript
// src/test/__mocks__/react-dom-test-utils.ts
export * from 'react-dom/test-utils';  // re-export all original exports
import * as React from 'react';
export const act = React.act;          // override: use React's own act
```

This works at the module resolution level — ALL consumers (including `@testing-library/react`'s internal `act-compat.js`) resolve to the mock file, which delegates to React's working `act` instead of the broken CJS production `act`.

Attempted alternative approaches that failed:

| Approach | Failure Reason |
|----------|---------------|
| `React.act = (cb) => cb()` — direct assignment | Property is read-only (`Cannot redefine property: act`) in Vercel's React production build |
| `Object.defineProperty(React, 'act', ...)` | Property is non-configurable; `TypeError` thrown |
| `vi.mock('react-dom/test-utils', ...)` in setup file | Vitest hoists `vi.mock` within the file, but `@testing-library/react` may resolve the module before the setup file executes on Vercel |
| `test.alias` in vitest.config.ts | **Works** — module resolution is intercepted at the bundler level, before any consumer loads |

## 8.3 Security & Validation

- **Zod Boundaries:** All external data is parsed at the adapter layer before entering the application/domain layers.
- **JWT Middleware:** Supabase-managed authentication on all sensitive routes.
- **Domain Restriction:** Strict proxy-level filtering for `@vmg.edu.vn` emails.

### 8.3.1 Tool Trustworthiness & Security
Giving agents the ability to execute tools introduces unique security risks (e.g., SQL injection, malicious side effects). MATE mitigates these through the following architectural constraints:
- **Read-Only Permissions:** Any tool interacting with a database (relational or vector) is assigned a **Strictly Read-Only (SELECT)** role. Data mutations are only allowed through controlled, Zod-validated Use Cases.
- **Input Validation (Zod Boundaries):** Every model-generated function call is parsed and validated via Zod at the Adapter boundary. Malformed or dangerous parameters are rejected before execution.
- **Execution Sandboxing:** Tools are executed within restricted environments (Edge/Serverless functions) to isolate potential side effects and ensure resource safety.

## 8.4 Model Context Protocol (MCP) Standards

VMG MATE implements the **Model Context Protocol (MCP)** to ensure standardized, secure, and dynamic interaction between agents and external systems.

### 8.4.1 MCP Architecture
The system follows a client-server architecture:
- **Host:** The VMG MATE application (Next.js/LangGraph) acts as the host that initiates connections.
- **Clients:** Internal components within the reasoning graph that maintain 1:1 connections with MCP servers.
- **Servers:** Lightweight programs (local or remote) that expose specific capabilities to the host.

### 8.4.2 MCP Primitives
MATE utilizes three core primitives from the protocol:
1. **Tools:** Discrete, executable functions (e.g., `send_zalo_reply`, `schedule_meeting`) with standardized input/output schemas.
2. **Resources:** Read-only data items (e.g., `academic_handbook.pdf`, `student_records_json`) that the agent can retrieve on demand.
3. **Prompts:** Pre-defined templates provided by the server to guide the agent through complex domain-specific workflows.

### 8.4.3 Agency Boundaries & Tool Ergonomics
To maintain trust and ensure compliance with **Law 134/2025/QH15**, MATE enforces strict standards for tool interaction:
- **Infrastructure Autonomy:** The agent's "agency" is limited to the tools and policies provided via MCP. It cannot bypass the core LangGraph topology.
- **Semantic Identifiers:** We eschew low-level technical identifiers (UUIDs) in favor of natural language names to reduce LLM hallucinations.
- **Namespacing:** Tools are grouped by common prefixes (e.g., `retrieval_`, `memory_`) for efficient discovery.

## 8.5 Secure Audit Trails (Cryptographic Receipts)

To satisfy the highest levels of trust and regulatory compliance, VMG MATE implements a **Cryptographic Receipt** standard.

### 8.5.1 Technical Mechanics
1. **Signature (Ed25519):** Every action payload is signed by the agent's private key.
2. **Canonicalization (JCS - RFC 8785):** Payloads are serialized using the JSON Canonicalization Scheme for byte-identical signatures.
3. **Hash Chaining:** Each receipt includes the SHA-256 hash of the previous receipt to ensure ordering and integrity.

### 8.5.2 Verification
- **Independent Verification:** Regulators can verify receipts offline using only the system's public key.
- **Tamper-Evidence:** Any modification to a receipt invalidates the signature immediately.
