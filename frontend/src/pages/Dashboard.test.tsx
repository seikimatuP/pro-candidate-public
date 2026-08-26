import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Dashboard } from './Dashboard';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../store/apiSlice';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockStatistics = {
  success: true,
  data: {
    year: 2024,
    totalPlayers: 3,
    byType: { highschool: 2, university: 1 },
    byYear: { 2024: 3 },
    byPosition: {},
    byPrefecture: { 東京: 2, 大阪: 1 },
    unresolvedPrefectureCount: 0,
    // 10/3・10/4 は届出が無い日。日次グラフのゼロ埋めを検証するために間隔を空けている
    byDate: {
      '2024-10-01': { highschool: 1, university: 0 },
      '2024-10-02': { highschool: 0, university: 1 },
      '2024-10-05': { highschool: 1, university: 0 },
    },
    lastUpdated: '2026-08-17T03:51:36.941Z',
  },
};

const mockRefetch = vi.fn();

vi.mock('../store/apiSlice', async importOriginal => {
  const actual = await importOriginal<typeof import('../store/apiSlice')>();
  return {
    ...actual,
    useGetStatisticsQuery: vi.fn(() => ({
      data: mockStatistics,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    })),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createStore = () =>
    configureStore({
      reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(apiSlice.middleware),
    });

  const renderDashboard = () => {
    return render(
      <Provider store={createStore()}>
        <ThemeProvider>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders correctly and displays data', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('プロ野球志望届')).toBeInTheDocument();
    });

    expect(screen.getByText('総提出者数')).toBeInTheDocument();
    expect(screen.getByText('ドラフト候補選手の届出状況')).toBeInTheDocument();
  });

  it('calculates and displays correct statistics', async () => {
    renderDashboard();

    await waitFor(() => {
      // 指標タイルの見出しと推移グラフの凡例で「高校生」「大学生」が現れる
      expect(screen.getAllByText('高校生').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('大学生').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('総提出者数')).toBeInTheDocument();
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    // 全体に占める割合を実数と併記する
    expect(screen.getByText('全体の67%')).toBeInTheDocument();
    expect(screen.getByText('全体の33%')).toBeInTheDocument();
  });

  it('renders the prefecture bar chart with counts and shares', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('都道府県・地区別の提出者数')).toBeInTheDocument();
    });

    // ドーナツとランキングの二重掲載をやめ、横棒1枚に統合している
    expect(screen.queryByTestId('doughnut-chart')).not.toBeInTheDocument();
    expect(screen.getByText('東京')).toBeInTheDocument();
    expect(screen.getByText('大阪')).toBeInTheDocument();
    // 実数と構成比を併記する（色だけに依存しない）
    expect(screen.getAllByText(/名 \d+\.\d+%/).length).toBe(2);
  });

  it('does not expose links to individual player lists on the public dashboard', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('総提出者数')).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /高校生一覧/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /大学生一覧/ })).not.toBeInTheDocument();
  });

  it('renders highschool vs university ratio bar', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('高校生・大学生の内訳')).toBeInTheDocument();
    });

    // 凡例は実数、色面の中には構成比を併記する
    expect(screen.getByText('高校生 2名')).toBeInTheDocument();
    expect(screen.getByText('大学生 1名')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('総提出者数')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /データを更新/i });
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders hero meta (recent delta and latest filing date)', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('最新7日間')).toBeInTheDocument();
    });

    expect(screen.getByText('最新届出日')).toBeInTheDocument();
  });

  it('displays the year returned by the API instead of the current year', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('2024年度')).toBeInTheDocument();
    });

    // 実行時の年（API の集計対象年度と一致しない）は表示しない
    const currentYear = new Date().getFullYear();
    if (currentYear !== 2024) {
      expect(screen.queryByText(`${currentYear}年度`)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/集計対象: 2024年度/)).toBeInTheDocument();
  });

  it('fills days without filings as zero bars', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/最新届出日までの/)).toBeInTheDocument();
    });

    // 届出は 10/1・10/2・10/5 の3日だが、届出の無い 10/3・10/4 も0として並べる
    expect(screen.getByText('最新届出日までの5日間（届出の無い日は0本）')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '10/3 合計0名（高校生0名・大学生0名）' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '10/5 合計1名（高校生1名・大学生0名）' })
    ).toBeInTheDocument();
  });

  it('shows an error alert and no figures when the request fails', async () => {
    const { useGetStatisticsQuery } = await import('../store/apiSlice');
    vi.mocked(useGetStatisticsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useGetStatisticsQuery>);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/データを取得できませんでした/)).toBeInTheDocument();
    // 取得失敗時は「0名」を表示しない
    expect(screen.queryByText('総提出者数')).not.toBeInTheDocument();
    expect(screen.queryByText('高校生')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('handles empty data gracefully', async () => {
    const { useGetStatisticsQuery } = await import('../store/apiSlice');
    vi.mocked(useGetStatisticsQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          year: 2024,
          totalPlayers: 0,
          byType: { highschool: 0, university: 0 },
          byYear: { 2024: 0 },
          byPosition: {},
          byPrefecture: {},
          unresolvedPrefectureCount: 0,
          byDate: {},
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetStatisticsQuery>);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('総提出者数')).toBeInTheDocument();
    });

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});
