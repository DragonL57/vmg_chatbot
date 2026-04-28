import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { QUERY_ANALYZER_PROMPT } from "../../prompts/rag-agents";
import { queryAnalysisSchema } from "../../domain/entities/query-analysis";

/**
 * Node: Analyze Query Clarity & Decompose
 */
export async function analyzeQueryNode(state: AgentStateType, config: RunnableConfig) {
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
    }
  } catch (e) {
    // Error logged in span
  }

  return {
    questionIsClear: parsed.is_clear,
    rewrittenQuestions: parsed.questions,
    reflection: parsed.is_clear ? "Query analyzed and clarified." : (parsed.clarification_needed || "The request is unclear, more information is needed."),
    subQueries: parsed.questions,
    totalUsage: res.usage
  };
}
