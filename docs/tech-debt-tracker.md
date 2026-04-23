# Technical Debt Tracker: VMG MATE

This document logs known technical debt and tracks its resolution as per `GEMINI.md`.

## Active Debt

| Debt Type | Description | Impact | Priority |
|-----------|-------------|--------|----------|
| **Observability** | No structured logging (`LoggerProvider`). Using `console.log`. | Hard to debug in production. | High |
| **Testing** | Low coverage for Adapter layer. | High risk of regression on DB/API changes. | Medium |
| **Purity** | `ChatInterface` logic is complex; could benefit from custom hook extraction. | Complex state management risks bugs. | Low |
| **Build Tooling** | `drizzle-kit` introspect bug requires manual schema sync script. | Friction during schema migrations. | Medium |

## Resolved Debt (2026-04-23)
- [x] **Hardcoded Auth**: Moved admin password from client-side code to server-side `env`.
- [x] **Enterprise Security**: Implemented Google OAuth, RBAC, and domain restriction.
- [x] **User Profiles**: Linked Google metadata to internal database.
- [x] **Chat Persistence**: Implemented user-linked conversation history and re-ordering.
- [x] **Database Stability**: Fixed connection pool leaks with Singleton pattern and `globalThis`.
- [x] **Build Reliability**: Decoupled schema pushing from the build process to avoid `drizzle-kit` failures.
- [x] **Performance**: Added indexing to `conversations(userId)` and optimized Middleware by skipping redundant auth checks.

## Cleanup Schedule
- **Weekly Scan**: Detect duplicate helpers and files > 300 lines.
- **Observability Sprint**: Implement `LoggerProvider` and replace `console` usage.
- **Admin Refactor**: Clean up the legacy admin login routes (Done).
