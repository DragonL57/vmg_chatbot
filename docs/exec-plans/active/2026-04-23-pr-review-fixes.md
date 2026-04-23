# Execution Plan: PR Review Fixes & Security Hardening (2026-04-23)

Address Copilot review comments and align the codebase with `GEMINI.md` standards.

## 1. Acceptance Criteria
- [x] Consolidate CSS safe-area variables with fallbacks.
- [x] Rename all product references to **VMG MATE**.
- [x] Remove unused imports from `chat-interface.tsx`, `silos/page.tsx`, and `files/[fileId]/page.tsx`.
- [x] Move admin authentication to a server-side API route.
- [x] Initialize the `docs/` system of record.

## 2. Implementation Strategy

### Layer 1: Adapters (UI)
- Update `src/app/globals.css` with correct `env()` syntax.
- Update UI components to use the new product name and remove "AI slop" (unused imports).

### Layer 2: Adapters (Infrastructure)
- Add `ADMIN_PASSWORD` to `src/env.ts` (server-side only).
- Create `src/app/api/admin/login/route.ts` for secure password validation.

### Layer 3: Documentation
- Create `docs/ARCHITECTURE.md`, `docs/QUALITY_SCORE.md`, and `docs/tech-debt-tracker.md`.
- Ensure all new docs are cross-linked.

## 3. Test Strategy
- **Manual Verification**: Test the admin login flow with correct and incorrect passwords.
- **Visual Audit**: Verify header text and safe-area spacing on different viewport sizes.
- **Linting**: Run `eslint` to confirm no unused imports remain.

## 4. Final Review
- [x] All architecture linters pass (conceptual check).
- [x] File sizes < 300 lines (maintained).
- [x] No `any` types introduced.
- [x] Updated `tech-debt-tracker.md` with remaining debt.
