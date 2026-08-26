import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as environment from './environment';
import * as envHelper from './env-helper';

describe('environment utils', () => {
  const originalWindowLocation = window.location;

  beforeEach(() => {
    // Reset window.location mock
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalWindowLocation, hostname: 'localhost', search: '' },
    });

    // Mock getEnv
    vi.spyOn(envHelper, 'getEnv').mockReturnValue({} as ReturnType<typeof envHelper.getEnv>);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalWindowLocation,
    });
    vi.restoreAllMocks();
  });

  describe('isLocalhost', () => {
    it('returns true for localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', search: '' },
      });
      expect(environment.isLocalhost()).toBe(true);
    });

    it('returns true for 127.0.0.1', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '127.0.0.1', search: '' },
      });
      expect(environment.isLocalhost()).toBe(true);
    });

    it('returns true if VITE_ENVIRONMENT is local', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', search: '' },
      });
      vi.mocked(envHelper.getEnv).mockReturnValue({ VITE_ENVIRONMENT: 'local' } as ReturnType<typeof envHelper.getEnv>);
      expect(environment.isLocalhost()).toBe(true);
    });

    it('returns false for other hostnames', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', search: '' },
      });
      expect(environment.isLocalhost()).toBe(false);
    });

    it('E2E_TEST_MODE をデプロイ済みドメインで立てても true にならない', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'd3brmn978dqs63.cloudfront.net', search: '' },
      });
      window.localStorage.setItem('E2E_TEST_MODE', 'true');
      try {
        expect(environment.isE2ETestMode()).toBe(false);
        expect(environment.isLocalhost()).toBe(false);
      } finally {
        window.localStorage.removeItem('E2E_TEST_MODE');
      }
    });

    it('e2e=true をデプロイ済みドメインで付けても true にならない', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'd3brmn978dqs63.cloudfront.net', search: '?e2e=true' },
      });
      expect(environment.isE2ETestMode()).toBe(false);
      expect(environment.isLocalhost()).toBe(false);
    });

    it('localhost では E2E_TEST_MODE を尊重する', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', search: '' },
      });
      window.localStorage.setItem('E2E_TEST_MODE', 'true');
      try {
        expect(environment.isE2ETestMode()).toBe(true);
        expect(environment.isLocalhost()).toBe(true);
      } finally {
        window.localStorage.removeItem('E2E_TEST_MODE');
      }
    });
  });

  describe('getEnvironment', () => {
    it('returns local for localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', search: '' },
      });
      expect(environment.getEnvironment()).toBe('local');
    });

    it('returns dev for dev hostname', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dev.example.com', search: '' },
      });
      expect(environment.getEnvironment()).toBe('dev');
    });

    it('returns prod for other hostnames', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', search: '' },
      });
      expect(environment.getEnvironment()).toBe('prod');
    });

    it('respects VITE_ENVIRONMENT override', () => {
      vi.mocked(envHelper.getEnv).mockReturnValue({ VITE_ENVIRONMENT: 'dev' } as ReturnType<typeof envHelper.getEnv>);
      expect(environment.getEnvironment()).toBe('dev');
    });
  });

  describe('getEnvironmentValue', () => {
    const config = {
      local: 'local-value',
      dev: 'dev-value',
      prod: 'prod-value',
      default: 'default-value',
    };

    it('returns local value in local env', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', search: '' },
      });
      expect(environment.getEnvironmentValue(config)).toBe('local-value');
    });

    it('returns default if specific env value is missing', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', search: '' },
      });
      const partialConfig = { default: 'default-value', prod: 'prod-value' };
      expect(environment.getEnvironmentValue(partialConfig)).toBe('default-value');
    });
  });

  describe('isAuthRequired', () => {
    it('returns false for localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', search: '' },
      });
      expect(environment.isAuthRequired()).toBe(false);
    });

    it('returns true for prod', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', search: '' },
      });
      expect(environment.isAuthRequired()).toBe(true);
    });

    it('respects VITE_AUTH_REQUIRED', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', search: '' },
      });
      vi.mocked(envHelper.getEnv).mockReturnValue({ VITE_AUTH_REQUIRED: 'true' } as ReturnType<typeof envHelper.getEnv>);
      expect(environment.isAuthRequired()).toBe(true);
    });
  });
});
