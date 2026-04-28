import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateType } from "../state";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { META_GRADER_PROMPT } from "../../prompts/rag-agents";
import { z } from "zod";

const graderSchema = z.object({
  is_relevant: z.string().default("NO"),
  reasoning: z.string().optional().default("")
});

/**
 * Node 4: Grade evidence
 */
export async function gradeNode(state: AgentStateType, config: RunnableConfig) {
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
  
  try {
    const parsed = JSON.parse(rawOut);
    const result = graderSchema.safeParse(parsed);
    
    if (result.success) {
      grade = result.data.is_relevant.toUpperCase() === "YES";
      reason = result.data.reasoning || (grade ? "Relevant information found." : "Documents provide insufficient information.");
    }
  } catch (e) {}

  return { isRelevant: grade, reflection: reason, totalUsage: res.usage };
}
