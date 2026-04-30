import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../theme';
import { DayStatus } from '../store';

interface WorkoutDayCardProps {
  dayNumber: number;
  sets?: number[];
  status: DayStatus;
  onPress?: () => void;
  isToday?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const statusLabels: Record<DayStatus, string> = {
  completed: 'Completed',
  current: 'GO',
  locked: 'Locked',
  rest: 'Rest Day',
  missed: 'Missed',
};

export const WorkoutDayCard: React.FC<WorkoutDayCardProps> = ({
  dayNumber,
  sets,
  status,
  onPress,
  isToday = false,
}) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    if (status === 'current') {
      scale.value = withSpring(0.98);
    }
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  return (
    <AnimatedPressable
      onPress={status === 'current' ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        status === 'current' && styles.cardCurrent,
        status === 'completed' && styles.cardCompleted,
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.dayText}>Day {dayNumber}</Text>
        {isToday && <View style={styles.todayBadge}><Text style={styles.todayText}>Today</Text></View>}
      </View>
      
      {status === 'rest' ? (
        <Text style={styles.restText}>Rest Day</Text>
      ) : sets ? (
        <View style={styles.setsContainer}>
          {sets.map((rep, index) => (
            <View key={index} style={styles.setItem}>
              <Text style={styles.setRep}>{rep}</Text>
            </View>
          ))}
        </View>
      ) : null}
      
      <View style={[
        styles.statusBadge,
        status === 'completed' && styles.statusCompleted,
        status === 'current' && styles.statusCurrent,
        status === 'locked' && styles.statusLocked,
      ]}>
        <Text style={[
          styles.statusText,
          status === 'completed' && styles.statusTextCompleted,
          status === 'current' && styles.statusTextCurrent,
        ]}>
          {statusLabels[status]}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardCurrent: {
    borderColor: colors.accentStrong,
    backgroundColor: colors.cardSecondary,
  },
  cardCompleted: {
    borderColor: colors.border,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayText: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  todayBadge: {
    backgroundColor: colors.accentAlpha,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: layout.hairline,
    borderColor: colors.borderAccent,
  },
  todayText: {
    ...typography.captionBold,
    color: colors.accentStrong,
    fontSize: 11,
  },
  setsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  setItem: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: layout.hairline,
    borderColor: colors.borderLight,
  },
  setRep: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  restText: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardSecondary,
    borderWidth: layout.hairline,
    borderColor: colors.borderLight,
  },
  statusCompleted: {
    backgroundColor: 'transparent',
    borderColor: colors.success,
  },
  statusCurrent: {
    backgroundColor: colors.accentAlpha,
    borderColor: colors.accentStrong,
  },
  statusLocked: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  statusText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  statusTextCompleted: {
    color: colors.success,
  },
  statusTextCurrent: {
    color: colors.accentStrong,
  },
});

export default WorkoutDayCard;
