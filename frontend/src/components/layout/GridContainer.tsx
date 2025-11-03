import React from 'react';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';

interface GridContainerProps extends BoxProps {
  spacing?: number;
}

export const GridContainer: React.FC<GridContainerProps> = ({ 
  children, 
  spacing = 2, 
  ...props 
}) => {
  return (
    <Box 
      display="flex" 
      flexWrap="wrap" 
      sx={{ 
        margin: `-${spacing * 0.5}rem`,
        '& > *': {
          padding: `${spacing * 0.5}rem`,
        }
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

interface GridItemProps extends BoxProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export const GridItem: React.FC<GridItemProps> = ({ 
  children, 
  xs = 12, 
  sm, 
  md, 
  lg, 
  xl, 
  ...props 
}) => {
  return (
    <Box 
      sx={{
        width: `${(xs / 12) * 100}%`,
        '@media (min-width: 600px)': sm && {
          width: `${(sm / 12) * 100}%`,
        },
        '@media (min-width: 900px)': md && {
          width: `${(md / 12) * 100}%`,
        },
        '@media (min-width: 1200px)': lg && {
          width: `${(lg / 12) * 100}%`,
        },
        '@media (min-width: 1536px)': xl && {
          width: `${(xl / 12) * 100}%`,
        },
      }}
      {...props}
    >
      {children}
    </Box>
  );
};