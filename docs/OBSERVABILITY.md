# Glass Box Observability & Monitoring

VMG MATE provides deep visibility into agent reasoning and costs using a "Traces & Spans" architecture.

## 1. Trace Hierarchy

### Logical Data Model
A Trace is the parent of multiple Spans.

```mermaid
erDiagram
    AGENT_TRACES ||--o{ AGENT_SPANS : contains
    AGENT_TRACES {
        uuid id
        uuid userId
        int totalTokens
        string totalCostUsd
        int latencyMs
        int feedback
    }
    AGENT_SPANS {
        uuid id
        uuid traceId
        string nodeName
        string model
        jsonb input
        jsonb output
        int promptTokens
        int cachedTokens
        string costUsd
    }
```

## 2. Token Accounting & Pricing Engine

We use `js-tiktoken` (`cl100k_base`) for accurate token estimation. The pricing engine follows a specific priority:

```mermaid
graph TD
    Start[Calculate Span Cost] --> Tier{Tokens > 256K?}
    Tier -- Yes --> P2[Set Base: $1.00/1M]
    Tier -- No --> P1[Set Base: $0.25/1M]
    
    P1 --> Batch{Is Batch?}
    P2 --> Batch
    
    Batch -- Yes --> Discount[Apply 50% Basic Discount]
    Batch -- No --> Cache[Check Cache Stats]
    
    Discount --> Final[Aggregate Prompt + Output Cost]
    
    Cache --> Hit[Cached Tokens: 10% Price]
    Cache --> New[New Tokens: 100% Price]
    Cache --> Create[Creation Tokens: 125% Price]
    
    Hit --> Final
    New --> Final
    Create --> Final
```

## 3. UI Feedback Loop
The UI links every Assistant message to a `traceId`.
- **Thumbs Up**: Validates the reasoning path.
- **Thumbs Down**: Signals a need for manual audit of the reasoning spans to identify where the "Knowledge Architect" or "Grader" failed.
