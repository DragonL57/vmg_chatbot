import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { META_COMPRESSOR_PROMPT } from "../../prompts/rag-agents";

/**
 * Node 6: Compress Facts
 */
export async function compressNode(state: AgentStateType, config: RunnableConfig) {
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
