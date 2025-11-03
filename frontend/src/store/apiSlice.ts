import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_CONFIG } from '../config/api';
import type { PlayersResponse, HealthResponse, SchoolsResponse } from '../types/player';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
  }),
  tagTypes: ['Player', 'School', 'Health'],
  endpoints: (builder) => ({
    // ヘルスチェック
    getHealth: builder.query<HealthResponse, void>({
      query: () => API_CONFIG.ENDPOINTS.HEALTH,
      providesTags: ['Health'],
    }),

    // 選手データ取得
    getPlayers: builder.query<PlayersResponse, void>({
      query: () => API_CONFIG.ENDPOINTS.PLAYERS,
      providesTags: ['Player'],
      // 5分間キャッシュ
      keepUnusedDataFor: 300,
    }),

    // 学校データ取得
    getSchools: builder.query<SchoolsResponse, void>({
      query: () => API_CONFIG.ENDPOINTS.SCHOOLS,
      providesTags: ['School'],
      keepUnusedDataFor: 600, // 10分間キャッシュ
    }),
  }),
});

// 自動生成されたフック
export const {
  useGetHealthQuery,
  useGetPlayersQuery,
  useGetSchoolsQuery,
} = apiSlice;