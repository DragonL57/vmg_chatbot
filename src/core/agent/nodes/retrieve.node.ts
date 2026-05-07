import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { IVectorStorePort } from "../../application/ports/vector-store.port";

export function extractKeywords(query: string): string[] {
  // Extract uppercase acronyms (2+ chars) and standalone numbers
  const acronyms = query.match(/\b[A-Z0-9]{2,}\b/g) || [];
  // Extract capitalized Vietnamese/English words (proper nouns)
  const proper = query.match(/\b[A-ZÀ-Ỹ][a-zà-ỹ]+\b/g) || [];
  const keywords = [...new Set([...acronyms, ...proper])];
  return keywords.filter(k => k.length >= 2).slice(0, 5);
}

/**
 * Node 3: Retrieve evidence
 */
export async function retrieveNode(state: AgentStateType, config: RunnableConfig) {
  const { vectorStore } = config.configurable as { vectorStore: IVectorStorePort };
  const { subQueries, targetCollections } = state;
  const mainQuery = state.messages[state.messages.length - 1].content as string;
  const queries = (subQueries && subQueries.length > 0) ? subQueries : [mainQuery];

  // Semantic search
  const semanticResults = await Promise.all(
    targetCollections.map(col => 
      Promise.all(queries.map(q => vectorStore.search(q, col, 10).catch(() => [])))
    )
  );

  // Keyword search — extract acronyms + proper nouns from the original query
  const keywords = extractKeywords(mainQuery);
  const keywordResults = keywords.length > 0
    ? await Promise.all(
        targetCollections.map(col =>
          vectorStore.keywordSearch(keywords, col, 5).catch(() => [])
        )
      )
    : [];

  const rawDocs = [...semanticResults.flat(2), ...keywordResults.flat()];
  const seenParents = new Set<string>();
  const deduplicated = rawDocs.filter(doc => {
    const pid = doc.parentId || doc.content;
    if (seenParents.has(pid)) return false;
    seenParents.add(pid);
    return true;
  });

  const rankedDocs = deduplicated.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);

  return { 
    evidence: { docs: rankedDocs },
    reflection: `Scanning ${targetCollections.length} silos with ${queries.length} semantic + ${keywords.length} keyword queries...` 
  };
}
