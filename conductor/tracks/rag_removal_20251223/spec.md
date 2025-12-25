# Specification: RAG Removal & Static Knowledge Optimization

## 1. Overview
The goal of this track is to simplify the system architecture by removing all Retrieval Augmented Generation (RAG) components. The system will transition to using strictly static knowledge overviews and External APIs (College Scorecard). This will eliminate dependencies on Qdrant (Vector DB), Mistral AI (Embeddings), and the complex document indexing pipeline, resulting in a lighter and more cost-effective application.

## 2. Functional Requirements

### 2.1 Knowledge Strategy
- **Static Only:** The AI will generate responses using only the curated overview files in `data/knowledge/`.
- **Hard Removal of Docs:** The `data/vmg-docs/` directory and its contents will be deleted. The AI will no longer have access to detailed administrative policy chunks.
- **External Tools:** Integration with the U.S. College Scorecard API remains active for academic data.

### 2.2 Intelligence Refactoring
- **Specialist Split:** Maintain the 3-agent specialist architecture (Safety, Profiler, Strategist).
- **Simplified Strategist:** The Strategist agent will be stripped of all logic related to "RAG vs. Static" decisions. It will now focus exclusively on:
    1. Detecting Ambiguity.
    2. Planning External API calls (Tools).

## 3. Technical Requirements

### 3.1 Codebase Cleanup
- **Remove Libraries:** Uninstall `@qdrant/js-client-rest`.
- **Delete Files:**
    - `src/lib/qdrant.ts`
    - `src/services/embedding.service.ts`
    - `src/services/search.service.ts`
    - `src/services/indexing/` (entire directory)
    - `scripts/` (all indexing and check scripts)
- **Environment:** Remove `QDRANT_URL`, `QDRANT_API_KEY`, and `MISTRAL_API_KEY` from `src/env.ts` and `.env.example`.

### 3.2 Logic Refactoring
- **Prompt Update:** Rewrite `src/prompts/specialists/planner.ts` to remove RAG-related tasks.
- **API Route:** Simplify `src/app/api/chat/route.ts` to remove the `docResults`, `faqResults`, and confidence thresholding logic. All non-ambiguous, non-tool queries will proceed directly to the Master Agent with the static knowledge base.

## 4. Acceptance Criteria
- [ ] The application starts and runs without Qdrant or Mistral environment variables.
- [ ] The `SearchService` and `EmbeddingService` are completely removed from the codebase.
- [ ] Chat responses are successfully generated for both ESL and Study Abroad using only static files.
- [ ] The College Scorecard tool continues to function correctly.
- [ ] No linting or type errors exist related to missing RAG dependencies.

## 5. Out of Scope
- Consolidating deleted documentation into static overviews (Hard Removal confirmed).
- Modifying the UI or Sidebar structure.
