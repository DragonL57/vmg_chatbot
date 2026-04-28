# Technical Reference: Infrastructure Layer

The Infrastructure Layer contains the concrete implementations of the Application Ports. It handles all side effects, third-party integrations, and persistence.

## 1. Database & Persistence (Drizzle ORM)

All relational data is stored in PostgreSQL (via Supabase) and managed using Drizzle ORM.

- **`DrizzleAuthRepositoryAdapter`**: Maps Supabase user IDs to internal records and handles RBAC (admin vs user).
- **`DrizzleChatRepositoryAdapter`**: Persists conversation history, messages, and metadata.
- **`DrizzleKnowledgeRepositoryAdapter`**: Tracks indexing progress, collection metadata, and file statuses.
- **`DrizzleMemoryRepository`**: Manages the storage and retrieval of long-term user facts.
- **`DrizzleObservabilityAdapter`**: Implements the telemetry stack.
  - **Trace Management**: Starts and finalizes traces.
  - **Span Emission**: Records node execution metrics.
  - **Cost Calculation**: Tiered pricing model considering cache hits and batch discounts.

## 2. Vector Store (Qdrant)

The **`QdrantVectorStoreAdapter`** manages semantic search and the URASys index.

- **Inference Model**: `inception-embed-text` (via qdrant local inference).
- **Embedding Dimensions**: 1024.
- **Distance Metric**: Cosine.
- **Parent-Child Logic**: Chunks are stored with a `parentId` payload, allowing the retrieval of semantic children while returning narrative parent context.

## 3. LLM Providers (`src/core/lib/providers.ts`)

VMG MATE uses a multi-provider strategy for cost and performance optimization.

- **Primary Provider**: Inception Labs (Mercury 2 model).
  - Used for complex reasoning nodes: `grade`, `compress`, `memory_extraction`.
  - Supports `reasoning_effort` control ('instant', 'low', 'medium', 'high').
- **Secondary/Fallback Provider**: Poe API.
  - Used for background tasks or as a failover for indexing.
- **Adapter Logic (`LLMProviderAdapter`)**: Selects the appropriate client based on `env` configuration and requested `effort` level.

## 4. Observability Stack

Telemetry is treated as a core product feature, not an afterthought.
- **Logs**: Structured logs emitted to the console and database.
- **Traces**: End-to-end reasoning paths visible in the Admin UI.
- **Metrics**: Real-time tracking of token usage, cost (USD), and latency (ms).

## 5. Infrastructure Rules
1. **Separation of Concerns**: Adapters only handle data translation; no business logic allowed.
2. **Resilience**: Database and Vector Store operations include basic error handling and retry-safe upserts.
3. **Environment Driven**: API keys and URLs are strictly pulled from `src/env.ts`.
