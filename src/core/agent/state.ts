import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { DocumentEvidence } from "@core/services/vector-search.service";

export const AgentState = Annotation.Root({
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
  evidence: Annotation<{ docs: DocumentEvidence[] }>({
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
  allCollections: Annotation<any[]>({
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
  /** Long-term user memories/facts retrieved for this user */
  userMemories: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;
