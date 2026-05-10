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

### 8.2.3 PageIndex Retrieval (Vectorless RAG)

VMG MATE uses **PageIndex** — a vectorless, reasoning-based retrieval framework. Instead of embeddings and vector similarity, documents are organized as hierarchical trees and an LLM navigates them like a human expert reading a book.

#### Architecture

```
Query → File System Layer (select documents by summary)
     → Document Tree Search (recursive layer-by-layer navigation)
     → Content Extraction (leaf nodes with matched content)
     → Answer Synthesis
```

1. **File System Layer**: One LLM call builds a query-dependent topic tree from all document summaries. The LLM then navigates this tree — at each node deciding whether to explore child topics (layer-wise) or collapse to document leaves (dynamic flattening).
2. **Document Tree Search**: For each selected document, the LLM navigates the internal tree recursively. At each level, it sees only the immediate children (~5-15 nodes), never the entire tree. This prevents context overload on large documents (300+ nodes).
3. **Content Extraction**: Leaf nodes reached through navigation return their full content. No embedding bottleneck, no top-K truncation.

#### Key Properties
- **Relevance classification, not similarity**: The LLM makes yes/no decisions at each node — "does this subtree contain the answer?" — using full document understanding.
- **Recursive by default**: Always navigates layer-by-layer, matching how a human reads a table of contents.
- **No fallback needed**: If the LLM finds nothing relevant, the answer generator naturally says "tôi không tìm thấy thông tin này."

### 8.2.4 Agent Graph (Linear Flow)

```
START → summarize → analyze_query → retrieve → compress → END
                   (chitchat skips retrieve)
```

The graph has no routing, no collections, no grade/rewrite corrective loop. PageIndex handles relevance at every step of tree navigation.

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

## Build Pipeline

The default `build` script runs hermetic checks only (lint + unit tests). Integration tests (real Qdrant/LLM calls) are excluded from the default pipeline because they require secrets and network access, making them non-hermetic and unsuitable for all CI/CD environments.

### Default build (hermetic)

```bash
pnpm lint:strict && pnpm test:unit && next build
```

- `lint:strict`: ESLint with `--max-warnings 0`
- `test:unit`: Vitest in jsdom (fast, mocked, 67 test files)
- `next build`: TypeScript compilation + Next.js production build

### Integration tests (optional, requires `.env.local`)

Integration tests run against real external services and must be invoked explicitly:

```bash
pnpm test:integration
```

This script uses `vitest.integration.config.ts`, which loads credentials from `.env.local` and runs tests in a `node` environment with real service connectivity. It is intended for:
- Local development verification before pushing
- Dedicated CI jobs/stages with the required secrets and outbound access

### 8.6.5 Vercel Build Compatibility

Vercel's build environment resolves `react-dom` to the **production CJS bundle** (`react-dom/cjs/react-dom-test-utils.production.js`). This causes a conflict with `@testing-library/react@16`:

- **Root cause**: `react-dom-test-utils.production.js` calls `React.act(callback)`, but React 19.2.5 production builds do not attach `act` as a writable function on the namespace object.
- **Symptom**: All 67 test suites fail with `TypeError: React.act is not a function` or `TypeError: Cannot redefine property: act`.
- **Why local passes**: Local development resolves the ESM development version of `react-dom`, which has a working `act`.

**Root cause**: Vercel injects `NODE_ENV=production` globally across its build container. Vitest's jsdom environment runs in a Node.js process (Vite SSR pipeline), inheriting this value. Node.js then resolves React's CJS production bundle (`react/cjs/react.production.js`) via its `package.json` export map, where `React.act` is intentionally stripped to reduce bundle size.

**Fix**: Explicitly override `NODE_ENV=test` during test execution. This forces Node.js to resolve React's development bundle, where `React.act` exists and `@testing-library/react`'s `act-compat.js` can use it directly, never falling back to the broken production `react-dom/test-utils`.

```jsonc
// package.json
"test:unit": "cross-env NODE_ENV=test vitest run --coverage",
"test:integration": "cross-env NODE_ENV=test vitest run --config vitest.integration.config.ts"
```

`cross-env` ensures cross-platform compatibility (Windows/Linux). When `NODE_ENV=test`, Node.js resolves `react` → development ESM build → `React.act` is available → `@testing-library/react` uses it → no fallback to `react-dom/test-utils`.

Attempted alternative approaches that failed:

| Approach | Failure Reason |
|----------|---------------|
| `React.act = (cb) => cb()` — direct assignment | ES module namespace is read-only (`Cannot redefine property`) |
| `Object.defineProperty(React, 'act', ...)` | Property is non-configurable in sealed module namespace |
| `vi.mock('react-dom/test-utils', ...)` in setup | Mock doesn't match pnpm's symlinked realpath; Node.js bypasses vitest cache |
| `test.alias` in vitest.config.ts | Vite aliases only apply to inlined modules; externalized deps go to Node.js resolver directly |
| `cross-env NODE_ENV=test` in package.json scripts | **Works** — sets env at process level before vitest starts, Node.js resolves development React bundle |

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
