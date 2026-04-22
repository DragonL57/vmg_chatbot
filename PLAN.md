# VMG Knowledge Center - Feature Roadmap & Plan

This document outlines the planned evolution of the VMG Assistant platform, transitioning from a prototype into a production-grade enterprise internal tool.

## Phase 1: Stability & UI Polish (Current)
Focus on resolving technical debt and finalizing the Notion-inspired minimalist UI.

- [x] **Dependency Fix:** Upgrade to Next.js `16.2.4` and React `19.2.5`. (🟢 Done)
- [ ] **Clean Build:** Perform `node_modules` purge and fresh `pnpm install`.
- [ ] **UI Audit:** Ensure all components strictly follow the `DESIGN.md` (no all-caps, whisper borders).
- [ ] **Mobile Optimization:** Double-check the Admin Table responsiveness on small screens.
- [ ] **Error Handling:** Implement a global "Toaster" notification system for API errors (replacing standard `alert`).

## Phase 2: Enterprise Auth & Security
Securing the platform for internal use only.

- [ ] **Google OAuth Integration:** Set up Supabase Auth with Google Provider.
- [ ] **Domain Restriction:** Implement a middleware check to allow ONLY `@vmg.edu.vn` email addresses.
- [ ] **Admin RBAC:** Replace the current `localStorage` mock auth with a proper `role` check in the database.
- [ ] **Silo Permissions:** Add `allowed_roles` to the `knowledge_collections` table to restrict sensitive silos (e.g., HR data) to specific staff.

## Phase 3: Conversation Intelligence
Making the tool as useful as a daily assistant.

- [ ] **Persistent Chat History:** 
    - Link the `conversations` table to `user_id`.
    - Add a "Recent Chats" list to the `Sidebar.tsx`.
    - Allow users to rename or delete past conversations.
- [ ] **Source Citations:** Update the RAG graph to return specific source filenames and display them as small badges below assistant messages.
- [ ] **Follow-up Suggestions:** Use LLM to generate 3 relevant "Next Questions" at the end of every response to guide the user.

## Phase 4: Advanced Admin Operations
Empowering the content managers.

- [ ] **Analytics Dashboard:** Create a view in `/admin` showing:
    - Most searched topics.
    - Token usage per user.
    - Most used Knowledge Silos.
- [ ] **Audit Logs:** Track who uploaded/deleted which file and when.
- [ ] **Bulk Actions:** Allow deleting multiple files or re-indexing entire folders at once.
- [ ] **Expanded File Support:** Add ingestion logic for `.docx`, `.xlsx`, and scanned `.pdf` (OCR).

## Phase 5: Feedback & Optimization
Closed-loop improvement.

- [ ] **Report Management:** Build a dedicated `/admin/reports` page to view and resolve "Báo cáo sai" submissions from users.
- [ ] **User Feedback Loop:** Allow users to "Thumbs up/down" responses to collect data for RAG fine-tuning.
- [ ] **Self-Correcting RAG:** Improve the "Grade" node in the agent graph to automatically re-search if initial results are low confidence.

---
**Status Key:**
- 🟢 Complete
- 🟡 In Progress
- ⚪ Planned / Backlog
