# VMG MATE: Agentic Architecture

VMG MATE is a high-integrity Agentic AI system built on Clean Architecture and the "Glass Box" observability principle.

## 1. System Layering

```mermaid
graph TD
    subgraph "Adapters Layer (Impure Shell)"
        UI[React / Next.js UI]
        API[Next.js Modular Routes]
        Proxy[Middleware Proxy @vmg.edu.vn]
        DB_Adapter[Drizzle + Postgres.js]
        LLM_Adapter[Alibaba DashScope / Poe]
    end

    subgraph "Application Layer"
        Graph[LangGraph Reasoning Loop]
        AuthService[Auth / Internal Sync]
        MemoryCurator[Sleep-time Memory Curator]
        ObsService[Observability & Cost Engine]
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
    MemoryCurator --> LLM_Adapter
    MemoryCurator --> DB_Adapter
    API --> ObsService
    ObsService --> DB_Adapter
```

## 2. Hybrid Execution Model

### A. Synchronous Reasoning Loop (The "Thinking" Phase)
This occurs in real-time while the user waits.

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
    S->>S: Hybrid Retrieve
    S->>GR: Raw Evidence
    GR->>GR: Relevance Check
    alt Irrelevant
        GR->>S: Refine & Rewrite Loop
    else Relevant
        GR->>A: Evidence Snippets
    end
    A->>A: Structure into Fact Sheet
    A->>P: Facts + Context
    P->>U: Final Answer (with Citations)
```

### B. Asynchronous Background Loop (The "Observability" Phase)
Uses Vercel `waitUntil` to process data without slowing down the user.

```mermaid
graph LR
    subgraph "Live Response (0-60s)"
        API[Chat API] --> Stream[JSON Stream]
        API --> Gen[Final Gen]
    end

    subgraph "Background Task (waitUntil)"
        Gen --> Obs[Observability Service]
        Obs --> DB[(agent_traces / agent_spans)]
        Gen --> Curator[Memory Curator]
        Curator --> Batch[Alibaba Batch API]
        Batch --> DB[(user_memories)]
    end
```

## 3. Multi-Agent Ecosystem

| Agent | Task | Optimization |
| :--- | :--- | :--- |
| **Gateway** | Routing & Intent | Tiered Pricing (Flash) |
| **Search/Grader** | Retrieval Integrity | Tiered Pricing (Flash) |
| **Architect** | Fact Sheet Compression | Context Caching (90% Off) |
| **Curator** | Memory Reconciliation | Batch API (50% Off) |

## 4. Cost Engineering
The system implements **Tiered Pricing Logic** for `qwen3.6-flash`:
- **Tier 1 (<= 256K tokens)**: $0.25/1M Input | $1.5/1M Output.
- **Tier 2 (> 256K tokens)**: $1.00/1M Input | $4.00/1M Output.
- **Cache Hit**: 10% of input base price ($0.025 in Tier 1).
- **Batch**: 50% of input/output base price.
