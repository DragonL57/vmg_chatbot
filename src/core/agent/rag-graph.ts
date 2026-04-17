import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { ManagerService, type RetrievalEvidence } from "@core/services/manager.service";
import { VectorSearchService } from "@core/services/vector-search.service";
import { getFastProvider } from "@core/lib/providers";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Node 0: Route to correct collections (The "Auto" brain)
 */
async function routerNode(state: AgentStateType) {
  const { mode, allCollections } = state;

  // If not auto, use the specific silo selected by the user
  if (mode !== 'auto' && mode !== 'discovery') {
    return { targetCollections: [mode] };
  }

  // AUTO MODE / DISCOVERY: Query ALL silos to ensure maximum coverage
  // This removes the "Router LLM" cost and prevents routing errors.
  const allIds = allCollections.map(c => c.qdrantName);
  
  return { targetCollections: allIds };
}

/**
 * Node 1: Summarize History
 */
async function summarizeHistoryNode(state: AgentStateType) {
  if (state.messages.length < 4) return {};
  const { client, model, extraBody } = getFastProvider();
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Tóm tắt hội thoại ngắn gọn, giữ lại các thực thể quan trọng." },
      ...state.messages.map(m => ({ 
        role: (m._getType() === 'human' ? 'user' : 'assistant') as 'user' | 'assistant', 
        content: m.content as string 
      }))
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });
  return { context_summary: res.choices[0].message.content || "" };
}

/**
 * Node 2: Analyze & Decompose
 */
async function analyzeNode(state: AgentStateType) {
  const history = state.messages.map(m => ({ 
    role: (m._getType() === 'human' ? 'user' : 'assistant') as 'user' | 'assistant', 
    content: m.content as string 
  }));
  const analysis = await ManagerService.decompose(history);
  return { 
    subQueries: analysis.subQueries,
    isRelevant: analysis.is_clear,
    iterations: 1 
  };
}

/**
 * Node 3: Retrieve evidence (Parallel across selected collections)
 */
async function retrieveNode(state: AgentStateType) {
  const { subQueries, targetCollections } = state;
  const queries = (subQueries && subQueries.length > 0) 
    ? subQueries 
    : [state.messages[state.messages.length - 1].content as string];

  // For every collection decided by the router, search all sub-queries
  const allResults = await Promise.all(
    targetCollections.map(col => 
      Promise.all(queries.map(q => VectorSearchService.search(q, col as any, 4).catch(() => [])))
    )
  );

  return { 
    evidence: { 
      docs: allResults.flat(2)
    } 
  };
}

/**
 * Node 4: Grade evidence
 */
async function gradeNode(state: AgentStateType) {
  const { evidence, messages } = state;
  const lastQuery = messages[messages.length - 1].content as string;
  if (!evidence.docs.length) return { isRelevant: false };
  const { client, model, extraBody } = getFastProvider();
  const context = evidence.docs.slice(0, 3).map(d => d.content).join("\n\n");
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Giám định viên: Trả lời 'YES' nếu tài liệu có ích, 'NO' nếu không. CHỈ TRẢ LỜI 1 TỪ." },
      { role: "user", content: `Câu hỏi: ${lastQuery}\n\nTài liệu:\n${context.slice(0, 2000)}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });
  return { isRelevant: (res.choices[0].message.content || "").toUpperCase().includes("YES") };
}

import { SEARCH_OPTIMIZATION_PROMPT } from "@core/prompts/rag-agents";

/**
 * Node 5: Rewrite query (Search Specialist)
 */
async function rewriteNode(state: AgentStateType) {
  const lastQuery = state.messages[state.messages.length - 1].content as string;
  const { client, model, extraBody } = getFastProvider();
  
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SEARCH_OPTIMIZATION_PROMPT },
      { 
        role: "user", 
        content: `User Query: "${lastQuery}"\nPrevious Tries: ${JSON.stringify(state.subQueries || [])}` 
      }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  let newQueries: string[] = [];
  try {
    const parsed = JSON.parse(res.choices[0].message.content || "{}");
    if (Array.isArray(parsed.queries)) {
      newQueries = parsed.queries;
    }
  } catch (e) {
    console.warn("[RewriteNode] Failed to parse JSON, falling back to original query");
  }

  return { 
    subQueries: newQueries.length > 0 ? newQueries : [lastQuery],
    iterations: 1 
  };
}

/**
 * Node 6: Compress Facts
 */
async function compressNode(state: AgentStateType) {
  const { evidence } = state;
  if (!evidence.docs.length) return {};
  const { client, model, extraBody } = getFastProvider();
  const rawText = evidence.docs.map(d => d.content).join("\n\n");
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Trích xuất các sự thật, con số và ý chính từ tài liệu dưới dạng danh sách gạch đầu dòng ngắn gọn bằng tiếng Việt." },
      { role: "user", content: `Tài liệu:\n${rawText.slice(0, 4000)}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });
  return { context_summary: res.choices[0].message.content || "" };
}

// ─── GRAPH CONSTRUCTION ──────────────────────────────────────────────────────

const workflow = new StateGraph(AgentState)
  .addNode("router", routerNode)
  .addNode("summarize", summarizeHistoryNode)
  .addNode("analyze", analyzeNode)
  .addNode("retrieve", retrieveNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("compress", compressNode);

workflow.addEdge(START, "router");
workflow.addEdge("router", "summarize");
workflow.addEdge("summarize", "analyze");
workflow.addEdge("analyze", "retrieve");
workflow.addEdge("retrieve", "grade");

workflow.addConditionalEdges(
  "grade",
  (state) => {
    if (state.isRelevant || state.iterations >= 3) return "compress";
    return "rewrite";
  },
  {
    compress: "compress",
    rewrite: "rewrite"
  }
);

workflow.addEdge("rewrite", "retrieve");
workflow.addEdge("compress", END);

export const ragGraph = workflow.compile();
