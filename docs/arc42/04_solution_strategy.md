# 4. Solution Strategy

The solution strategy defines the high-level technical approaches to achieve our quality goals and manage our constraints.

## 4.1 PageIndex-Native Architecture

VMG MATE uses a streamlined agent graph optimized for PageIndex vectorless retrieval.

### 4.1.1 Why No CRAG Loop

PageIndex performs relevance classification at every node during tree navigation — the LLM decides "does this subtree contain the answer?" before descending. A separate grade/rewrite loop is redundant. If nothing is found, the answer generator naturally handles it.

### 4.1.2 Agent Graph

```
START → summarize → analyze_query → retrieve → compress → END
                   (chitchat skips retrieve)
```

Four nodes, linear flow. No routing, no collections, no corrective loops.

- **summarize**: Compacts history to maintain coherence
- **analyze_query**: Determines chitchat vs knowledge query, reconstructs intent
- **retrieve**: Runs PageIndex File System + recursive tree search, returns evidence + trace
- **compress**: Synthesizes final answer from evidence with citations

## 4.2 Hybrid Adaptive-Corrective RAG

The system combines two retrieval strategies:

### 4.2.1 File System Layer (Adaptive)
One LLM call builds a query-dependent topic tree from all document summaries. The LLM then navigates this tree — at each node deciding between:
- **Layer-wise**: Present child topics, prune by labels (informative labels)
- **Dynamic flattening**: Collapse to document leaves (uninformative labels)

### 4.2.2 Recursive Tree Search (Corrective)
For each selected document, the LLM navigates the internal tree recursively. At each level, it sees only immediate children. If branches are explored but nothing found, the node's own content is included as fallback context.

## 4.3 Model Context Protocol (MCP) Integration

VMG MATE adopts the **Model Context Protocol (MCP)** as the foundational standard for connecting the Agentic RAG engine to external data and tools.

### 4.3.1 Universal Adapter Strategy
Instead of hard-coding discrete API integrations for every VMG data source (Academic, HR, Sales), MATE uses MCP as a "universal adapter":
- **Dynamic Discovery:** The reasoning graph can dynamically query MCP servers to discover available **Tools** (actions) and **Resources** (data).
- **Standardized Context:** MCP ensures that context is provided to the LLM in a consistent, machine-readable format, reducing implementation overhead for new integrations.
- **Interoperability:** By adhering to MCP, MATE remains compatible with a wide ecosystem of pre-built MCP servers (e.g., Google Drive, GitHub, Slack) and is prepared for future LLM upgrades.

## 4.4 Tool Consolidation & Context Efficiency

To minimize context usage and prevent "Context Rot," MATE follows the principle of **Multi-step Consolidation**:
- **Consolidated Nodes:** Instead of multiple discrete API calls (e.g., `list_users` + `get_profile`), our nodes compile all necessary context all at once (e.g., the `retrieve` node returns both child chunks and their stable parent context).
- **Token-Efficient Truncation:** Nodes implement sensible truncation and filtering before returning data to the orchestrator, ensuring we stay within the **Attention Budget**.

## 4.3 Planning & Task Decomposition

VMG MATE employs the **Planning Design Pattern** to handle complex, multi-faceted queries.

### 4.3.1 Goal Setting & Decomposition
The `analyze_query` node acts as a **Planner Agent**. It receives a high-level goal and decomposes it into manageable `subQueries`.
- **Structured Output:** The planner generates a machine-readable plan (stored in `AgentState.subQueries`) that downstream agents (Retriever, Synthesis) can process independently.
- **Dynamic Routing:** The `router_expand` node uses the plan to determine if specialized agents or external tools (Zalo, Google) need to be invoked.

### 4.3.2 Iterative Planning
The architecture supports **Iterative Planning** through the Meta-Grader and Rewrite loop. If a subtask (e.g., retrieving specific policy evidence) fails or yields low-quality results, the system re-evaluates the plan and adjusts the search strategy dynamically.

## 4.4 Hybrid Adaptive-Corrective RAG (CRAG)

To ensure **Accuracy (Q-03)** and enable self-correcting retrieval, VMG MATE implements a **Corrective Retrieval-Augmented Generation (CRAG)** architecture. Unlike standard RAG (one-shot retrieve → generate), CRAG adds an inline verification and correction loop that detects when retrieved evidence is insufficient and automatically triggers re-retrieval with improved queries.

