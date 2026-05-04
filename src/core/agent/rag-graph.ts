import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState } from "./state";
import { CHAT_POLICIES } from "@core/domain/entities/chat";
import { 
  analyzeQueryNode,
  routerExpandNode,
  summarizeHistoryNode,
  retrieveNode,
  gradeNode,
  rewriteNode,
  compressNode
} from "./nodes";

const workflow = new StateGraph(AgentState)
  .addNode("analyze_query", analyzeQueryNode)
  .addNode("router_expand", routerExpandNode)
  .addNode("summarize", summarizeHistoryNode)
  .addNode("retrieve", retrieveNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("compress", compressNode);

workflow.addEdge(START, "summarize");
workflow.addEdge("summarize", "analyze_query");

workflow.addConditionalEdges(
  "analyze_query",
  (state) => state.questionIsClear ? "router_expand" : END,
  { router_expand: "router_expand" }
);

workflow.addConditionalEdges(
  "router_expand",
  (state) => state.isChitChat ? "compress" : "retrieve",
  { compress: "compress", retrieve: "retrieve" }
);

// Always route to grade — enables CRAG corrective loop
workflow.addEdge("retrieve", "grade");

workflow.addConditionalEdges(
  "grade",
  (state) => (state.isRelevant || state.iterations >= CHAT_POLICIES.MAX_ITERATIONS) ? "compress" : "rewrite",
  { compress: "compress", rewrite: "rewrite" }
);

workflow.addEdge("rewrite", "router_expand");
workflow.addEdge("compress", END);

export const ragGraph = workflow.compile();
