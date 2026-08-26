import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useScrapingHistory } from './useScrapingHistory';
import { apiSlice } from '../store/apiSlice';

const mockHistoryData = {
  data: [
    {
      id: '2024-01-01T10:00:00Z_highschool',
      timestamp: '2024-01-01T10:00:00Z',
      type: 'highschool',
      environment: 'prod',
      duration: 5000,
      year: 2024,
      results: {
        highschool: { currentCount: 100, previousCount: 95, difference: 5 },
      },
      summary: { totalCurrent: 100, totalPrevious: 95, totalDifference: 5 },
      triggeredBy: 'manual',
    },
    {
      id: '2024-01-02T08:00:00Z_both',
      timestamp: '2024-01-02T08:00:00Z',
      type: 'both',
      environment: 'dev',
      duration: 8000,
      year: 2024,
      results: {
        highschool: { currentCount: 105, previousCount: 100, difference: 5 },
        university: { currentCount: 210, previousCount: 200, difference: 10 },
      },
      summary: { totalCurrent: 315, totalPrevious: 300, totalDifference: 15 },
      triggeredBy: 'scheduled',
    },
  ],
  metadata: {
    total: 2,
    offset: 0,
    limit: 10,
  },
};

vi.mock('../config/apiConfig', () => ({
  apiConfig: {
    baseURL: 'https://api.example.com/dev',
  },
}));

vi.mock('../store/apiSlice', async importOriginal => {
  const actual = await importOriginal<typeof import('../store/apiSlice')>();
  return {
    ...actual,
    useLazyGetScrapingHistoryQuery: () => [
      vi.fn(() => ({ unwrap: () => Promise.resolve(mockHistoryData) })),
    ],
  };
});

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const createWrapper = () => {
  const store = configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(apiSlice.middleware),
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useScrapingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load history data on mount', async () => {
    const { result } = renderHook(() => useScrapingHistory(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.historyData.length).toBeGreaterThan(0);
  });

  it('should detect current environment correctly', async () => {
    const { result } = renderHook(() => useScrapingHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentEnvironment).toBe('dev');
  });

  it('should handle pagination', async () => {
    const { result } = renderHook(() => useScrapingHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.page).toBe(0);
    expect(result.current.rowsPerPage).toBe(10);

    act(() => {
      result.current.handlePageChange(null, 1);
    });
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.handleRowsPerPageChange({
        target: { value: '25' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.rowsPerPage).toBe(25);
    expect(result.current.page).toBe(0);
  });

  it('should handle type filter change', async () => {
    const { result } = renderHook(() => useScrapingHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.typeFilter).toBe('all');

    act(() => {
      result.current.handleTypeFilterChange({} as React.MouseEvent<HTMLElement>, 'highschool');
    });

    expect(result.current.typeFilter).toBe('highschool');
  });

  it('should handle year filter change', async () => {
    const { result } = renderHook(() => useScrapingHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.yearFilter).toBe('all');

    act(() => {
      result.current.handleYearFilterChange({
        target: { value: 2024 },
      });
    });

    expect(result.current.yearFilter).toBe(2024);
  });

  it('should reload data when loadHistoryData is called', async () => {
    const { result } = renderHook(() => useScrapingHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.loadHistoryData();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
