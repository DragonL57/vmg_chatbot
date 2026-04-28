# VMG MATE - Multi-Agent Tooling Ecosystem

**Version: 4.0.0** — An intelligent agentic companion featuring Metacognitive Reasoning, Long-term Memory, and Enterprise-grade Security.

## 🌟 The "Mate" Philosophy: Machine execution, human direction.
**VMG MATE** is built as a "Glass Box" system. Unlike traditional black-box chatbots, MATE exposes its entire reasoning process, allowing users to verify evidence, trace logic, and maintain absolute control over the AI's actions.

---

## 🧠 Advanced Agentic Capabilities

### 1. Intent Reconstruction (RECAP-Driven)
We have integrated research from **RECAP (REwriting Conversations for Agent Planning)** to resolve the "Ellipsis & Drift" problem.
- **Contextual Expansion**: MATE doesn't just read the last message; it reconstructs elliptical queries (e.g., "What about Australia?") into standalone, high-precision search terms using conversation history.
- **True vs. Fake Shift Detection**: The "Query Architect" node distinguishes between users changing their goal vs. simply refining a previous one, preventing unnecessary search resets.

### 2. Context Engineering (Anthropic-Flavor)
To prevent "Context Rot" and optimize the model's **Attention Budget**, we implement state-of-the-art context management:
- **Structured Compaction**: Instead of basic summarization, MATE creates a "Working Memory Snapshot" that preserves **Active Goals**, **Key Decisions**, and **Rejected Alternatives**.
- **Progressive Disclosure**: Only high-signal tokens are permitted in the context window. Redundant tool outputs and conversational filler are aggressively pruned.

### 3. URASys Indexing (High-Precision RAG)
Our proprietary **URASys (Universal Retrieval & Augmentation System)** ensures zero-hallucination grounding:
- **Hierarchical Parent-Child Chunking**: Documents are split into semantic segments with stable `parentId` mapping. This allows the agent to search small chunks for precision but retrieve full sections for context.
- **Context-Aware Rewriting**: Every chunk is rewritten by an LLM during ingestion to be self-contained, resolving pronouns and ambiguous references before they reach the vector store.

---

## 🛡️ Enterprise Security & Integrity

### 1. Zero-Trust Boundary Validation
Every single API endpoint and internal port is protected by **Zod** schemas. 
- **Untrusted Input**: No request body or query parameter enters our business logic without strict parsing.
- **Type-Safe Adapters**: Our Clean Architecture ensures that infrastructure failures (Database, Vector Store) are caught at the boundary and never pollute the Domain layer.

### 2. XSS & Injection Hardening
- **Sanitized Markdown**: We use `rehype-sanitize` with custom whitelists to ensure that AI-generated content (including Math/LaTeX) is rendered safely without risking XSS injections.
- **Safe Deletion**: Admin routes now perform DB-lookups for metadata instead of trusting client-provided filenames, preventing unauthorized data clearing.

---

## 🏗️ Architectural Blueprint (Clean Architecture)

```
┌───────────────────────────────────────────────────────────┐
│ Adapters (Next.js Routes, Qdrant, Drizzle, Supabase)      │ ← Infrastructure
├───────────────────────────────────────────────────────────┤
│ Use Cases (IndexFile, ExtractMemory, ReconstructQuery)    │ ← Application
├───────────────────────────────────────────────────────────┤
│ Entities (Message, KnowledgeFile, agent_traces)           │ ← Domain
└───────────────────────────────────────────────────────────┘
```

### Key Technical Stack
- **AI**: LangGraph (Stateful workflows), OpenAI GPT-4o / O3-Mini.
- **Storage**: Supabase (PostgreSQL), Qdrant (Vector).
- **Observability**: Custom `ILoggerProvider` for structured "Glass Box" tracing.
- **Testing**: Vitest with mandatory 100% coverage for all Application Use Cases.

---

## 🛠️ Developer Setup

### Environment Variables (`.env.local`)
Required keys for full agentic functionality:
- `DATABASE_URL`: Supabase Connection String (Port 6543 for pooling).
- `QDRANT_URL` & `QDRANT_API_KEY`: High-performance vector retrieval.
- `INCEPTION_API_KEY`: Enterprise LLM orchestration.
- `SUPABASE_KEY`: Service Role Key for secure background indexing.

### Critical Commands
```bash
pnpm install          # Install dependencies
pnpm test run         # Execute full verification suite
pnpm dev              # Launch localized development environment
npm run db:push       # Synchronize schema changes
```

---
**VMG MATE** — *Your Intelligent Partner for a Smarter Workspace.*
Copyright 2026 VMG English Center.
