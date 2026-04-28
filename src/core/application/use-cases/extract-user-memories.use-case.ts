import { ILLMProvider, LLMMessage } from "../ports/llm-provider.port";
import { IMemoryRepository } from "../ports/memory-repository.port";
import { IObservabilityPort } from "../ports/observability.port";
import { ILoggerProvider } from "../ports/logger.port";
import { memoryExtractionSchema, MemoryAction } from "../../domain/entities/memory";
import { KNOWLEDGE_AUDITOR_PROMPT } from "@core/prompts/memory";

export interface ExtractUserMemoriesInput {
  userId: string;
  messages: { role: string; content: string }[];
  traceId?: string | null;
}

export class ExtractUserMemoriesUseCase {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly memoryRepository: IMemoryRepository,
    private readonly obsPort: IObservabilityPort,
    private readonly logger: ILoggerProvider
  ) {}

  async execute(input: ExtractUserMemoriesInput): Promise<number> {
    const startTime = Date.now();
    const { userId, messages, traceId } = input;
    
    const recentMessages = messages.slice(-6);
    const contextStr = recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    try {
      const existingMemories = await this.memoryRepository.getByUserId(userId, 30);
      const memoryBlock = existingMemories.map(m => `[ID: ${m.id}] (${m.category}): ${m.fact}`).join('\n');

      const systemPrompt = KNOWLEDGE_AUDITOR_PROMPT(memoryBlock);

      const res = await this.llmProvider.completion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Latest context:\n${contextStr}` }
        ],
        jsonMode: true,
        effort: 'high'
      });

      const rawOutput = res.content || '{"actions": []}';
      let parsed;
      try {
        parsed = JSON.parse(rawOutput.trim());
      } catch (e) {
        this.logger.error('JSON parse error in memory extraction', e, { rawOutput, traceId });
        return 0;
      }

      const validation = memoryExtractionSchema.safeParse(parsed);
      
      if (!validation.success) {
         this.logger.warn('Invalid schema in memory extraction', { 
           errors: validation.error.format(), 
           rawOutput,
           traceId 
         });
         return 0;
      }

      const actions = validation.data.actions;
      if (actions.length === 0) return 0;

      let changeCount = 0;
      for (const action of actions) {
        try {
          if (action.op === 'ADD' && action.fact) {
            await this.memoryRepository.add(userId, action.fact, action.category || 'episodic');
            changeCount++;
          } 
          else if (action.op === 'UPDATE' && action.id && action.fact) {
            await this.memoryRepository.update(action.id, userId, action.fact);
            changeCount++;
          }
          else if (action.op === 'DELETE' && action.id) {
            await this.memoryRepository.delete(action.id, userId);
            changeCount++;
          }
        } catch (actionErr) {
          this.logger.error('Failed to apply memory action', actionErr, { action, userId, traceId });
        }
      }

      if (traceId) {
        await this.obsPort.emitSpan(traceId, {
          nodeName: 'memory_curator',
          model: res.model,
          input: { historyLength: recentMessages.length },
          output: actions,
          promptTokens: res.usage.prompt_tokens,
          completionTokens: res.usage.completion_tokens,
          cachedTokens: res.usage.cached_tokens || 0,
          cacheCreationTokens: res.usage.cache_creation_tokens || 0,
          latencyMs: Date.now() - startTime,
          isBatch: res.isBatch
        }).catch(err => this.logger.error('Failed to emit memory_curator span', err, { traceId }));
      }

      if (changeCount > 0) {
        this.logger.info(`Memory extracted and synchronized`, { userId, changeCount, traceId });
      }

      return changeCount;

    } catch (err) {
      this.logger.error('Fatal error in ExtractUserMemoriesUseCase', err, { userId, traceId });
      throw err; // Re-throw to be handled at the boundary
    }
  }
}
