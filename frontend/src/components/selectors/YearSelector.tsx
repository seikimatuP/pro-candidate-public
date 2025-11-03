import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { CalendarToday } from '@mui/icons-material';

/**
 * 年度選択コンポーネントのプロパティ
 * v1.2.14: 装飾要素（チップ・バッジ）を削除しシンプル化
 */
export interface YearSelectorProps {
  /** 現在選択されている年度 */
  selectedYear: number;
  /** 選択可能な年度のリスト */
  availableYears: number[];
  /** 年度変更時のコールバック関数 */
  onChange: (year: number) => void;
  /** コンポーネントの無効化フラグ */
  disabled?: boolean;
  /** ラベルテキスト（デフォルト: "年度"） */
  label?: string;
  /** コンポーネントサイズ */
  size?: 'small' | 'medium';
  /** Material-UIのSelectバリアント */
  variant?: 'outlined' | 'filled' | 'standard';
}

/**
 * 年度選択コンポーネント
 * 
 * 利用可能な年度から1つを選択するシンプルなセレクトボックス。
 * v1.2.14で装飾要素を削除し、純粋な年度表示のみに簡素化。
 * 
 * @param props YearSelectorProps
 * @returns 年度選択UI
 * 
 * @example
 * ```tsx
 * <YearSelector
 *   selectedYear={2025}
 *   availableYears={[2025, 2024, 2023]}
 *   onChange={(year) => console.log(`Selected: ${year}`)}
 *   size="small"
 * />
 * ```
 */
export const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  availableYears,
  onChange,
  disabled = false,
  label = '年度',
  size = 'medium',
  variant = 'outlined'
}) => {
  const currentYear = new Date().getFullYear();
  
  // 年度が設定されていない場合のフォールバック
  const years = availableYears.length > 0 ? availableYears : [currentYear, currentYear - 1];
  const sortedYears = [...years].sort((a, b) => b - a); // 降順（新しい年から）

  const handleChange = (event: { target: { value: unknown } }) => {
    const year = parseInt(String(event.target.value), 10);
    onChange(year);
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <FormControl variant={variant} size={size} disabled={disabled} sx={{ minWidth: 120 }}>
        <InputLabel id="year-selector-label">
          <Box display="flex" alignItems="center" gap={0.5}>
            <CalendarToday sx={{ fontSize: size === 'small' ? 16 : 20 }} />
            {label}
          </Box>
        </InputLabel>
        <Select
          labelId="year-selector-label"
          value={selectedYear}
          onChange={handleChange}
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              <CalendarToday sx={{ fontSize: size === 'small' ? 16 : 20 }} />
              {label}
            </Box>
          }
        >
          {sortedYears.map((year) => (
            <MenuItem key={year} value={year}>
              <Typography>
                {year}年度
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default YearSelector;