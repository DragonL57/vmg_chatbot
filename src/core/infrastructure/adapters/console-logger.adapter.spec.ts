import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleLoggerAdapter } from './console-logger.adapter';

describe('ConsoleLoggerAdapter', () => {
  let logger: ConsoleLoggerAdapter;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new ConsoleLoggerAdapter();
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('logs info messages', () => {
    logger.info('test message', { key: 'value' });
    expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] test message', { key: 'value' });
  });

  it('logs info without context', () => {
    logger.info('test');
    expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] test', '');
  });

  it('logs warn messages', () => {
    logger.warn('warning', { reason: 'test' });
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning', { reason: 'test' });
  });

  it('logs warn without context', () => {
    logger.warn('warning');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning', '');
  });

  it('logs error messages with error object', () => {
    const err = new Error('boom');
    logger.error('failure', err, { id: '123' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] failure', err, { id: '123' });
  });

  it('logs error without error object', () => {
    logger.error('failure');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] failure', '', '');
  });
});
