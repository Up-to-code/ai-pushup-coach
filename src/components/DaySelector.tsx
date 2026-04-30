import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../theme';
import { DayStatus } from '../store';

interface DaySelectorProps {
  days: Array<{
    day: number;
    status: DayStatus;
  }>;
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const statusIcons: Record<DayStatus, string> = {
  completed: '✓',
  current: '●',
  locked: '○',
  rest: '☾',
  missed: '!',
};

export const DaySelector: React.FC<DaySelectorProps> = ({
  days,
  selectedDay,
  onSelectDay,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((dayItem) => {
        const isSelected = selectedDay === dayItem.day;
        const isLocked = dayItem.status === 'locked';
        
        return (
          <DayItem
            key={dayItem.day}
            day={dayItem.day}
            status={dayItem.status}
            isSelected={isSelected}
            isLocked={isLocked}
            onPress={() => !isLocked && onSelectDay(dayItem.day)}
          />
        );
      })}
    </ScrollView>
  );
};

interface DayItemProps {
  day: number;
  status: DayStatus;
  isSelected: boolean;
  isLocked: boolean;
  onPress: () => void;
}

const DayItem: React.FC<DayItemProps> = ({
  day,
  status,
  isSelected,
  isLocked,
  onPress,
}) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    if (!isLocked) {
      scale.value = withSpring(0.95);
    }
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.dayItem,
        isSelected && styles.dayItemSelected,
        isLocked && styles.dayItemLocked,
        animatedStyle,
      ]}
    >
      <Text style={[styles.dayNumber, isLocked && styles.dayNumberLocked]}>
        {day}
      </Text>
      <Text style={[
        styles.dayIcon,
        status === 'completed' && styles.iconCompleted,
        status === 'current' && styles.iconCurrent,
        status === 'rest' && styles.iconRest,
        isLocked && styles.iconLocked,
      ]}>
        {statusIcons[status]}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  dayItem: {
    width: 62,
    height: 84,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  dayItemSelected: {
    borderColor: colors.accentStrong,
    backgroundColor: colors.cardSecondary,
  },
  dayItemLocked: {
    opacity: 0.5,
  },
  dayNumber: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  dayNumberLocked: {
    color: colors.textMuted,
  },
  dayIcon: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  iconCompleted: {
    color: colors.success,
  },
  iconCurrent: {
    color: colors.accentStrong,
  },
  iconRest: {
    color: colors.textMuted,
  },
  iconLocked: {
    color: colors.textDisabled,
  },
});

export default DaySelector;
