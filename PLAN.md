# VMG MATE - Feature Roadmap & Plan

This document outlines the planned evolution of the VMG MATE platform, transitioning from a prototype into a production-grade enterprise internal tool.

## Phase 1: Stability & UI Polish (🟢 Complete)
Focus on resolving technical debt and finalizing the Notion-inspired minimalist UI.

- [x] **Dependency Fix:** Upgrade to Next.js `16.2.4` and React `19.2.5`.
- [x] **Clean Build:** Resolved `drizzle-kit` introspection bugs and fixed `@supabase/ssr` linkage.
- [x] **UI Audit:** Standardized "Mate Vibe" (whisper borders, no all-caps).
- [x] **Mobile Optimization:** Added responsive Admin headers and Sidebar toggles.
- [x] **Error Handling:** Implemented "Sonner" toast system for all API/Auth interactions.

## Phase 2: Enterprise Auth & Security (🟢 Complete)
Securing the platform for internal use only.

- [x] **Google OAuth Integration:** Set up Supabase Auth with Google Provider.
- [x] **Domain Restriction:** Implemented middleware proxy to allow ONLY `@vmg.edu.vn` emails.
- [x] **Admin RBAC:** Replaced mock auth with server-side database role validation.
- [x] **Silo Permissions:** Added `allowed_roles` to knowledge collections for granular access control.

## Phase 3: Conversation Intelligence (🟢 Complete)
Making the tool as useful as a daily assistant.

- [x] **Persistent Chat History:** 
    - Linked all conversations to internal `users` table.
    - Added "Recent Chats" sidebar with "Push to Top" re-ordering.
    - Implemented LLM-generated titles for new conversations.
- [x] **User Profiles:** Synchronized Google name and avatar to the UI and database.
- [x] **Conversation Management:** Added Star, Rename, and Delete actions via Portal-based menus.

## Phase 4: Advanced Admin Operations (⚪ Planned)
Empowering the content managers.

- [ ] **Analytics Dashboard:** Create a view in `/admin` showing most searched topics and token usage.
- [ ] **Audit Logs:** Track who uploaded/deleted which file and when.
- [ ] **Bulk Actions:** Allow deleting multiple files or re-indexing entire folders at once.
- [ ] **Expanded File Support:** Add ingestion logic for `.docx`, `.xlsx`, and OCR for PDFs.

## Phase 5: Feedback & Optimization (🟡 In Progress)
Closed-loop improvement.

- [x] **Chit-Chat Detection:** (🟢 Done) Bypasses RAG for greetings to reduce latency.
- [ ] **Report Management:** Dedicated `/admin/reports` page to resolve user feedback.
- [ ] **User Feedback Loop:** "Thumbs up/down" responses for RAG fine-tuning.
- [ ] **Self-Correcting RAG:** Automatic re-search for low-confidence results.

---
**Status Key:**
- 🟢 Complete
- 🟡 In Progress
- ⚪ Planned / Backlog
