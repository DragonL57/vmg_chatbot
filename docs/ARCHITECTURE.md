# VMG MATE: Agentic Architecture & Ecosystem

**VMG MATE (Multi-Agent Tooling Ecosystem) Version 4.0.0** is a high-integrity Agentic AI system built on Clean Architecture, "Glass Box" observability principles, and advanced Context Engineering. 

It is designed as a professional digital companion for VMG English Center employees, operating under the philosophy: **"Machines execute, humans direct."**

---

## 1. High-Level System Architecture

VMG MATE follows strict layer separation (Clean Architecture), ensuring that domain logic is pure and side effects are pushed to the adapter layers.

```mermaid
graph TD
    subgraph "Adapters Layer (Impure Shell)"
        UI[React / Next.js UI]
        API[Next.js Modular Routes]
        DB_Adapter[Drizzle + PostgreSQL / Supabase]
        Vector_Adapter[Qdrant / Vector Store]
        LLM_Adapter[Inception Mercury 2 / Poe]
    end

    subgraph "Application Layer (Orchestration)"
        Graph[LangGraph Reasoning Loop]
        AuthService[Auth / Internal Sync]
        MemoryCurator[Asynchronous Memory Curator]
        ObsService[Observability & Cost Engine]
        ContextManager[Structured Compaction]
    end

    subgraph "Domain Layer (Pure Core)"
        Types[Domain Types / Schemas]
        Prompts[Agent Personas & Constraints]
    end

    UI --> API
    API --> Graph
    API --> MemoryCurator
    Graph --> LLM_Adapter
    Graph --> DB_Adapter
    Graph --> Vector_Adapter
    MemoryCurator --> LLM_Adapter
    MemoryCurator --> DB_Adapter
    API --> ObsService
    ObsService --> DB_Adapter
```

---

## 2. Multi-Agent RAG Graph (The "Thinking" Phase)

The core reasoning of VMG MATE is managed by a LangGraph state machine (`src/core/agent/rag-graph.ts`). It employs a Metacognitive Reasoning loop that is visible to the user in real-time.

```mermaid
stateDiagram-v2
    [*] --> SummarizeHistory
    SummarizeHistory --> RouterExpand : Context < 6 turns? Skip
    
    state RouterExpand {
        [*] --> IntentAnalysis
        IntentAnalysis --> ChitChatCheck
    }
    
    RouterExpand --> CompressFacts : if is_chit_chat == true
    RouterExpand --> RetrieveEvidence : if is_chit_chat == false
    
    RetrieveEvidence --> GradeEvidence : if tokens <= 3000
    RetrieveEvidence --> CompressFacts : if tokens > 3000
    
    state GradeEvidence {
        [*] --> RelevanceCheck
    }
    
    GradeEvidence --> CompressFacts : if relevant OR retries >= 3
    GradeEvidence --> RewriteQuery : if irrelevant
    
    RewriteQuery --> RouterExpand : loop back
    
    CompressFacts --> [*] : Output Context to Final Generator
```

### Agent Roles in the Graph:
1. **Gateway Agent (RouterExpand)**: Classifies "chit-chat" vs "factual" queries. Selects target knowledge silos and expands initial queries.
2. **Search Specialist (Retrieve)**: Executes parallel BM25/Vector hybrid searches across Qdrant collections.
3. **Knowledge Evidence Grader (Grade)**: Evaluates if retrieved documents actually answer the user's intent.
4. **Query Optimization Specialist (Rewrite)**: If grading fails, rewrites queries based on past failures to widen or narrow the search.
5. **Knowledge Architect (Compress)**: Transforms raw retrieved data into a **SUPER CONCISE Fact Sheet**, shedding 50%+ of redundant tokens before final generation.

---

## 3. Context Management & Rot Defenses

To prevent **Context Rot** (instruction fade-out, goal drift, and attention dilution) during long-running conversations, VMG MATE implements industry-leading Context Engineering.

### A. The 40-60% Rule & Structured Compaction
Instead of naive truncation, MATE uses an aggressive, early compaction strategy starting at **6 conversation turns**.

