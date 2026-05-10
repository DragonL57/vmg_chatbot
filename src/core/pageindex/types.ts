/**
 * PageIndex Experiment — Core Types
 *
 * A vectorless, reasoning-based RAG approach that builds a hierarchical
 * tree index from documents and uses LLM-driven tree search for retrieval.
 */

export interface PageIndexNode {
  /** Unique node ID within the tree */
  id: string;
  /** Section heading text (e.g. "Financial Stability") */
  title: string;
  /** Heading level (1 = H1, 2 = H2, etc.) */
  level: number;
  /** LLM-generated summary of what this section covers */
  summary?: string;
  /** Full text content — only populated at leaf nodes */
  content?: string;
  /** Child subsections */
  children: PageIndexNode[];
  /** Character offset in the source document */
  startIndex?: number;
  /** Character offset end in the source document */
  endIndex?: number;
}

export interface PageIndexTree {
  /** Original filename */
  sourceFile: string;
  /** Document-level title (first H1 or filename) */
  documentTitle: string;
  /** Root node (virtual level-0 container) */
  root: PageIndexNode;
  /** Total nodes in the tree */
  totalNodes: number;
  /** Maximum nesting depth */
  depth: number;
  /** When the tree was generated */
  generatedAt: string;
}

export interface TreeSearchResult {
  /** The matched leaf node */
  node: PageIndexNode;
  /** Full path from root to this leaf (title chain) */
  path: string[];
  /** LLM reasoning for why this section is relevant */
  relevance: string;
}

export interface BuildTreeOptions {
  /** LLM model to use for summaries */
  model?: string;
  /** Max characters per section before splitting */
  maxSectionChars?: number;
  /** Whether to generate LLM summaries for each node */
  enableSummaries?: boolean;
}

export type SearchStepCallback = (step: string) => void;

export interface SearchOptions {
  /** Maximum branches to explore at each level */
  maxBranchesPerLevel?: number;
  /** Maximum leaf results to return */
  maxResults?: number;
  /** LLM model to use for search reasoning */
  model?: string;
  /** Document-level summary for context-aware navigation */
  documentContext?: string;
  /** Callback for real-time step reporting */
  onStep?: SearchStepCallback;
}
