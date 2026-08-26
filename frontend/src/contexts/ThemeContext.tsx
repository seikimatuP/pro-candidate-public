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

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// セマンティックカラーをモードに応じて取得するフック
// eslint-disable-next-line react-refresh/only-export-components
export const useSemanticColors = () => {
  const { mode } = useTheme();
  return mode === 'dark' ? semanticColors.dark : semanticColors.light;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_KEY = 'pro-candidate-theme-mode';

/**
 * デジタル庁「ダッシュボードデザインの実践ガイドブック」(2026-03-31 正式版) の
 * Blue カラーパレットに準拠したカラートークン。
 *
 * 出典:
 * - ガイドブック 4.3 カラーパレット
 *   https://www.digital.go.jp/resources/dashboard-guidebook
 * - カラーコード実体（Power BI テーマ JSON）
 *   https://github.com/digital-go-jp/policy-dashboard-assets
 *
 * 準拠している規範:
 * - グラフに使用する色数を1〜5色程度に絞る（チェックリスト「指標と表、グラフのデザイン」）
 * - 系列色は Primary(Blue) / Secondary(Yellow) / Neutral(SolidGray) の3系統に限定する
 * - グラフ色は背景色に対しコントラスト比 3:1 以上を確保する
 *   （満たせない場合は数値併記またはホバー時の数値表示で代替する）
 */

// デジタル庁デザインシステム 系統色（ガイドブック p.35 のカラーコード）
const da = {
  blue: {
    50: '#E8F1FE',
    200: '#C5D7FB',
    400: '#7096F8',
    500: '#4979F5', // ガイドブックがコントラスト比3:1の下限として明示している濃さ
    600: '#3460FB',
    900: '#0017C1',
    1200: '#000060',
  },
  yellow: { 400: '#FFC700', 600: '#D2A400', 800: '#A58000' },
  gray: { 50: '#F2F2F2', 200: '#CCCCCC', 400: '#999999', 600: '#666666', 800: '#333333' },
  lightBlue: { 400: '#57B8FF', 900: '#0055AD' },
  green: { 400: '#51B883', 900: '#115A36' },
  orange: { 400: '#FF8D44', 900: '#AC3E00' },
  red: { 200: '#FFBBBB', 400: '#FF7171', 600: '#FE3939', 900: '#CE0000' },
  text: { black: '#000000', white: '#FFFFFF', label: '#626264', link: '#0017C1' },
  bg: { standard: '#F8F8FB', control: '#F1F1F4' },
  semantic: { success: '#197A4B', error: '#CE0000' },
} as const;

// セマンティックカラートークン（テーマ外で参照するためexport）
export const semanticColors = {
  light: {
    // 系列色は Primary(Blue600) / Secondary(Yellow800) の2色のみ。いずれも白背景に対し3:1以上
    highschool: da.blue[600], // 4.99:1
    university: da.yellow[800], // 3.69:1
    chart: {
      highschool: { border: da.blue[600], bg: 'rgba(52, 96, 251, 0.12)' },
      university: { border: da.yellow[800], bg: 'rgba(165, 128, 0, 0.12)' },
      total: { border: da.gray[800], bg: 'rgba(51, 51, 51, 0.10)' },
      tertiary: da.yellow[800],
      quaternary: da.gray[600],
      // 構成比グラフ用の単系統シーケンス（濃い順＝数量の多い順）
      sequence: [da.blue[1200], da.blue[900], da.blue[600], da.blue[500], da.blue[400]],
      neutral: da.gray[200],
    },
    tint: {
      highschool: 'rgba(52, 96, 251, 0.06)',
      university: 'rgba(165, 128, 0, 0.06)',
      total: 'rgba(51, 51, 51, 0.05)',
    },
    // 順位表現は装飾色（金銀銅）をやめ、Blue の濃淡による強弱のみで表す
    emphasis: {
      strong: da.blue[900],
      base: da.blue[600],
      muted: da.gray[200],
      // 下位項目用の最も淡いステップ。白背景に対しては 3:1 を下回るため、
      // 必ず実数と構成比を併記して使う（ガイドブック 4.3 の代替手段）
      soft: da.blue[400],
    },
    // 最重要指標のみを塗りつぶし面で強調するための面色。白文字で 11.1:1
    hero: {
      bg: da.blue[900],
      text: da.text.white,
      label: da.blue[200], // 面色に対し 7.7:1
    },
  },
  dark: {
    // 暗背景では濃い側が沈むため、同じ Blue 系統の明るいステップを使う
    highschool: da.blue[400], // 6.76:1
    university: da.yellow[400], // 12.25:1
    chart: {
      highschool: { border: da.blue[400], bg: 'rgba(112, 150, 248, 0.15)' },
      university: { border: da.yellow[400], bg: 'rgba(255, 199, 0, 0.15)' },
      total: { border: da.gray[200], bg: 'rgba(204, 204, 204, 0.12)' },
      tertiary: da.yellow[400],
      quaternary: da.gray[400],
      sequence: [da.blue[50], da.blue[200], da.blue[400], da.blue[500], da.blue[600]],
      neutral: da.gray[600],
    },
    tint: {
      highschool: 'rgba(112, 150, 248, 0.10)',
      university: 'rgba(255, 199, 0, 0.10)',
      total: 'rgba(204, 204, 204, 0.08)',
    },
    emphasis: {
      strong: da.blue[200],
      base: da.blue[400],
      muted: da.gray[600],
      soft: da.blue[600],
    },
    // 塗りつぶし面は「面の上の文字」のコントラストが要件になるため、
    // 暗背景でも同じ濃紺を使う（白文字 11.1:1）。周囲との境界は枠線で確保する
    hero: {
      bg: da.blue[900],
      text: da.text.white,
      label: da.blue[200],
    },
  },
} as const;

// カスタムテーマの作成
const createCustomTheme = (mode: PaletteMode): Theme => {
  const isLight = mode === 'light';

  // デジタル庁 Blue カラーパレット準拠（ガイドブック 4.3 / カラーパレットの構成）
  const colors = {
    primary: {
      main: isLight ? da.blue[600] : da.blue[400],
      light: isLight ? da.blue[400] : da.blue[200],
      dark: isLight ? da.blue[900] : da.blue[600],
    },
    secondary: {
      main: isLight ? da.yellow[800] : da.yellow[400], // Secondary は Yellow 系統
    },
    background: {
      default: isLight ? da.bg.standard : '#080808', // Standard 背景 #F8F8FB / 深い黒
      paper: isLight ? da.text.white : '#0F0F0F',
    },
    text: {
      primary: isLight ? da.text.black : da.text.white,
      secondary: isLight ? da.text.label : '#9CA3AF', // Label #626264（白背景に 6.09:1）
    }
  };

  return createTheme({
    palette: {
      mode,
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      // 状態色もデジタル庁デザインシステムの系統色に統一する
      success: {
        main: isLight ? da.semantic.success : da.green[400],
        light: da.green[400],
        dark: da.green[900],
      },
      warning: {
        main: isLight ? da.orange[900] : da.orange[400],
        light: da.orange[400],
        dark: da.orange[900],
      },
      error: {
        main: isLight ? da.semantic.error : da.red[400],
        light: da.red[400],
        dark: da.red[900],
      },
      info: {
        main: isLight ? da.lightBlue[900] : da.lightBlue[400],
        light: da.lightBlue[400],
        dark: da.lightBlue[900],
      },
    },
    typography: {
      fontFamily: [
        'Inter',
        'Noto Sans JP',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: {
      // 8pxグリッドに揃えた抑制的な角丸（過度な装飾を避けるガイドブック 4.5 の方針）
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
            },
          },
          contained: {
            backgroundImage: 'none',
          }
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: mode === 'light' 
              ? '0 2px 12px 0 rgba(0,0,0,0.05)' 
              : '0 2px 12px 0 rgba(0,0,0,0.2)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            overflow: 'visible',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            backgroundColor: isLight
              ? colors.background.default
              : 'rgba(255,255,255,0.04)',
            borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`,
          },
        },
      },
      // ダークモード時のDrawer背景色調整
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.background.paper,
            borderRight: 'none',
            boxShadow: mode === 'light' 
              ? '4px 0 24px rgba(0,0,0,0.02)' 
              : '4px 0 24px rgba(0,0,0,0.2)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.background.paper,
            color: colors.text.primary,
            boxShadow: isLight
              ? '0 1px 0 rgba(0,0,0,0.08)'
              : '0 1px 0 rgba(255,255,255,0.06)',
          },
        },
      },
    },
  });
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // localStorageから初期値を取得、デフォルトはライトモード
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      return saved as PaletteMode;
    }
    // システム設定を確認
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
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