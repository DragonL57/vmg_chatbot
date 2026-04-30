import { ILoggerProvider } from "../../application/ports/logger.port";

export class ConsoleLoggerAdapter implements ILoggerProvider {
  info(message: string, context?: Record<string, unknown>): void {
    console.warn(`[INFO] ${message}`, context || '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error || '', context || '');
  }
}
