import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton, ProBadge } from '../../src/components';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore, type Day, type Plan } from '../../src/store';
import { resolveCameraModeForAccess, useSubscription } from '../../src/subscriptions';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { useResponsive } from '../../src/hooks';
import { formatPreferredTime, getCurrentPlanDay } from '../../src/utils';
import { cancelPlanNotifications, syncNotificationsForPlan } from '../../src/services/notifications';
import { useAppLocale } from '../../src/localization';
import { localizePlanName } from '../../src/localization/planNames';

function groupWeeks(days: Day[]) {
  const weeks: Day[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function dayLabel(date: string, locale: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
}

function repsLabel(day: Day | null, recoveryLabel: string) {
  if (!day || day.status === 'rest') return recoveryLabel;
  return day.sets?.join('-') ?? `${day.targetReps ?? 0} reps`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, locale } = useAppLocale();
  const { horizontalPadding } = useResponsive();
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const { isPro, showPaywall } = useSubscription();
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const plan = usePlanStore((state) => state.plan);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const markCurrentDayStarted = usePlanStore((state) => state.markCurrentDayStarted);
  const [expandedWeek, setExpandedWeek] = useState(0);

  const currentDay = getCurrentPlanDay(plan);
  const planDays = Array.isArray(plan?.days) ? plan.days : [];
  const trainingDays = Array.isArray(plan?.trainingDays) ? plan.trainingDays : [];
  const preferredTime = plan?.preferredTime ?? '07:30';
  const weeks = useMemo(() => groupWeeks(planDays), [planDays]);
  const progress = plan ? Math.round(((plan.completedDays ?? 0) / Math.max(1, planDays.filter((day) => day.status !== 'rest').length)) * 100) : 0;

  const handleStartSession = async () => {
    if (!plan || !currentDay || currentDay.status === 'rest') return;

    const startedAt = new Date().toISOString();
    const nextPlan: Plan = {
      ...plan,
      days: plan.days.map((day, index) =>
        index === plan.currentDayIndex ? { ...day, startedAt, status: 'current' } : day
      ),
    };

    markCurrentDayStarted();
    startWorkout(
      'sets',
      resolveCameraModeForAccess(settings.defaultCameraMode, isPro),
      currentDay.targetReps,
      currentDay.sets,
      currentDay.restTime
    );

    await cancelPlanNotifications(plan.notificationIds);
    const notificationIds = await syncNotificationsForPlan({
      plan: nextPlan,
      user,
      notificationsEnabled: settings.notificationsEnabled,
      workoutReminderEnabled: settings.workoutReminderEnabled,
      missedReminderEnabled: settings.missedReminderEnabled,
      habitNudgeEnabled: settings.habitNudgeEnabled,
    });
    updatePlan({ notificationIds });

    router.push('/workout-session' as any);
  };

  const promptPro = async () => {
    try {
      await showPaywall();
    } catch (error) {
      Alert.alert(
        t('home.proFeatureTitle'),
        error instanceof Error ? error.message : t('home.proFeatureBody')
      );
    }
  };

  if (!plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.emptyState, { paddingHorizontal: horizontalPadding }]}>
          <Ionicons name="calendar-outline" size={34} color={colors.accent} />
          <Text style={styles.emptyTitle}>{t('home.setUpPlan')}</Text>
          <Text style={styles.emptyText}>
            {t('home.setUpPlanBody')}
          </Text>
          <NeonButton
            title={t('home.startSetup')}
            onPress={() => router.replace('/onboarding' as any)}
            testID="start-plan-setup"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.planName}>{localizePlanName(plan.name, t)}</Text>
        </View>

        <View style={[styles.todayCard, { marginHorizontal: horizontalPadding }]}>
          <View style={styles.todayHeader}>
            <View style={styles.todayTitleBox}>
              <Text style={styles.todayLabel}>{currentDay?.status === 'rest' ? t('home.recovery') : t('home.today')}</Text>
              <Text style={styles.todayTitle}>{currentDay ? `${t('home.day', { number: currentDay.day })}: ${repsLabel(currentDay, t('home.recovery'))}` : t('home.planReady')}</Text>
            </View>
            <Text style={styles.todayTime}>{formatPreferredTime(preferredTime)}</Text>
          </View>

          <View style={styles.todayDetailsRow}>
            <View style={styles.todayDetailItem}>
              <Ionicons name="repeat" size={16} color={colors.textSecondary} />
              <Text style={styles.todayDetailText}>{t('home.sets', { count: currentDay?.sets?.length ?? 0 })}</Text>
            </View>
            <View style={styles.todayDetailItem}>
              <Ionicons name="timer-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.todayDetailText}>{t('home.restSeconds', { count: currentDay?.restTime ?? 0 })}</Text>
            </View>
          </View>

          {currentDay?.status === 'rest' ? (
            <View style={styles.restPanel}>
              <Text style={styles.restText}>{t('home.recoveryDay')}</Text>
            </View>
          ) : (
            <Pressable style={styles.todayStartButton} onPress={handleStartSession}>
              <Text style={styles.todayStartText}>{t('home.startSession')}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </Pressable>
          )}
        </View>

        <View style={[styles.progressPanel, { marginHorizontal: horizontalPadding }]}>
          <View style={styles.progressStatsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress}%</Text>
              <Text style={styles.statLabel}>{t('home.progress')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{plan.completedDays}</Text>
              <Text style={styles.statLabel}>{t('home.done')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{trainingDays.length}</Text>
              <Text style={styles.statLabel}>{t('home.daysPerWeek')}</Text>
            </View>
          </View>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={[styles.weekContainer, { marginHorizontal: horizontalPadding }]}>
            <Pressable style={styles.weekHeader} onPress={() => setExpandedWeek(expandedWeek === weekIndex ? -1 : weekIndex)}>
              <Text style={styles.weekTitle}>{t('home.week', { number: weekIndex + 1 })}</Text>
              <Text style={styles.weekRatio}>{week.filter((day) => day.status === 'completed').length}/{week.filter((day) => day.status !== 'rest').length}</Text>
            </Pressable>

            {expandedWeek === weekIndex && (
              <View style={styles.daysList}>
                {week.map((day) => (
                  <View key={day.day} style={[styles.dayCard, day.status === 'current' && styles.dayCardCurrent]}>
                    <View style={styles.dayLabelBox}>
                      <Text style={styles.dayLabelText}>{dayLabel(day.date, locale)}</Text>
                      <Text style={styles.dayNumber}>{day.day}</Text>
                    </View>
                    <View style={styles.dayDetails}>
                      <Text style={styles.dayReps}>{repsLabel(day, t('home.recovery'))}</Text>
                      <Text style={styles.dayRestText}>{day.status === 'rest' ? t('home.recoveryDay') : t('home.restSeconds', { count: day.restTime ?? 0 })}</Text>
                    </View>
                    <Ionicons
                      name={day.status === 'completed' ? 'checkmark-circle' : day.status === 'current' ? 'play-circle' : day.status === 'rest' ? 'moon' : 'lock-closed-outline'}
                      size={22}
                      color={day.status === 'current' || day.status === 'completed' ? colors.accent : colors.textSecondary}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={[styles.changePlanArea, { paddingHorizontal: horizontalPadding }]}>
          {!isPro ? (
            <View style={styles.changePlanProRow}>
              <ProBadge />
              <Text style={styles.changePlanProText}>{t('home.planRebuilds')}</Text>
            </View>
          ) : null}
          <NeonButton
            title={t('home.changePlan')}
            variant="outline"
            onPress={() => {
              if (!isPro) {
                void promptPro();
                return;
              }
              updateSetupDraft({
                level: plan.level,
                goal: plan.goal,
                trainingDays: plan.trainingDays,
                preferredTime,
              });
              router.push('/onboarding?mode=rebuild&returnTo=home' as any);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 112, gap: spacing.lg },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: 96,
  },
  emptyTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  planName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressPanel: {
    padding: spacing.md,
    gap: spacing.md,
  },
  eyebrow: { ...typography.captionBold, color: colors.accent, letterSpacing: 2 },
  title: { ...typography.titleMedium, color: colors.textPrimary, fontSize: 22 },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  energyText: { ...typography.captionBold, color: colors.textPrimary },
  calendarRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  calendarBox: {
    width: 58,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 6,
  },
  calendarBoxActive: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  calendarDayText: { ...typography.captionBold, color: colors.textPrimary, fontSize: 14 },
  calendarEmoji: { ...typography.captionBold, color: colors.textSecondary, fontSize: 10 },
  coachCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(32, 37, 50, 0.62)',
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  coachIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  coachCopy: { flex: 1, gap: spacing.xs },
  coachLabel: { ...typography.captionBold, color: colors.accent, textTransform: 'uppercase' },
  coachText: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20 },
  mainCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: spacing.lg,
  },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  programInfo: { flex: 1, gap: 4 },
  programLabel: { ...typography.captionBold, color: colors.accent, letterSpacing: 1.5, fontSize: 9 },
  programTitle: { ...typography.titleMedium, color: colors.textPrimary, fontSize: 22 },
  progressCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDark,
  },
  progressCircleText: { ...typography.captionBold, color: colors.textPrimary },
  progressStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'flex-start' },
  statValue: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 },
  statLabel: { ...typography.captionBold, color: colors.textMuted, fontSize: 9 },
  statDivider: { width: 1, height: 22, backgroundColor: colors.borderStrong },
  miniTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  miniFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  todayCard: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  todayTitleBox: { flex: 1, gap: 4 },
  todayLabel: { ...typography.captionBold, color: colors.textSecondary },
  todayEyebrow: { ...typography.captionBold, color: colors.accent, letterSpacing: 1.5, fontSize: 9 },
  todayTitle: { ...typography.titleMedium, color: colors.textPrimary, fontSize: 18 },
  todayTime: { ...typography.captionBold, color: colors.textPrimary },
  todayBadge: {
    backgroundColor: colors.accentDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignSelf: 'flex-start',
  },
  todayBadgeText: { ...typography.captionBold, color: colors.accent, fontSize: 10 },
  todayDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  todayDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayDetailText: { ...typography.captionBold, color: colors.textSecondary },
  todayStartButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    gap: 8,
  },
  todayStartText: { ...typography.bodyBold, color: colors.textInverse, fontSize: 14 },
  restPanel: { padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundElevated },
  restText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  changePlanArea: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  changePlanProRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  changePlanProText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  weekContainer: { marginBottom: spacing.sm },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, alignItems: 'center' },
  weekTitle: { ...typography.bodyBold, color: colors.textPrimary },
  weekRatio: { ...typography.captionBold, color: colors.accent },
  daysList: { gap: spacing.sm },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  dayCardCurrent: { backgroundColor: colors.surfaceStrong, borderRadius: 16 },
  dayLabelBox: { alignItems: 'center', width: 54 },
  dayLabelText: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  dayNumber: { ...typography.titleMedium, color: colors.textPrimary },
  dayDetails: { flex: 1, gap: 2 },
  dayReps: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 },
  dayRestText: { ...typography.caption, color: colors.textSecondary },
});
