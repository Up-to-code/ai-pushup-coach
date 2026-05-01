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
    workouts.find((workout) => workout.id === workoutId) ??
    (lastCompletedWorkout?.id === workoutId || !workoutId ? lastCompletedWorkout : null) ??
    currentWorkout
  );
  const [saving, setSaving] = useState(false);
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const plan = usePlanStore((state) => state.plan);
  const updatePlan = usePlanStore((state) => state.updatePlan);

  const reps = workoutSnapshot?.reps || 0;
  const duration = workoutSnapshot?.duration || 0;
  const calories = Math.round(reps * 0.29);
  const qualityScore = workoutSnapshot?.qualityScore || 84;
  const cameraMode = workoutSnapshot?.trainingCameraMode === 'fullScene' ? 'Full Scene' : 'Face Focus';
  const nextDay = plan?.days.find((day, index) => index > (plan.currentDayIndex ?? 0) && day.status !== 'rest');
  const coachMessage = getCoachMessage('workoutComplete', user, plan, workouts);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (workoutSnapshot) {
      return;
    }

    const foundWorkout =
      workouts.find((workout) => workout.id === workoutId) ??
      (lastCompletedWorkout?.id === workoutId || !workoutId ? lastCompletedWorkout : null) ??
      currentWorkout;
    if (foundWorkout) {
      setWorkoutSnapshot(foundWorkout);
    }
  }, [currentWorkout, lastCompletedWorkout, workoutId, workoutSnapshot, workouts]);

  useEffect(() => {
    if (workoutSnapshot || navigationStartedRef.current) {
      return;
    }

    const fallback = setTimeout(() => {
      if (!navigationStartedRef.current) {
        navigationStartedRef.current = true;
        router.replace('/(tabs)/practice' as any);
      }
    }, 1200);

    return () => clearTimeout(fallback);
  }, [router, workoutSnapshot]);

  const saveAndGo = (href: string) => {
    if (saving || navigationStartedRef.current || !workoutSnapshot) return;

    navigationStartedRef.current = true;
    setSaving(true);
    const currentPlan = usePlanStore.getState().plan;
    router.replace(href as any);

    if (currentPlan) {
      void syncNotificationsForPlan({
        plan: currentPlan,
        user,
        notificationsEnabled: settings.notificationsEnabled,
        workoutReminderEnabled: settings.workoutReminderEnabled,
        missedReminderEnabled: settings.missedReminderEnabled,
      })
        .then((notificationIds) => {
          updatePlan({ notificationIds });
        })
        .catch((error) => {
          console.warn('Notification resync after workout failed', error);
        });
    }
  };

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={48} color={colors.accent} />
          </View>

          <Text style={styles.eyebrow}>{reps > 0 ? 'SESSION COMPLETE' : 'INCOMPLETE SESSION'}</Text>
          <Text style={styles.title}>{reps > 0 ? 'Great work!' : 'No reps saved'}</Text>
          <Text style={styles.coachText}>
            {reps > 0 ? coachMessage : 'This attempt will stay out of your plan progress and leaderboard.'}
          </Text>

          <Text style={styles.bigReps}>{reps}</Text>
          <Text style={styles.bigRepsLabel}>PUSHUPS</Text>

          <View style={styles.metricsGrid}>
            <MetricTile icon="time-outline" label="Duration" value={formatTime(duration)} />
            <MetricTile icon="flame-outline" label="Calories" value={`${calories}`} />
            <MetricTile icon="shield-checkmark-outline" label="Quality" value={`${qualityScore}%`} />
            <MetricTile icon="camera-outline" label="Camera" value={cameraMode} />
          </View>

          <View style={styles.nextCard}>
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            <View style={styles.nextCopy}>
              <Text style={styles.nextTitle}>Next session</Text>
              <Text style={styles.nextText}>
                {nextDay?.scheduledAt
                  ? `Day ${nextDay.day} at ${formatPreferredTime(plan?.preferredTime ?? '07:30')}`
                  : 'Plan complete. Rebuild when you are ready.'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <NeonButton title={saving ? 'Saving...' : reps > 0 ? 'Save & Go Home' : 'Close Session'} onPress={() => saveAndGo('/(tabs)')} disabled={saving} />
            <Pressable
              style={[styles.secondaryBtn, saving && styles.secondaryBtnDisabled]}
              onPress={() => saveAndGo('/(tabs)/profile')}
              disabled={saving}
            >
              <Ionicons name="stats-chart" size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>View Profile Stats</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MetricTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Ionicons name={icon as any} size={20} color={colors.accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  trophyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentDark,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: { 
    ...typography.label, 
    color: colors.accentStrong,
    letterSpacing: 2,
  },
  title: { 
    ...typography.titleLarge, 
    color: colors.textPrimary, 
    textAlign: 'center',
  },
  coachText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  bigReps: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -2,
    marginTop: spacing.sm,
  },
  bigRepsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 3,
    marginTop: -spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.lg,
  },
  metricTile: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: { ...typography.bodyBold, color: colors.textPrimary },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  nextCard: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  nextCopy: { flex: 1, gap: 2 },
  nextTitle: { ...typography.captionBold, color: colors.accent },
  nextText: { ...typography.bodySmall, color: colors.textPrimary },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  secondaryBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(32, 37, 50, 0.4)',
  },
  secondaryBtnText: { ...typography.bodyBold, color: colors.textPrimary },
  secondaryBtnDisabled: { opacity: 0.5 },
});
