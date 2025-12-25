# Plan: Study Abroad Consultation & Sidebar Navigation

## Phase 1: Multi-Mode Infrastructure & UI [checkpoint: 93aa2fa]
- [x] Task: Define Service Mode types and update `src/types/chat.ts` to include `mode` [5c454d8]
- [x] Task: Create `Sidebar` component for navigation between ESL and Study Abroad [73e0063]
- [x] Task: Integrate Sidebar into `ChatInterface` and handle mode switching state [bd759cd]
- [x] Task: Update `/api/chat` Route Handler to accept and propagate the `serviceMode` parameter [4b8e684]
- [x] Task: Conductor - User Manual Verification 'Multi-Mode Infrastructure & UI' (Protocol in workflow.md) [93aa2fa]

## Phase 2: Study Abroad Intelligence & Retrieval
- [ ] Task: Create initial knowledge base at `data/knowledge/study-abroad-overview.md`
- [ ] Task: Implement `src/prompts/study-abroad-master.ts` with the Consultant persona and KYC discovery logic
- [ ] Task: Update `SearchService` to filter results or use separate collections based on the active mode
- [ ] Task: Implement proactive greeting logic in `ChatInterface` when switching modes
- [ ] Task: Conductor - User Manual Verification 'Study Abroad Intelligence & Retrieval' (Protocol in workflow.md)

## Phase 3: Enhanced Lead Capture (KYC Level 1)
- [ ] Task: Update `QueryDecompositionSchema` in `src/types/agent.ts` with the 7 new Study Abroad KYC fields
- [ ] Task: Update the Dispatcher prompt in `src/prompts/manager.ts` to perform multi-domain extraction
- [ ] Task: Update `LeadService.saveLead` to handle incremental updates for the new KYC fields
- [ ] Task: Update `MessageItem` to correctly render the expanded Lead JSON data in the system badge
- [ ] Task: Conductor - User Manual Verification 'Enhanced Lead Capture' (Protocol in workflow.md)

## Phase 4: Final Integration & Polishing
- [ ] Task: Update Header UI to reflect the active service mode (Title, Icons)
- [ ] Task: End-to-end testing of the "Conversational Discovery" flow for Study Abroad
- [ ] Task: Final linting, type-checking, and performance review
- [ ] Task: Conductor - User Manual Verification 'Final Integration & Polishing' (Protocol in workflow.md)
