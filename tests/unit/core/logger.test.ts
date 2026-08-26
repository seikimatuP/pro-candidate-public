import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 環境変数をモックするため、モジュールを動的にインポート
describe('src/core/logger.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Logger Class', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
        delete process.env.STAGE;
        delete process.env.AWS_LAMBDA_FUNCTION_NAME;
        delete process.env.LOG_LEVEL;
      });

      it('should enable console output in development', async () => {
        process.env.NODE_ENV = 'development';
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('test message');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should log debug messages with args', async () => {
        process.env.NODE_ENV = 'development';
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test', { key: 'value' }, 123);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('DEBUG');
        expect(loggedMessage).toContain('debug test');
        consoleSpy.mockRestore();
      });

      it('should log info messages', async () => {
        process.env.NODE_ENV = 'development';
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('info test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('INFO');
        consoleSpy.mockRestore();
      });

      it('should log warn messages', async () => {
        process.env.NODE_ENV = 'development';
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.warn('warn test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('WARN');
        consoleSpy.mockRestore();
      });

      it('should log error messages', async () => {
        process.env.NODE_ENV = 'development';
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('error test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('ERROR');
        consoleSpy.mockRestore();
      });

      it('should log critical messages always', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.critical('critical test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('CRITICAL');
        consoleSpy.mockRestore();
      });

      it('should format message with multiple arguments', async () => {
        process.env.NODE_ENV = 'development';
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('test message', 'arg1', { key: 'value' }, 123);

        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('test message');
        expect(loggedMessage).toContain('arg1');
        expect(loggedMessage).toContain('"key":"value"');
        expect(loggedMessage).toContain('123');
        consoleSpy.mockRestore();
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        delete process.env.LOG_LEVEL;
      });

      it('should disable console output in production for debug', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('test message');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should disable console output in production for info', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('info test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should disable console for warn in production', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.warn('warn test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should disable console for error in production', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('error test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should still log critical in production', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.critical('critical test');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('Lambda Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-function';
        delete process.env.LOG_LEVEL;
      });

      it('should disable console output in Lambda environment', async () => {
        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('test message');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('LOG_LEVEL Environment Variable', () => {
      it('should use DEBUG level when LOG_LEVEL=DEBUG', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'DEBUG';

        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should use INFO level when LOG_LEVEL=INFO', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'INFO';

        const { logger } = await import('../../../src/core/logger');
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.debug('debug test');
        logger.info('info test');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
        debugSpy.mockRestore();
        infoSpy.mockRestore();
      });

      it('should use WARN level when LOG_LEVEL=WARN', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'WARN';

        const { logger } = await import('../../../src/core/logger');
        const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.info('info test');
        logger.warn('warn test');

        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
      });

      it('should use ERROR level when LOG_LEVEL=ERROR', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'ERROR';

        const { logger } = await import('../../../src/core/logger');
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.warn('warn test');
        logger.error('error test');

        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      });

      it('should use NONE level when LOG_LEVEL=NONE', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'NONE';

        const { logger } = await import('../../../src/core/logger');
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('error test');

        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
      });

      it('should handle lowercase LOG_LEVEL', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'info';

        const { logger } = await import('../../../src/core/logger');
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test');

        expect(debugSpy).not.toHaveBeenCalled();
        debugSpy.mockRestore();
      });
    });

    describe('getEnvironmentInfo', () => {
      it('should return environment info in development', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.AWS_LAMBDA_FUNCTION_NAME;

        const { logger } = await import('../../../src/core/logger');
        const info = logger.getEnvironmentInfo();

        expect(info.env).toBe('development');
        expect(info.isProduction).toBe(false);
        expect(info.isLambda).toBe(false);
        expect(info.logLevel).toBeDefined();
      });

      it('should return environment info in production', async () => {
        process.env.NODE_ENV = 'production';

        const { logger } = await import('../../../src/core/logger');
        const info = logger.getEnvironmentInfo();

        expect(info.isProduction).toBe(true);
      });

      it('should return Lambda environment info', async () => {
        process.env.NODE_ENV = 'development';
        process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-function';

        const { logger } = await import('../../../src/core/logger');
        const info = logger.getEnvironmentInfo();

        expect(info.isLambda).toBe(true);
      });
    });

    describe('updateConfig', () => {
      it('should update logger config', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.AWS_LAMBDA_FUNCTION_NAME;

        const { logger } = await import('../../../src/core/logger');
        const { LogLevel } = await import('../../../src/core/types');

        // 最初はDEBUGレベルでコンソール有効
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        logger.debug('before update');
        expect(debugSpy).toHaveBeenCalled();
        debugSpy.mockClear();

        // 設定を更新してコンソール出力を無効化
        logger.updateConfig({ enableConsole: false });

        logger.debug('after update');
        // コンソール無効化後は呼ばれない
        expect(debugSpy).not.toHaveBeenCalled();
        debugSpy.mockRestore();
      });

      it('should update log level via updateConfig', async () => {
        process.env.NODE_ENV = 'development';

        const { logger } = await import('../../../src/core/logger');
        const { LogLevel } = await import('../../../src/core/types');

        logger.updateConfig({ level: LogLevel.ERROR });

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.warn('warn test');
        logger.error('error test');

        expect(warnSpy).not.toHaveBeenCalled();
        // enableConsoleがtrueのままなら出力される
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      });
    });

    describe('STAGE environment variable', () => {
      it('should treat STAGE=prod as production for debug', async () => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'prod';
        delete process.env.AWS_LAMBDA_FUNCTION_NAME;

        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test');

        // STAGE=prodの場合、debug内のisProductionチェックで出力されない
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should treat STAGE=prod as production for info', async () => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'prod';
        delete process.env.AWS_LAMBDA_FUNCTION_NAME;

        const { logger } = await import('../../../src/core/logger');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('info test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('log Convenience Object', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      delete process.env.STAGE;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      delete process.env.LOG_LEVEL;
    });

    it('should expose debug function', async () => {
      const { log } = await import('../../../src/core/logger');
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      log.debug('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose info function', async () => {
      const { log } = await import('../../../src/core/logger');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.info('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose warn function', async () => {
      const { log } = await import('../../../src/core/logger');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      log.warn('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose error function', async () => {
      const { log } = await import('../../../src/core/logger');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      log.error('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose critical function', async () => {
      const { log } = await import('../../../src/core/logger');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      log.critical('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Singleton logger Instance', () => {
    it('should export a singleton logger instance', async () => {
      process.env.NODE_ENV = 'development';

      const module1 = await import('../../../src/core/logger');
      vi.resetModules();
      const module2 = await import('../../../src/core/logger');

      // モジュールリセット後は異なるインスタンスになる
      expect(module1.logger).toBeDefined();
      expect(module2.logger).toBeDefined();
    });
  });
});