```mermaid
flowchart TD
    A[Conversation Length >= 6] -->|Trigger| B(Structured Compaction Prompt)
    B --> C{LLM Extraction}
    C --> D[ACTIVE GOAL]
    C --> E[KEY DECISIONS]
    C --> F[CURRENT STATE]
    C --> G[NEXT STEPS]
    D & E & F & G --> H[Compact Context Summary]
    H --> I[Replaces Old Messages in State]
```

### B. Instruction Re-Injection & Task Anchoring
To defeat the "Lost-in-the-Middle" effect, critical instructions are dynamically injected at the *end* of the context window.

```mermaid
block-beta
    columns 1
    SystemPrompt["Initial System Prompt (Identity)"]
    MemoryBlock["<user_memories> (Read-only Context)"]
    History["Conversation History or Structured Summary"]
    CurrentGoal["Task Anchor: ## CURRENT GOAL (Last User Msg)"]
    KnowledgeContext["# KNOWLEDGE CONTEXT (Retrieved Fact Sheet)"]
    ReInjection["# CRITICAL REMINDER (Re-Injection of Rules/Formatting)"]
```

---

## 4. Long-Term Memory Curator (The "Knowledge Auditor")

VMG MATE possesses a "Trí nhớ vĩnh cửu" (Eternal Memory). A background agent continuously monitors the chat and extracts explicit personal disclosures.

### Hybrid Few-Shot Architecture
Rather than relying on brittle regex or hardcoded procedural logic, the Curator uses **Hybrid Few-Shot Prompting** with `reasoning_effort: 'high'`.

```mermaid
sequenceDiagram
    participant API as Chat Route
    participant M as MemoryService
    participant LLM as Inception Mercury 2
    participant DB as PostgreSQL (user_memories)

    API->>M: async extractAndSaveMemories(userId, recentMessages)
    M->>DB: Fetch existing memory block
    M->>LLM: Prompt (Existing Memory + Recent Context + 4 Examples)
    Note over LLM: Evaluates op: ADD | UPDATE | DELETE | []
    LLM-->>M: JSON Action Array
    M->>DB: Apply Upserts/Deletions
    M->>API: emit({ type: 'memory_update' })
```

**Anti-Garbage Rules**:
- ONLY remembers explicit personal info (Name, role, department, preferences).
- NEVER remembers questions ("what is X?"), AI-retrieved facts, or technical requests.

---

## 5. Observability & Cost Engine ("Glass Box")

VMG MATE tracks every LLM invocation granularly.

### Span Tracking
Every node in the RAG Graph emits a `SpanData` payload tracking:
- `nodeName` (e.g., 'router_expand', 'grade')
- `model` used
- `promptTokens`, `completionTokens`
- `cachedTokens`, `cacheCreationTokens`
- `latencyMs`

### Tiered Pricing Logic
Calculates exact USD cost based on Inception Mercury 2's pricing tiers, including heavy discounts for Context Caching.

```mermaid
flowchart LR
    SpanEmit[emitSpan] --> CostCalc{Calculate Cost}
    CostCalc -->|Input Base| P1($0.25 / 1M)
    CostCalc -->|Output Base| P2($0.75 / 1M)
    CostCalc -->|Cache Hit| P3($0.025 / 1M)
    P1 & P2 & P3 --> DB[Insert into agent_spans]
    DB --> Finalize[Aggregate into agent_traces]
```

---

## 6. Model Provider Configurations

| Engine / Node | Reasoning Effort | Justification |
| :--- | :--- | :--- |
| **Agentic Steps** (Router, Grader, Rewriter, Summarizer) | `instant` | Speed is critical for multi-step loops. Cost efficiency. |
| **Final Generation** | `high` | Maximum cognitive depth for synthesizing complex policies and facts. |
| **Knowledge Architect** (Compressor) | `high` | Requires deep structural understanding to compress accurately without hallucination. |
| **Memory Curator** (Background) | `high` | Accuracy is paramount over latency for long-term state. Needs strict JSON compliance. |

---
*Document Generated: April 2026*
