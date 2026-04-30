import { ILLMProvider } from "../ports/llm-provider.port";
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
    const recent = messages.slice(-6);
    const contextStr = recent.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    try {
      const existing = await this.memoryRepository.getByUserId(userId, 30);
      const res = await this.llmProvider.completion({
        messages: [{ role: 'system', content: KNOWLEDGE_AUDITOR_PROMPT(existing.map(m => `[ID: ${m.id}] (${m.category}): ${m.fact}`).join('\n')) }, { role: 'user', content: `Latest context:\n${contextStr}` }],
        jsonMode: true, effort: 'high'
      });

      const actions = this.parseActions(res.content, traceId);
      if (actions.length === 0) return 0;

      const changeCount = await this.applyActions(userId, actions, traceId);
      await this.emitTrace(traceId, res, recent.length, actions, startTime);
      if (changeCount > 0) this.logger.info(`Memory synced`, { userId, changeCount, traceId });
      return changeCount;
    } catch (err: unknown) {
      this.logger.error('Fatal memory error', err, { userId, traceId });
      throw err;
    }
  }

  private parseActions(content: string | null, traceId?: string | null): MemoryAction[] {
    try {
      const parsed = JSON.parse((content || '{"actions": []}').trim());
      const validation = memoryExtractionSchema.safeParse(parsed);
      if (!validation.success) {
        this.logger.warn('Invalid memory schema', { errors: validation.error.format(), traceId });
        return [];
      }
      return validation.data.actions;
    } catch (e) {
      this.logger.error('JSON error in memory', e, { traceId });
      return [];
    }
  }

  private async applyActions(userId: string, actions: MemoryAction[], traceId?: string | null): Promise<number> {
    let count = 0;
    for (const a of actions) {
      try {
        if (a.op === 'ADD' && a.fact) {
          await this.memoryRepository.add(userId, a.fact, a.category || 'episodic');
          count++;
        } else if (a.op === 'UPDATE' && a.id && a.fact) {
          await this.memoryRepository.update(a.id, userId, a.fact);
          count++;
        } else if (a.op === 'DELETE' && a.id) {
          await this.memoryRepository.delete(a.id, userId);
          count++;
        }
      } catch (err) {
        this.logger.error('Memory action fail', err, { action: a, userId, traceId });
      }
    }
    return count;
  }

  private async emitTrace(traceId: string | null | undefined, res: { model: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cached_tokens?: number; cache_creation_tokens?: number }; isBatch?: boolean }, histLen: number, actions: MemoryAction[], start: number) {
    if (!traceId) return;
    await this.obsPort.emitSpan(traceId, {
      nodeName: 'memory_curator', model: res.model, input: { historyLength: histLen }, output: actions,
      promptTokens: res.usage.prompt_tokens, completionTokens: res.usage.completion_tokens,
      cachedTokens: res.usage.cached_tokens || 0, cacheCreationTokens: res.usage.cache_creation_tokens || 0,
      latencyMs: Date.now() - start, isBatch: res.isBatch
    }).catch(err => this.logger.error('Trace emit fail', err));
  }
}
