# Plan: RAG Removal & Static Knowledge Optimization

## Phase 1: Dependency & File Removal
- [x] Task: Remove `@qdrant/js-client-rest` dependency from `package.json` [d069e29]
- [x] Task: Delete indexing scripts and utility scripts in `scripts/` [0b17a02]
- [x] Task: Delete `src/lib/qdrant.ts` and `src/services/indexing/` directory [0b17a02]
- [x] Task: Delete `src/services/search.service.ts` and `src/services/embedding.service.ts` [0b17a02]
- [x] Task: Delete the `data/vmg-docs/` directory and its contents [0b17a02]
- [ ] Task: Conductor - User Manual Verification 'Dependency & File Removal' (Protocol in workflow.md)

## Phase 2: Environment & Schema Refactoring
- [x] Task: Remove RAG-related variables from `src/env.ts` and `.env.example` [0bd4af5]
- [ ] Task: Update `QueryDecompositionSchema` in `src/types/agent.ts` to reflect the removal of RAG (remove/deprecate `subQueries` if no longer needed)
- [ ] Task: Conductor - User Manual Verification 'Environment & Schema Refactoring' (Protocol in workflow.md)

## Phase 3: Prompt & Logic Refactoring
- [x] Task: Rewrite `src/prompts/specialists/planner.ts` to focus only on Ambiguity and Tools [eceb568]
- [x] Task: Refactor `/api/chat` route handler to remove dual-path retrieval and use only Static Knowledge [eceb568]
- [ ] Task: Conductor - User Manual Verification 'Prompt & Logic Refactoring' (Protocol in workflow.md)

## Phase 4: Final Validation & Polishing
- [ ] Task: Verify ESL consultation flow using only static knowledge
- [ ] Task: Verify Study Abroad consultation flow including College Scorecard tool usage
- [ ] Task: Final project-wide linting and type-checking
- [ ] Task: Conductor - User Manual Verification 'Final Validation & Polishing' (Protocol in workflow.md)
