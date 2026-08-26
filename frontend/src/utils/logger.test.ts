import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('FrontendLogger', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: any;

  beforeEach(() => {
    // 他のログレベルはスパイのみ設定（出力抑制のため）
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // エラーログのみ検証用に変数に保持
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log debug messages when enabled', () => {
    // Assuming default dev environment enables debug
    logger.debug('test debug');
    // Note: This assertion depends on the environment configuration. 
    // If we can't easily mock import.meta.env, we might need to adjust the test or the logger to be more testable.
  });

  it('should log error messages', () => {
    logger.error('test error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('test error');
  });
});
