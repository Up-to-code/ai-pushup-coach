import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, layout, spacing, typography } from '../theme';

interface StackHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
}

export function StackHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  rightLabel,
  onRightPress,
}: StackHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable style={styles.actionButton} onPress={onBack}>
            <Text style={styles.actionButtonText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {rightLabel ? (
          <Pressable style={styles.actionButton} onPress={onRightPress}>
            <Text style={styles.actionButtonText}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionButton: {
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: layout.hairline,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
  },
  actionButtonText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accentStrong,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 27,
  },
});

export default StackHeader;
