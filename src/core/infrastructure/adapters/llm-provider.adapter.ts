import { ILLMProvider, LLMMessage, LLMResponse } from "../../application/ports/llm-provider.port";
import { getInceptionProvider, getPoeProvider, ReasoningEffort } from "../../lib/providers";
import { env } from "@/env";

export class LLMProviderAdapter implements ILLMProvider {
  async completion(params: {
    messages: LLMMessage[];
    model?: string;
    jsonMode?: boolean;
    effort?: 'instant' | 'low' | 'medium' | 'high';
  }): Promise<LLMResponse> {
    const { messages, jsonMode, effort } = params;
    
    // Logic to select provider similar to providers.ts
    const provider = env.INCEPTION_API_KEY 
      ? getInceptionProvider(effort as ReasoningEffort || 'medium') 
      : getPoeProvider();

    const res = await provider.client.chat.completions.create({
      model: provider.model,
      messages: messages as any,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      ...(provider.extraBody ? { extra_body: provider.extraBody } : {}),
    });

    return {
      content: res.choices[0].message.content,
      usage: {
        prompt_tokens: res.usage?.prompt_tokens || 0,
        completion_tokens: res.usage?.completion_tokens || 0,
        total_tokens: res.usage?.total_tokens || 0,
        cached_tokens: (res.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
        cache_creation_tokens: (res.usage as any)?.prompt_tokens_details?.cache_creation_input_tokens || 0,
      },
      model: provider.model,
      isBatch: provider.isBatch
    };
  }
}
