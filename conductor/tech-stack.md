# Tech Stack: URASys (VMG English Center)

## 1. Frontend & Backend (Fullstack)
*   **Framework:** **Next.js** (App Router, TypeScript)
*   **Styling:** **Tailwind CSS** (for VMG Red/White branding)
*   **Deployment:** **Vercel**
*   **Package Manager:** **pnpm**
*   **Communication:** **Server Actions** & **Route Handlers** (Streaming)

## 2. AI & Retrieval (URASys Implementation)
*   **LLM Inference:** **Poe API** (OpenAI-compatible) using the `grok-4.1-fast-non-reasoning` model.
*   **Embeddings:** **Google Gemini API** (`gemini-embedding-001`) via the Google AI JavaScript SDK.
*   **Vector Database:** **Qdrant** (Managed Cloud Free Tier) for high-performance hybrid search.
*   **Indexing Logic:** **Custom Implementation** in TypeScript to handle the two-phase pipeline:
    *   **Phase 1 (Chunk-and-Title):** Semantic chunking and title assignment.
    *   **Phase 2 (Ask-and-Augment):** FAQ generation and paraphrasing.

## 3. Infrastructure & DevOps
*   **Secret Management:** **Vercel Environment Variables** (Production) and **.env** files (Local development).
*   **Version Control:** **Git** (GitHub/GitLab) with deployment hooks to Vercel.

## 4. Key Libraries (Anticipated)
*   `openai`: For Poe API interaction (OpenAI-compatible client).
*   `@google/generative-ai`: For Gemini embeddings.
*   `@qdrant/js-client-rest`: For vector store operations.
*   `zod`: For data validation and schema definition.
*   `dotenv`: For local environment variable management.