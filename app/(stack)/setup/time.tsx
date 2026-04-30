import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { usePlanStore, useSettingsStore, useUserStore } from '../../../src/store';
import { generateTrainingPlan } from '../../../src/utils/planGenerator';
import { syncNotificationsForPlan } from '../../../src/services/notifications';
import { debugPlanSetup } from '../../../src/utils/debug';

const FALLBACK_WORKOUT_TIME = '07:30';

function cleanTime(value?: string | null) {
  if (typeof value !== 'string') return null;

  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

export default function SetupTimeScreen() {
  const router = useRouter();
  const setupDraft = usePlanStore((state) => state.setupDraft);
  const setPlan = usePlanStore((state) => state.setPlan);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const [preferredTime, setPreferredTime] = useState(
    cleanTime(setupDraft.preferredTime) ?? cleanTime(settings.defaultWorkoutTime) ?? FALLBACK_WORKOUT_TIME
  );
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    const normalizedTime = cleanTime(preferredTime);
    if (!setupDraft.level || !setupDraft.goal || !setupDraft.trainingDays.length || !normalizedTime) {
      Alert.alert('Plan needs a little more detail', 'Use a 24-hour time like 07:30 and complete the previous steps.');
      return;
    }

    setSaving(true);
    try {
      debugPlanSetup('time selected', { preferredTime: normalizedTime });
      updateSetupDraft({ preferredTime: normalizedTime });
      updateUser({ displayName: user.displayName || user.name });

      const plan = generateTrainingPlan({
        level: setupDraft.level,
        goal: setupDraft.goal,
        trainingDays: setupDraft.trainingDays,
        preferredTime: normalizedTime,
      });

      const nextSettings = {
        ...settings,
        defaultWorkoutTime: normalizedTime,
      };
      updateSettings(nextSettings);

      const notificationIds = await syncNotificationsForPlan({
        plan,
        user,
        notificationsEnabled: settings.notificationsEnabled,
        workoutReminderEnabled: settings.workoutReminderEnabled,
        missedReminderEnabled: settings.missedReminderEnabled,
      });

      setPlan({ ...plan, notificationIds });
      router.dismissAll();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepText}>Step 4 of 4</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Choose training time</Text>
        <Text style={styles.subtitle}>This screen only sets when workouts land on your selected days.</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>WORKOUT TIME</Text>
          <View style={styles.inputRow}>
            <Ionicons name="time-outline" size={22} color={colors.accent} />
            <TextInput
              testID="setup-time-input"
              accessibilityLabel="setup-time-input"
              value={preferredTime}
              onChangeText={setPreferredTime}
              placeholder="07:30"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              style={styles.input}
              maxLength={5}
            />
          </View>
          <Text style={styles.hint}>Use 24-hour time, for example 07:30 or 18:15.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton
          title={saving ? 'Generating...' : 'Generate My Plan'}
          onPress={handleFinish}
          disabled={saving || !cleanTime(preferredTime)}
          testID="setup-generate-plan"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  stepText: { ...typography.bodyBold, color: colors.textSecondary },
  placeholder: { width: 40 },
  content: { padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { ...typography.headline, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  panel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...typography.label, color: colors.accent },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  input: { flex: 1, ...typography.bodyBold, color: colors.textPrimary, paddingVertical: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
});
