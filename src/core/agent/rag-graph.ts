import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { estimateTokens } from "@core/lib/utils";
import { 
  SEARCH_OPTIMIZATION_PROMPT, 
  META_GRADER_PROMPT, 
  META_COMPRESSOR_PROMPT,
  GATEWAY_AGENT_PROMPT,
  STRUCTURED_COMPACTION_PROMPT,
  QUERY_ANALYZER_PROMPT
} from "@core/prompts/rag-agents";
import { z } from "zod";
import { CHAT_POLICIES } from "@core/domain/entities/chat";
import { RunnableConfig } from "@langchain/core/runnables";
import { queryAnalysisSchema } from "@core/domain/entities/query-analysis";

// Port Interfaces
import { ILLMProvider } from "../application/ports/llm-provider.port";
import { IVectorStorePort } from "../application/ports/vector-store.port";
import { IObservabilityPort } from "../application/ports/observability.port";

const TOKEN_COMPRESSION_THRESHOLD = CHAT_POLICIES.TOKEN_COMPRESSION_THRESHOLD;

function logPayload(node: string, input: any, output: any) {
  const inputChars = JSON.stringify(input).length;
  const outputChars = JSON.stringify(output).length;
  console.log(`[PAYLOAD] ${node.padEnd(12)} | In: ${inputChars.toLocaleString().padStart(6)} chars | Out: ${outputChars.toLocaleString().padStart(5)} chars`);
}

function safeParseJson<T>(nodeName: string, json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error(`[${nodeName}] JSON parse error:`, e, "Raw output:", json);
    return fallback;
  }
}

const graderSchema = z.object({
  is_relevant: z.string().default("NO"),
  reasoning: z.string().optional().default("")
});

/**
 * Node: Analyze Query Clarity & Decompose
 */
