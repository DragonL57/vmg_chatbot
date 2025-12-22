# Plan: Foundational URASys Infrastructure

## Phase 1: Project Scaffolding
- [ ] Task: Initialize Next.js frontend with Tailwind CSS and pnpm.
- [ ] Task: Initialize FastAPI backend with `uv` and Vercel configuration.
- [ ] Task: Set up environment variable handling for POE, Gemini, and Qdrant.
- [ ] Task: Conductor - User Manual Verification 'Project Scaffolding' (Protocol in workflow.md)

## Phase 2: Core Agent Implementation
- [ ] Task: Implement POE API client for `grok-4.1-fast-non-reasoning`.
- [ ] Task: Implement Gemini Embedding client.
- [ ] Task: Implement Manager Agent with query decomposition logic.
- [ ] Task: Implement Document and FAQ Search Agents with Qdrant integration.
- [ ] Task: Conductor - User Manual Verification 'Core Agent Implementation' (Protocol in workflow.md)

## Phase 3: Dual-Phase Indexing Pipeline (Initial)
- [ ] Task: Implement semantic chunking and Title Assigner logic.
- [ ] Task: Implement FAQ Creator and Expander logic for 'Ask-and-Augment'.
- [ ] Task: Create initial index of sample VMG documents.
- [ ] Task: Conductor - User Manual Verification 'Dual-Phase Indexing Pipeline' (Protocol in workflow.md)

## Phase 4: UI & Integration
- [ ] Task: Build the chat interface in Next.js with Red/White VMG theme.
- [ ] Task: Integrate streaming backend responses (SSE) with the frontend.
- [ ] Task: Implement the Interactive Clarification UI flow.
- [ ] Task: Conductor - User Manual Verification 'UI & Integration' (Protocol in workflow.md)
