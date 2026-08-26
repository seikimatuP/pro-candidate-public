import { useState, useEffect } from 'react';
import {
  useLazyGetHighschoolPlayersQuery,
  useLazyGetUniversityPlayersQuery,
} from '../../../store/apiSlice';
import type { PlayerData } from '../../../types/player';
import { log as logger } from '../../../utils/logger';

export const useSchoolStatisticsData = () => {
  const [triggerHighschool] = useLazyGetHighschoolPlayersQuery();
  const [triggerUniversity] = useLazyGetUniversityPlayersQuery();
  const [playersData, setPlayersData] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [highschoolPlayers, universityPlayers] = await Promise.all([
          triggerHighschool().unwrap(),
          triggerUniversity().unwrap(),
        ]);

        const allPlayers = [...highschoolPlayers.data, ...universityPlayers.data];
        setPlayersData(allPlayers);

        logger.debug('School statistics data loaded:', {
          total: allPlayers.length,
          highschool: highschoolPlayers.data.length,
          university: universityPlayers.data.length,
        });
      } catch (err) {
        logger.error('Failed to load school statistics data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`データの取得に失敗しました: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [triggerHighschool, triggerUniversity]);

  return { playersData, loading, error };
};
