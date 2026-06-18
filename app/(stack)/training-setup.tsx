import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../src/analytics';
import { NeonButton } from '../../src/components';
import { useWorkoutStore, useSettingsStore, type WorkoutType } from '../../src/store';
import { resolveCameraModeForAccess, useSubscription } from '../../src/subscriptions';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { useAppLocale } from '../../src/localization';

function parseNumberParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseSetsParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw === 'undefined') return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number) : undefined;
  } catch {
    return undefined;
  }
}

export default function TrainingSetupScreen() {
  const posthog = useAnalytics();
  const router = useRouter();
  const { t } = useAppLocale();
  const params = useLocalSearchParams();
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const { settings, hasCompletedOnboarding } = useSettingsStore();
  const { isPro } = useSubscription();

  React.useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [hasCompletedOnboarding, router]);

  const type = (Array.isArray(params.type) ? params.type[0] : params.type || 'open') as WorkoutType;
  const modeCopy = {
    sets: { title: t('practice.setsTitle'), subtitle: t('practice.setsSubtitle') },
    open: { title: t('practice.openTitle'), subtitle: t('practice.openSubtitle') },
    timer: { title: t('practice.timerTitle'), subtitle: t('practice.timerSubtitle') },
    limit: { title: t('practice.limitTitle'), subtitle: t('practice.limitSubtitle') },
  }[type] ?? { title: t('training.startSession'), subtitle: t('practice.setsSubtitle') };
  const goal = parseNumberParam(params.goal);
  const restTime = parseNumberParam(params.restTime);
  const sets = parseSetsParam(params.sets);
  const cameraMode = resolveCameraModeForAccess(settings.defaultCameraMode, isPro);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('training.prepare')}</Text>
          <Text style={styles.title}>{modeCopy.title}</Text>
          <Text style={styles.subtitle}>{modeCopy.subtitle}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="fitness-outline" size={20} color={colors.accent} />
            <Text style={styles.summaryTitle}>{t('training.details')}</Text>
          </View>
          <View style={styles.detailsList}>
            <DetailRow label={t('training.mode')} value={type.toUpperCase()} />
            {goal ? <DetailRow label={t('training.goal')} value={t('training.repsValue', { count: goal })} /> : null}
            {sets?.length ? <DetailRow label={t('training.structure')} value={`${sets.join('-')} ${t('profile.repsUnit').toLowerCase()}`} /> : null}
            {restTime ? <DetailRow label={t('training.rest')} value={t('training.secondsValue', { count: restTime })} /> : null}
            <DetailRow 
              label={t('training.camera')} 
              value={cameraMode === 'faceFocus' ? t('settings.faceFocus') : t('settings.fullScene')}
              isDimmed
            />
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={18} color={colors.warning} />
          <Text style={styles.tipText}>
            {t('training.tip')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton
          title={t('training.startLive')}
          onPress={() => {
            posthog.capture('workout_started', { type, camera_mode: cameraMode });
            startWorkout(type, cameraMode, goal, sets, restTime);
            router.replace('/workout-session');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, isDimmed }: { label: string; value: string; isDimmed?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, isDimmed && { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 32 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.5 },
  title: { ...typography.titleLarge, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryTitle: { ...typography.bodyBold, color: colors.textPrimary },
  detailsList: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { ...typography.bodySmall, color: colors.textSecondary },
  detailValue: { ...typography.bodyBold, color: colors.textPrimary },
  tipCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  tipText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 16 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
