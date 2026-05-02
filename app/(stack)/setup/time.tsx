import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton, CFEView } from '../../../src/components';
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

  const initialTimeStr = cleanTime(setupDraft.preferredTime) ?? cleanTime(settings.defaultWorkoutTime) ?? FALLBACK_WORKOUT_TIME;
  const initialDate = new Date();
  const [hours, minutes] = initialTimeStr.split(':').map(Number);
  initialDate.setHours(hours, minutes, 0, 0);

  const [preferredDate, setPreferredDate] = useState(initialDate);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    const normalizedTime = cleanTime(`${preferredDate.getHours()}:${preferredDate.getMinutes()}`);
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
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CFEView style={styles.container} withBackground={true}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Choose training time</Text>
        <Text style={styles.subtitle}>This screen only sets when workouts land on your selected days.</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>WORKOUT TIME</Text>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              testID="setup-time-picker"
              value={preferredDate}
              mode="time"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) setPreferredDate(selectedDate);
              }}
              textColor={colors.textPrimary}
              style={{ flex: 1 }}
            />
          </View>
          <Text style={styles.hint}>Use 24-hour time, for example 07:30 or 18:15.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton
          title={saving ? 'Generating...' : 'Generate My Plan'}
          onPress={handleFinish}
          disabled={saving || !preferredDate}
          testID="setup-generate-plan"
          variant="white"
        />
      </View>
    </CFEView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { ...typography.headline, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  panel: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  label: { ...typography.label, color: colors.textSecondary, letterSpacing: 1.2 },
  pickerContainer: {
    height: 200,
    backgroundColor: '#0A0A0A',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
});
