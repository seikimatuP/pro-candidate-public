import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_CONFIG } from '../config/api';
import { getEnv } from '../utils/env-helper';
import type {
  PlayersResponse,
  HealthResponse,
  SchoolsResponse,
  ScrapingHistoryResponse,
  PlayerData,
  StatisticsResponse,
} from '../types/player';

const getUseProductionData = () => getEnv().VITE_USE_PRODUCTION_DATA === 'true';

interface PlayersByTypeResponse {
  data: PlayerData[];
  metadata?: { message?: string; [key: string]: unknown };
}

interface AvailableYearsResponse {
  years: number[];
  defaultYear: number;
  currentYear: number;
  latestYear: number;
  existingYears: number[];
}

interface ScrapingTriggerResponse {
  success: boolean;
  message: string;
}

interface ScrapingHistoryParams {
  environment?: 'dev' | 'prod';
  limit?: number;
  offset?: number;
}

/**
 * 選手一覧APIの1回あたりの取得件数。API側の上限（500件）に合わせる。
 *
 * API は一括で全件を返さなくなった（#L7）ため、画面が必要とする全件は
 * ここで順にページを辿って組み立てる。
 */
const PLAYERS_PAGE_SIZE = 500;

/** 応答が壊れていたときに無限ループしないための取得ページ数の上限 */
const PLAYERS_MAX_PAGES = 40;

/**
 * 選手一覧APIを最終ページまで辿り、1つのレスポンスにまとめる。
 *
 * 返す metadata は最終ページのものを土台に、件数系だけを合計で上書きする。
 */
type PlayersPageResult = { data?: unknown; error?: FetchBaseQueryError };

/** RTK Query が queryFn へ渡す baseQuery（同期・非同期どちらも返しうる）を受ける形 */
type PlayersPageFetcher = (url: string) => PlayersPageResult | PromiseLike<PlayersPageResult>;

