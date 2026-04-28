import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { SEARCH_OPTIMIZATION_PROMPT } from "../../prompts/rag-agents";

/**
 * Node 5: Rewrite query
 */
export async function rewriteNode(state: AgentStateType, config: RunnableConfig) {
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
  try {
    const rawParsed = JSON.parse(output);
    parsed = { ...parsed, ...rawParsed };
  } catch (e) {}

  return { 
    subQueries: Array.isArray(parsed.queries) && parsed.queries.length > 0 ? parsed.queries : [lastQuery],
    iterations: (state.iterations || 0) + 1,
    reflection: "Expanding search scope for better evidence...",
    totalUsage: res.usage
  };
}
