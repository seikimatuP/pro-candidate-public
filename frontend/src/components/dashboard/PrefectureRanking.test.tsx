import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrefectureRanking } from './PrefectureRanking';
import type { PlayerData } from '../../types/player';

describe('PrefectureRanking', () => {
  const mockPlayers: PlayerData[] = [
    { id: '1', name: 'Player 1', prefecture: 'Tokyo', school: 'School A', grade: '3', position: 'P' },
    { id: '2', name: 'Player 2', prefecture: 'Tokyo', school: 'School B', grade: '2', position: 'C' },
    { id: '3', name: 'Player 3', prefecture: 'Osaka', school: 'School C', grade: '3', position: '1B' },
    { id: '4', name: 'Player 4', prefecture: 'Kanagawa', school: 'School D', grade: '1', position: '2B' },
    { id: '5', name: 'Player 5', prefecture: 'Tokyo', school: 'School E', grade: '3', position: '3B' },
    { id: '6', name: 'Player 6', prefecture: 'Osaka', school: 'School F', grade: '2', position: 'SS' },
    { id: '7', name: 'Player 7', prefecture: 'Hokkaido', school: 'School G', grade: '3', position: 'LF' },
    { id: '8', name: 'Player 8', prefecture: 'Aichi', school: 'School H', grade: '2', position: 'CF' },
    { id: '9', name: 'Player 9', prefecture: 'Fukuoka', school: 'School I', grade: '1', position: 'RF' },
    { id: '10', name: 'Player 10', prefecture: 'Hyogo', school: 'School J', grade: '3', position: 'P' },
  ];

  it('renders correctly with empty data', () => {
    render(<PrefectureRanking players={[]} />);
    expect(screen.getByText('都道府県別ランキング')).toBeInTheDocument();
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('calculates and renders ranking correctly', () => {
    render(<PrefectureRanking players={mockPlayers} />);

    // Tokyo: 3, Osaka: 2, Others: 1
    // Top 5 should be displayed
    
    // Check Tokyo (1st)
    expect(screen.getByText('1. Tokyo')).toBeInTheDocument();
    expect(screen.getByText('3名')).toBeInTheDocument();

    // Check Osaka (2nd)
    expect(screen.getByText('2. Osaka')).toBeInTheDocument();
    expect(screen.getByText('2名')).toBeInTheDocument();

    // Check others (order might vary for same count, but usually stable sort or insertion order)
    // Kanagawa, Hokkaido, Aichi, Fukuoka, Hyogo have 1 each.
    // Logic uses Object.entries which might not guarantee order for same values, but usually it's fine.
    // We just check if 5 items are rendered.
    
    const listItems = screen.getAllByText(/\d+\. .+/);
    expect(listItems).toHaveLength(5);
  });

  it('handles players without prefecture', () => {
    const playersWithMissingPrefecture = [
      ...mockPlayers,
      { id: '11', name: 'No Pref', school: 'Unknown', grade: '1', position: 'P' } as PlayerData,
    ];
    render(<PrefectureRanking players={playersWithMissingPrefecture} />);
    
    // Should ignore missing prefecture
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    expect(screen.getByText('1. Tokyo')).toBeInTheDocument();
  });

  it('renders progress bars with correct values', () => {
    render(<PrefectureRanking players={mockPlayers} />);
    
    // Max is 3 (Tokyo). Tokyo bar should be 100%.
    // Osaka is 2. Bar should be 66.6%.
    
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(5);
    
    // First bar (Tokyo)
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '100');
    
    // Second bar (Osaka)
    // 2/3 * 100 = 66.666... （MUI v9からaria-valuenowは丸められず生の値になる）
    const val2 = Number(progressBars[1].getAttribute('aria-valuenow'));
    expect(val2).toBeCloseTo(66.67, 1);
  });
});
