# Technical Reference: Domain Layer

The Domain Layer contains the pure business logic, entities, and policies of VMG MATE. It is the core of the system and has zero dependencies on any external libraries or frameworks (except for `zod` for schema validation).

## 1. Core Entities

### Chat (`src/core/domain/entities/chat.ts`)
Defines the monitoring and policy constraints for agentic interactions.

- **`CHAT_POLICIES`**:
  - `CONTEXT_COMPACTION_THRESHOLD`: 6 (Trigger summarization after 6 messages)
  - `TOKEN_COMPRESSION_THRESHOLD`: 3000 (Compress evidence if total tokens exceed 3000)
  - `MAX_HISTORY_MESSAGES`: 10 (Keep last 10 messages in active context)
  - `MAX_ITERATIONS`: 3 (Maximum search/grade loops)
- **`ChatTrace`**: Interface for top-level observability (Total tokens, cost, latency).
- **`ChatSpan`**: Interface for individual node execution (Node name, model, prompt/completion tokens, cost).

### User Memory (`src/core/domain/entities/memory.ts`)
Defines the structure for long-term user context.

- **`MemoryCategory`**: `persona`, `preference`, `entity`, `episodic`, `general`.
- **`UserMemory`**: Pure interface for a stored fact about a user.
- **`MemoryAction`**: Schema for memory reconciliation operations (`ADD`, `UPDATE`, `DELETE`).
- **`MemoryExtraction`**: Wrapper for a batch of memory actions.

### Knowledge Indexing (`src/core/domain/entities/indexing.ts`)
Defines types for the URASys (Universal Retrieval & Augmentation System).

- **`DocumentChunk`**:
  - `id`: Unique chunk ID.
  - `parentId`: ID of the parent section (stable UUID).
  - `title`: AI-generated title for the chunk.
  - `content`: Search-optimized content (includes Intents/FAQs).
  - `parentContent`: Original raw text of the parent section for context.
- **`TokenAccumulator`**: Utility type for tracking usage across indexing phases.

### Query Analysis (`src/core/domain/entities/query-analysis.ts`)
Schema for the RECAP-integrated query architect.

- **`queryAnalysisSchema`**:
  - `is_clear`: Boolean flag.
  - `questions`: Array of rewritten, self-contained questions.
  - `clarification_needed`: Optional string to ask the user if `is_clear` is false.

## 2. Domain Services

### Hierarchical Chunking (`src/core/domain/services/chunking.service.ts`)
A pure function service that implements the parent-child chunking strategy.

- **`hierarchicalChunk(markdown: string)`**:
  - Splits markdown by headers (H1-H3).
  - Groups small sections into "Parents" (Min 1200 chars).
  - Slices Parents into overlapping "Children" (500 chars, 150 overlap).
  - Returns `ChunkResult[]` mapping child text to parent context.

## 3. Purity Rules
1. **No Side Effects**: No database calls, no HTTP requests, no direct file system access.
2. **Deterministic**: Given the same input, domain services return the same output.
3. **No Outer Dependencies**: Imports only from other domain files or basic type libraries.
