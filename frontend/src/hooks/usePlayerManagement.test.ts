import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePlayerManagement } from './usePlayerManagement';
import { apiSlice } from '../store/apiSlice';

const mockHighschoolData = {
  data: [
    {
      id: 'highschool_1',
      name: '田中太郎',
      school: '東京高校',
      type: 'highschool',
      prefecture: '東京都',
    },
    {
      id: 'highschool_2',
      name: '山田次郎',
      school: '大阪高校',
      type: 'highschool',
      prefecture: '大阪府',
    },
  ],
};

const mockUniversityData = {
  data: [
    {
      id: 'university_1',
      name: '佐藤三郎',
      school: '東京大学',
      type: 'university',
      region: '関東',
    },
    {
      id: 'university_2',
      name: '鈴木四郎',
      school: '京都大学',
      type: 'university',
      region: '関西',
    },
  ],
};

vi.mock('../config/apiConfig', () => ({
  apiConfig: {
    useProductionData: true,
    baseURL: 'https://api.example.com/dev',
  },
}));

vi.mock('../store/apiSlice', async importOriginal => {
  const actual = await importOriginal<typeof import('../store/apiSlice')>();
  return {
    ...actual,
    useLazyGetHighschoolPlayersQuery: () => [
      vi.fn(() => ({ unwrap: () => Promise.resolve(mockHighschoolData) })),
    ],
    useLazyGetUniversityPlayersQuery: () => [
      vi.fn(() => ({ unwrap: () => Promise.resolve(mockUniversityData) })),
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

describe('usePlayerManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load players on mount', async () => {
    const { result } = renderHook(() => usePlayerManagement(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.players.length).toBe(4);
  });

  it('should calculate stats correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats.total).toBe(4);
    expect(result.current.stats.highschool).toBe(2);
    expect(result.current.stats.university).toBe(2);
    expect(result.current.stats.schools).toBe(4);
  });

  it('should filter players by search', async () => {
    const { result } = renderHook(() => usePlayerManagement(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleFilterChange('search', '田中');
    });

    expect(result.current.filteredPlayers.length).toBe(1);
    expect(result.current.filteredPlayers[0].name).toBe('田中太郎');
  });

  it('should filter players by type', async () => {
    const { result } = renderHook(() => usePlayerManagement(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleFilterChange('type', 'highschool');
    });

    expect(result.current.filteredPlayers.length).toBe(2);
    expect(result.current.filteredPlayers.every(p => p.type === 'highschool')).toBe(true);
  });

  it('should handle pagination', async () => {
    const { result } = renderHook(() => usePlayerManagement(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleChangePage(null, 2);
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.handleChangeRowsPerPage({
        target: { value: '25' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.rowsPerPage).toBe(25);
    expect(result.current.page).toBe(0);
  });

  it('should handle player click to open dialog', async () => {
    const { result } = renderHook(() => usePlayerManagement(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const player = result.current.players[0];
    act(() => {
      result.current.handlePlayerClick(player);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.selectedPlayer).toBe(player);
  });
});
