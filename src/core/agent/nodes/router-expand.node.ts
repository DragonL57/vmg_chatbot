import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { ILoggerProvider } from "../../application/ports/logger.port";
import { GATEWAY_AGENT_PROMPT } from "../../prompts/rag-agents";

/**
 * Node 0+2: Semantic Router & Intent Expansion (Merged)
 */
export async function routerExpandNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort, logger } = config.configurable as { llmProvider: ILLMProvider; obsPort: IObservabilityPort; logger: ILoggerProvider };
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
    }).catch((err) => logger.error('Failed to emit router_expand span', err));
  }

  let parsed = { is_chit_chat: false, selected: [] as string[], queries: queries, reasoning: "" };
  try {
    const rawParsed = JSON.parse(output);
    parsed = { ...parsed, ...rawParsed };
  } catch {
    // Silent fail fallback
  }

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
