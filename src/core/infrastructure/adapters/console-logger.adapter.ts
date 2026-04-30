import { ILoggerProvider } from "../../application/ports/logger.port";

export class ConsoleLoggerAdapter implements ILoggerProvider {
  public info(message: string, context?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, context || '');
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error || '', context || '');
  }
}
