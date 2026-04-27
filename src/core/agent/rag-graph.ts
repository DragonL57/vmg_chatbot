import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { VectorSearchService } from "@core/services/vector-search.service";
import { getFastProvider, getGenerationProvider } from "@core/lib/providers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { estimateTokens } from "@core/lib/utils";
import { 
  SEARCH_OPTIMIZATION_PROMPT, 
  META_GRADER_PROMPT, 
  META_COMPRESSOR_PROMPT,
  GATEWAY_AGENT_PROMPT,
  STRUCTURED_COMPACTION_PROMPT
} from "@core/prompts/rag-agents";
import { z } from "zod";
import { ObservabilityService } from "@core/services/observability.service";

const TOKEN_COMPRESSION_THRESHOLD = 3000;

function logPayload(node: string, input: any, output: any) {
  const inputChars = JSON.stringify(input).length;
  const outputChars = JSON.stringify(output).length;
  console.log(`[PAYLOAD] ${node.padEnd(12)} | In: ${inputChars.toLocaleString().padStart(6)} chars | Out: ${outputChars.toLocaleString().padStart(5)} chars`);
}

const graderSchema = z.object({
  is_relevant: z.string().default("NO"),
  reasoning: z.string().optional().default("")
});

/**
 * Node 0+2: Semantic Router & Intent Expansion (Merged)
 */
async function routerExpandNode(state: AgentStateType) {
  const startTime = Date.now();
  const { mode, allCollections, messages, traceId } = state;
  const lastQuery = messages[messages.length - 1].content as string;
  const siloList = allCollections.map(c => `- ${c.qdrantName} (${c.name}): ${c.description || 'No description'}`).join("\n");
  const { client, model, extraBody } = getFastProvider();
  
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GATEWAY_AGENT_PROMPT(siloList) },
      { role: "user", content: `Mode: ${mode} | Query: ${lastQuery}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const output = res.choices[0].message.content || "{}";
  logPayload("RouterExpand", { siloList, lastQuery }, output);

  if (traceId) {
    ObservabilityService.emitSpan(traceId, {
      nodeName: 'router_expand',
      model,
      input: { mode, query: lastQuery },
      output: output,
      promptTokens: res.usage?.prompt_tokens || 0,
      completionTokens: res.usage?.completion_tokens || 0,
      cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
      cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
      latencyMs: Date.now() - startTime
    }).catch(console.error);
  }

  let parsed = { is_chit_chat: false, selected: [] as string[], queries: [lastQuery], reasoning: "" };
  try { parsed = JSON.parse(output); } catch (e) {}

  let finalSilos = mode === 'auto' || mode === 'discovery' ? parsed.selected : [mode];
  if (finalSilos.length === 0 && !parsed.is_chit_chat) finalSilos = allCollections.map(c => c.qdrantName);

  return { 
    isChitChat: !!parsed.is_chit_chat,
    targetCollections: finalSilos,
    subQueries: Array.isArray(parsed.queries) ? parsed.queries : [lastQuery],
    reflection: parsed.is_chit_chat ? "Đang xử lý hội thoại trực tiếp..." : (parsed.reasoning || "Đang xác định chiến lược tra cứu..."),
    totalUsage: res.usage
  };
}

/**
 * Node 1: Summarize History
 */
async function summarizeHistoryNode(state: AgentStateType) {
  const startTime = Date.now();
  // Aggressive Early Compaction: Trigger at 6 messages to stay in 40-60% sweet spot
  if (state.messages.length < 6) return { reflection: "" };
  
  const { client, model, extraBody } = getFastProvider();
  const { traceId } = state;
  const history = state.messages.map(m => ({ 
    role: (m._getType() === 'human' ? 'user' : 'assistant') as 'user' | 'assistant', 
    content: m.content as string 
  }));

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: STRUCTURED_COMPACTION_PROMPT },
      ...history
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const summary = res.choices[0].message.content || "";
  logPayload("Summarize", history, summary);

  if (traceId) {
    ObservabilityService.emitSpan(traceId, {
      nodeName: 'summarize',
      model,
      input: { historyLength: history.length },
      output: summary,
      promptTokens: res.usage?.prompt_tokens || 0,
      completionTokens: res.usage?.completion_tokens || 0,
      cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
      cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
      latencyMs: Date.now() - startTime
    }).catch(console.error);
  }

  return { 
    context_summary: summary,
    reflection: "Đã tối ưu hóa bối cảnh hội thoại (Structured Compaction).",
    totalUsage: res.usage
  };
}

/**
 * Node 3: Retrieve evidence
 */
async function retrieveNode(state: AgentStateType) {
  const { subQueries, targetCollections } = state;
  const queries = (subQueries && subQueries.length > 0) ? subQueries : [state.messages[state.messages.length - 1].content as string];

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

  const rankedDocs = deduplicated.sort((a, b) => b.score - a.score).slice(0, 5);

  return { 
    evidence: { docs: rankedDocs },
    reflection: `Đang quét ${targetCollections.length} kho dữ liệu với ${queries.length} hướng truy vấn...` 
  };
}

/**
 * Node 4: Grade evidence
 */
async function gradeNode(state: AgentStateType) {
  const startTime = Date.now();
  const { evidence, messages, traceId } = state;
  const lastQuery = messages[messages.length - 1].content as string;
  if (!evidence.docs.length) return { isRelevant: false, reflection: "Không tìm thấy tài liệu liên quan." };

  const { client, model, extraBody } = getFastProvider();
  const context = evidence.docs.slice(0, 8).map(d => d.parentContent || d.content).join("\n\n");
  
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: META_GRADER_PROMPT },
      { role: "user", content: `Question: ${lastQuery}\n\nContext:\n${context.slice(0, 4000)}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const rawOut = res.choices[0].message.content || "{}";
  logPayload("Grader", { lastQuery, context: context.slice(0, 500) }, rawOut);

  if (traceId) {
    ObservabilityService.emitSpan(traceId, {
      nodeName: 'grade',
      model,
      input: { query: lastQuery },
      output: rawOut,
      promptTokens: res.usage?.prompt_tokens || 0,
      completionTokens: res.usage?.completion_tokens || 0,
      cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
      cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
      latencyMs: Date.now() - startTime
    }).catch(console.error);
  }

  let grade = false;
  let reason = "Tài liệu chưa đủ thông tin.";
  try {
    const parsed = JSON.parse(rawOut);
    const result = graderSchema.safeParse(parsed);
    if (result.success) {
      grade = result.data.is_relevant.toUpperCase() === "YES";
      reason = result.data.reasoning || (grade ? "Đã tìm thấy thông tin phù hợp." : "Tài liệu chưa đủ thông tin.");
    }
  } catch (e) {}

  return { isRelevant: grade, reflection: reason, totalUsage: res.usage };
}

