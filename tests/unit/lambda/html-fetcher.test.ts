import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../pro-candidate-aws/lambda/monitoring-helper', () => ({
  recordApiCall: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  fetchHtml,
  resetFetchScheduleForTests,
} from '../../../pro-candidate-aws/lambda/scraping/html-fetcher';

describe('fetchHtml', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetFetchScheduleForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('連絡先付きUser-AgentとAbortSignalを付けてHTMLを取得する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>ok</html>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const html = await fetchHtml('https://example.com', {
      timeout: 1_000,
      retryCount: 0,
      delayBetweenRequests: 0,
      userAgent: 'DataScraper/1.0 (+mailto:operator@example.com)',
    });

    expect(html).toBe('<html>ok</html>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({
          'User-Agent': 'DataScraper/1.0 (+mailto:operator@example.com)',
        }),
      })
    );
  });

  it('5xxを上限内で再試行する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('temporary', { status: 503 }))
      .mockResolvedValueOnce(new Response('recovered', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchHtml('https://example.com', {
        timeout: 1_000,
        retryCount: 1,
        retryBaseDelay: 0,
        delayBetweenRequests: 0,
      })
    ).resolves.toBe('recovered');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('404は再試行しない', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('missing', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchHtml('https://example.com/missing', {
        timeout: 1_000,
        retryCount: 3,
        retryBaseDelay: 0,
        delayBetweenRequests: 0,
      })
    ).rejects.toThrow('404');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('指定時間を超えた要求をAbortする', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = fetchHtml('https://example.com/slow', {
      timeout: 50,
      retryCount: 0,
      delayBetweenRequests: 0,
    });
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
