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
- **Intent Visualization:** RECAP reconstructions and Router decisions are visible to provide transparency into the "why" behind an answer.

### 8.1.3 Performance Metrics
- **Node-level Analysis:** We track the latency and cost of each specialized agent to identify bottlenecks.
- **Meta-Grading Success Rate:** We monitor how often the `grade` node rejects evidence to identify gaps in the knowledge base.

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

### 8.2.3 Iterative Planning & Correction

VMG MATE does not execute a static list of tasks. Instead, it uses **Iterative Planning**:
- **Meta-Grading Feedback:** The `grade` node evaluates the results of the `retrieve` subtask. If the outcome is insufficient, the system "re-plans" by triggering the `rewrite` node.
- **Dynamic Adaptation:** If the `router_expand` node discovers that a query requires multi-hop retrieval, it can decompose the intent into multiple `subQueries` that are executed sequentially or in parallel.

### 8.2.4 Mitigation of Context Failures

To prevent common agentic failures, MATE employs the following architectural "guards":

- **Context Poisoning (Hallucination Loops):** Prevented by the **Meta-Grader** node. It validates retrieved evidence before it enters the synthesis stage. Low-quality evidence is quarantined, and a `rewrite` loop is triggered.
- **Context Distraction (History Overload):** Mitigated by the **Summarization Pipeline**. By periodically compressing the context, we prevent the "Lost in the Middle" syndrome and ensure the LLM focuses on the current goal.
- **Context Confusion (Tool Overload):** Controlled by the **Router/Expand** node. Instead of exposing all knowledge silos, the router selects only relevant `targetCollections` based on the query intent.
- **Context Clash (Contradictory Input):** Resolved by **RECAP (Intent Reconstruction)**. The `analyze_query` node reconciles previous instructions with new user inputs to generate a singular, consistent `rewrittenQuestions` set.

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
