# 4. Solution Strategy

The solution strategy defines the high-level technical approaches to achieve our quality goals and manage our constraints.

## 4.1 Multi-Agent Design Pattern (Hand-off & Specialization)

Instead of a monolithic "Do-it-all" agent, VMG MATE adopts a **Multi-Agent Design Pattern** using the **Hand-off** and **Orchestrator-Worker** models.

### 4.1.1 Rationale for Multi-Agent Architecture
- **Specialization:** Each node (Summarize, Grade, Rewrite) is a specialized "mini-agent" with a narrow scope. This prevents the LLM from getting confused by too many instructions or tools (Context Confusion).
- **Fault Tolerance:** If the `Grade` node detects a failure, it can hand off back to the `Rewrite` node rather than failing the entire conversation.
- **Agentic Maintenance:** Smaller, specialized prompts are easier for AI coding agents to maintain and optimize without unintended side effects on the rest of the system.

### 4.1.2 The "Hand-off" Workflow
The system orchestrates a linear-to-cyclic hand-off between specialized nodes:
1. **Summarizer** (Context Specialist) → **Analyzer** (Intent Specialist)
2. **Analyzer** → **Router** (Gateway Specialist)
3. **Router** → **Retriever** (Knowledge Specialist) or **Compressor** (Synthesis Specialist)
4. **Retriever** → **Grader** (Quality/Compliance Specialist)

## 4.2 Agentic RAG Principles (Ownership & Iteration)

VMG MATE follows the **Agent-First Tool Design** philosophy (inspired by Anthropic's "Writing Effective Tools"):
- **Deterministic Tools vs. Non-deterministic Agents:** While our specialized nodes (tools) are deterministic in implementation, they are designed to be "ergonomic" for the non-deterministic reasoning nodes that call them.
- **Surface Area for Strategy:** We provide nodes with high-signal descriptions and structured schemas, allowing the agentic orchestrator to pursue a variety of successful strategies (e.g., deciding whether to broaden a search or synthesize existing data).

### 4.2.1 Owning the Reasoning Process
The system is designed to "own" its reasoning. It does not follow a pre-defined, rigid chain-of-thought. Instead, the specialized nodes autonomously determine the next step based on the quality of retrieved information:
- If evidence is insufficient, the system decides to **Rewrite** and re-query.
- If the question is ambiguous, the system decides to **Analyze** and request clarification.
- This autonomous orchestration is bounded by the **LangGraph** topology, ensuring agency is productive and governed.

### 4.2.2 Iterative Maker-Checker Style
MATE employs an iterative "Maker-Checker" loop to improve correctness:
- **The Maker:** The `retrieve` and `rewrite` nodes act as the "producers" of information.
- **The Checker:** The `grade` (Meta-Grader) node acts as the "evaluator."
- **The Loop:** This cycle continues (up to `MAX_ITERATIONS`) until a high-quality, grounded answer is achieved, handling malformed queries and low-signal data effectively.

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

## 4.4 Hybrid Adaptive-Corrective RAG

To ensure **Accuracy (Q-03)**, we use a multi-agent orchestration pattern:
- **Meta-Grading:** Self-reflection nodes that evaluate document relevance before synthesizing answers.
- **URASys Indexing:** Hierarchical parent-child chunking to preserve context.
- **RECAP Intent:** Intent reconstruction to handle ambiguous follow-up questions.

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

### Phase B: Infrastructure Sovereignty (Medium-term)
- **Containerization:** All core logic is decoupled from cloud-specific APIs.
- **Target:** Transition from Supabase Cloud to a self-hosted PostgreSQL/Auth stack on a **Vietnamese VPS**.
- **Vector:** Migrate to a self-hosted Qdrant instance on the same VPS.

### Phase C: Secure Audit Reporting (Long-term)
- **Standard:** Implement **Cryptographic Receipts** (based on IETF `draft-farley-acta-signed-receipts`).
- **Mechanism:** Every agent action (tool call/response) is sealed with an **Ed25519 signature** over JCS-canonicalized JSON.
- **Integrity:** Receipts are **Hash-Chained** (`previous_receipt_hash`) to ensure the sequence of actions cannot be reordered or deleted without detection.
- **Verification:** Implement an offline verification tool for regulators to audit MATE decisions independently of the database.
