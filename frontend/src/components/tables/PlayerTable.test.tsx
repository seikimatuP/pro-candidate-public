import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerTable } from './PlayerTable';
import type { PlayerData } from '../../types/player';

// useAuth フックのモック
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';

// モックデータ
const mockPlayers: PlayerData[] = [
  {
    id: 'highschool-2024-001',
    name: '山田太郎',
    school: 'テスト高校',
    type: 'highschool',
    prefecture: '東京都',
    filingDate: '2024-11-01',
    year: 2024,
  },
  {
    id: 'highschool-2024-002',
    name: '佐藤次郎',
    school: 'サンプル高校',
    type: 'highschool',
    prefecture: '大阪府',
    filingDate: '2024-11-02',
    year: 2024,
  },
  {
    id: 'university-2024-001',
    name: '田中三郎',
    school: 'テスト大学',
    type: 'university',
    region: '関東',
    filingDate: '2024-11-03',
    year: 2024,
  },
];

describe('PlayerTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトは一般ユーザー
    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'testuser', groups: [] },
      loading: false,
      isAuthenticated: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  describe('基本的な表示', () => {
    test('プレイヤーリストが正しく表示される', () => {
      render(<PlayerTable players={mockPlayers} />);

      // 各プレイヤーの名前が表示されているか
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
      expect(screen.getByText('田中三郎')).toBeInTheDocument();

      // 学校名が表示されているか
      expect(screen.getByText('テスト高校')).toBeInTheDocument();
      expect(screen.getByText('サンプル高校')).toBeInTheDocument();
      expect(screen.getByText('テスト大学')).toBeInTheDocument();
    });

    test('タイトルが正しく表示される', () => {
      render(<PlayerTable players={mockPlayers} title="選手一覧" />);

      expect(screen.getByText('選手一覧')).toBeInTheDocument();
    });

    test('高校・大学の区分チップが正しく表示される', () => {
      render(<PlayerTable players={mockPlayers} />);

      // 高校チップが2つ、大学チップが1つ表示される
      const highschoolChips = screen.getAllByText('高校');
      const universityChips = screen.getAllByText('大学');

      expect(highschoolChips).toHaveLength(2);
      expect(universityChips).toHaveLength(1);
    });

    test('都道府県・地域が正しく表示される', () => {
      render(<PlayerTable players={mockPlayers} />);

      expect(screen.getByText('東京都')).toBeInTheDocument();
      expect(screen.getByText('大阪府')).toBeInTheDocument();
      expect(screen.getByText('関東')).toBeInTheDocument();
    });

    test('登録日が日本語フォーマットで表示される', () => {
      render(<PlayerTable players={mockPlayers} />);

      // 日本語の日付フォーマット (YYYY/MM/DD)
      expect(screen.getByText('2024/11/1')).toBeInTheDocument();
      expect(screen.getByText('2024/11/2')).toBeInTheDocument();
      expect(screen.getByText('2024/11/3')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    test('ローディング状態でスケルトンが表示される', () => {
      render(<PlayerTable players={[]} loading={true} />);

      // MUI Skeleton はテキストのスケルトンとして表示される
      // ローディング中は実際のデータは表示されない
      expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();
    });
  });

  describe('空データの処理', () => {
    test('データが空の場合に「データが存在しません」が表示される', () => {
      render(<PlayerTable players={[]} />);

      expect(screen.getByText('データが存在しません')).toBeInTheDocument();
      expect(screen.getByText('選択した年度の選手データがまだ登録されていません')).toBeInTheDocument();
    });
  });

  describe('ページネーション', () => {
    test('ページネーションが表示される', () => {
      render(<PlayerTable players={mockPlayers} />);

      // ページネーション要素が存在する
      expect(screen.getByText('1ページの行数:')).toBeInTheDocument();
      expect(screen.getByText(/3件中/)).toBeInTheDocument();
    });

    test('1ページあたりの行数変更が機能する', async () => {
      const user = userEvent.setup();
      render(<PlayerTable players={mockPlayers} />);

      // 行数セレクタを見つける
      const rowsPerPageSelect = screen.getByRole('combobox', { name: /1ページの行数/ });
      
      // 初期値は10
      expect(rowsPerPageSelect).toHaveTextContent('10');

      // 値を変更（MUIのSelectは特殊なので、クリックしてオプションを選択）
      await user.click(rowsPerPageSelect);
      
      // 25を選択
      const option25 = await screen.findByRole('option', { name: '25' });
      await user.click(option25);

      // 表示が更新される
      expect(screen.getByText(/3件中/)).toBeInTheDocument();
    });

    test('ページ送りが機能する', async () => {
      const user = userEvent.setup();
      // 15件のデータを作成（デフォルトの10件/ページを超える）
      const manyPlayers: PlayerData[] = Array.from({ length: 15 }, (_, i) => ({
        id: `player-${i}`,
        name: `選手${i + 1}`,
        school: `学校${i + 1}`,
        type: 'highschool' as const,
        prefecture: '東京都',
        filingDate: '2024-11-01',
        year: 2024,
      }));

      render(<PlayerTable players={manyPlayers} />);

      // 最初のページには選手1-10が表示される
      expect(screen.getByText('選手1')).toBeInTheDocument();
      expect(screen.getByText('選手10')).toBeInTheDocument();
      expect(screen.queryByText('選手11')).not.toBeInTheDocument();

      // 次のページボタンをクリック
      const nextButton = screen.getByLabelText('Go to next page');
      await user.click(nextButton);

      // 2ページ目には選手11-15が表示される
      expect(screen.getByText('選手11')).toBeInTheDocument();
      expect(screen.getByText('選手15')).toBeInTheDocument();
      expect(screen.queryByText('選手1')).not.toBeInTheDocument();
    });
  });

  describe('ユーザー操作', () => {
    test('プレイヤーの行クリックで onPlayerClick が呼ばれる', async () => {
      const user = userEvent.setup();
      const onPlayerClick = vi.fn();
      
      render(
        <PlayerTable players={mockPlayers} onPlayerClick={onPlayerClick} />
      );

      // 最初のプレイヤーの行をクリック
      const firstPlayerRow = screen.getByText('山田太郎').closest('tr');
      await user.click(firstPlayerRow!);

      expect(onPlayerClick).toHaveBeenCalledWith(mockPlayers[0]);
      expect(onPlayerClick).toHaveBeenCalledTimes(1);
    });

    test('詳細表示ボタンクリックで onPlayerClick が呼ばれる', async () => {
      const user = userEvent.setup();
      const onPlayerClick = vi.fn();
      
      render(
        <PlayerTable players={mockPlayers} onPlayerClick={onPlayerClick} />
      );

      // 詳細表示ボタン（Visibilityアイコン）を見つけてクリック
      const viewButtons = screen.getAllByRole('button', { name: /の詳細を表示/ });
      await user.click(viewButtons[0]);

      expect(onPlayerClick).toHaveBeenCalledWith(mockPlayers[0]);
    });
  });

  describe('権限制御', () => {
    test('管理者ユーザーの場合、編集・削除ボタンが表示される', () => {
      const onEditClick = vi.fn();
      const onDeleteClick = vi.fn();

      // 管理者ユーザーとしてモック
      vi.mocked(useAuth).mockReturnValue({
        user: { username: 'admin', groups: ['admin'] },
        loading: false,
        isAuthenticated: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        confirmSignUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <PlayerTable 
          players={mockPlayers} 
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
        />
      );

      // 編集ボタンが表示される
      expect(screen.getAllByRole('button', { name: /編集/ })).toHaveLength(3);
      
      // 削除ボタンが表示される
      expect(screen.getAllByRole('button', { name: /削除/ })).toHaveLength(3);
    });

    test('一般ユーザーの場合、編集・削除ボタンが非表示になる', () => {
      const onEditClick = vi.fn();
      const onDeleteClick = vi.fn();

      // 一般ユーザー（デフォルトのbeforeEachで設定済み）
      render(
        <PlayerTable 
          players={mockPlayers} 
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
        />
      );

      // 編集ボタンが表示されない
      expect(screen.queryByRole('button', { name: /編集/ })).not.toBeInTheDocument();
      
      // 削除ボタンが表示されない
      expect(screen.queryByRole('button', { name: /削除/ })).not.toBeInTheDocument();
    });

    test('管理者ユーザーが編集ボタンをクリックすると onEditClick が呼ばれる', async () => {
      const user = userEvent.setup();
      const onEditClick = vi.fn();

      // 管理者ユーザーとしてモック
      vi.mocked(useAuth).mockReturnValue({
        user: { username: 'admin', groups: ['admin'] },
        loading: false,
        isAuthenticated: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        confirmSignUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <PlayerTable players={mockPlayers} onEditClick={onEditClick} />
      );

      const editButtons = screen.getAllByRole('button', { name: /編集/ });
      await user.click(editButtons[0]);

      expect(onEditClick).toHaveBeenCalledWith(mockPlayers[0]);
      expect(onEditClick).toHaveBeenCalledTimes(1);
    });

    test('管理者ユーザーが削除ボタンをクリックすると onDeleteClick が呼ばれる', async () => {
      const user = userEvent.setup();
      const onDeleteClick = vi.fn();

      // 管理者ユーザーとしてモック
      vi.mocked(useAuth).mockReturnValue({
        user: { username: 'admin', groups: ['admin'] },
        loading: false,
        isAuthenticated: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        confirmSignUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <PlayerTable players={mockPlayers} onDeleteClick={onDeleteClick} />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
      await user.click(deleteButtons[0]);

      expect(onDeleteClick).toHaveBeenCalledWith(mockPlayers[0]);
      expect(onDeleteClick).toHaveBeenCalledTimes(1);
    });
  });
});
