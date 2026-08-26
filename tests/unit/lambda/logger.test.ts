import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 環境変数をモックするため、モジュールを動的にインポート
describe('LambdaLogger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('LogLevel Enum', () => {
    it('should have correct numeric values', async () => {
      const { LogLevel } = await import('../../../pro-candidate-aws/lambda/logger');
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.NONE).toBe(4);
    });

    it('should be comparable', async () => {
      const { LogLevel } = await import('../../../pro-candidate-aws/lambda/logger');
      expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true);
      expect(LogLevel.INFO < LogLevel.WARN).toBe(true);
      expect(LogLevel.WARN < LogLevel.ERROR).toBe(true);
      expect(LogLevel.ERROR < LogLevel.NONE).toBe(true);
    });
  });

  describe('LambdaLogger Class', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'dev';
        delete process.env.LOG_LEVEL;
      });

      it('should enable console output in development', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('test message');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should log debug messages', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test', { key: 'value' });

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('DEBUG');
        expect(loggedMessage).toContain('debug test');
        consoleSpy.mockRestore();
      });

      it('should log info messages', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('info test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('INFO');
        consoleSpy.mockRestore();
      });

      it('should log warn messages', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.warn('warn test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('WARN');
        consoleSpy.mockRestore();
      });

      it('should log error messages', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('error test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('ERROR');
        consoleSpy.mockRestore();
      });

      it('should log critical messages', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.critical('critical test');

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('CRITICAL');
        consoleSpy.mockRestore();
      });

      it('should format message with multiple arguments', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
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
        process.env.STAGE = 'prod';
        delete process.env.LOG_LEVEL;
      });

      it('should disable console output in production', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('test message');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should not log info messages in production', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('info test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should not log warn messages in production', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.warn('warn test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should not log error messages in production (console disabled)', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('error test');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('LOG_LEVEL Environment Variable', () => {
      it('should use DEBUG level when LOG_LEVEL=DEBUG', async () => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'dev';
        process.env.LOG_LEVEL = 'DEBUG';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should use INFO level when LOG_LEVEL=INFO', async () => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'dev';
        process.env.LOG_LEVEL = 'INFO';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
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
        process.env.STAGE = 'dev';
        process.env.LOG_LEVEL = 'WARN';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
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
        process.env.STAGE = 'dev';
        process.env.LOG_LEVEL = 'ERROR';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
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
        process.env.STAGE = 'dev';
        process.env.LOG_LEVEL = 'NONE';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('error test');

        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
      });

      it('should handle lowercase LOG_LEVEL', async () => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'dev';
        process.env.LOG_LEVEL = 'info';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        logger.debug('debug test');

        expect(debugSpy).not.toHaveBeenCalled();
        debugSpy.mockRestore();
      });
    });

    describe('Lambda-specific Methods', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.STAGE = 'dev';
        delete process.env.LOG_LEVEL;
      });

      it('should log requestStart with httpMethod', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const event = {
          httpMethod: 'GET',
          path: '/test',
        };

        logger.requestStart(event);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('Request started');
        consoleSpy.mockRestore();
      });

      it('should log requestStart with requestContext', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const event = {
          requestContext: {
            http: {
              method: 'POST',
            },
          },
          pathParameters: {
            proxy: '/api/test',
          },
        };

        logger.requestStart(event);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should log requestEnd with status and duration', async () => {
        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.requestEnd(200, 150);

        expect(consoleSpy).toHaveBeenCalled();
        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain('Request completed');
        consoleSpy.mockRestore();
      });

      it('should not log requestStart in production', async () => {
        process.env.NODE_ENV = 'production';
        process.env.STAGE = 'prod';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const event = { httpMethod: 'GET', path: '/test' };
        logger.requestStart(event);

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should not log requestEnd in production', async () => {
        process.env.NODE_ENV = 'production';
        process.env.STAGE = 'prod';

        const { LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');
        const logger = new LambdaLogger();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.requestEnd(200, 150);

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('log Convenience Object', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'dev';
      delete process.env.LOG_LEVEL;
    });

    it('should expose debug function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      log.debug('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose info function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.info('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose warn function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      log.warn('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose error function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      log.error('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose critical function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      log.critical('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose requestStart function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.requestStart({ httpMethod: 'GET', path: '/test' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should expose requestEnd function', async () => {
      const { log } = await import('../../../pro-candidate-aws/lambda/logger');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.requestEnd(200, 100);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Singleton logger Instance', () => {
    it('should export a singleton logger instance', async () => {
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'dev';

      const { logger, LambdaLogger } = await import('../../../pro-candidate-aws/lambda/logger');

      expect(logger).toBeInstanceOf(LambdaLogger);
    });
  });
});
