# Technical Debt Tracker: VMG MATE

This document logs known technical debt and tracks its resolution as per `GEMINI.md`.

## Active Debt

| Debt Type | Description | Impact | Priority |
|-----------|-------------|--------|----------|
| **Observability** | No structured logging (`LoggerProvider`). Using `console.log`. | Hard to debug in production. | High |
| **Build Tooling** | `drizzle-kit` introspect bug requires manual schema sync script. | Friction during schema migrations. | Medium |

## Resolved Debt (2026-05-09)
- [x] **Vectorless Migration**: Removed all Qdrant, vector store, chunking, and CRAG loop code. Replaced with PageIndex recursive tree search + File System layer.
- [x] **Architecture Simplification**: 7-node LangGraph reduced to 4 nodes. No routing, no collections, no grade/rewrite.
- [x] **DB Cleanup**: Dropped `retrieval_engine` column, renamed `qdrant_name` → `collection_key`, removed `@qdrant/js-client-rest` dependency.
- [x] **Unused Code**: Deleted `bm25.ts`, `poe.ts`, `location-modal.tsx`, `grade.node.ts`, `rewrite.node.ts`, `router-expand.node.ts`, `vector-store.port.ts`, `chunking.service.ts`, `get-full-file-content.use-case.ts`.
- [x] **Docs Updated**: arc42 sections 04, 06, 08, 12 updated to reflect PageIndex-native architecture.

## Resolved Debt (2026-05-06)
- [x] **Testing Coverage**: 59 test files, 319 unit tests. Domain (100%), Application (87%). Build: `pnpm lint:strict && test:unit && next build`.

## Resolved Debt (2026-04-30)
- [x] **Trace Integrity**: Fixed foreign key race condition by ensuring conversation exists before trace initiation (See `docs/exec-plans/active/2026-04-30-comprehensive-hardening.md`).
- [x] **Observability Accuracy**: Implemented real-time latency tracking for the generation phase.
- [x] **UI Performance**: Fixed cascading renders in `AgentSteps` and `MessageList` by refactoring state sync logic.
- [x] **Code Health**: Removed all legacy citation logic and dead `any` types from API routes.
- [x] **Boundary Security**: Implemented strict Zod validation for Chat and Ingest APIs.
- [x] **Accessibility Compliance**: Added ARIA labels to icon-only buttons across the platform.

## Resolved Debt (2026-04-27)
- [x] **Architectural Drift**: Refactored the entire system from Service-Oriented to a strict 3-layer Clean Architecture (Domain -> Application -> Infrastructure).
- [x] **God Services**: Decoupled `MemoryService` and `IndexingService` into Use Cases and Ports.
- [x] **Graph Coupling**: Implemented Dependency Injection in LangGraph nodes via `RunnableConfig`.
- [x] **Ambiguity Hallucination**: Added `QueryArchitect` node for ambiguity detection and clarification.
- [x] **Retrieval Grounding**: Implemented Hierarchical Retrieval (Child Search -> Parent Context).
- [x] **Prompt Slop**: Centralized and translated all prompts to English.

## Resolved Debt (2026-04-23)
- [x] **Hardcoded Auth**: Moved admin password from client-side code to server-side `env`.
- [x] **Enterprise Security**: Implemented Google OAuth, RBAC, and domain restriction.
- [x] **User Profiles**: Linked Google metadata to internal database.
- [x] **Chat Persistence**: Implemented user-linked conversation history.
- [x] **UI Stability**: Resolved "Full Reload" bug by moving Sidebar to a Shared Layout in the `(main)` route group.
- [x] **Clean URLs**: Switched from query parameters to `/chat/[id]` path segments for better resource representation.
- [x] **Database Stability**: Fixed connection pool leaks with Singleton pattern and `globalThis`.
- [x] **Build Reliability**: Decoupled schema pushing from the build process to avoid `drizzle-kit` failures.
- [x] **Performance**: Added indexing to `conversations(userId)` and optimized Middleware by skipping redundant auth checks.

## Cleanup Schedule
- **Weekly Scan**: Detect duplicate helpers and files > 300 lines.
- **Observability Sprint**: Implement `LoggerProvider` and replace `console` usage.
- **Admin Refactor**: Clean up the legacy admin login routes (Done).
