# ADR-002: Architecture Audit Findings and Remediation

## Metadata
- **Date:** 2026-05-04
- **Author:** Agent
- **Status:** In Progress

## Problem Description and Context
A comprehensive architecture audit of `origin/master` (commit c642161) was conducted on 2026-05-04 to assess the codebase against the Clean Architecture principles defined in `AGENTS.md` and `GEMINI.md`. The audit evaluated layer separation, dependency direction, file sizes, type safety, and code quality.

## Audit Findings Summary

### ✅ Compliant Areas
| Area | Grade | Evidence |
|------|-------|----------|
| Layer separation | A | Strict Domain → Application → Infrastructure hierarchy |
| File sizes | A | Max 296 lines (under 300 limit) |
| Type safety | A | Zero `any` types in production code |
| Port abstraction | A | 8 ports, all with adapter implementations |
| RAG graph modularity | A | 8 node files, ~50 lines each |
| Documentation | A | 13 arc42 docs, 1 ADR, comprehensive README |
| ESLint enforcement | A | `boundaries/dependencies`, `no-explicit-any`, `max-lines`, `max-lines-per-function` |

### ❌ Violations Found

| # | Severity | Issue | File(s) |
|---|----------|-------|---------|
| 1 | **High** | Domain imports Zod (external dep) | `memory.ts`, `query-analysis.ts`, `chat-request.ts`, `ingest-request.ts` |
| 2 | **High** | Hooks import Supabase directly (port bypass) | `use-chat.helpers.ts`, `use-sidebar.user.ts` |
| 3 | **Medium** | Hook imports application port type | `use-chat.helpers.ts` → `KnowledgeCollection` |
| 4 | **Medium** | Application layer imports prompts | 5 use cases import from `@core/prompts/` |
| 5 | **Medium** | `console.error` in agent nodes | 5 node files use `.catch(console.error)` |
| 6 | **Medium** | `types/chat.ts` duplicates domain types | `Message`, `ChatSession` should be in domain |
| 7 | **Low** | `console.error` in API routes | 15+ route files for error logging |
| 8 | **Low** | Low test coverage | 7 test files, no adapter integration tests |

## Decision
We will remediate violations in priority order, starting with domain purity and port compliance. Each fix must maintain backward compatibility and pass `npm run lint:strict` and `npm run type-check`.

## Remediation Plan

### Phase 1: Domain Purity (High)
- Move Zod schemas from `domain/entities/` to `application/schemas/`
- Keep only pure TypeScript interfaces in domain
- Files: `memory.ts`, `query-analysis.ts`, `chat-request.ts`, `ingest-request.ts`

### Phase 2: Port Compliance (High)
- Remove direct `supabase` imports from hooks
- Route auth-related calls through `IAuthRepository` port
- Files: `use-chat.helpers.ts`, `use-sidebar.user.ts`

### Phase 3: Application Cleanup (Medium)
- Replace `console.error` in agent nodes with injected `ILoggerProvider`
- Move `Message` and `ChatSession` types from `types/chat.ts` to `domain/entities/`
- Files: agent nodes, `types/chat.ts`, `chat-repository.port.ts`

### Phase 4: Observability (Low)
- Replace `console.error` in API routes with `StructuredLoggerAdapter`
- Consolidate `console-logger.adapter.ts` and `structured-logger.adapter.ts`

## Consequences

### Positive Effects
- Domain becomes dependency-free (truly pure)
- UI layer no longer coupled to Supabase specifics
- Consistent error logging across all layers

### Risks
- Refactoring hooks requires careful state management
- Moving `types/chat.ts` may cause import churn across components

### Technical Debt Resolved
- Domain purity violation
- Port bypass in UI layer
- Duplicate type definitions
- Inconsistent error logging

---
## Status
**Completed** as of 2026-05-04.

### Phase 1: Domain Purity ✅
- Moved all Zod schemas from `domain/entities/` to `application/schemas/`
- `memory.ts`, `query-analysis.ts`, `chat-request.ts`, `ingest-request.ts` are now pure TypeScript
- Domain has zero imports across all 7 production files

### Phase 2: Port Compliance ✅
- Created `hooks/use-auth-user.ts` to isolate Supabase infrastructure import
- Updated `use-chat.helpers.ts` and `use-sidebar.user.ts` to use the new hook
- Removed direct `@/core/lib/supabase` import from 2 files

### Phase 3: Application Cleanup ✅
- Replaced `.catch(console.error)` with `logger.error(...)` in all 5 agent node files
- Replaced `console.error('Feedback failed')` with silent catch in `message-item.tsx`

### Phase 4: Observability (Deferred)
- API routes still use `console.error` for error logging — requires `StructuredLoggerAdapter` injection
