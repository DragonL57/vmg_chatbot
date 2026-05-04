import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { ILoggerProvider } from "../../application/ports/logger.port";
import { CHAT_POLICIES } from "../../domain/entities/chat";
import { STRUCTURED_COMPACTION_PROMPT } from "../../prompts/rag-agents";

/**
 * Node 1: Summarize History
 */
export async function summarizeHistoryNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort, logger } = config.configurable as { llmProvider: ILLMProvider; obsPort: IObservabilityPort; logger: ILoggerProvider };
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
    }).catch((err) => logger.error('Failed to emit summarize span', err));
  }

  return { 
    context_summary: summary,
    reflection: "Conversation context optimized (Structured Compaction).",
    totalUsage: res.usage
  };
}
