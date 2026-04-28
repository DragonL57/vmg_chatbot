# Technical Reference: Application Layer

The Application Layer orchestrates the Domain entities and services to fulfill specific user scenarios. It defines **Ports** (interfaces) for external communication, maintaining strict decoupling from infrastructure details.

## 1. Ports (Interfaces)

Ports define the contracts that Infrastructure Adapters must implement.

- **`IAuthRepository`**: User management (Supabase mapping, role checking).
- **`IChatRepository`**: Conversation persistence (History, starring, renaming).
- **`IKnowledgeRepositoryPort`**: Metadata for files and collections (status tracking, indexing logs).
- **`IVectorStorePort`**: Vector operations (Ensuring collections, upserting chunks, semantic search).
- **`ILLMProvider`**: LLM interaction (Completions, JSON mode, reasoning effort levels).
- **`IMemoryRepository`**: Long-term fact storage (CRUD for user memories).
- **`IObservabilityPort`**: Telemetry (Trace/Span emission, cost calculation).
- **`ILoggerProvider`**: Structured logging (info, warn, error).

## 2. Use Cases

### Knowledge Indexing (`IndexKnowledgeFileUseCase`)
Implements the URASys pipeline for enriching documents.
1. **Hierarchical Chunking**: Calls Domain Service to split markdown.
2. **Context-Aware Rewriting**: Uses LLM to make chunks self-contained.
3. **Title Assignment**: Generates precise titles for knowledge nodes.
4. **FAQ Generation**: Extracts potential user intents/questions to store as searchable metadata.
5. **Vector Sync**: Upserts enriched `DocumentChunk` objects to Qdrant.
6. **Summarization**: Generates a file-level summary for collection descriptions.

### Memory Extraction (`ExtractUserMemoriesUseCase`)
Implements the Knowledge Auditor logic for user context.
1. **Retrieval**: Fetches existing user memories.
2. **Analysis**: Uses LLM to identify new facts or updates from the latest chat context.
3. **Reconciliation**: Applies `ADD`, `UPDATE`, or `DELETE` actions to the `IMemoryRepository`.
4. **Observability**: Emits a `memory_curator` span to track changes and costs.

### Conversation Management
- **`GenerateTitleUseCase`**: Uses the first message to generate a meaningful chat title.
- **`GetRecentMemoriesUseCase`**: Retrieves the most relevant facts for the current agent context.
- **`GetInternalUserIdUseCase`**: Maps Supabase Auth IDs to internal repository IDs.

## 3. Application Rules
1. **Dependency Direction**: Only depends on the Domain Layer.
2. **Interface Driven**: Never references concrete database classes or LLM clients directly.
3. **Orchestration Only**: Use cases should not contain complex business logic; they should coordinate entities and ports.