async function fetchAllPlayerPages(
  fetchPage: PlayersPageFetcher,
  path: string
): Promise<{ data: PlayersResponse } | { error: FetchBaseQueryError }> {
  const separator = path.includes('?') ? '&' : '?';
  const all: PlayerData[] = [];
  let metadata: PlayersResponse['metadata'] = {};
  let offset = 0;

  for (let page = 0; page < PLAYERS_MAX_PAGES; page++) {
    const result = await fetchPage(
      `${path}${separator}limit=${PLAYERS_PAGE_SIZE}&offset=${offset}`
    );
    if (result.error) return { error: result.error };

    const response = result.data as PlayersResponse;
    const items = response.data || [];
    all.push(...items);
    metadata = response.metadata || {};

    if (!metadata.hasMore || items.length === 0) break;
    offset += items.length;
  }

  return {
    data: {
      success: true,
      data: all,
      metadata: { ...metadata, total: all.length, offset: 0, limit: all.length, hasMore: false },
      count: all.length,
    },
  };
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    prepareHeaders: async headers => {
      try {
        const { tokens } = await fetchAuthSession();
        const idToken = tokens?.idToken?.toString();
        if (idToken) {
          headers.set('Authorization', `Bearer ${idToken}`);
        }
      } catch {
        // 未認証状態では認証ヘッダーを付与しない
      }
      return headers;
    },
  }),
  tagTypes: ['Player', 'School', 'Health', 'ScrapingHistory', 'Statistics'],
  endpoints: builder => ({
    getHealth: builder.query<HealthResponse, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          return {
            data: {
              status: 'healthy',
              message: 'ローカル環境（モックデータ）',
              timestamp: new Date().toISOString(),
              version: '1.0.0-local',
            } as HealthResponse,
          };
        }
        const result = await baseQuery(API_CONFIG.ENDPOINTS.HEALTH);
        if (result.error) return { error: result.error };
        return { data: result.data as HealthResponse };
      },
      providesTags: ['Health'],
    }),

    getPlayers: builder.query<PlayersResponse, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          return {
            data: {
              success: true,
              data: [],
              metadata: { total: 0, source: 'mock', message: 'ローカル環境用モックデータ' },
              count: 0,
            } as PlayersResponse,
          };
        }
        return fetchAllPlayerPages(baseQuery, API_CONFIG.ENDPOINTS.PLAYERS);
      },
      providesTags: ['Player'],
      keepUnusedDataFor: 300,
    }),

    getStatistics: builder.query<StatisticsResponse, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          const year = new Date().getFullYear() - 1;
          return {
            data: {
              success: true,
              data: {
                year,
                totalPlayers: 0,
                byType: { highschool: 0, university: 0 },
                byYear: { [year]: 0 },
                byPosition: {},
                byPrefecture: {},
                unresolvedPrefectureCount: 0,
                byDate: {},
              },
            },
          };
        }
        const result = await baseQuery(API_CONFIG.ENDPOINTS.STATISTICS);
        if (result.error) return { error: result.error };
        return { data: result.data as StatisticsResponse };
      },
      providesTags: ['Statistics'],
      keepUnusedDataFor: 300,
    }),

    getHighschoolPlayers: builder.query<PlayersByTypeResponse, number | void>({
      queryFn: async (year, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          return { data: { data: [], metadata: { message: 'モックデータモードです' } } };
        }
        const result = await fetchAllPlayerPages(
          baseQuery,
          `${API_CONFIG.ENDPOINTS.PLAYERS}?type=highschool&year=${year || 2024}`
        );
        if ('error' in result) return { error: result.error };
        return { data: { data: result.data.data || [], metadata: result.data.metadata } };
      },
      providesTags: ['Player'],
      keepUnusedDataFor: 300,
    }),

    getUniversityPlayers: builder.query<PlayersByTypeResponse, number | void>({
      queryFn: async (year, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          return { data: { data: [], metadata: { message: 'モックデータモードです' } } };
        }
        const result = await fetchAllPlayerPages(
          baseQuery,
          `${API_CONFIG.ENDPOINTS.PLAYERS}?type=university&year=${year || 2024}`
        );
        if ('error' in result) return { error: result.error };
        return { data: { data: result.data.data || [], metadata: result.data.metadata } };
      },
      providesTags: ['Player'],
      keepUnusedDataFor: 300,
    }),

    getSchools: builder.query<SchoolsResponse, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          return {
            data: {
              success: true,
              data: [],
              metadata: { total: 0, source: 'mock', message: 'ローカル環境用モック学校データ' },
            } as SchoolsResponse,
          };
        }
        const result = await baseQuery(API_CONFIG.ENDPOINTS.SCHOOLS);
        if (result.error) return { error: result.error };
        return { data: result.data as SchoolsResponse };
      },
      providesTags: ['School'],
      keepUnusedDataFor: 600,
    }),

    getAvailableYears: builder.query<AvailableYearsResponse, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          const currentYear = new Date().getFullYear();
          const lastYear = currentYear - 1;
          const years = [];
          for (let year = lastYear; year >= 2024; year--) {
            years.push(year);
          }
          return {
            data: {
              years,
              defaultYear: lastYear,
              currentYear,
              latestYear: lastYear,
              existingYears: [],
            },
          };
        }
        const result = await baseQuery('/years/available');
        if (result.error) {
          const currentYear = new Date().getFullYear();
          const lastYear = currentYear - 1;
          const years = [];
          for (let year = lastYear; year >= 2024; year--) {
            years.push(year);
          }
          return {
            data: {
              years,
              defaultYear: lastYear,
              currentYear,
              latestYear: lastYear,
              existingYears: [],
            },
          };
        }
        return { data: (result.data as { data: AvailableYearsResponse }).data };
      },
    }),

    triggerScraping: builder.mutation<
      ScrapingTriggerResponse,
      { dataType?: 'highschool' | 'university' | 'both'; year?: number }
    >({
      queryFn: async (arg, _api, _extra, baseQuery) => {
        if (!getUseProductionData()) {
          return {
            data: {
              success: false,
              message: 'スクレイピングはモックモードでは利用できません',
            },
          };
        }
        const result = await baseQuery({
          url: '/scraping/trigger',
          method: 'POST',
          body: { type: arg.dataType || 'both', year: arg.year || new Date().getFullYear() },
        });
        if (result.error) return { error: result.error };
        return { data: result.data as ScrapingTriggerResponse };
      },
      invalidatesTags: ['Player', 'ScrapingHistory', 'Statistics'],
    }),

    getScrapingHistory: builder.query<ScrapingHistoryResponse, ScrapingHistoryParams | void>({
      queryFn: async (params, _api, _extra, baseQuery) => {
        const environment = params?.environment || 'dev';
        const limit = params?.limit || 50;
        const offset = params?.offset || 0;
        if (!getUseProductionData()) {
          return {
            data: {
              success: true,
              data: [],
              metadata: {
                environment: environment as 'dev' | 'prod',
                total: 0,
                limit,
                offset,
                hasMore: false,
                currentCount: 0,
              },
              message: 'スクレイピング履歴はモックモードでは利用できません',
            },
          };
        }
        const result = await baseQuery(
          `/scraping/history?environment=${environment}&limit=${limit}&offset=${offset}`
        );
        if (result.error) return { error: result.error };
        return { data: result.data as ScrapingHistoryResponse };
      },
      providesTags: ['ScrapingHistory'],
    }),
  }),
});

export const {
  useGetHealthQuery,
  useLazyGetHealthQuery,
  useGetPlayersQuery,
  useGetStatisticsQuery,
  useLazyGetPlayersQuery,
  useGetHighschoolPlayersQuery,
  useLazyGetHighschoolPlayersQuery,
  useGetUniversityPlayersQuery,
  useLazyGetUniversityPlayersQuery,
  useGetSchoolsQuery,
  useLazyGetSchoolsQuery,
  useGetAvailableYearsQuery,
  useLazyGetAvailableYearsQuery,
  useTriggerScrapingMutation,
  useGetScrapingHistoryQuery,
  useLazyGetScrapingHistoryQuery,
} = apiSlice;
