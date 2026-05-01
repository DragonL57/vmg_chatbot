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
- [x] **Observability (The "Glass Box"):** 
    - Implemented `agent_traces` and `agent_spans` tables for granular token and cost tracking.
    - Added real-time "Agentic Thinking" traces in the UI.

## Phase 4: Long-Term Memory & Personalization (🟢 Complete)
Implementing the "Mate" that learns and remembers.

- [x] **Memory Extraction:** Background agents extract facts from conversations in the third person.
- [x] **Memory Dashboard:** Users can view and edit their "remembered" facts in their profile.
- [x] **Fact Deduplication:** Implemented semantic and exact checks for fact storage.

## Phase 5: Feedback & Optimization (🟡 In Progress)
Closed-loop improvement.

- [x] **Chit-Chat Detection:** (🟢 Done) Bypasses RAG for greetings to reduce latency.
- [x] **Report System:** (🟢 Done) Users can report messages; data is stored in `reports` table.
- [ ] **Admin Reports Dashboard:** Dedicated `/admin/reports` page to resolve user feedback.
- [ ] **Self-Correcting RAG:** Automatic re-search for low-confidence results (Meta-Grader loop).

## Phase 6: Omnichannel & Workspace (⚪ Planned)
Expanding MATE's reach.

- [ ] **Google Workspace Integration:** Direct reading of Gmail/Calendar and meeting capture from Meet.
- [ ] **Omnichannel Support:** Zalo and Messenger integration via webhooks.
- [ ] **Bulk Operations:** Multi-file deletion and re-indexing in the Admin dashboard.

---
**Status Key:**
- 🟢 Complete
- 🟡 In Progress
- ⚪ Planned / Backlog
