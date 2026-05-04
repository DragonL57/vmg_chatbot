import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider, LLMResponse } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { QUERY_ANALYZER_PROMPT } from "../../prompts/rag-agents";
import { QueryAnalysis } from "../../domain/entities/query-analysis";
import { queryAnalysisSchema } from "../../application/schemas/query-analysis-schema";

export async function analyzeQueryNode(state: AgentStateType, config: RunnableConfig) {
  const startTime = Date.now();
  const { llmProvider, obsPort } = config.configurable as { llmProvider: ILLMProvider, obsPort: IObservabilityPort };
  const lastMsg = state.messages[state.messages.length - 1].content as string;
  const recent = state.messages.slice(-4).map(m => `${m._getType() === 'human' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

  const res = await llmProvider.completion({
    messages: [{ role: "system", content: QUERY_ANALYZER_PROMPT }, { role: "user", content: `Context: ${state.context_summary}\n\nRecent:\n${recent}\n\nQuery: ${lastMsg}` }],
    jsonMode: true, effort: 'instant'
  });

  await emitTrace(obsPort, state.traceId, res, lastMsg, startTime);
  const parsed = parseResult(res.content, lastMsg);

  return {
    questionIsClear: parsed.is_clear,
    rewrittenQuestions: parsed.questions,
    reflection: parsed.is_clear ? "Query analyzed." : (parsed.clarification_needed || "Need info."),
    subQueries: parsed.questions,
    totalUsage: res.usage
  };
}

async function emitTrace(obs: IObservabilityPort, tid: string | null, res: LLMResponse, msg: string, start: number) {
  if (!tid) return;
  await obs.emitSpan(tid, {
    nodeName: 'analyze_query', 
    model: res.model, 
    input: { query: msg }, 
    output: res.content,
    promptTokens: res.usage.prompt_tokens, 
    completionTokens: res.usage.completion_tokens,
    cachedTokens: res.usage.cached_tokens || 0, 
    cacheCreationTokens: res.usage.cache_creation_tokens || 0,
    latencyMs: Date.now() - start, 
    isBatch: res.isBatch
  }).catch(() => {});
}

function parseResult(content: string | null, fallback: string): QueryAnalysis {
  try {
    const raw = JSON.parse(content || "{}");
    const result = queryAnalysisSchema.safeParse(raw);
    return result.success ? result.data : { is_clear: true, questions: [fallback] };
  } catch { return { is_clear: true, questions: [fallback] }; }
}
