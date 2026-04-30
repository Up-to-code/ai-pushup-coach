import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius } from '../theme';
import { MetricRow } from './MetricRow';
import { NeonButton } from './NeonButton';

interface CompletionSheetProps {
  totalReps: number;
  duration: number;
  calories: number;
  onSave: () => void;
  onDismiss: () => void;
}

export const CompletionSheet: React.FC<CompletionSheetProps> = ({
  totalReps,
  duration,
  calories,
  onSave,
  onDismiss,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const speed = duration > 0 ? Math.round((totalReps / duration) * 60) : 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkmark}>✓</Text>
      </View>
      
      <Text style={styles.title}>Congratulations</Text>
      <Text style={styles.subtitle}>Workout Completed</Text>
      
      <View style={styles.card}>
        <MetricRow label="Total Push-Ups" value={totalReps} icon="🔥" />
        <MetricRow label="Total Duration" value={formatDuration(duration)} icon="⏱️" />
        <MetricRow label="Speed" value={`${speed} reps/min`} icon="⚡" />
        <MetricRow label="Calories" value={calories} icon="💪" />
        <MetricRow label="Avg. Rep Distance" value="--" icon="📏" />
      </View>
      
      <NeonButton title="SAVE" onPress={onSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    padding: spacing.lg,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkmark: {
    fontSize: 48,
    color: colors.background,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default CompletionSheet;