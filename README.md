# VMG Wiki — Internal Knowledge Chatbot

> **Current version: v1.0.0** — Modular `src/core` architecture + multi-environment staging support.

An internal chatbot for VMG staff built on **URASys** (Unified Retrieval-Augmented System), an academic RAG pipeline architecture. Answers questions about company knowledge using a hybrid vector + BM25 search backed by Qdrant Cloud, with conversation analytics and quality reporting via Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| LLM — fast calls ¹ | POE API (`grok-4.1-fast-non-reasoning`) **or** Inception Labs (`mercury-2`) |
| LLM — generation ¹ | POE API (`grok-4.1-fast-reasoning`) **or** Inception Labs (`mercury-2`, reasoning_effort) |
| Provider selection | `LLM_PROVIDER=poe\|inception` env var — all phases respect it |
| Embeddings | Qdrant server-side inference — `intfloat/multilingual-e5-small` (384-dim) |
| Vector DB | Qdrant Cloud |
| Search | Hybrid: Dense + BM25 + Reciprocal Rank Fusion, capped at 5 docs + 5 FAQs |
| Analytics DB | Supabase (conversations + reports) |
| Package manager | pnpm |

> ¹ Switch between providers by setting `LLM_PROVIDER`. All three pipeline phases (decompose, retrieve, generate) use the same provider.

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
│     ├─ chitchat detected? → skip retrieval  │
│     └─ getFastProvider() — POE or Inception │
│                                             │
│  2. Retrieve (per sub-query, parallel)      │
│     ├─ Hybrid doc search (dense+BM25+RRF)  │
│     │   └─ query reformulation via LLM      │
│     └─ FAQ dense search                    │
│         └─ query reformulation via LLM      │
│     All retrieval via getFastProvider()     │
│                                             │
│  3. Generate                                │
│     ├─ System: identity + domain-aware      │
│     │   static.md injection                 │
│     ├─ Context: top-5 docs + top-5 FAQs    │
│     │   (each truncated to 1200 / 400 chars)│
│     ├─ getGenerationProvider() — POE or     │
│     │   Inception (with reasoning_effort)   │
│     └─ Stream response + __TOKENS__ signal  │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Post-response: Save to Supabase            │
│  POST /api/conversation — upsert session    │
│  with full message history, location data, │
│  and token usage breakdown                 │
└─────────────────────────────────────────────┘
```

---

## Knowledge Folder Structure

```
data/knowledge/
  <domain>/
    index.md    ← chunked, embedded, and indexed into Qdrant
    static.md   ← injected verbatim into system prompt (domain-aware, only when relevant docs are retrieved)
```

**Plug-and-play**: drop a new subfolder with `index.md` and it is auto-discovered by both the index script and the API route. No code changes needed.

The `static.md` file for a domain is **only injected** when the retrieval step returns at least one document from that domain — avoiding token waste when a query is unrelated.

---

## Multi-Provider LLM

All three pipeline phases (decompose, retrieve reformulation, generate) route through a single provider selected by `LLM_PROVIDER`:

| `LLM_PROVIDER` | Fast calls (phases 1–2) | Generation (phase 3) |
|---|---|---|
| `poe` | `POE_BOT_NAME` | `POE_REASONING_MODEL` |
| `inception` | `INCEPTION_MODEL` + `INCEPTION_MODEL_EFFORT` | `INCEPTION_REASONING_MODEL` + `INCEPTION_REASONING_EFFORT` |

**Inception Labs** (`mercury-2`) is an OpenAI-compatible diffusion LLM. The `reasoning_effort` parameter accepts `instant`, `low`, `medium`, or `high` — `instant` for fast decomposition, `medium` for generation.

> Note: `POE_API_KEY` is always required because the indexing scripts (`index-knowledge.ts`) call POE directly, regardless of `LLM_PROVIDER`.

---

## Environment Variables

Local env files are managed via Vercel CLI — **never hand-edit** the pulled files.

```powershell
# Pull all three environments at once
vercel env pull .env.local --environment development
vercel env pull .env.staging.local --environment preview
vercel env pull .env.production.local --environment production
```

Full variable reference:

```env
# ── POE ───────────────────────────────────────────────────────────────────────
POE_API_KEY=...                          # always required (indexing scripts use POE directly)
POE_BOT_NAME=grok-4.1-fast-non-reasoning
POE_REASONING_MODEL=grok-4.1-fast-reasoning

# ── LLM Provider selector ────────────────────────────────────────────────────
LLM_PROVIDER=inception                   # 'poe' | 'inception' — controls all 3 pipeline phases

# ── Inception Labs ────────────────────────────────────────────────────────────
INCEPTION_API_KEY=sk_...
INCEPTION_MODEL=mercury-2
INCEPTION_MODEL_EFFORT=instant           # instant|low|medium|high
INCEPTION_REASONING_MODEL=mercury-2
INCEPTION_REASONING_EFFORT=medium

# ── Qdrant ────────────────────────────────────────────────────────────────────
QDRANT_URL=...
QDRANT_API_KEY=...
QDRANT_ENV=dev                           # dev | staging | prod

# ── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_URL=...
SUPABASE_KEY=...
```

---

## Multi-Environment Setup

The project has three fully isolated environments, each with its own Qdrant collection namespace:

| Environment | Git Branch | Vercel Target | `QDRANT_ENV` | Qdrant Prefix | Local File |
|---|---|---|---|---|---|
| Development | any (local) | — | `dev` | `dev_` | `.env.local` |
| Staging | `staging` | Preview | `staging` | `stg_` | `.env.staging.local` |
| Production | `master` | Production | `prod` | *(none)* | `.env.production.local` |

### Deployment Flow
```
feature branch → local test → merge to staging → verify on preview URL → merge to master → live
```

### Vercel Dashboard Settings
- **Project Settings → Git → Production Branch**: `master`
- **Environment Variables**: `QDRANT_ENV=prod` (Production), `QDRANT_ENV=staging` (Preview)

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
  message_count int default 0,
  token_usage jsonb            -- { prompt, completion, total } per final response
);

-- If upgrading an existing database, add the column:
alter table conversations add column if not exists token_usage jsonb;

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
- After every completed assistant response, `POST /api/conversation` upserts the full message history (excluding tool-call system messages) along with raw GPS coordinates, reverse-geocoded address, and token usage data.
- Token usage (`{ prompt, completion, total }`) is extracted from the `__TOKENS__` signal appended to the stream and stored in the `token_usage` jsonb column.
- Use Supabase Table Editor or SQL to query patterns: busiest hours, common topics, geographic distribution, and token costs.

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

### 1. Local Development

```powershell
pnpm install
pnpm dev   # uses .env.local → QDRANT_ENV=dev → dev_ collections
```

### 2. Index Knowledge

Only re-indexes files whose content has changed (SHA-256 manifest at `data/.index-manifest.json`).

```powershell
# Development (default)
pnpm ts-node scripts/index-knowledge.ts

# Staging
$env:QDRANT_ENV="staging"; pnpm ts-node scripts/index-knowledge.ts

# Production ⚠️
$env:QDRANT_ENV="prod"; pnpm ts-node scripts/index-knowledge.ts
```

Flags:
```powershell
pnpm ts-node scripts/index-knowledge.ts --status    # show state of each domain
pnpm ts-node scripts/index-knowledge.ts --dry-run   # preview without writing
pnpm ts-node scripts/index-knowledge.ts --force     # re-index everything
```

### 3. Deploy to Staging

```powershell
git add -A
git commit -m "feat: my change"
git push origin staging
# Vercel auto-deploys to preview URL with QDRANT_ENV=staging
```

### 4. Promote to Production

```powershell
git checkout master
git merge staging
git push origin master
# Vercel auto-deploys to vmg-chatbot.vercel.app with QDRANT_ENV=prod
```

### 5. Sync Env Files After Vercel Dashboard Changes

```powershell
vercel env pull .env.local --environment development
vercel env pull .env.staging.local --environment preview
vercel env pull .env.production.local --environment production
```

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
  app/                        — Next.js routes & pages
    api/
      chat/route.ts           — streaming chat endpoint
      conversation/route.ts   — upsert session to Supabase
      report/route.ts         — save flagged message to Supabase
  components/                 — React UI components
    chat/
      chat-interface.tsx      — main UI: location gate, session ID, conversation saving
      message-item.tsx        — renders message + report button + report modal
      message-list.tsx        — message feed
      location-modal.tsx      — forced geolocation permission modal
    layout/Sidebar.tsx        — navigation sidebar
  core/                       — all business logic (import via @core/*)
    lib/
      providers.ts            — multi-provider abstraction (getGenerationProvider, getFastProvider)
      qdrant.ts               — Qdrant client + collection names + env-based prefix
      poe.ts                  — POE OpenAI-compat client
      bm25.ts                 — BM25 + RRF implementation
      utils.ts                — shared helpers
    prompts/                  — all LLM prompt templates
      specialists/            — specialist agent prompts (lead, planner, safety)
    services/
      indexing.service.ts     — Phase 1 & 2 indexing pipeline
      qdrant.service.ts       — upsert / hybrid search / FAQ search
      manager.service.ts      — query decomposition + retrieval orchestration
      supabase.service.ts     — Supabase upsert abstraction
      document-search.service.ts — iterative doc search with LLM reformulation
      faq-search.service.ts   — iterative FAQ search with LLM reformulation
    types/
      chat.ts                 — ServiceMode, Message types
      agent.ts                — QueryDecomposition schema
      indexing.ts             — IndexingStats, TokenAccum types
  hooks/                      — React hooks
  env.ts                      — Zod-validated environment config

scripts/
  index-knowledge.ts          — smart incremental indexing script

data/
  knowledge/                  — knowledge domains (plug-and-play)
    <domain>/
      index.md                — indexed into Qdrant
      static.md               — injected verbatim into system prompt
  .index-manifest.json        — change-detection manifest (git-ignored)

.env.local                    — development env (QDRANT_ENV=dev)
.env.staging.local            — staging env    (QDRANT_ENV=staging)
.env.production.local         — production env (QDRANT_ENV=prod)
```

### Import Convention

Always use the `@core/` alias for anything inside `src/core/`:

```ts
// ✅ correct
import { getGenerationProvider } from '@core/lib/providers';
import { ManagerService } from '@core/services/manager.service';

// ❌ never use relative paths
import { getGenerationProvider } from '../../core/lib/providers';
```