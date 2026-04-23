# Technical Debt Tracker: VMG MATE

This document logs known technical debt and tracks its resolution as per `GEMINI.md`.

## Active Debt

| Debt Type | Description | Impact | Priority |
|-----------|-------------|--------|----------|
| **Observability** | No structured logging (`LoggerProvider`). Using `console.log`. | Hard to debug in production. | High |
| **Testing** | Low coverage for Adapter layer. | High risk of regression on DB/API changes. | Medium |
| **Purity** | Some Domain functions have implicit dependencies on global `Date` or `Math`. | Impure domain makes testing harder. | Low |
| **Refactoring** | `src/core/services/` contains mixed logic (Ports + Adapters). | Violates layer separation. | Medium |

## Resolved Debt (2026-04-23)
- [x] **Hardcoded Auth**: Moved admin password from client-side code to server-side `env`.
- [x] **UI Drift**: Standardized "VMG MATE" branding and fixed CSS safe-area variables.
- [x] **Dead Code**: Removed unused imports in `ChatInterface`, `SilosPage`, and `FileDetailPage`.

## Cleanup Schedule
- **Weekly Scan**: Detect duplicate helpers and files > 300 lines.
- **Observability Sprint**: Implement `LoggerProvider` and replace `console` usage.