### 4.4.1 CRAG Core Loop

The CRAG loop operates across three RAG graph nodes:

```
retrieve → grade → [relevant?] → compress → generate
                  → [irrelevant?] → rewrite → router_expand → retrieve (loop)
                  → [max iterations?] → compress → generate (best-effort)
```

1. **Retrieve** (`retrieve` node): Executes hybrid search (vector + keyword) across selected knowledge silos with k=10 per query for broad recall.
2. **Grade** (`grade` node): A lightweight LLM-based evaluator scores whether retrieved passages actually answer the user's reconstructed intent. It decomposes the question into atomic claims and checks each against the evidence.
3. **Corrective Action** (controller logic): If the evaluator deems evidence insufficient, the `rewrite` node generates improved search queries (synonyms, alternative phrasings) and re-routes through `router_expand` for re-retrieval — up to `MAX_ITERATIONS` (3).

### 4.4.2 Evaluator Scoring

The `grade` node uses a structured schema:

| Score | Action | Description |
|-------|--------|-------------|
| `is_relevant: YES` | → compress | Evidence sufficiently answers the query; proceed to fact synthesis |
| `is_relevant: NO` | → rewrite (if iterations < max) | Evidence is off-topic or insufficient; generate improved query and re-search |
| `is_relevant: NO` + max iterations | → compress | Force best-effort synthesis after exhausting retries |

### 4.4.3 Query Reconstruction

Before grading, the query is reconstructed from conversation context by the `analyze_query` node:
- **Ellipsis Resolution:** "SAT thì sao?" → "Thông tin về các khóa học SAT tại VMG"
- **Fake Intent Shift Protection:** Distinguishes between goal changes and refinements
- **Structured Output:** Produces `rewrittenQuestions` and `subQueries` used by both retrieve and grade nodes

For a detailed rationale of why we use query reconstruction vs. other approaches (heuristic co-reference, no rewriting, etc.), see **§5.2.3 — Analyze Query**.

### 4.4.4 Retrieval Recall for CRAG

CRAG requires broad initial recall to be effective:
- **k=10** per query to ensure edge-relevant documents aren't missed
- **Top-10 final keep** after dedup and score sort (up from top-5) — prevents valid levels like SAT Foundation and Excellence from being dropped when Core and Advanced have slightly higher scores
- **Multiple query variations** generated by `rewrite` node when corrective loop triggers
- **Deduplication** by parent ID to prevent redundant context

### 4.4.5 Fail-Safe: Best-Effort Synthesis

If all retry attempts fail to find relevant evidence, the system still synthesizes a response from whatever context is available, with transparent language indicating the confidence level. This prevents silent failures while maintaining the corrective loop's integrity.

### 4.4.6 Prompt Engineering: Curated Reasoning Example

The master synthesis prompt (`src/core/prompts/master.ts`) includes a **curated reasoning example** following the StSQA approach [arxiv:2304.03087]:

> StSQA (Structured Stance QA) demonstrates that a single manually verified reasoning example in the prompt achieves nearly the same accuracy as dynamically generated chain-of-thought, at a fraction of the cost. The key is quality over quantity: one well-crafted reasoning trace beats many generic ones.

**What the example demonstrates:**
- **ANALYZE → REASON → SYNTHESIZE scaffold** applied end-to-end on a realistic VMG query
- **Dual-track grounding**: uses `# KNOWLEDGE CONTEXT` for enterprise knowledge and `<user_memories>` for personal context
- **Language matching**: Vietnamese query → Vietnamese response
- **Output format compliance**: bullet points, no arrows, no emojis, formal tone
- **Evidence boundary**: answers only from documented policies, no speculation

**Why a single curated example instead of dynamic few-shot selection:**
- Dynamic clustering (Auto-CoT) requires 2+ LLM calls per query, adding latency
- A static curated example costs nothing at inference time
- The example shows the *reasoning process*, not just the output format — this teaches the LLM *how* to think, not just *what* to output
- Works across all query types (enterprise Q&A, personal context, chit-chat) because it generalizes the scaffold rather than the content

**Reference:** This technique is inspired by StSQA [Zhang et al., 2023b] and validated by the systematic comparison of prompting vs. multi-agent methods [Dai et al., 2026], which found that a single curated reasoning example matches or exceeds complex multi-agent approaches at 7-12× lower cost.

## 4.5 "Glass Box" Observability

