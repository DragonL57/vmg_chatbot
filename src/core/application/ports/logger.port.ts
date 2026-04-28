export interface ILoggerProvider {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: any, context?: Record<string, any>): void;
}
