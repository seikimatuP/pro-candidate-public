import React from 'react';
import { useTheme } from '@mui/material';
import { useLazyGetHighschoolPlayersQuery } from '../store/apiSlice';
import { useSemanticColors } from '../contexts/ThemeContext';
import { PlayerListPage } from './PlayerListPage';
import type { PlayerListPageConfig } from './PlayerListPage';

export const HighschoolPlayers: React.FC = () => {
  const theme = useTheme();
  const semantic = useSemanticColors();
  const [triggerFetch] = useLazyGetHighschoolPlayersQuery();

  const config: PlayerListPageConfig = React.useMemo(
    () => ({
      fetchPlayers: async (year: number) => triggerFetch(year).unwrap(),
      title: '高校生選手一覧',
      subtitle: 'プロ野球志望届を提出した高校生選手の詳細データ',
      emptyDataLabel: '高校生選手',
      schoolLabel: '学校数',
      logLabel: '高校生',
      titleIconColor: 'primary.main',
      trendIconColor: 'primary.main',
      statColors: {
        total: semantic.highschool,
        schools: theme.palette.primary.main,
        topPrefecture: semantic.university,
      },
      statTints: {
        total: semantic.tint.highschool,
        schools: semantic.tint.total,
        topPrefecture: semantic.tint.university,
      },
      trendField: 'highschoolCount',
    }),
    [
      triggerFetch,
      theme.palette.primary.main,
      semantic.highschool,
      semantic.university,
      semantic.tint.highschool,
      semantic.tint.total,
      semantic.tint.university,
    ]
  );

  return <PlayerListPage config={config} />;
};
