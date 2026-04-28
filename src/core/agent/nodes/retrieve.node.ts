import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { IVectorStorePort } from "../../application/ports/vector-store.port";

/**
 * Node 3: Retrieve evidence
 */
export async function retrieveNode(state: AgentStateType, config: RunnableConfig) {
  const { vectorStore } = config.configurable as { vectorStore: IVectorStorePort };
  const { subQueries, targetCollections } = state;
  const queries = (subQueries && subQueries.length > 0) ? subQueries : [state.messages[state.messages.length - 1].content as string];

  const allResults = await Promise.all(
    targetCollections.map(col => 
      Promise.all(queries.map(q => vectorStore.search(q, col as any, 5).catch(() => [])))
    )
  );

  const rawDocs = allResults.flat(2);
  const seenParents = new Set<string>();
  const deduplicated = rawDocs.filter(doc => {
    const pid = doc.parentId || doc.content;
    if (seenParents.has(pid)) return false;
    seenParents.add(pid);
    return true;
  });

  const rankedDocs = deduplicated.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

  return { 
    evidence: { docs: rankedDocs },
    reflection: `Scanning ${targetCollections.length} silos with ${queries.length} query variations...` 
  };
}
