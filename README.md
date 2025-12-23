# URASys - VMG English Center Chatbot

A Unified Retrieval Agent-Based System (URASys) designed for VMG English Center to provide precise, context-aware answers regarding courses, tuition, and policies. It leverages a dual-retrieval pipeline (Document Search + FAQ Search) and an agentic workflow to handle user queries effectively.

## 🚀 Key Features

*   **Study Advisor Persona:** An empathetic and professional AI agent that focuses on user outcomes, quality, and convenience.
*   **Dual-Phase Retrieval:** Combines semantic search over unstructured documents with a high-precision FAQ lookup.
*   **Interactive Clarification:** Proactively asks follow-up questions when user intent is ambiguous.
*   **Incremental Indexing:** Efficiently updates the knowledge base by processing only new or modified files.
*   **Streaming Responses:** Provides real-time, typewriter-style responses for a better user experience.
*   **VMG Branding:** Custom UI with VMG's Red/White color scheme and specific tone/style guidelines.

## 🛠 Tech Stack

*   **Frontend:** Next.js 14 (App Router), Tailwind CSS, React Markdown
*   **Backend:** Next.js Route Handlers (Serverless)
*   **LLM:** Poe API (OpenAI-compatible) - `grok-4.1-fast-non-reasoning`
*   **Embeddings:** Google Gemini API - `gemini-embedding-001`
*   **Vector Database:** Qdrant (Managed Cloud)
*   **Language:** TypeScript

## 📦 Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/DragonL57/vmg_chatbot.git
    cd vmg_chatbot
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add the following keys:
    ```env
    # POE API
    POE_API_KEY=your_poe_api_key
    POE_BOT_NAME=grok-4.1-fast-non-reasoning

    # Qdrant
    QDRANT_URL=your_qdrant_url
    QDRANT_API_KEY=your_qdrant_api_key

    # Google Gemini
    GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
    ```

4.  **Run Development Server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Knowledge Base Indexing

URASys uses a script to index markdown documents from the `data/vmg-docs` directory into Qdrant.

### Incremental Indexing
The indexing script is **incremental**, meaning it saves time and resources by:
1.  **Tracking State:** It maintains a `data/indexing-state.json` file to track the content hash of every indexed file.
2.  **Detecting Changes:** It only re-indexes files that are **new** or **modified**.
3.  **Handling Deletions:** It automatically removes embeddings for files that have been **deleted** from the `data/vmg-docs` folder.

### How to Run Indexing
To update the knowledge base, simply add, edit, or remove `.md` files in `data/vmg-docs` and run:

```bash
pnpm exec tsx scripts/index-docs.ts
```

The script will output a summary of actions (To Index vs. To Remove) and process them automatically.

## 🤝 Contribution
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feat/new-feature`).
3.  Commit your changes (`git commit -m "feat: add new feature"`).
4.  Push to the branch (`git push origin feat/new-feature`).
5.  Open a Pull Request.

## 📄 License
[MIT](LICENSE)