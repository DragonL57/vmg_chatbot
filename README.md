# URASys - VMG English Center Chatbot

A **Unified Retrieval Agent-Based System (URASys)** designed for VMG English Center to provide precise, context-aware answers regarding courses, tuition, and policies. It leverages a multi-agent orchestration layer and an optimized dual-retrieval pipeline.

## 🏗 Multi-Agent Architecture (Optimized Path B)

URASys operates through a collaborative ecosystem of specialized agents. The current implementation uses a **Streamlined Dispatcher Pattern** to minimize sequential LLM calls and ensure high-speed, high-accuracy responses.

```mermaid
graph TD
    subgraph UI_Layer [User Interface]
        UI[Next.js Chat Interface]
    end

    subgraph Dispatch_Layer [Intelligent Orchestration]
        DA[Dispatcher Agent]
        LC[Lead Extraction Logic]
        LS[Lead Service / CRM Mock]
    end

    subgraph Knowledge_Retrieval [Dual-Path Retrieval]
        SK[Static Knowledge Check]
        RE[Retrieval Engine]
        KV[(Qdrant Vector DB)]
    end

    subgraph Synthesis_Layer [Response Generation]
        MS[Master Agent]
    end

    UI -->|1. Message + History| DA
    
    DA -->|2. Analysis| LC
    LC -->|3a. Lead Data| LS
    
    DA -->|4. Strategy Check| SK
    
    SK -->|5a. Answer in Static| MS
    SK -->|5b. Needs Detail| RE
    
    RE <-->|6. Vector Search| KV
    RE -->|7. Context| MS
    
    MS -->|8. Final Response| UI
```

### The Agents & Services
1.  **Dispatcher Agent (`ManagerService`):** The "Brain" of the system. Handles Safety, Strategy, and Lead Extraction in one pass.
2.  **Retrieval Engine (`SearchService`):** Powered by **Mistral Embeddings (1024D)**. Performs parallel semantic searches.
3.  **Lead Service (`LeadService`):** Asynchronously pushes customer data (Name, Phone, Goals) to CRM/Sheets.
4.  **Master Agent (Route Handler):** The "Voice" of VMG. Follows a 3-step consultation protocol: **Ask -> Empathize -> Hook**.

---

## 🚀 Key Features

*   **Low-Latency Dispatcher:** Merged safety, intent, and lead analysis to significantly reduce "Time to First Byte".
*   **Pacing & Lead Generation:** AI is trained to listen and empathize before asking for contact info, ensuring a high-trust conversion rate.
*   **Visual Lead Confirmation:** UI displays a "System Message" (clickable) to verify captured lead data in real-time.
*   **Deep-Sync Indexing:** The indexing script automatically detects "ghost" embeddings (data in DB for files no longer on disk) and cleans them up.
*   **Zalo-Style UI:** Optimized for mobile viewports with shimmer indicators and guided suggestion buttons.

## 🛠 Tech Stack

*   **Frontend:** Next.js 15 (App Router), Tailwind CSS v4, Lucide Icons
*   **LLM Orchestration:** Poe API - `grok-4.1-fast-non-reasoning`
*   **Embeddings:** Mistral AI - `mistral-embed` (1024 dimensions)
*   **Vector Database:** Qdrant Cloud
*   **Data Capture:** Custom Lead Extraction via Dispatcher Agent

---

## 📦 Setup & Installation

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file based on `.env.example`.

3.  **Run Development Server:**
    ```bash
    pnpm dev
    ```

---

## 📚 Knowledge Management

### 1. Automated Deep-Sync Indexing
To update the vector database:
1.  Place or update `.md` files in `data/vmg-docs/`.
2.  Run the indexing script:
    ```bash
    pnpm exec tsx scripts/index-docs.ts
    ```
    *   **Incremental:** Only processes new/modified files.
    *   **Cleanup:** Automatically removes embeddings for files deleted from the folder.

### 2. Utility Scripts
*   **Check Sources:** List all files currently indexed in Qdrant:
    ```bash
    pnpm exec tsx scripts/check-sources.ts
    ```

---

## 📄 License
© 2025 VMG English Center. All rights reserved.