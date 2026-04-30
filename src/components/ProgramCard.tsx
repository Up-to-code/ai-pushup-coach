import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../theme';

interface ProgramCardProps {
  title: string;
  duration: string;
  progress: number;
  completedDays: number;
  totalDays: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  duration,
  progress,
  completedDays,
  totalDays,
}) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{duration}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedDays}/{totalDays} days • {progress}%
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    height: 126,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  badge: {
    backgroundColor: colors.accentAlpha,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: layout.hairline,
    borderColor: colors.borderAccent,
  },
  badgeText: {
    ...typography.captionBold,
    color: colors.accentStrong,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.backgroundCanvas,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentStrong,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});

export default ProgramCard;
