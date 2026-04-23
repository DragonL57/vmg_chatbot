# Execution Plan: Phase 3 - User Profile & Chat History (🟢 Complete)

Implementing user profile display and persistent conversation history.

## 1. Acceptance Criteria
- [x] **Profile Display**: User's name and avatar are displayed in the Sidebar.
- [x] **Metadata Sync**: `fullName` and `avatarUrl` from Google are synced to our `users` table.
- [x] **Chat History**: Sidebar shows a list of recent conversations for the logged-in user.
- [x] **Navigation**: Clicking a history item loads that specific conversation correctly.

## 2. Implementation Results

### Domain (Schema)
- Added `name` and `avatar_url` to the `users` table.
- Added `title` and `is_starred` to the `conversations` table.
- Added database index on `conversations(user_id)`.

### Services
- Updated `auth.service.ts` to sync metadata during upsert.
- Added `listConversationsByUser` and `getConversationById` to Supabase service.
- Added `ManagerService.generateTitle` for LLM-powered summarization.

### UI
- Refactored `Sidebar.tsx` to include profile card and recent chats list.
- Implemented "Push to Top" behavior for active conversations.
- Added "Silent Refresh" to the sidebar to avoid UI flickering.
- Added loading skeletons to the main chat area during session transitions.

## 3. Validation
- Confirmed name and avatar update on login.
- Confirmed Star/Rename/Delete actions are persistent.
- Verified re-ordering logic triggers instantly on message send.
