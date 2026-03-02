# VMG Wiki — Internal Knowledge Chatbot

An internal chatbot for VMG staff built on **URASys** (Unified Retrieval-Augmented System), an academic RAG pipeline architecture. Answers questions about company knowledge using a hybrid vector + BM25 search backed by Qdrant Cloud.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| LLM | POE API (`grok-4.1-fast-non-reasoning`) |
| Embeddings | Qdrant server-side inference — `intfloat/multilingual-e5-small` (384-dim, free) |
| Vector DB | Qdrant Cloud |
| Search | Hybrid: Dense + BM25 + Reciprocal Rank Fusion |
| Package manager | pnpm |

---

## Architecture

```
User Message
    │
    ▼
┌─────────────────────────────────────────────┐
│  URASys Pipeline                            │
│                                             │
│  1. Decompose — split query into sub-queries│
│     └─ chitchat detected? → skip search     │
│                                             │
│  2. Retrieve (per sub-query, parallel)      │
│     ├─ Hybrid doc search (dense+BM25+RRF)  │
│     └─ FAQ dense search                    │
│                                             │
│  3. Generate                                │
│     ├─ System: identity + static overview  │
│     ├─ Context: retrieved docs + FAQs      │
│     └─ Stream response                     │
└─────────────────────────────────────────────┘
```

---

## Knowledge Folder Structure

```
data/knowledge/
  <domain>/
    index.md    ← chunked, embedded, and indexed into Qdrant
    static.md   ← injected verbatim into every system prompt (for broad questions)
```

**Plug-and-play**: drop a new subfolder with `index.md` and it is auto-discovered by both the index script and the API route. No code changes needed.

---

## Environment Variables

Create `.env.local`:

```env
POE_API_KEY=...
POE_BOT_NAME=grok-4.1-fast-non-reasoning
QDRANT_URL=...
QDRANT_API_KEY=...
QDRANT_ENV=dev        # dev → "dev_" prefixed collections; prod → no prefix
```

---

## Dev / Prod Isolation

| Environment | `QDRANT_ENV` | Qdrant collections |
|---|---|---|
| Local dev | `dev` | `dev_vmg_docs_wiki`, `dev_vmg_faqs_wiki` |
| Vercel Preview | *(unset → defaults to `dev`)* | `dev_*` |
| Vercel Production | `prod` | `vmg_docs_wiki`, `vmg_faqs_wiki` |

Set `QDRANT_ENV=prod` in Vercel → Project Settings → Environment Variables → Production.

---

## Workflow

### 1. Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

### 2. Index knowledge (dev collections)

```bash
set -a && source .env.local && set +a && pnpm tsx scripts/index-knowledge.ts
```

Only re-indexes files whose content has changed (SHA-256 manifest at `data/.index-manifest.json`).

```bash
# Useful flags
pnpm tsx scripts/index-knowledge.ts --status    # show state of each domain
pnpm tsx scripts/index-knowledge.ts --dry-run   # preview without writing
pnpm tsx scripts/index-knowledge.ts --force     # re-index everything
```

### 3. Test at http://localhost:3000

### 4. Push to prod collections (when satisfied)

```bash
set -a && source .env.local && set +a && QDRANT_ENV=prod pnpm tsx scripts/index-knowledge.ts --force
```

### 5. Deploy

```bash
vercel deploy --prod
```
Or push to your main git branch if auto-deploy is enabled.

---

## Indexing Pipeline (URASys)

Each `index.md` file goes through two phases, both parallelised with a concurrency limiter:

**Phase 1 — Chunk & Title** (concurrency = 5)
- Semantic chunking by heading/paragraph
- LLM rewrites each chunk for retrieval clarity
- LLM assigns a descriptive title

**Phase 2 — FAQ Generation** (concurrency = 4 outer, 4 inner)
- LLM generates Q&A pairs per chunk
- LLM expands each question into paraphrase variants
- All variants upserted as FAQ vectors (question → answer)

At query time, **hybrid search** fuses dense vector results with BM25 keyword results using Reciprocal Rank Fusion.

---

## Project Structure

```
src/
  app/
    api/chat/route.ts       — streaming chat endpoint
  components/
    chat/                   — chat UI (streaming, phase indicators)
    layout/Sidebar.tsx      — navigation sidebar
  lib/
    qdrant.ts               — Qdrant client + collection names
    poe.ts                  — POE API client
    bm25.ts                 — BM25 + RRF implementation
  prompts/                  — all LLM prompt templates
  services/
    indexing.service.ts     — Phase 1 & 2 indexing pipeline
    qdrant.service.ts       — upsert / hybrid search / FAQ search
    manager.service.ts      — query decomposition + retrieval orchestration
  types/
    chat.ts                 — ServiceMode, Message types
    agent.ts                — QueryDecomposition schema

data/
  knowledge/                — knowledge domains (plug-and-play)
  .index-manifest.json      — change-detection manifest (git-ignored)

scripts/
  index-knowledge.ts        — CLI indexing script
```

