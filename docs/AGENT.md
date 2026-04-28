# Technical Reference: Agentic RAG Layer

VMG MATE employs a **Hybrid Adaptive-Corrective RAG** system built with LangGraph. It features a "Glass Box" execution model where every step is traced and validated.

## 1. Agent State (`src/core/agent/state.ts`)

The `AgentState` object tracks the reasoning lifecycle:
- `messages`: Active chat history.
- `questionIsClear`: Boolean result from the Query Architect.
- `rewrittenQuestions`: Reconstructed standalone queries.
- `subQueries`: Decomposed search instructions.
- `evidence`: Pool of retrieved `DocumentChunk` objects.
- `iterations`: Loop counter to prevent context runaway.
- `isRelevant`: Result from the Knowledge Evidence Grader (Meta-Grader).
- `context_summary`: Distilled "Working Memory" snapshot.
- `targetCollections`: Specific silos identified for routing.
- `isChitChat`: Flag to bypass retrieval for casual talk.
- `traceId`: Link to the observability trace.
- `totalUsage`: Cumulative token consumption for the graph.

## 2. Graph Topology (`src/core/agent/rag-graph.ts`)

The graph follows a structured flow from context optimization to fact synthesis.

### Node: `summarize` (Structured Compaction)
- **Trigger**: History length > 6 messages.
- **Logic**: Compresses old context into a structured snapshot (Goals, Decisions, Facts).

### Node: `analyze_query` (Query Architect)
- **Logic**: Implements RECAP principles. Resolves ellipses and checks for intent clarity.
- **Outcome**: If unclear, the agent exits early to ask the user for clarification.

### Node: `router_expand` (Gateway Agent)
- **Logic**: Performs **Adaptive Routing**. Decides if the query is "ChitChat" or "Factual".
- **Selection**: Matches queries against available collection metadata to select the best silos.

### Node: `retrieve` (Search Specialist)
- **Logic**: Executes hierarchical search across target silos using multiple query variations.
- **Deduplication**: Maps child chunks back to unique parents to avoid redundant context.

### Node: `grade` (Knowledge Evidence Grader)
- **Logic**: Implements **Corrective RAG (CRAG)**. Checks if the retrieved context actually answers the question.

### Node: `rewrite` (Query Refiner)
- **Logic**: If evidence is insufficient, it rewrites the search strategy for a broader/deeper second attempt.

### Node: `compress` (Knowledge Architect)
- **Logic**: Performs **Deep Token Distillation**. Reduces evidence by extracting only the core facts, maximizing the model's attention budget for the final answer.

## 3. Conditional Logic
- **Router Exit**: If `isChitChat` is true, it skips directly to generation.
- **Relevance Exit**: If evidence is graded `YES`, it proceeds to compression.
- **Iteration Limit**: After 3 failed attempts, it proceeds with whatever evidence was found (preventing infinite loops).
- **Token Overflow**: If retrieved text > 3000 tokens, it forces a compression step.
