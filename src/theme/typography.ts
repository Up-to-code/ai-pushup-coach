import { TextStyle } from 'react-native';

export const typography = {
  titleLarge: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
  } as TextStyle,
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  } as TextStyle,
  titleMedium: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.45,
  } as TextStyle,
  headline: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
  } as TextStyle,
  headlineMedium: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.12,
  } as TextStyle,
  bodyBold: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.12,
  } as TextStyle,
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.08,
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.12,
  } as TextStyle,
  captionBold: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.16,
  } as TextStyle,
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  } as TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
};

export type Typography = typeof typography;
