# Technical Reference: UI & API Layer (Driving Adapters)

The UI and API layers act as the driving adapters that trigger the Application use cases. They handle user interaction, authentication session management, and the final response synthesis.

## 1. Unified Chat API (`src/app/api/chat/route.ts`)

The `/api/chat` route is the primary entry point for the agentic chat experience.

- **Composition Root**: Manually instantiates adapters and use cases for each request, ensuring isolation.
- **Phase 1: Reasoning**: Executes the `ragGraph` (LangGraph) and streams reasoning phases (`phase`, `reflection`) and the `trace_id` to the client.
- **Phase 2: Generation**: After the graph completes, it builds a final system prompt using `buildSystemPrompt` which incorporates:
  - **Identities & Constraints**: Master prompts for behavior.
  - **Retrieved Context**: The evidence found by the graph.
  - **User Memories**: Long-term facts.
  - **Fact Sheet**: The distilled summary from the Knowledge Architect.
  - **Task Anchoring**: Re-stating the user's latest goal.
  - **Instruction Re-Injection**: Defense against instruction fade.
- **Streaming**: Uses `ReadableStream` with NDJSON to provide real-time updates for both reasoning steps and content generation.
- **Background Tasks**: Triggers memory extraction and trace finalization using `waitUntil` to avoid blocking the user response.

## 2. API Router Structure

- **`/api/admin/ingest`**: Triggers the `IndexKnowledgeFileUseCase` for file processing.
- **`/api/conversation/[id]`**: Fetches historical messages and metadata.
- **`/api/collections`**: Lists available knowledge silos for the UI collection selector.
- **`/api/history`**: Lists conversation history for the sidebar.

## 3. UI Components (`src/components/chat`)

### `ChatInterface`
The main orchestrator for the chat view.
- **State Management**: Handles real-time message updates, reasoning phases, and token tracking.
- **Session Sync**: Synchronizes the session ID with the URL using the Next.js App Router.
- **Stream Processing**: Parses NDJSON chunks from the API to update the UI incrementally.

### `MessageList` & `MessageItem`
- Renders chat history with support for Markdown and LaTeX.
- **Agent Steps**: Displays the reasoning trace (`reflections`) associated with each assistant message.
- **Memory Badge**: Indicates when a message triggered a long-term memory update.

### `ChatInput`
- A professional, auto-growing text area with "Action" button.
- Handles submission and loading states.

## 4. UI/API Rules
1. **No Direct DB Access in UI**: All data fetching must go through API routes.
2. **Streaming First**: Prioritize perceived performance by streaming all agentic responses.
3. **Optimistic UI**: Implement immediate state updates for actions like starting a new chat or sending a message.
