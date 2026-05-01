import { StyleSheet } from 'react-native';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  mdSm: 12,
  md: 16,
  lgSm: 20,
  lg: 24,
  xl: 32,
  xxlSm: 40,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const layout = {
  hairline: StyleSheet.hairlineWidth,
  maxContentWidth: 560,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  accent: {
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
};

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
