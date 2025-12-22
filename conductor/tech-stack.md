# Tech Stack: URASys (VMG English Center)

## 1. Frontend
*   **Framework:** **Next.js** (App Router, TypeScript)
*   **Styling:** **Tailwind CSS** (for VMG Red/White branding)
*   **Deployment:** **Vercel**

## 2. Backend (API & Agent Logic)
*   **Language:** **Python 3.10+**
*   **Framework:** **FastAPI** (hosted as Serverless Functions on Vercel)
*   **Communication:** **SSE (Server-Sent Events)** for streaming agent reasoning and search results.

## 3. AI & Retrieval (URASys Implementation)
*   **LLM Inference:** **Poe API** (OpenAI-compatible) using the `grok-4.1-fast-non-reasoning` model.
*   **Embeddings:** **Google Gemini API** (`gemini-embedding-001`) via the `google-genai` Python SDK.
*   **Vector Database:** **Qdrant** (Managed Cloud Free Tier) for high-performance hybrid search.
*   **Indexing Logic:** **Custom Implementation** in Python to handle the two-phase pipeline:
    *   **Phase 1 (Chunk-and-Title):** Semantic chunking and title assignment.
    *   **Phase 2 (Ask-and-Augment):** FAQ generation and paraphrasing.

## 4. Infrastructure & DevOps
*   **Secret Management:** **Vercel Environment Variables** (Production) and **.env** files (Local development).
*   **Version Control:** **Git** (GitHub/GitLab) with deployment hooks to Vercel.

## 5. Key Libraries (Anticipated)
*   `fastapi`, `uvicorn`: Web framework and server.
*   `openai`: For Poe API interaction.
*   `google-genai`: For Gemini embeddings.
*   `qdrant-client`: For vector store operations.
*   `pydantic`: For data validation and settings.
*   `python-dotenv`: For local environment variable management.
