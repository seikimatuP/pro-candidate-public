import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RecentPlayers } from './RecentPlayers';
import type { PlayerData } from '../../types/player';

// React Router のナビゲーションをモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// モックデータ
const createMockPlayer = (id: number, type: 'highschool' | 'university'): PlayerData => ({
  id: `${type}-2024-${String(id).padStart(3, '0')}`,
  name: `選手${id}`,
  school: `テスト${type === 'highschool' ? '高校' : '大学'}${id}`,
  type,
  prefecture: type === 'highschool' ? '東京都' : undefined,
  region: type === 'university' ? '関東' : undefined,
  filingDate: `2024-11-${String(id).padStart(2, '0')}`,
  year: 2024,
});

const mockPlayers: PlayerData[] = [
  createMockPlayer(1, 'highschool'),
  createMockPlayer(2, 'university'),
  createMockPlayer(3, 'highschool'),
  createMockPlayer(4, 'university'),
  createMockPlayer(5, 'highschool'),
  createMockPlayer(6, 'university'), // 6番目は表示されない（最新5件のみ）
  createMockPlayer(7, 'highschool'),
];

// テスト用のラッパーコンポーネント
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('RecentPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的な表示', () => {
    test('最新5件の選手が表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      // 最初の5件が表示される
      expect(screen.getByText('選手1')).toBeInTheDocument();
      expect(screen.getByText('選手2')).toBeInTheDocument();
      expect(screen.getByText('選手3')).toBeInTheDocument();
      expect(screen.getByText('選手4')).toBeInTheDocument();
      expect(screen.getByText('選手5')).toBeInTheDocument();

      // 6件目以降は表示されない
      expect(screen.queryByText('選手6')).not.toBeInTheDocument();
      expect(screen.queryByText('選手7')).not.toBeInTheDocument();
    });

    test('タイトル「最新の登録選手」が表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      expect(screen.getByText('最新の登録選手')).toBeInTheDocument();
    });

    test('学校名が正しく表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      expect(screen.getByText(/テスト高校1/)).toBeInTheDocument();
      expect(screen.getByText(/テスト大学2/)).toBeInTheDocument();
    });

    test('都道府県が高校選手に表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      // 高校選手には都道府県が表示される
      const tokyoPrefectures = screen.getAllByText(/東京都/);
      expect(tokyoPrefectures.length).toBeGreaterThan(0);
    });
  });

  describe('選手の区分表示', () => {
    test('高校・大学の区分チップが正しく表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      // 最初の5件のうち、高校3件、大学2件
      const highschoolChips = screen.getAllByText('高校');
      const universityChips = screen.getAllByText('大学');

      expect(highschoolChips).toHaveLength(3);
      expect(universityChips).toHaveLength(2);
    });
  });

  describe('登録日の表示', () => {
    test('登録日が日本語フォーマットで表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      // 日本語の日付フォーマット (YYYY/M/D 登録)
      expect(screen.getByText(/2024\/11\/1 登録/)).toBeInTheDocument();
      expect(screen.getByText(/2024\/11\/2 登録/)).toBeInTheDocument();
      // 高校選手には都道府県が表示される
      const tokyoPrefectures = screen.getAllByText(/東京都/);
      expect(tokyoPrefectures.length).toBeGreaterThan(0);
    });
  });

  describe('ローディング状態', () => {
    test('ローディング状態で「Loading...」が表示される', () => {
      renderWithRouter(<RecentPlayers players={[]} loading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('ローディング中は選手リストが表示されない', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} loading={true} />);

      expect(screen.queryByText('選手1')).not.toBeInTheDocument();
      expect(screen.queryByText('選手2')).not.toBeInTheDocument();
    });
  });

  describe('空データの処理', () => {
    test('データが空の場合に「データがありません」が表示される', () => {
      renderWithRouter(<RecentPlayers players={[]} />);

      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });

    test('空データの場合、選手リストは表示されない', () => {
      renderWithRouter(<RecentPlayers players={[]} />);

      expect(screen.queryByText('選手1')).not.toBeInTheDocument();
    });
  });

  describe('ナビゲーション', () => {
    test('高校選手をクリックすると高校選手ページに遷移する', async () => {
      const user = userEvent.setup();
      const highschoolPlayer = createMockPlayer(1, 'highschool');

      renderWithRouter(<RecentPlayers players={[highschoolPlayer]} />);

      // 選手アイテムをクリック
      const playerItem = screen.getByText('選手1').closest('li');
      await user.click(playerItem!);

      // 高校選手ページへのナビゲーションが呼ばれる
      expect(mockNavigate).toHaveBeenCalledWith('/highschool-players');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    test('大学選手をクリックすると大学選手ページに遷移する', async () => {
      const user = userEvent.setup();
      const universityPlayer = createMockPlayer(1, 'university');

      renderWithRouter(<RecentPlayers players={[universityPlayer]} />);

      // 選手アイテムをクリック
      const playerItem = screen.getByText('選手1').closest('li');
      await user.click(playerItem!);

      // 大学選手ページへのナビゲーションが呼ばれる
      expect(mockNavigate).toHaveBeenCalledWith('/university-players');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    test('複数の選手をクリックすると、それぞれ正しいページに遷移する', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      // 1番目の選手（高校）をクリック
      const player1 = screen.getByText('選手1').closest('li');
      await user.click(player1!);
      expect(mockNavigate).toHaveBeenLastCalledWith('/highschool-players');

      // 2番目の選手（大学）をクリック
      const player2 = screen.getByText('選手2').closest('li');
      await user.click(player2!);
      expect(mockNavigate).toHaveBeenLastCalledWith('/university-players');

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('アクセシビリティ', () => {
    test('選手アイテムにカーソルポインターが設定される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      const playerItem = screen.getByText('選手1').closest('li');
      
      // スタイルにcursor: pointerが設定されている
      expect(playerItem).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('エッジケース', () => {
    test('6件以上のデータがある場合、5件のみ表示される', () => {
      renderWithRouter(<RecentPlayers players={mockPlayers} />);

      // ListItemにrole="button"が設定されているため、buttonロールで検索
      expect(screen.getAllByRole('button')).toHaveLength(5);
    });

    test('3件のデータの場合、3件のみ表示される', () => {
      const threePlayers = mockPlayers.slice(0, 3);
      renderWithRouter(<RecentPlayers players={threePlayers} />);

      expect(screen.getAllByRole('button')).toHaveLength(3);
      expect(screen.getByText('選手1')).toBeInTheDocument();
      expect(screen.getByText('選手2')).toBeInTheDocument();
      expect(screen.getByText('選手3')).toBeInTheDocument();
    });

    test('1件のデータの場合、1件のみ表示される', () => {
      const onePlayer = [mockPlayers[0]];
      renderWithRouter(<RecentPlayers players={onePlayer} />);

      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.getByText('選手1')).toBeInTheDocument();
    });
  });
});
