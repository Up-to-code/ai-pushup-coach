import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from '../../src/components';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore } from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { getCoachMessage, getCurrentPlanDay, formatPreferredTime } from '../../src/utils';
import { syncNotificationsForPlan } from '../../src/services/notifications';

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { currentWorkout, lastCompletedWorkout, workouts } = useWorkoutStore();
  const navigationStartedRef = useRef(false);
  const [workoutSnapshot, setWorkoutSnapshot] = useState(() =>
    workouts.find((w) => w.id === workoutId) ??
    (lastCompletedWorkout?.id === workoutId || !workoutId ? lastCompletedWorkout : null) ??
    currentWorkout
  );
  const [saving, setSaving] = useState(false);
  const user = useUserStore((s) => s.user);
  const settings = useSettingsStore((s) => s.settings);
  const plan = usePlanStore((s) => s.plan);
  const updatePlan = usePlanStore((s) => s.updatePlan);

  const reps = workoutSnapshot?.reps ?? 0;
  const duration = workoutSnapshot?.duration ?? 0;
  const calories = Math.round(reps * 0.29);
  const qualityScore = workoutSnapshot?.qualityScore ?? 84;
  const coachMessage = getCoachMessage('workoutComplete', user, plan, workouts);

  // Next upcoming workout day
  const nextDay = plan?.days.find((day, idx) => idx > (plan.currentDayIndex ?? 0) && day.status !== 'rest');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fallback if no workout data after short delay
  useEffect(() => {
    if (workoutSnapshot) return;
    const fallback = setTimeout(() => {
      if (!navigationStartedRef.current) {
        navigationStartedRef.current = true;
        router.replace('/practice' as any);
      }
    }, 1200);
    return () => clearTimeout(fallback);
  }, [router, workoutSnapshot]);

  const saveAndGo = (href: string) => {
    if (saving || navigationStartedRef.current || !workoutSnapshot) return;
    navigationStartedRef.current = true;
    setSaving(true);

    router.replace(href as any);

    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan) {
      void syncNotificationsForPlan({
        plan: currentPlan,
        user,
        notificationsEnabled: settings.notificationsEnabled,
        workoutReminderEnabled: settings.workoutReminderEnabled,
        missedReminderEnabled: settings.missedReminderEnabled,
      })
        .then((ids) => updatePlan({ notificationIds: ids }))
        .catch((err) => console.warn('Notification sync failed', err));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Success badge */}
        <View style={styles.iconBadge}>
          <Ionicons name="checkmark-circle" size={40} color={colors.accent} />
        </View>

        <Text style={styles.title}>{reps > 0 ? 'Amazing work' : 'Session incomplete'}</Text>
        <Text style={styles.subtitle}>
          {reps > 0 ? coachMessage : 'This attempt won’t count toward your plan or leaderboard.'}
        </Text>

        {/* Big number */}
        <Text style={styles.hugeNumber}>{reps}</Text>
        <Text style={styles.unit}>pushups</Text>

        {/* Metrics row (no cards) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>{formatTime(duration)}</Text>
            <Text style={styles.metricLabel}>Duration</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="flame-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>{calories}</Text>
            <Text style={styles.metricLabel}>Calories</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>{qualityScore}%</Text>
            <Text style={styles.metricLabel}>Quality</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>
              {workoutSnapshot?.trainingCameraMode === 'fullScene' ? 'Full' : 'Face'}
            </Text>
            <Text style={styles.metricLabel}>Camera</Text>
          </View>
        </View>

        {/* Next session hint */}
        {plan && (
          <View style={styles.nextHint}>
            <Text style={styles.nextText}>
              {nextDay?.scheduledAt
                ? `Next: Day ${nextDay.day} at ${formatPreferredTime(plan.preferredTime ?? '07:30')}`
                : 'Plan complete – you’re on fire 🔥'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <NeonButton
            title={saving ? 'Saving…' : reps > 0 ? 'Done' : 'Close'}
            onPress={() => saveAndGo('/')}
            disabled={saving}
          />
          <Pressable
            onPress={() => saveAndGo('/profile')}
            style={styles.linkButton}
            disabled={saving}
          >
            <Ionicons name="stats-chart" size={18} color={colors.accent} />
            <Text style={styles.linkText}>View profile</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(96, 165, 250, 0.1)', // soft accent glow
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  hugeNumber: {
    fontSize: 96,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -2,
    marginTop: spacing.sm,
  },
  unit: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  nextHint: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  nextText: {
    ...typography.caption,
    color: colors.accent,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.bodyBold,
    color: colors.accent,
  },
});