import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface WorkoutCounterProps {
  reps: number;
  goal?: number;
  size?: 'small' | 'large';
}

export const WorkoutCounter: React.FC<WorkoutCounterProps> = ({
  reps,
  goal,
  size = 'large',
}) => {
  const scale = useSharedValue(1);
  const prevReps = useSharedValue(reps);
  
  React.useEffect(() => {
    if (reps !== prevReps.value) {
      scale.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
      prevReps.value = reps;
    }
  }, [reps]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const circleSize = size === 'large' ? 208 : 136;
  const fontSize = size === 'large' ? 68 : 42;
  
  return (
    <View style={[styles.container, { width: circleSize, height: circleSize }]}>
      <Animated.View
        style={[
          styles.circle,
          { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
          animatedStyle,
        ]}
      >
        <Text style={[styles.repsText, { fontSize }]}>{reps}</Text>
        {goal && (
          <Text style={styles.goalText}>of {goal}</Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  repsText: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    fontStyle: 'normal',
  },
  goalText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default WorkoutCounter;
