import { ILLMProvider, LLMMessage, LLMResponse } from "../../application/ports/llm-provider.port";
import { getInceptionProvider } from "../../lib/providers";

export class LLMProviderAdapter implements ILLMProvider {
  public async completion(params: {
    messages: LLMMessage[];
    model?: string;
    jsonMode?: boolean;
    effort?: 'instant' | 'low' | 'medium' | 'high';
  }): Promise<LLMResponse> {
    const provider = getInceptionProvider(params.effort || 'medium');
    const res = await provider.client.chat.completions.create({
      model: params.model || provider.model,
      messages: params.messages.map(m => ({ role: m.role, content: m.content })),
      response_format: params.jsonMode ? { type: 'json_object' } : undefined,
      ...(provider.extraBody ? { extra_body: provider.extraBody } : {}),
    });

    return {
      content: res.choices[0]?.message?.content || null,
      usage: this.mapUsage(res.usage),
      model: res.model || params.model || provider.model,
    };
  }

  private mapUsage(usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number; cache_creation_input_tokens?: number } } | null | undefined) {
    return {
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
      cached_tokens: usage?.prompt_tokens_details?.cached_tokens || 0,
      cache_creation_tokens: usage?.prompt_tokens_details?.cache_creation_input_tokens || 0,
    };
  }
}
