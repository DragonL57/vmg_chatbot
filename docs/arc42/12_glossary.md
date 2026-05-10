# 12. Glossary

Key terms and acronyms in the VMG MATE ecosystem.

| Term | Definition |
| :--- | :--- |
| **PageIndex** | Vectorless RAG framework. Documents are organized as hierarchical trees; an LLM navigates them via recursive layer-by-layer search — no embeddings, no vector DB, no chunking. |
| **File System Layer** | Query-dependent topic tree built from document summaries. The LLM selects relevant documents before descending into their internal trees. Supports layer-wise and dynamic flattening strategies. |
| **Tree Search** | Recursive document navigation. At each level, the LLM sees only immediate children (~5-15 nodes), selects relevant branches, and descends. No flat JSON of the entire tree. |
| **Query Reconstruction** | Resolves pronouns, ellipsis, and incomplete follow-ups in chat history. Produces self-contained queries from conversation context. |
| **"Glass Box"** | Architectural philosophy prioritizing observability and explainability of the AI's internal reasoning process. Search traces are visible to users. |
| **Clean Architecture** | Design pattern separating code into layers (Domain, Application, Infrastructure) to minimize dependencies on external frameworks. |
| **HITL** | Human-in-the-Loop. Specialist evaluators who review and correct AI outputs to improve the knowledge base. |
| **StSQA** | Structured Stance Quality Assessment. Prompt engineering technique using a single curated reasoning example to guide LLM output. |
| **Given-When-Then** | Test description convention: Given = initial context, When = triggering event, Then = expected observable result. |
| **Screen Query** | Testing Library API (`screen.getByText`, `screen.getByRole`) querying the rendered DOM as a user would perceive it. |
| **Integration Test** | Test using real Postgres and LLM connections via `vitest.integration.config.ts`. |
| **Unit Test** | Test covering the smallest unit of code with all dependencies mocked. Runs in jsdom via `vitest.config.ts`. |
