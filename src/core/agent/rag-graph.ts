import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { ManagerService, type RetrievalEvidence } from "@core/services/manager.service";
import { VectorSearchService } from "@core/services/vector-search.service";
import { getFastProvider } from "@core/lib/providers";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { estimateTokens } from "@core/lib/utils";
import { SEARCH_OPTIMIZATION_PROMPT, META_GRADER_PROMPT, META_COMPRESSOR_PROMPT } from "@core/prompts/rag-agents";

const TOKEN_COMPRESSION_THRESHOLD = 3000;

/**
 * Utility to log exact character counts for cost evaluation
 */
function logPayload(node: string, input: any, output: any) {
  const inputChars = JSON.stringify(input).length;
  const outputChars = JSON.stringify(output).length;
  console.log(`[PAYLOAD] ${node.padEnd(12)} | In: ${inputChars.toLocaleString().padStart(6)} chars | Out: ${outputChars.toLocaleString().padStart(5)} chars`);
}

/**
 * Node 0+2: Semantic Router & Intent Expansion (Merged)
 * One call to decide Silos and generate Search Variations.
 */
async function routerExpandNode(state: AgentStateType) {
  const { mode, allCollections, messages } = state;
  const lastQuery = messages[messages.length - 1].content as string;

  // FAST PATH: Specific silo selection skips LLM routing logic but still needs expansion
  const isAuto = mode === 'auto' || mode === 'discovery';
  const siloList = allCollections.map(c => `- ${c.qdrantName} (${c.name}): ${c.description || 'No description'}`).join("\n");

  const { client, model, extraBody } = getFastProvider();
  
  const systemContent = `Bạn là "Gateway Agent" cho hệ thống VMG. Nhiệm vụ của bạn là định tuyến và mở rộng ý định.
  
  DANH SÁCH KHO TRI THỨC:
  ${siloList}
  
  YÊU CẦU:
  1. Nếu mode là "auto", chọn "selected" qdrantName phù hợp.
  2. Luôn mở rộng câu hỏi thành 3-4 "queries" chuyên môn (Ví dụ: "hoa hồng" -> "thưởng", "incentive", "KPI").
  
  CHỈ trả về JSON: { "selected": ["name"], "queries": ["q1", "q2"] }`;

  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: `Mode: ${mode} | Query: ${lastQuery}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const output = res.choices[0].message.content || "{}";
  logPayload("RouterExpand", { systemContent, lastQuery }, output);

  let parsed = { selected: [] as string[], queries: [lastQuery] };
  try {
    parsed = JSON.parse(output);
  } catch (e) {}

  // Resolve target collections
  let finalSilos = isAuto ? parsed.selected : [mode];
  if (finalSilos.length === 0) finalSilos = allCollections.map(c => c.qdrantName);

  return { 
    targetCollections: finalSilos,
    subQueries: Array.isArray(parsed.queries) ? parsed.queries : [lastQuery]
  };
}

/**
 * Node 1: Summarize History
 */
async function summarizeHistoryNode(state: AgentStateType) {
  if (state.messages.length < 4) return {};
  const { client, model, extraBody } = getFastProvider();
  
  const history = state.messages.map(m => ({ 
    role: (m._getType() === 'human' ? 'user' : 'assistant') as 'user' | 'assistant', 
    content: m.content as string 
  }));

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Tóm tắt hội thoại cực kỳ ngắn gọn (dưới 100 từ), chỉ giữ lại các thực thể và ý chính quan trọng nhất. Tuyệt đối không được giải thích hay lặp lại lịch sự." },
      ...history
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const summary = res.choices[0].message.content || "";
  logPayload("Summarize", history, summary);
  return { context_summary: summary };
}

/**
 * Node 3: Retrieve evidence (Parallel across selected collections)
 */
async function retrieveNode(state: AgentStateType) {
  const { subQueries, targetCollections } = state;
  const queries = (subQueries && subQueries.length > 0) 
    ? subQueries 
    : [state.messages[state.messages.length - 1].content as string];

  const allResults = await Promise.all(
    targetCollections.map(col => 
      Promise.all(queries.map(q => VectorSearchService.search(q, col as any, 5).catch(() => [])))
    )
  );

  const rawDocs = allResults.flat(2);
  const seenContent = new Set<string>();
  const deduplicated = rawDocs.filter(doc => {
    const isDuplicate = seenContent.has(doc.content);
    seenContent.add(doc.content);
    return !isDuplicate;
  });

  const rankedDocs = deduplicated
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log(`[RetrieveNode] Total raw: ${rawDocs.length} | Unique: ${deduplicated.length} | Final: ${rankedDocs.length}`);
  return { evidence: { docs: rankedDocs } };
}

/**
 * Node 4: Grade evidence
 */
async function gradeNode(state: AgentStateType) {
  const { evidence, messages } = state;
  const lastQuery = messages[messages.length - 1].content as string;
  if (!evidence.docs.length) return { isRelevant: false };

  const { client, model, extraBody } = getFastProvider();
  const context = evidence.docs.slice(0, 8).map(d => d.parentContent || d.content).join("\n\n");
  
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: META_GRADER_PROMPT },
      { role: "user", content: `Câu hỏi: ${lastQuery}\n\nTài liệu:\n${context.slice(0, 4000)}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const rawOut = res.choices[0].message.content || "";
  const grade = rawOut.toUpperCase().includes("YES");
  
  logPayload("Grader", { lastQuery, context: context.slice(0, 500) }, rawOut);
  console.log(`[GradeNode] Verdict: ${grade ? "✅ YES" : "❌ NO"}`);
  
  return { isRelevant: grade };
}

