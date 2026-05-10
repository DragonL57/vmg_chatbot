import { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { ILLMProvider } from "../../application/ports/llm-provider.port";
import { IObservabilityPort } from "../../application/ports/observability.port";
import { ILoggerProvider } from "../../application/ports/logger.port";

export interface GraphConfig {
  llmProvider: ILLMProvider;
  obsPort: IObservabilityPort;
  logger: ILoggerProvider;
}

export function getConfig(config: RunnableConfig): GraphConfig {
  return config.configurable as GraphConfig;
}

export function logPayload(logger: ILoggerProvider, node: string, input: unknown, output: unknown): void {
  const inputStr = JSON.stringify(input);
  const outputStr = JSON.stringify(output);
  logger.info(`[PAYLOAD] ${node}`, {
    inputSize: inputStr.length,
    outputSize: outputStr.length,
  });
}

export function safeParseJson<T>(logger: ILoggerProvider, nodeName: string, json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch (e) {
    logger.error(`[${nodeName}] JSON parse error`, e, { rawOutput: json });
    return fallback;
  }
}

export const graderSchema = z.object({
  is_relevant: z.string().default("NO"),
  reasoning: z.string().optional().default(""),
});
