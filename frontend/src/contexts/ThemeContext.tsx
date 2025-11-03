import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_KEY = 'pro-candidate-theme-mode';

// カスタムテーマの作成
const createCustomTheme = (mode: PaletteMode): Theme => {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // ライトモードの色設定
            primary: {
              main: '#1976d2',
            },
            secondary: {
              main: '#dc004e',
            },
            background: {
              default: '#f5f5f5',
              paper: '#ffffff',
            },
          }
        : {
            // ダークモードの色設定
            primary: {
              main: '#90caf9',
            },
            secondary: {
              main: '#f48fb1',
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
          }),
    },
    typography: {
      fontFamily: [
        'Noto Sans JP',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', // ボタンテキストの大文字変換を無効化
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
          },
        },
      },
      // ダークモード時のDrawer背景色調整
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
          }),
        },
      },
      // ダークモード時のAppBar調整
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : theme.palette.primary.main,
            backgroundImage: theme.palette.mode === 'dark' ? 'none' : undefined,
          }),
        },
      },
    },
  });
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // localStorageから初期値を取得、デフォルトはライトモード
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return (saved as PaletteMode) || 'light';
  });

  // テーマ切り替え関数
  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, newMode);
      return newMode;
    });
  };

  // modeが変更されたときにテーマを再作成
  const theme = useMemo(() => createCustomTheme(mode), [mode]);

  // システムのダークモード設定を監視（オプション）
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 初回のみシステム設定を適用（localStorageに保存されていない場合）
    if (!localStorage.getItem(THEME_KEY)) {
      setMode(mediaQuery.matches ? 'dark' : 'light');
    }

    // システム設定の変更を監視（localStorageに保存されていない場合のみ）
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      toggleTheme,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};