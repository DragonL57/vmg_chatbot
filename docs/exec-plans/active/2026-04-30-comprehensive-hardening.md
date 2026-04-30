# Execution Plan: Comprehensive System Hardening & Observability (🟢 Complete)

Address the 2026-04-30 audit findings, improve system-wide observability, and harden API boundaries.

## 1. Acceptance Criteria
- [x] **Observability**: Implement a "Glass Box" Trace & Span system with real-time cost and latency tracking.
- [x] **Security**: Implement strict Zod validation for all Chat and Ingest API request payloads.
- [x] **Data Integrity**: Implement `ensureExists` in the repository to prevent accidental history wiping during trace initialization.
- [x] **Compliance**: Add explicit access modifiers (`public`/`private`) to all ports, adapters, and use cases.
- [x] **Quality**: Resolve all cascading render loops and unused variable lint errors.
- [x] **Accessibility**: Ensure all icon-only buttons have localized Vietnamese accessible labels.
- [x] **Error Handling**: Replace silent `.catch()` blocks with structured logging via `ConsoleLoggerAdapter`.

## 2. Implementation Results

### Layer 1: Domain (Entities & Services)
- Introduced `chatRequestSchema` and `ingestRequestSchema` using Zod for runtime validation.
- Defined `TokenUsage` and `SpanData` for accurate observability tracking.

### Layer 2: Application (Use Cases & Ports)
- Added `ensureExists(id, userId)` to `IChatRepository` to safely handle foreign key prerequisites.
- Standardized visibility by adding `public` access modifiers to all `execute` methods.
- Refactored `ExtractUserMemoriesUseCase` to include span emission and structured logging.

### Layer 3: Adapters (Infrastructure & UI)
- **DrizzleObservabilityAdapter**: Implemented span aggregation logic for `totalCostUsd` and `totalTokens`.
- **DrizzleChatRepositoryAdapter**: Implemented non-destructive `ensureExists` using `onConflictDoNothing`.
- **API Boundaries**: Updated `/api/chat` and `/api/admin/ingest` with strict payload parsing and sanitized error responses.
- **UI Performance**: Refactored `AgentSteps` to use the "Adjusting state from props" pattern, eliminating cascading renders.
- **Accessible UI**: Added `aria-label` attributes to `ChatHeader`, `ChatInput`, `Sidebar`, and `ReportModal` buttons.

## 3. Validation
- [x] **Unit Testing**: `observability.test.ts` verified with 5 tests passing (aggregation + cost calc).
- [x] **Build Pipeline**: `pnpm build` succeeded (Lint: Strict + Next.js Type Check).
- [x] **Grounding Verification**: Prompt hardening verified to prioritize Vietnamese language and Vietnamese expert tone.