/**
 * Node 5: Rewrite query (Search Specialist)
 */
async function rewriteNode(state: AgentStateType) {
  const lastQuery = state.messages[state.messages.length - 1].content as string;
  const { client, model, extraBody } = getFastProvider();
  
  const input = `User Query: "${lastQuery}"\nPrevious Tries: ${JSON.stringify(state.subQueries || [])}`;
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SEARCH_OPTIMIZATION_PROMPT },
      { role: "user", content: input }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const output = res.choices[0].message.content || "{}";
  logPayload("Rewriter", input, output);

  let newQueries: string[] = [];
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed.queries)) newQueries = parsed.queries;
  } catch (e) {}

  return { 
    subQueries: newQueries.length > 0 ? newQueries : [lastQuery],
    iterations: (state.iterations || 0) + 1 
  };
}

/**
 * Node 6: Compress Facts
 */
async function compressNode(state: AgentStateType) {
  const { evidence } = state;
  if (!evidence.docs.length) return {};
  
  const { client, model, extraBody } = getFastProvider();
  const rawText = evidence.docs.map(d => d.parentContent || d.content).join("\n\n");
  
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: META_COMPRESSOR_PROMPT },
      { role: "user", content: `Tài liệu:\n${rawText.slice(0, 5000)}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });
  
  const summary = res.choices[0].message.content || "";
  logPayload("Compressor", rawText.slice(0, 1000), summary);
  
  return { context_summary: summary };
}

// ─── GRAPH CONSTRUCTION ──────────────────────────────────────────────────────

const workflow = new StateGraph(AgentState)
  .addNode("router_expand", routerExpandNode)
  .addNode("summarize", summarizeHistoryNode)
  .addNode("retrieve", retrieveNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("compress", compressNode);

workflow.addEdge(START, "summarize");
workflow.addEdge("summarize", "router_expand");
workflow.addEdge("router_expand", "retrieve");

workflow.addConditionalEdges(
  "retrieve",
  (state) => {
    const totalContent = state.evidence.docs.map(d => d.content).join("\n");
    if (estimateTokens(totalContent) > TOKEN_COMPRESSION_THRESHOLD) return "compress";
    return "grade";
  },
  {
    compress: "compress",
    grade: "grade"
  }
);

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

workflow.addEdge("rewrite", "router_expand");
workflow.addEdge("compress", END);

export const ragGraph = workflow.compile();
