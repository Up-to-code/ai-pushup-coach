import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../src/store';
import { colors, spacing, typography } from '../../src/theme';

export default function SessionReadyScreen() {
  const router = useRouter();
  const currentWorkout = useWorkoutStore((state) => state.currentWorkout);

  useEffect(() => {
    if (currentWorkout?.id) {
      router.replace('/(stack)/workout-session');
      return;
    }

    router.replace('/(tabs)/start' as any);
  }, [currentWorkout?.id, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.title}>Opening live session</Text>
        <Text style={styles.subtitle}>Moving directly into the workout camera now.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.headline, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
