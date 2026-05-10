/**
 * Lightweight LLM client for the PageIndex experiment.
 * Reads env vars directly from process.env (set via dotenv -e .env.local).
 * Uses Inception Labs API (OpenAI-compatible) — no Poe dependency.
 */

import OpenAI from 'openai';

export interface ExperimentLLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

function getConfig(): ExperimentLLMConfig {
  const apiKey = process.env.INCEPTION_API_KEY;
  if (!apiKey) throw new Error('INCEPTION_API_KEY not set. Run with: dotenv -e .env.local -- npx tsx ...');

  return {
    apiKey,
    baseURL: 'https://api.inceptionlabs.ai/v1',
    model: process.env.INCEPTION_MODEL || 'mercury-2',
  };
}

let _client: OpenAI | null = null;
let _config: ExperimentLLMConfig | null = null;

function getClient(): { client: OpenAI; config: ExperimentLLMConfig } {
  if (!_client || !_config) {
    _config = getConfig();
    _client = new OpenAI({
      apiKey: _config.apiKey,
      baseURL: _config.baseURL,
    });
  }
  return { client: _client, config: _config };
}

export async function completion(params: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  jsonMode?: boolean;
  effort?: 'instant' | 'low' | 'medium' | 'high';
  model?: string;
}): Promise<{ content: string | null; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  const { client, config } = getClient();

  const res = await client.chat.completions.create({
    model: params.model || config.model,
    messages: params.messages.map(m => ({ role: m.role, content: m.content })),
    response_format: params.jsonMode ? { type: 'json_object' } : undefined,
    ...(params.effort ? {
      extra_body: {
        reasoning_effort: params.effort,
        reasoning_summary: true,
      },
    } : {}),
  });

  return {
    content: res.choices[0]?.message?.content || null,
    usage: {
      prompt_tokens: res.usage?.prompt_tokens || 0,
      completion_tokens: res.usage?.completion_tokens || 0,
      total_tokens: res.usage?.total_tokens || 0,
    },
  };
}
