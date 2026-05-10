import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState } from "./state";
import { 
  analyzeQueryNode,
  summarizeHistoryNode,
  retrieveNode,
  compressNode
} from "./nodes";

/**
 * PageIndex-native agent graph.
 *
 * Flow:
 *   START → summarize (compact history)
 *         → analyze_query (chitchat or real query?)
 *           ├→ compress (casual conversation → skip retrieval)
 *           └→ retrieve (PageIndex tree search → return evidence)
 *             → compress (synthesize answer from retrieved content)
 *               → END
 *
 * No grade/rewrite loop — the PageIndex tree search already classifies
 * relevance at every node. If nothing relevant is found, the answer
 * generator handles it naturally ("tôi không tìm thấy thông tin này").
 */
const workflow = new StateGraph(AgentState)
  .addNode("analyze_query", analyzeQueryNode)
  .addNode("summarize", summarizeHistoryNode)
  .addNode("retrieve", retrieveNode)
  .addNode("compress", compressNode);

workflow.addEdge(START, "summarize");
workflow.addEdge("summarize", "analyze_query");

workflow.addConditionalEdges(
  "analyze_query",
  (state) => state.isChitChat ? "compress" : "retrieve",
  { compress: "compress", retrieve: "retrieve" }
);

workflow.addEdge("retrieve", "compress");
workflow.addEdge("compress", END);

export const ragGraph = workflow.compile();
