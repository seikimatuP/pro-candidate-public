import React from 'react';
import { useTheme } from '@mui/material';
import { useLazyGetUniversityPlayersQuery } from '../store/apiSlice';
import { useSemanticColors } from '../contexts/ThemeContext';
import { PlayerListPage } from './PlayerListPage';
import type { PlayerListPageConfig } from './PlayerListPage';

export const UniversityPlayers: React.FC = () => {
  const theme = useTheme();
  const semantic = useSemanticColors();
  const [triggerFetch] = useLazyGetUniversityPlayersQuery();

  const config: PlayerListPageConfig = React.useMemo(
    () => ({
      fetchPlayers: async (year: number) => triggerFetch(year).unwrap(),
      title: '大学生選手一覧',
      subtitle: 'プロ野球志望届を提出した大学生選手の詳細データ',
      emptyDataLabel: '大学生選手',
      schoolLabel: '大学数',
      logLabel: '大学生',
      titleIconColor: 'secondary.main',
      trendIconColor: 'secondary.main',
      statColors: {
        total: semantic.university,
        schools: theme.palette.secondary.main,
        topPrefecture: theme.palette.primary.main,
      },
      statTints: {
        total: semantic.tint.university,
        schools: semantic.tint.total,
        topPrefecture: semantic.tint.highschool,
      },
      trendField: 'universityCount',
    }),
    [
      triggerFetch,
      theme.palette.primary.main,
      theme.palette.secondary.main,
      semantic.university,
      semantic.tint.university,
      semantic.tint.total,
      semantic.tint.highschool,
    ]
  );

  return <PlayerListPage config={config} />;
};
