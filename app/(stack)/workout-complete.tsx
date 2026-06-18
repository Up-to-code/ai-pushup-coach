import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAnalytics } from '../../src/analytics';
import { useAuth } from '../../src/auth';
import { NeonButton } from '../../src/components';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore } from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { getCurrentPlanDay, formatPreferredTime } from '../../src/utils';
import { syncNotificationsForPlan } from '../../src/services/notifications';
import { savePushupWorkoutToAppleHealth, shouldExportWorkoutToAppleHealth } from '../../src/services/appleHealth';
import { useAppLocale } from '../../src/localization';

export default function WorkoutCompleteScreen() {
  const posthog = useAnalytics();
  const { t } = useAppLocale();
  const router = useRouter();
  const auth = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const submitWorkout = useMutation(api.workouts.submitWorkout);
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { currentWorkout, lastCompletedWorkout, markWorkoutAppleHealthSynced, markWorkoutSynced, workouts } = useWorkoutStore();
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
  const convexUserId = auth.clientUserId ?? user.id;
  const canSyncConvex = Boolean(auth.status === 'signedIn' && isConvexAuthenticated && auth.clientUserId);

  const reps = workoutSnapshot?.reps ?? 0;
  const duration = workoutSnapshot?.duration ?? 0;
  const calories = Math.round(reps * 0.29);
  const qualityScore = workoutSnapshot?.qualityScore ?? 84;

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

  const saveAndGo = async (href: string) => {
    if (saving || navigationStartedRef.current || !workoutSnapshot) return;
    navigationStartedRef.current = true;
    setSaving(true);
    const completedWorkoutId = workoutSnapshot.id;

    try {
      if (canSyncConvex && reps > 0 && completedWorkoutId && !workoutSnapshot.synced) {
        await submitWorkout({
          clientUserId: convexUserId,
          clientWorkoutId: completedWorkoutId,
          date: workoutSnapshot.date || new Date().toISOString(),
          type: workoutSnapshot.type || 'open',
          trainingCameraMode: workoutSnapshot.trainingCameraMode || 'faceFocus',
          reps,
          duration,
          calories,
          completed: true,
          goal: workoutSnapshot.goal,
          sets: workoutSnapshot.sets,
          restTime: workoutSnapshot.restTime,
          formFeedbackState: workoutSnapshot.formFeedbackState,
          cameraPresentationState: workoutSnapshot.cameraPresentationState,
          qualityScore,
        });
        markWorkoutSynced(completedWorkoutId);
      }

      if (reps > 0) {
        posthog.capture('workout_completed', {
          reps,
          duration,
          calories,
          quality_score: qualityScore,
          workout_type: workoutSnapshot.type ?? null,
          camera_mode: workoutSnapshot.trainingCameraMode ?? null,
        });
      }

      if (settings.appleHealthWorkoutExportEnabled && completedWorkoutId && shouldExportWorkoutToAppleHealth(workoutSnapshot as any)) {
        const result = await savePushupWorkoutToAppleHealth(workoutSnapshot as any);
        if (result.ok) {
          markWorkoutAppleHealthSynced(completedWorkoutId);
          setWorkoutSnapshot((snapshot) =>
            snapshot?.id === completedWorkoutId
              ? { ...snapshot, appleHealthSyncedAt: Date.now() }
              : snapshot
          );
          posthog.capture('apple_health_workout_exported', {
            workout_id: completedWorkoutId,
            reps,
            duration,
            calories,
          });
        } else if (result.status !== 'skipped') {
          console.warn('Apple Health workout export skipped or failed', result);
          posthog.capture('apple_health_workout_export_failed', {
            workout_id: completedWorkoutId,
            status: result.status,
            reps,
          });
        }
      }
    } catch (error) {
      console.warn('Convex workout final save failed', error);
      posthog.captureError(error, {
        screen: 'workout_complete',
        action: 'save_workout',
        workout_id: completedWorkoutId ?? null,
        reps,
      });
    }

    router.replace(href as any);

    const currentPlan = usePlanStore.getState().plan;
    if (currentPlan) {
      void syncNotificationsForPlan({
        plan: currentPlan,
        user,
        notificationsEnabled: settings.notificationsEnabled,
        workoutReminderEnabled: settings.workoutReminderEnabled,
        missedReminderEnabled: settings.missedReminderEnabled,
        habitNudgeEnabled: settings.habitNudgeEnabled,
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

        <Text style={styles.title}>{reps > 0 ? t('workoutComplete.amazingTitle') : t('workoutComplete.incompleteTitle')}</Text>
        <Text style={styles.subtitle}>
          {reps > 0 ? t('workoutComplete.amazingBody') : t('workoutComplete.incompleteBody')}
        </Text>

        {/* Big number */}
        <Text style={styles.hugeNumber}>{reps}</Text>
        <Text style={styles.unit}>{t('workoutComplete.pushups')}</Text>

        {/* Metrics row (no cards) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>{formatTime(duration)}</Text>
            <Text style={styles.metricLabel}>{t('workoutComplete.duration')}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="flame-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>{calories}</Text>
            <Text style={styles.metricLabel}>{t('workoutComplete.calories')}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>{qualityScore}%</Text>
            <Text style={styles.metricLabel}>{t('workoutComplete.quality')}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricValue}>
              {workoutSnapshot?.trainingCameraMode === 'fullScene' ? t('workoutComplete.fullCamera') : t('workoutComplete.faceCamera')}
            </Text>
            <Text style={styles.metricLabel}>{t('workoutComplete.camera')}</Text>
          </View>
        </View>

        {/* Next session hint */}
        {plan && (
          <View style={styles.nextHint}>
            <Text style={styles.nextText}>
              {nextDay?.scheduledAt
                ? t('workoutComplete.nextSession', { day: nextDay.day, time: formatPreferredTime(plan.preferredTime ?? '07:30') })
                : t('workoutComplete.planComplete')}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <NeonButton
            title={saving ? t('common.saving') : reps > 0 ? t('common.done') : t('common.close')}
            onPress={() => saveAndGo('/')}
            disabled={saving}
          />
          <Pressable
            onPress={() => saveAndGo('/profile')}
            style={styles.linkButton}
            disabled={saving}
          >
            <Ionicons name="stats-chart" size={18} color={colors.accent} />
            <Text style={styles.linkText}>{t('workoutComplete.viewProfile')}</Text>
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
