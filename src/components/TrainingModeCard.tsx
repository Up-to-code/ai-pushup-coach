import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { borderRadius, colors, layout, shadows, spacing, typography } from '../theme';
import type { TrainingCameraMode } from '../store';

interface TrainingModeCardProps {
  mode: TrainingCameraMode;
  title: string;
  subtitle: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TrainingModeCard({
  mode,
  title,
  subtitle,
  detail,
  selected,
  onPress,
}: TrainingModeCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.985);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={[styles.card, selected && styles.cardSelected, animatedStyle]}
    >
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{mode === 'faceFocus' ? 'Face Focus' : 'Full Scene'}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
        </View>
      </View>

      <View style={styles.preview}>
        {mode === 'faceFocus' ? (
          <View style={styles.previewCircle}>
            <Text style={styles.previewLabel}>Face guide</Text>
          </View>
        ) : (
          <View style={styles.previewFrame}>
            <View style={styles.previewHorizon} />
            <Text style={styles.previewLabel}>Wide live view</Text>
          </View>
        )}
      </View>

      <Text style={styles.detail}>{detail}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cardSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accentStrong,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: layout.hairline,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  radioSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
  },
  radioDotSelected: {
    backgroundColor: colors.accentStrong,
  },
  preview: {
    height: 168,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundCanvas,
    borderWidth: layout.hairline,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewCircle: {
    width: 118,
    height: 118,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFrame: {
    width: '82%',
    height: '78%',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHorizon: {
    position: 'absolute',
    width: '78%',
    height: 1,
    backgroundColor: colors.borderAccent,
  },
  previewLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  detail: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
