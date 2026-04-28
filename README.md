# VMG MATE - Multi-Agent Tooling Ecosystem

**Version: 4.1.0** — High-Integrity Agentic RAG Platform.

## 🌟 The "Glass Box" Vision
VMG MATE is not a chatbot; it is an **Agentic Retrieval-Augmented Generation (Agentic RAG)** system. We prioritize **Process-Aware Observability**, ensuring every decision—from query routing to evidence grading—is traceable, verifiable, and secure.

---

## 🏗️ Agentic RAG Taxonomy Alignment
Based on the latest industry surveys (arXiv:2501.09136), VMG MATE is classified as a **Hybrid Adaptive-Corrective RAG** system.

### 1. Agentic Design Patterns
- **Reflection & Self-Critique**: Our `Meta-Grader` node evaluates retrieved documents for relevance. If the "Knowledge Evidence" is deemed insufficient, the system triggers a **Corrective Loop** to rewrite the query or expand the search.
- **Planning (Orchestrator-Worker)**: The `Gateway Agent` acts as an orchestrator, decomposing user intent into specialized tasks for downstream worker nodes (Retrieval, Memory, or Chit-Chat).
- **Tool Use**: Seamless integration with **Qdrant** (Vector), **PostgreSQL** (Relational), and **Web Search** tools, dynamically selected based on query complexity.

### 2. Adaptive Workflow Patterns
- **Evaluator-Optimizer**: We employ iterative refinement loops. If a generated answer fails internal grading, the system optimizes the prompt and re-attempts retrieval.
- **Adaptive Routing**: Simple queries bypass the complex RAG graph for efficiency, while multi-hop questions trigger the full agentic reasoning chain.

---

## 🧠 Advanced Intent & Context Engineering

### 1. Intent Reconstruction (RECAP-Driven)
Integrated from **RECAP (arXiv:2509.04472)**:
- **Ellipsis Resolution**: Automatically reconstructs follow-up questions (e.g., "What about Australia?") into standalone search instructions.
- **Fake Intent Shift Protection**: Distinguishes between goal changes and goal refinements to maintain search stability.

### 2. Context Engineering (Anthropic-Flavor)
- **Structured Compaction**: Prevents "Context Rot" by distilling conversation history into high-fidelity "Working Memory Snapshots."
- **Attention Budget Optimization**: Aggressively prunes low-signal tokens to ensure the model focuses on critical facts and unresolved goals.

---

## 🛡️ Enterprise Security & URASys Indexing

### 1. URASys (Universal Retrieval & Augmentation System)
- **Hierarchical Indexing**: Parent-Child chunking with stable `parentId` mapping for precise retrieval without losing document context.
- **Context-Aware Rewriting**: LLM-augmented ingestion resolves pronouns and ambiguity at the storage level.

### 2. Security Mandates
- **Zero-Trust Boundaries**: All inputs are validated via **Zod** at the Adapter boundary.
- **XSS Protection**: Whitelisted `rehype-sanitize` for safe Markdown/KaTeX rendering.
- **Auth Guards**: Mandatory Supabase JWT verification on all internal data mutations.

---

## 📊 Process-Aware Observability
We evaluate **Process, not just Outcomes**.
- **Thought Traces**: Real-time visualization of the agentic reasoning graph.
- **Trace Finalization**: Mandatory trace lifecycle management to prevent "hanging" database records.
- **Cost & Token Tracking**: Granular monitoring of token consumption per reasoning node.

---

## 🛠️ Technical Documentation

For detailed implementation specifics, architectural boundaries, and layer-by-layer analysis, refer to the following:

- **[Architecture Overview](./docs/ARCHITECTURE.md)**: High-level design and agentic taxonomy.
- **[Domain Layer](./docs/DOMAIN.md)**: Pure entities, business policies, and chunking services.
- **[Application Layer](./docs/APPLICATION.md)**: Use cases, port interfaces, and orchestration logic.
- **[Agentic RAG Layer](./docs/AGENT.md)**: LangGraph state, node topology, and routing logic.
- **[Infrastructure Layer](./docs/INFRASTRUCTURE.md)**: Persistence (Drizzle), Vector Store (Qdrant), and LLM adapters.
- **[UI & API Layer](./docs/UI_API.md)**: Next.js App Router, streaming API, and React components.

---
**VMG MATE** — *State-of-the-Art Agentic Intelligence for the Enterprise.*
Copyright 2026 VMG English Center.
