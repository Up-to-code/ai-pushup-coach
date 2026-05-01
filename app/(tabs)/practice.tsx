import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../src/theme';
import { PracticeModeCard } from '../../src/components/PracticeModeCard';
import { useResponsive } from '../../src/hooks';

const practiceModes = [
  {
    type: 'sets' as const,
    title: 'Sets Workout',
    subtitle: 'Classic 3 sets with recovery',
    icon: '🏋️',
  },
  {
    type: 'open' as const,
    title: 'Open Goal',
    subtitle: 'Push until you drop',
    icon: '🎯',
  },
  {
    type: 'timer' as const,
    title: 'Reps Per Minute',
    subtitle: 'Max reps in 60 seconds',
    icon: '⏱️',
  },
  {
    type: 'limit' as const,
    title: 'Daily Session',
    subtitle: 'Quick 10-minute focus',
    icon: '📅',
  },
];

export default function TrainScreen() {
  const router = useRouter();
  const { horizontalPadding } = useResponsive();
  const trainingSetupRoute = '/(stack)/training-setup' as any;

  const handleModeSelect = (mode: typeof practiceModes[0]) => {
    let goal: number | undefined;
    let sets: number[] | undefined;
    let restTime: number | undefined;

    switch (mode.type) {
      case 'timer': goal = 60; break;
      case 'limit': goal = 10; break;
      case 'sets': sets = [10, 10, 10]; restTime = 60; break;
      default: goal = undefined;
    }

    router.push({
      pathname: trainingSetupRoute,
      params: {
        type: mode.type,
        title: mode.title,
        subtitle: mode.subtitle,
        goal: goal?.toString(),
        sets: sets ? JSON.stringify(sets) : undefined,
        restTime: restTime?.toString(),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Practice</Text>
        </View>

        <View style={styles.modesGrid}>
          {practiceModes.map((mode) => (
            <PracticeModeCard
              key={mode.type}
              type={mode.type}
              title={mode.title}
              subtitle={mode.subtitle}
              icon={mode.icon}
              onPress={() => handleModeSelect(mode)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    minHeight: 42,
    justifyContent: 'center',
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  modesGrid: {
    gap: spacing.md,
  },
});
