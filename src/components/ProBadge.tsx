import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { borderRadius, colors, layout, spacing, typography } from '../theme';

type ProBadgeSize = 'tiny' | 'small';

interface ProBadgeProps {
  size?: ProBadgeSize;
  style?: ViewStyle;
}

export function ProBadge({ size = 'small', style }: ProBadgeProps) {
  const tiny = size === 'tiny';

  return (
    <View style={[styles.badge, tiny && styles.badgeTiny, style]}>
      <Text style={[styles.text, tiny && styles.textTiny]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    borderWidth: layout.hairline,
    borderColor: colors.borderAccent,
    backgroundColor: colors.accentAlpha,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeTiny: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: {
    ...typography.captionBold,
    color: colors.accent,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  textTiny: {
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.3,
  },
});

export default ProBadge;
