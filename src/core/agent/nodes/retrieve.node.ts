import { AgentStateType } from "../state";
import { searchAllFiles } from "../../infrastructure/adapters/pageindex.adapter";
import { RunnableConfig } from "@langchain/core/runnables";
import { getConfig } from "./shared";

export async function retrieveNode(state: AgentStateType, config: RunnableConfig) {
  const { llmProvider } = getConfig(config);
  const mainQuery = state.messages[state.messages.length - 1].content as string;

  const { passages, trace } = await searchAllFiles(mainQuery, llmProvider, 10)
    .catch((e) => { console.error('[PageIndex] searchAllFiles error:', e); return { passages: [], trace: 'Search failed' }; });

  const seenParents = new Set<string>();
  const deduplicated = passages.filter(doc => {
    const pid = doc.parentId || doc.content;
    if (seenParents.has(pid)) return false;
    seenParents.add(pid);
    return true;
  });

  const rankedDocs = deduplicated.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);

  return {
    evidence: { docs: rankedDocs },
    reflection: trace || `PageIndex tree search across all files...`
  };
}