async function analyzeQueryNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  const lastMessage = state.messages[state.messages.length - 1];
  const conversationSummary = state.context_summary || "";
  
  // Get recent messages for local context
  const recentMessages = state.messages.slice(-4).map(m => 
    `${m._getType() === 'human' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');

  const res = await llmProvider.completion({
    messages: [
      { role: "system", content: QUERY_ANALYZER_PROMPT },
      { role: "user", content: `Global Context Summary: ${conversationSummary}\n\nRecent Conversation:\n${recentMessages}\n\nLatest Query to Analyze: ${lastMessage.content}` }
    ],
    jsonMode: true,
    effort: 'instant'
  });

  const output = res.content || "{}";
  logPayload("QueryAnalyzer", { query: lastMessage.content }, output);

  if (state.traceId) {
    await obsPort.emitSpan(state.traceId, {
      nodeName: 'analyze_query',
      model: res.model,
      input: { query: lastMessage.content },
      output: output,
      promptTokens: res.usage.prompt_tokens,
      completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0,
      cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - startTime,
      isBatch: res.isBatch
    }).catch(console.error);
  }

  let parsed: { is_clear: boolean, questions: string[], clarification_needed: string } = { 
    is_clear: true, 
    questions: [lastMessage.content as string], 
    clarification_needed: "" 
  };

  try { 
    const rawParsed = JSON.parse(output);
    const result = queryAnalysisSchema.safeParse(rawParsed);
    if (result.success) {
      parsed = {
        is_clear: result.data.is_clear,
        questions: result.data.questions,
        clarification_needed: result.data.clarification_needed || ""
      };
    } else {
      console.error("[analyze_query] Validation failed:", result.error.format());
    }
  } catch (e) {
    console.error("[analyze_query] JSON parse error:", e, "Raw output:", output);
  }

  return {
    questionIsClear: parsed.is_clear,
    rewrittenQuestions: parsed.questions,
    reflection: parsed.is_clear ? "Query analyzed and clarified." : (parsed.clarification_needed || "The request is unclear, more information is needed."),
    subQueries: parsed.questions,
    totalUsage: res.usage
  };
}

/**
 * Node 0+2: Semantic Router & Intent Expansion (Merged)
 */
async function routerExpandNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  const { mode, allCollections, messages, traceId, subQueries } = state;
  const queries = subQueries && subQueries.length > 0 ? subQueries : [messages[messages.length - 1].content as string];
  const siloList = allCollections.map(c => `- ${c.qdrantName} (${c.name}): ${c.description || 'No description'}`).join("\n");

  const res = await llmProvider.completion({
    messages: [
      { role: "system", content: GATEWAY_AGENT_PROMPT(siloList) },
      { role: "user", content: `Mode: ${mode} | Queries: ${queries.join(" | ")}` }
    ],
    jsonMode: true,
    effort: 'instant'
  });

  const output = res.content || "{}";
  logPayload("RouterExpand", { siloList, queries }, output);

  if (traceId) {
    await obsPort.emitSpan(traceId, {
      nodeName: 'router_expand',
      model: res.model,
      input: { mode, queries },
      output: output,
      promptTokens: res.usage.prompt_tokens,
      completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0,
      cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - startTime,
      isBatch: res.isBatch
    }).catch(console.error);
  }

  let parsed = { is_chit_chat: false, selected: [] as string[], queries: queries, reasoning: "" };
  const rawParsed = safeParseJson("router_expand", output, parsed);
  parsed = { ...parsed, ...rawParsed };

  let finalSilos = mode === 'auto' || mode === 'discovery' ? parsed.selected : [mode];
  if (finalSilos.length === 0 && !parsed.is_chit_chat) finalSilos = allCollections.map(c => c.qdrantName);

  return { 
    isChitChat: !!parsed.is_chit_chat,
    targetCollections: finalSilos,
    subQueries: Array.isArray(parsed.queries) ? parsed.queries : queries,
    reflection: parsed.is_chit_chat ? "Processing direct conversation..." : (parsed.reasoning || "Determining search strategy..."),
    totalUsage: res.usage
  };
}

/**
 * Node 1: Summarize History
 */
async function summarizeHistoryNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  if (state.messages.length < CHAT_POLICIES.CONTEXT_COMPACTION_THRESHOLD) return { reflection: "" };

  const { traceId } = state;
  const history = state.messages.map(m => ({ 
    role: (m._getType() === 'human' ? 'user' : 'assistant') as 'user' | 'assistant', 
    content: m.content as string 
  }));

  const res = await llmProvider.completion({
    messages: [
      { role: "system", content: STRUCTURED_COMPACTION_PROMPT },
      ...history
    ],
    effort: 'instant'
  });

  const summary = res.content || "";
  logPayload("Summarize", history, summary);

  if (traceId) {
    await obsPort.emitSpan(traceId, {
      nodeName: 'summarize',
      model: res.model,
      input: { historyLength: history.length },
      output: summary,
      promptTokens: res.usage.prompt_tokens,
      completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0,
      cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - startTime,
      isBatch: res.isBatch
    }).catch(console.error);
  }

  return { 
    context_summary: summary,
    reflection: "Conversation context optimized (Structured Compaction).",
    totalUsage: res.usage
  };
}

/**
 * Node 3: Retrieve evidence
 */
async function retrieveNode(state: AgentStateType, config: RunnableConfig) {
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

/**
 * Node 4: Grade evidence
 */
async function gradeNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  const { evidence, messages, traceId } = state;
  const lastQuery = messages[messages.length - 1].content as string;
  if (!evidence.docs.length) return { isRelevant: false, reflection: "No relevant documents found." };

  const context = evidence.docs.slice(0, 8).map(d => d.parentContent || d.content).join("\n\n");

  const res = await llmProvider.completion({
    messages: [
      { role: "system", content: META_GRADER_PROMPT },
      { role: "user", content: `Question: ${lastQuery}\n\nContext:\n${context.slice(0, 4000)}` }
    ],
    jsonMode: true,
    effort: 'instant'
  });

  const rawOut = res.content || "{}";
  logPayload("Grader", { lastQuery, context: context.slice(0, 500) }, rawOut);

  if (traceId) {
    await obsPort.emitSpan(traceId, {
      nodeName: 'grade',
      model: res.model,
      input: { query: lastQuery },
      output: rawOut,
      promptTokens: res.usage.prompt_tokens,
      completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0,
      cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - startTime,
      isBatch: res.isBatch
    }).catch(console.error);
  }

  let grade = false;
  let reason = "Documents provide insufficient information.";
  const parsed = safeParseJson("grade", rawOut, {});
  const result = graderSchema.safeParse(parsed);
  
  if (result.success) {
    grade = result.data.is_relevant.toUpperCase() === "YES";
    reason = result.data.reasoning || (grade ? "Relevant information found." : "Documents provide insufficient information.");
  } else if (Object.keys(parsed).length > 0) {
    console.error("[grade] Validation failed:", result.error.format());
  }

  return { isRelevant: grade, reflection: reason, totalUsage: res.usage };
}

/**
 * Node 5: Rewrite query
 */
async function rewriteNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  const { messages, traceId } = state;
  const lastQuery = messages[messages.length - 1].content as string;

  const res = await llmProvider.completion({
    messages: [
      { role: "system", content: SEARCH_OPTIMIZATION_PROMPT },
      { role: "user", content: `Query: ${lastQuery}` }
    ],
    jsonMode: true,
    effort: 'instant'
  });

  const output = res.content || "{}";
  logPayload("Rewriter", { lastQuery }, output);

  if (traceId) {
    await obsPort.emitSpan(traceId, {
      nodeName: 'rewrite',
      model: res.model,
      input: { query: lastQuery },
      output: output,
      promptTokens: res.usage.prompt_tokens,
      completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0,
      cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - startTime,
      isBatch: res.isBatch
    }).catch(console.error);
  }

  let parsed = { queries: [] as string[], reasoning: "" };
  const rawParsed = safeParseJson("rewrite", output, parsed);
  parsed = { ...parsed, ...rawParsed };

  return { 
    subQueries: Array.isArray(parsed.queries) && parsed.queries.length > 0 ? parsed.queries : [lastQuery],
    iterations: (state.iterations || 0) + 1,
    reflection: "Expanding search scope for better evidence...",
    totalUsage: res.usage
  };
}

/**
 * Node 6: Compress Facts
 */
async function compressNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  const { evidence, traceId, isChitChat } = state;
  if (!evidence.docs.length || isChitChat) return { reflection: "" };

  const rawTextWithSources = evidence.docs.map(d => `[Source: ${d.source || d.title}]\n${d.parentContent || d.content}`).join("\n\n---\n\n");

  const res = await llmProvider.completion({
    messages: [
      { role: "system", content: META_COMPRESSOR_PROMPT },
      { role: "user", content: `Raw Data:\n${rawTextWithSources.slice(0, 6000)}` }
    ],
    effort: 'high'
  });

  const summary = res.content || "";
  logPayload("Compressor", { docCount: evidence.docs.length }, summary);

  if (traceId) {
    await obsPort.emitSpan(traceId, {
      nodeName: 'compress',
      model: res.model,
      input: { docCount: evidence.docs.length },
      output: summary,
      promptTokens: res.usage.prompt_tokens,
      completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0,
      cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - startTime,
      isBatch: res.isBatch
    }).catch(console.error);
  }

  return { 
    context_summary: summary,
    reflection: "Synthesized core facts from retrieved documents.",
    totalUsage: res.usage
  };
}


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
  (state) => state.questionIsClear ? "router_expand" : "end",
  { router_expand: "router_expand", end: END }
);

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
  (state) => (state.isRelevant || state.iterations >= CHAT_POLICIES.MAX_ITERATIONS) ? "compress" : "rewrite",
  { compress: "compress", rewrite: "rewrite" }
);

workflow.addEdge("rewrite", "router_expand");
workflow.addEdge("compress", END);

export const ragGraph = workflow.compile();