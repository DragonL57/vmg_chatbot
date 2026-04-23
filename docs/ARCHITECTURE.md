# Project Architecture: VMG MATE

This document maps the VMG MATE codebase to Clean Architecture layers as defined in `GEMINI.md`.

## 1. Core Principles
- **Dependency Rule**: Dependencies point inward: `Adapters → Application → Domain`.
- **Pure Domain**: The Domain layer contains zero side effects or external dependencies.
- **Agent Legibility**: Code is optimized for agent comprehension first.

## 2. Layer Mapping

### Domain Layer (`src/core/types/`, `src/core/lib/`)
Contains pure business logic and entity definitions.
- `src/core/types/agent.ts`: Domain types for the Multi-Agent system.
- `src/core/types/chat.ts`: Domain types for the conversation system.
- `src/core/lib/bm25.ts`: Pure algorithmic implementation of BM25.

### Application Layer (`src/core/agent/`, `src/core/services/ports.ts`)
Orchestrates domain operations and defines ports for external communication.
- `src/core/agent/rag-graph.ts`: State machine for the Agentic RAG workflow (LangGraph).
- `src/core/agent/state.ts`: Application state management for the agent.

### Adapters Layer (`src/core/services/`, `src/app/api/`, `src/components/`)
Handles all side effects and external integrations.

#### Driven Adapters (External Services)
- `src/core/services/supabase.service.ts`: Database and Auth persistence.
- `src/core/services/qdrant.service.ts`: Vector database operations.
- `src/core/services/poe.service.ts`: LLM provider integration.

#### Driving Adapters (UI & API)
- `src/app/api/chat/route.ts`: API endpoint for chat interactions.
- `src/app/api/admin/`: Administrative API routes.
- `src/components/chat/`: React components for the chat interface.

## 3. Boundary Validation
All external data entering the system via `src/app/api` is validated using Zod schemas (implemented in `src/env.ts` and route handlers).

## 4. Cross-Cutting Concerns
- **Auth**: Managed via `supabase.service.ts` and enforced in `AdminLayout`.
- **Environment**: Centralized in `src/env.ts` using `@t3-oss/env-nextjs`.
- **Logging**: (TODO) Integrate structured LoggerProvider as per `GEMINI.md`.
