# VMG Wiki — Internal Knowledge Chatbot

An internal chatbot for VMG staff built on **URASys** (Unified Retrieval-Augmented System), an academic RAG pipeline architecture. Answers questions about company knowledge using a hybrid vector + BM25 search backed by Qdrant Cloud, with conversation analytics and quality reporting via Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| LLM | POE API (`grok-4.1-fast-non-reasoning`) |
| Embeddings | Qdrant server-side inference — `intfloat/multilingual-e5-small` (384-dim, free) |
| Vector DB | Qdrant Cloud |
| Search | Hybrid: Dense + BM25 + Reciprocal Rank Fusion |
| Analytics DB | Supabase (conversations + reports) |
| Package manager | pnpm |

---

## Architecture

```
User opens app
    │
    ▼
┌─────────────────────────────────────────────┐
│  Location Gate                              │
│  Browser asks for geolocation permission.  │
│  Raw coords stored; Nominatim reverse-      │
│  geocode attempted (non-blocking).          │
│  Chat is blocked until permission granted. │
└─────────────────────────────────────────────┘
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
    │
    ▼
┌─────────────────────────────────────────────┐
│  Post-response: Save to Supabase            │
│  POST /api/conversation — upsert session    │
│  with full message history + location data │
└─────────────────────────────────────────────┘
```

---

## Knowledge Folder Structure

```
data/knowledge/
  <domain>/
    index.md    ← chunked, embedded, and indexed into Qdrant
    static.md   ← injected verbatim into every system prompt (broad questions)
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
SUPABASE_URL=...
SUPABASE_KEY=...      # service_role key or publishable key with RLS off
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

## Supabase Schema

Run once in the Supabase SQL Editor:

```sql
-- Stores every conversation session with location + message history
create table conversations (
  id text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  messages jsonb not null default '[]',
  location_coords jsonb,       -- { latitude, longitude, accuracy }
  location_address text,       -- Nominatim reverse geocode (best-effort)
  message_count int default 0
);

-- Stores flagged assistant messages reported by staff
create table reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  reported_message text not null,
  conversation jsonb not null,
  note text,                   -- "<problem type> — <free text>"
  status text default 'open',
  session_id text references conversations(id)
);
```

---

## Analytics Features

### Conversation Tracking
- Each page load generates a UUID **session ID** that persists for the session.
- After every completed assistant response, `POST /api/conversation` upserts the full message history (excluding tool-call system messages) along with raw GPS coordinates and reverse-geocoded address.
- Use Supabase Table Editor or SQL to query patterns: busiest hours, common topics, geographic distribution.

### Quality Reporting
- Every assistant message shows a visible **"Báo cáo sai"** flag button below it.
- Clicking opens a modal where staff select a problem type (chip, required) and optionally add a note.
- Problem types: content error, theoretically correct but practically wrong, missing info, outdated, irrelevant, wrong numbers/fees, other.
- Reports are stored in `reports` with a `session_id` foreign key — join with `conversations` to see the full chat context for any flagged answer.

### Location Gate
- On first load the app requests browser geolocation (mandatory — no skip option).
- If permission was previously granted, coordinates are read silently without showing the modal.
- If denied, a message guides the user to browser settings; the modal stays open until access is granted.
- Raw `{ latitude, longitude, accuracy }` is always stored. A non-blocking Nominatim reverse geocode is attempted to also store a human-readable address.

---

## Workflow

### 1. Development

```bash
pnpm install
pnpm dev
```

### 2. Index knowledge (dev collections)

```bash
set -a && source .env.local && set +a && pnpm tsx scripts/index-knowledge.ts
```

Only re-indexes files whose content has changed (SHA-256 manifest at `data/.index-manifest.json`).

```bash
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
    api/
      chat/route.ts           — streaming chat endpoint
      conversation/route.ts   — upsert session to Supabase
      report/route.ts         — save flagged message to Supabase
  components/
    chat/
      chat-interface.tsx      — main UI: location gate, session ID, conversation saving
      message-item.tsx        — renders message + report button + report modal
      message-list.tsx        — message feed
      location-modal.tsx      — forced geolocation permission modal
    layout/Sidebar.tsx        — navigation sidebar
  lib/
    qdrant.ts                 — Qdrant client + collection names
    poe.ts                    — POE API client
    bm25.ts                   — BM25 + RRF implementation
  prompts/                    — all LLM prompt templates
  services/
    indexing.service.ts       — Phase 1 & 2 indexing pipeline
    qdrant.service.ts         — upsert / hybrid search / FAQ search
    manager.service.ts        — query decomposition + retrieval orchestration
  types/
    chat.ts                   — ServiceMode, Message types
    agent.ts                  — QueryDecomposition schema

data/
  knowledge/                  — knowledge domains (plug-and-play)
  .index-manifest.json        — change-detection manifest (git-ignored)

scripts/
  index-knowledge.ts          — CLI indexing script
```