/**
 * Node 5: Rewrite query
 */
async function rewriteNode(state: AgentStateType) {
  const startTime = Date.now();
  const { messages, traceId, subQueries } = state;
  const lastQuery = messages[messages.length - 1].content as string;
  const { client, model, extraBody } = getFastProvider();
  
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SEARCH_OPTIMIZATION_PROMPT },
      { role: "user", content: `Query: ${lastQuery}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });

  const output = res.choices[0].message.content || "{}";
  logPayload("Rewriter", { lastQuery }, output);

  if (traceId) {
    ObservabilityService.emitSpan(traceId, {
      nodeName: 'rewrite',
      model,
      input: { query: lastQuery },
      output: output,
      promptTokens: res.usage?.prompt_tokens || 0,
      completionTokens: res.usage?.completion_tokens || 0,
      cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
      cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
      latencyMs: Date.now() - startTime
    }).catch(console.error);
  }

  let parsed = { queries: [] as string[], reasoning: "" };
  try { parsed = JSON.parse(output); } catch (e) {}

  return { 
    subQueries: Array.isArray(parsed.queries) && parsed.queries.length > 0 ? parsed.queries : [lastQuery],
    iterations: (state.iterations || 0) + 1,
    reflection: "Đang mở rộng phạm vi tìm kiếm tài liệu...",
    totalUsage: res.usage
  };
}

/**
 * Node 6: Compress Facts
 */
async function compressNode(state: AgentStateType) {
  const startTime = Date.now();
  const { evidence, traceId, isChitChat } = state;
  if (!evidence.docs.length || isChitChat) return { reflection: "" };
  
  const { client, model, extraBody } = getGenerationProvider();
  const rawTextWithSources = evidence.docs.map(d => `[Source: ${d.source || d.title}]\n${d.parentContent || d.content}`).join("\n\n---\n\n");
  
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: META_COMPRESSOR_PROMPT },
      { role: "user", content: `Raw Data:\n${rawTextWithSources.slice(0, 6000)}` }
    ],
    ...(extraBody ? { extra_body: extraBody } : {}),
  });
  
  const summary = res.choices[0].message.content || "";
  logPayload("Compressor", { docCount: evidence.docs.length }, summary);

  if (traceId) {
    ObservabilityService.emitSpan(traceId, {
      nodeName: 'compress',
      model,
      input: { docCount: evidence.docs.length },
      output: summary,
      promptTokens: res.usage?.prompt_tokens || 0,
      completionTokens: res.usage?.completion_tokens || 0,
      cachedTokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
      cacheCreationTokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
      latencyMs: Date.now() - startTime
    }).catch(console.error);
  }
  
  return { 
    context_summary: summary,
    reflection: "Đã tổng hợp các sự thật cốt lõi từ tài liệu.",
    totalUsage: res.usage
  };
}

const workflow = new StateGraph(AgentState)
  .addNode("router_expand", routerExpandNode)
  .addNode("summarize", summarizeHistoryNode)
  .addNode("retrieve", retrieveNode)
  .addNode("grade", gradeNode)
  .addNode("rewrite", rewriteNode)
  .addNode("compress", compressNode);

workflow.addEdge(START, "summarize");
workflow.addEdge("summarize", "router_expand");

workflow.addConditionalEdges(
  "router_expand",
  (state) => state.isChitChat ? "compress" : "retrieve",
  { compress: "compress", retrieve: "retrieve" }
);

workflow.addConditionalEdges(
  "retrieve",
  (state) => {
    const totalContent = state.evidence.docs.map(d => d.content).join("\n");
    return estimateTokens(totalContent) > TOKEN_COMPRESSION_THRESHOLD ? "compress" : "grade";
  },
  { compress: "compress", grade: "grade" }
);

workflow.addConditionalEdges(
  "grade",
  (state) => (state.isRelevant || state.iterations >= 3) ? "compress" : "rewrite",
  { compress: "compress", rewrite: "rewrite" }
);

workflow.addEdge("rewrite", "router_expand");
workflow.addEdge("compress", END);

export const ragGraph = workflow.compile();