To satisfy **Auditability (Q-01)** and Law 134/2025:
- **Trace Persistence:** Every node execution in LangGraph is logged to `agent_spans` (Logging & Monitoring).
- **Reasoning Visualization:** The UI renders the thinking process (Visualization) to ensure transparency.
- **Performance Metrics:** Cost and latency are tracked per reasoning node to identify bottlenecks.

## 4.6 Compliance Roadmap (2026 Strategy)

To address the **Technical Debt (Chapter 11)**, we adopt a phased transition:

### Phase A: Consent & Privacy (Short-term)
- **Mechanism:** Implement an explicit "Consent Management" UI on the login screen.
- **Policy:** Link to a versioned Privacy Policy stored as Markdown in the repo.

### Phase A1: Data Subject Rights (Completed — Apr 2026)

Compliant with Law 91/2025 §11 (right to access, right to erasure) and Decree 356/2025 (20-day response window).

#### Right to Access — `GET /api/user/data`
- Authenticated users can download all their personal data as JSON
- Profile is read from the internal `users` table (system of record, synced from Supabase Auth at login)
- Returns: conversations with full messages, user memories, agent traces, reports, and profile

#### Right to Erasure — `DELETE /api/user/data`

The erasure handler scrubs personal data at three layers:

| Layer | What is scrubbed | How |
|-------|-----------------|-----|
| **Supabase Auth** | Email, user_metadata | `supabaseAdmin.auth.admin.updateUserById()` — overwrites with `anon-xxx@anonymized.local`, empties metadata. Uses `SUPABASE_SERVICE_KEY`. |
| **Internal DB — profile** | `users` table email, name, avatar | Set to anonymized values, `updatedAt` updated |
| **Internal DB — conversations** | Title, messages, location, token usage | Content cleared, structure preserved for debugging |
| **Internal DB — memories** | `user_memories` rows | Hard deleted |
| **Internal DB — traces** | `agent_traces.userId`, `conversationId` | Set to null; `isAnonymized = 1` flag set |
| **Internal DB — spans** | `agent_spans.input`, `output` payloads | Set to null (aggregate metrics like token counts and costs preserved for audit) |
| **Internal DB — reports** | Reported message, conversation transcript, note, sessionId | Content scrubbed, `userId` set to null |

**Key design decisions:**
- **Erasure ordering**: DB is scrubbed first; Supabase Auth is scrubbed second. If Auth update fails, DB is already safe and the user can retry. (Never Auth-first — if DB fails after Auth is scrubbed, the user is stuck in a half-anonymized state.)
- Aggregate observability data (token counts, costs, latency) is preserved — only user-content payloads (`input`, `output`) in `agent_spans` are removed.
- The Supabase Auth record is overwritten (not deleted) so the user account remains functional for login.
- The internal `users` table email is overwritten to match the anonymized Auth email.
- Report structure is preserved (for abuse analysis) but all user-generated content is replaced.

#### Termination Cleanup Script — `scripts/anonymize-user.ts`

For offboarding (employment termination), an admin can run:

```bash
npx tsx scripts/anonymize-user.ts <email|supabase_id>
```

This script performs the same scrubbing as the API route, but can be run directly against the database (no auth session required). It also scrubs Supabase Auth if `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `.env.local`.

**Prerequisites:**
- `DATABASE_URL` in `.env.local`
- (Optional) `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` for Auth scrub
- The script does not log PII (only internal user IDs and anonymized IDs)

### Phase B: Infrastructure Sovereignty (Medium-term)
- **Containerization:** All core logic is decoupled from cloud-specific APIs.
- **Target:** Transition from Supabase Cloud to a self-hosted PostgreSQL/Auth stack on a **Vietnamese VPS**.
- **Vector:** Migrate to a self-hosted Qdrant instance on the same VPS.

### Phase C: Secure Audit Reporting (Long-term)
- **Standard:** Implement **Cryptographic Receipts** (based on IETF `draft-farley-acta-signed-receipts`).
- **Mechanism:** Every agent action (tool call/response) is sealed with an **Ed25519 signature** over JCS-canonicalized JSON.
- **Integrity:** Receipts are **Hash-Chained** (`previous_receipt_hash`) to ensure the sequence of actions cannot be reordered or deleted without detection.
- **Verification:** Implement an offline verification tool for regulators to audit MATE decisions independently of the database.
