# Tech Stack: URASys (VMG English Center)

## 1. Frontend & Backend (Fullstack)
*   **Framework:** **Next.js** (App Router, TypeScript)
*   **Styling:** **Tailwind CSS** (for VMG Red/White branding)
*   **Deployment:** **Vercel**
*   **Package Manager:** **pnpm**
*   **Communication:** **Server Actions** & **Route Handlers** (Streaming)

## 2. AI & Retrieval (URASys Implementation)
*   **LLM Inference:** **Poe API** (OpenAI-compatible) using the `grok-4.1-fast-non-reasoning` model.
*   **Embeddings:** **Mistral AI** (`mistral-embed`) - 1024 dimensions for superior semantic search.
*   **Vector Database:** **Qdrant** (Managed Cloud Free Tier) for high-performance hybrid search.
*   **Parallel Specialist Orchestration:** Concurrent execution of specialized sub-agents (Safety, Profiler, Strategist).
*   **External Data:** **U.S. College Scorecard API** for real-time university metrics.
*   **Indexing Logic:** Custom pipeline including:
    *   **Phase 1 (Chunk-and-Title):** Semantic chunking and title assignment.
    *   **Phase 2 (Ask-and-Augment):** FAQ generation and paraphrasing.

## 3. Infrastructure & DevOps
*   **Secret Management:** **Vercel Environment Variables** (Production) and **.env** files (Local development).
*   **Version Control:** **Git** (GitHub/GitLab) with deployment hooks to Vercel.

## 4. Key Libraries (Anticipated)
*   `openai`: For Poe API interaction (OpenAI-compatible client).
*   `@qdrant/js-client-rest`: For vector store operations.
*   `zod`: For data validation and schema definition.
*   `lucide-react`: For specialized UI icons (GraduationCap, Plane, etc.).
*   `dotenv`: For local environment variable management.
