import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../src/store';
import { useAppLocale } from '../../src/localization';
import { colors, spacing, typography } from '../../src/theme';

export default function SessionReadyScreen() {
  const router = useRouter();
  const { t } = useAppLocale();
  const currentWorkout = useWorkoutStore((state) => state.currentWorkout);

  useEffect(() => {
    if (currentWorkout?.id) {
      router.replace('/workout-session');
      return;
    }

    router.replace('/practice' as any);
  }, [currentWorkout?.id, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.title}>{t('workout.openingTitle')}</Text>
        <Text style={styles.subtitle}>{t('workout.openingSubtitle')}</Text>
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
