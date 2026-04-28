import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { DocumentChunk } from "@core/domain/entities/indexing";
import { KnowledgeCollection } from "@core/application/ports/knowledge-repository.port";

export const AgentState = Annotation.Root({
  /** Flag to indicate if the question is clear */
  questionIsClear: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => true,
  }),
  /** List of rewritten, self-contained questions */
  rewrittenQuestions: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  /** Original chat history */
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  /** Decomposed sub-queries */
  subQueries: Annotation<string[] | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  /** Current evidence pool */
  evidence: Annotation<{ docs: DocumentChunk[] }>({
    reducer: (x, y) => ({
      docs: [...x.docs, ...y.docs],
    }),
    default: () => ({ docs: [] }),
  }),
  /** Counter to prevent infinite loops */
  iterations: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
  /** Flag to indicate if we have enough info */
  isRelevant: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false,
  }),
  /** Summary of prior context or extracted facts */
  context_summary: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  /** Service mode (e.g. 'auto' or a specific collection ID) */
  mode: Annotation<string>({
    reducer: (x, y) => y,
    default: () => '',
  }),
  /** The specific collection names identified by the router */
  targetCollections: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  /** Metadata of all available collections for routing decisions */
  allCollections: Annotation<KnowledgeCollection[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  /** Flag to indicate casual conversation (skips RAG) */
  isChitChat: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false,
  }),
  /** Metacognitive reasoning/reflection for the current phase */
  reflection: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  /** Root observability trace ID */
  traceId: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  /** Long-term user memories/facts retrieved for this user */
  userMemories: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  /** Total token usage accumulated across all nodes in the reasoning graph */
  totalUsage: Annotation<{
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }>({
    reducer: (x, y) => {
      if (!x) return y;
      return {
        prompt_tokens: x.prompt_tokens + y.prompt_tokens,
        completion_tokens: x.completion_tokens + y.completion_tokens,
        total_tokens: x.total_tokens + y.total_tokens,
      };
    },
    default: () => ({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }),
  }),
});

export type AgentStateType = typeof AgentState.State;
