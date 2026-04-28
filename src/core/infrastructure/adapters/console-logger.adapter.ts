import { ILoggerProvider } from "../../application/ports/logger.port";

export class ConsoleLoggerAdapter implements ILoggerProvider {
  info(message: string, context?: Record<string, any>): void {
    console.log(`[INFO] ${message}`, context || '');
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  error(message: string, error?: any, context?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, error || '', context || '');
  }
}
