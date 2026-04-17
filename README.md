# VMG Knowledge Center — Agentic RAG Platform

> **Version: 2.0.0** — Fully Agentic Architecture with Dynamic Knowledge Silos.

An enterprise-grade internal knowledge chatbot for VMG staff, powered by an **Agentic RAG State Machine** (LangGraph). This system features a professional Admin UI for real-time knowledge management, folder-based organization, and a "Storage-First" ingestion pipeline to handle massive documentation.

---

## Key Features

*   **Agentic Reasoning:** Uses LangGraph to orchestrate a multi-stage workflow: Decompose → Parallel Retrieval → Grading → Self-Correction → Context Compression.
*   **Dynamic Knowledge Silos:** Create, rename, and manage independent knowledge domains (e.g., ESL, Study Abroad, HR) via the Admin UI.
*   **High-Integrity Retrieval:** Hybrid search (Dense + BM25) with a strict **0.45 score threshold** and full silo traceability.
*   **Enterprise Ingestion:** Supports PDF, Markdown, and TXT files. Uses Supabase Storage to bypass Vercel's 4.5MB payload limit.
*   **Real-Time Monitoring:** Live "Research Log" terminal in the Admin panel showing every step of the indexing process.
*   **ORM Managed:** 100% type-safe database management using **Drizzle ORM**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Orchestration** | LangGraph (State Machine) |
| **Database (SQL)** | Supabase (PostgreSQL) + Drizzle ORM |
| **Vector DB** | Qdrant Cloud (Hybrid Search + RRF) |
| **Storage** | Supabase Storage (Storage-First Pipeline) |
| **LLM Providers** | POE API (Grok 4.1) or Inception Labs (Mercury-2) |
| **Embeddings** | Server-side Inference (`intfloat/multilingual-e5-small`) |

---

## Architecture

### The Agentic Workflow (LangGraph)
1.  **Understand:** Analyze user intent and decompose complex questions.
2.  **Retrieve:** Query **all active silos** in parallel for maximum coverage.
3.  **Grade:** Automatically filter out low-score noise (Threshold: 0.45).
4.  **Rewrite:** If context is insufficient, the agent reformulates search queries and tries again.
5.  **Compress:** Extract key facts and figures into a concise Vietnamese summary.
6.  **Synthesize:** Generate a grounded answer with full source traceability.

### Ingestion Pipeline
1.  **Direct Upload:** Frontend uploads file to Supabase Storage (Bypasses Vercel limits).
2.  **Background Processing:** API downloads file and triggers hierarchical chunking.
3.  **Semantic Enrichment:** LLM rewrites chunks for better searchability and assigns titles.
4.  **Vector Sync:** Upserts enriched chunks to Qdrant with parent-child context preservation.

---

## Knowledge Organization

Manage your data hierarchically in the Admin Panel:
*   **Silos:** Independent knowledge spaces (e.g., `vmg_docs_hr`).
*   **Folders:** Organize files within a silo (e.g., `/2025/tuition-fees`).
*   **Files:** Support for `.pdf`, `.md`, and `.txt`.

---

## Environment Variables

Required variables for Vercel and local development:

```env
# ── LLM Configuration ────────────────────────────────────────────────────────
LLM_PROVIDER=inception                   # 'poe' | 'inception'
POE_API_KEY=...
INCEPTION_API_KEY=...

# ── Vector Store (Qdrant) ────────────────────────────────────────────────────
QDRANT_URL=...
QDRANT_API_KEY=...

# ── Database & Storage (Supabase) ────────────────────────────────────────────
DATABASE_URL=...                         # Postgres connection string
SUPABASE_URL=...
SUPABASE_KEY=...                         # service_role key for backend
NEXT_PUBLIC_SUPABASE_URL=...             # public URL for frontend
NEXT_PUBLIC_SUPABASE_KEY=...             # anon/public key for frontend
```

---

## Deployment

### 1. Database Setup
The build process automatically synchronizes the schema:
```bash
# Handled automatically on Vercel via 'pnpm build'
drizzle-kit push --force
```

### 2. Storage Setup
Run the SQL provided in `SUPABASE_STORAGE_SETUP.md` in your Supabase Dashboard to enable large file support.

### 3. Vercel Configuration
Ensure all environment variables are added to the Vercel Dashboard. **Note:** `NEXT_PUBLIC_` variables are required for the browser to communicate with Supabase Storage.

---

## Development

```bash
pnpm install
pnpm dev
```

Admin Access: `/admin` (Password: `ilovevmg`)

---
&copy; 2025 VMG English Center - Internal Knowledge Base
