# Plan: Foundational URASys Infrastructure

## Phase 1: Project Scaffolding
- [x] Task: Initialize Next.js fullstack project with Tailwind CSS and pnpm. [740abb3]
- [x] Task: Set up environment variable handling for POE, Gemini, and Qdrant. [8fa188d]
- [ ] Task: Conductor - User Manual Verification 'Project Scaffolding' (Protocol in workflow.md)

## Phase 2: Core Agent Implementation (TypeScript)
- [ ] Task: Implement POE API client (OpenAI-compatible) in Next.js.
- [ ] Task: Implement Gemini Embedding client using `@google/generative-ai`.
- [ ] Task: Implement Manager Agent with query decomposition logic.
- [ ] Task: Implement Document and FAQ Search Agents with Qdrant integration (`@qdrant/js-client-rest`).
- [ ] Task: Conductor - User Manual Verification 'Core Agent Implementation' (Protocol in workflow.md)

## Phase 3: Dual-Phase Indexing Pipeline (Initial)
- [ ] Task: Implement semantic chunking and Title Assigner logic.
- [ ] Task: Implement FAQ Creator and Expander logic for 'Ask-and-Augment'.
- [ ] Task: Create initial index of sample VMG documents.
- [ ] Task: Conductor - User Manual Verification 'Dual-Phase Indexing Pipeline' (Protocol in workflow.md)

## Phase 4: UI & Integration
- [ ] Task: Build the chat interface in Next.js with Red/White VMG theme.
- [ ] Task: Integrate streaming backend responses (Route Handlers) with the frontend.
- [ ] Task: Implement the Interactive Clarification UI flow.
- [ ] Task: Conductor - User Manual Verification 'UI & Integration' (Protocol in workflow.md)