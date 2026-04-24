# Project Architecture: VMG MATE

This document provides a comprehensive technical overview of the VMG MATE system, mapping its components to Clean Architecture layers and detailing the sophisticated Multi-Agent orchestration.

## 1. Core Principles
- **Dependency Rule**: Dependencies point inward: `Adapters → Application → Domain`.
- **Pure Domain**: The Domain layer contains zero side effects or external dependencies.
- **Agentic Orchestration**: Uses LangGraph to manage complex, stateful reasoning loops.
- **Sleep-time Compute**: Background agents reconcile and maintain long-term state asynchronously.

## 2. System Layering

```mermaid
graph TD
    subgraph "Adapters Layer (Impure Shell)"
        UI[React / Next.js UI]
        API[Next.js Route Handlers]
        Proxy[Middleware Proxy @vmg.edu.vn]
        DB_Adapter[Drizzle + Postgres.js]
        LLM_Adapter[OpenAI / Poe Client]
    end

    subgraph "Application Layer"
        Graph[LangGraph RAG Workflow]
        AuthService[Auth / Role Service]
        MemoryCurator[Memory Curator Agent]
        VectorSearch[Vector Search Service]
    end

    subgraph "Domain Layer (Pure Core)"
        Types[Domain Types / Schemas]
        BM25[Pure BM25 Logic]
    end

    UI --> Proxy
    Proxy --> API
    API --> Graph
    API --> MemoryCurator
    Graph --> LLM_Adapter
    Graph --> DB_Adapter
    Graph --> AuthService
    AuthService --> DB_Adapter
    MemoryCurator --> DB_Adapter
```

## 3. Multi-Agent Ecosystem

VMG MATE operates as a group of specialized agents sharing a common state.

| Agent | Role | Persistence |
| :--- | :--- | :--- |
| **Primary Assistant** | Final response generation and user interaction. | Short-term (Session) |
| **Gateway Agent** | Intent classification and Knowledge Silo routing. | Volatile |
| **Search Specialist** | Multi-query expansion and vector retrieval. | Volatile |
| **Grader Agent** | Evaluates document relevance to prevent hallucinations. | Volatile |
| **Knowledge Architect** | Compresses raw data into structured "Fact Sheets". | Volatile |
| **Memory Curator** | Background reconciliation of user facts (Add/Update/Delete). | Long-term (DB) |

## 4. Agent Interaction & Communication

### A. Synchronous Reasoning Loop (The "Thinking" Phase)
This loop occurs in real-time during a chat request. The agents communicate by updating a shared `AgentState` object.

```mermaid
sequenceDiagram
    participant U as User
    participant G as Gateway Agent
    participant S as Search Specialist
    participant GR as Grader Agent
    participant A as Knowledge Architect
    participant P as Primary Assistant

    U->>G: User Question
    G->>G: Analyze & Route
    G->>S: Sub-queries & Silos
    S->>S: Retrieve Context
    S->>GR: Raw Evidence
    GR->>GR: Relevance Check
    alt Irrelevant
        GR->>S: Refine & Retry Loop
    else Relevant
        GR->>A: Evidence
    end
    A->>A: Structure into Fact Sheet
    A->>P: Facts + Evidence
    P->>U: Final Answer (with Citations)
```

### B. Asynchronous Sleep-time Loop (The "Memory" Phase)
Inspired by the **Letta/MemGPT** architecture, this agent runs after the user response is delivered to manage the agent's long-term "Persona Block".

```mermaid
graph LR
    subgraph "Live Request"
        API[Chat API] --> Stream[JSON Stream]
    end

    subgraph "Sleep-time Compute"
        API -- Async Call --> Curator[Memory Curator Agent]
        DB[(User Memories)] -- Read State --> Curator
        Curator -- Reflect & Reconcile --> Curator
        Curator -- ADD/UPDATE/DELETE --> DB
    end
```

## 5. Metadata & Grounding
- **Citations**: Sources are carried as metadata through the entire pipeline (Retrieval -> Compression -> Generation).
- **Passive Data Injection**: Long-term memories are injected into the System Prompt as READ-ONLY XML blocks to prevent prompt injection.
- **Stateful Layout**: The chat state is preserved in the layout to ensure the streaming reasoning trace isn't lost during internal navigation.
