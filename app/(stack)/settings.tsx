import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing, typography } from '../../src/theme';
import { useSubscription } from '../../src/revenuecat';
import { usePlanStore, useSettingsStore, useUserStore, type Day } from '../../src/store';
import { cancelPlanNotifications, requestNotificationPermission, syncNotificationsForPlan } from '../../src/services/notifications';
import { formatPreferredTime } from '../../src/utils';

export default function SettingsScreen() {
  const router = useRouter();
  const { activeProductIdentifier, isPro, restore, showCustomerCenter } = useSubscription();
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const plan = usePlanStore((state) => state.plan);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const [timeDraft, setTimeDraft] = useState(cleanTime(plan?.preferredTime ?? settings.defaultWorkoutTime));
  const [timeSaving, setTimeSaving] = useState(false);

  const resyncNotifications = async (nextSettings = settings, nextPlan = plan) => {
    if (!nextPlan) return [];
    const ids = await syncNotificationsForPlan({
      plan: nextPlan,
      user,
      notificationsEnabled: nextSettings.notificationsEnabled,
      workoutReminderEnabled: nextSettings.workoutReminderEnabled,
      missedReminderEnabled: nextSettings.missedReminderEnabled,
    });
    updatePlan({ notificationIds: ids });
    return ids;
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      if (plan) await cancelPlanNotifications(plan.notificationIds);
      updateSettings({ notificationsEnabled: false, workoutReminderEnabled: false, missedReminderEnabled: false });
      updatePlan({ notificationIds: [] });
      return;
    }

    const granted = await requestNotificationPermission();
    const nextSettings = { ...settings, notificationsEnabled: granted, workoutReminderEnabled: granted, missedReminderEnabled: granted };
    updateSettings(nextSettings);
    await resyncNotifications(nextSettings);

    if (!granted) {
      Alert.alert('Notifications are off', 'Enable notifications in iOS Settings to receive workout reminders.');
    }
  };

  const updateReminderSetting = async (key: 'workoutReminderEnabled' | 'missedReminderEnabled', value: boolean) => {
    const nextSettings = { ...settings, [key]: value };
    updateSettings(nextSettings);
    await resyncNotifications(nextSettings);
  };

  const saveWorkoutTime = async () => {
    const preferredTime = cleanTime(timeDraft);
    if (!isValidTime(preferredTime)) {
      Alert.alert('Check the time', 'Use 24-hour format, for example 07:30 or 18:15.');
      return;
    }

    setTimeSaving(true);
    const nextSettings = { ...settings, defaultWorkoutTime: preferredTime };
    updateSettings({ defaultWorkoutTime: preferredTime });

    try {
      if (plan) {
        const days = reschedulePlanDays(plan.days, preferredTime);
        const nextPlan = { ...plan, preferredTime, days };
        updatePlan({ preferredTime, days });
        const notificationIds = await resyncNotifications(nextSettings, nextPlan);
        updatePlan({ notificationIds });
      }
    } catch (error) {
      console.warn('Failed to resync workout reminders after time change.', error);
      Alert.alert('Time saved', 'The workout time was saved, but reminders could not be refreshed right now.');
    } finally {
      setTimeDraft(preferredTime);
      setTimeSaving(false);
    }
  };

  const preferredTime = cleanTime(plan?.preferredTime ?? settings.defaultWorkoutTime);
  const timeChanged = cleanTime(timeDraft) !== preferredTime;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Account">
          <NavRow icon="person-outline" label="Edit profile" value={user.displayName || user.name} onPress={() => router.push('/(stack)/settings/edit-profile' as any)} />
        </Section>

        <Section title="Training">
          <InfoRow label="Current plan" value={plan ? plan.name : 'No plan'} />
          <Divider />
          <TimeRow
            value={timeDraft}
            displayValue={formatPreferredTime(preferredTime)}
            changed={timeChanged}
            saving={timeSaving}
            onChange={setTimeDraft}
            onSave={saveWorkoutTime}
          />
          <Divider />
          <NavRow icon="calendar-outline" label="Rebuild plan" onPress={() => router.push('/(stack)/setup/level' as any)} />
        </Section>

        <Section title="Reminders">
          <ToggleRow
            label="Workout reminders"
            description="Notify me at my selected workout time."
            value={settings.notificationsEnabled && settings.workoutReminderEnabled}
            onChange={(value) => (value ? toggleNotifications(true) : updateReminderSetting('workoutReminderEnabled', false))}
          />
          <Divider />
          <ToggleRow
            label="Missed workout follow-up"
            description="Send one local reminder if I have not started after 30 minutes."
            value={settings.notificationsEnabled && settings.missedReminderEnabled}
            onChange={(value) => updateReminderSetting('missedReminderEnabled', value)}
            disabled={!settings.notificationsEnabled}
          />
        </Section>

        <Section title="Workout feedback">
          <ToggleRow label="Sound" description="Count reps aloud during sessions." value={settings.soundEnabled} onChange={(soundEnabled) => updateSettings({ soundEnabled })} />
          <Divider />
          <ToggleRow label="Haptics" description="Confirm counted reps with vibration." value={settings.hapticsEnabled} onChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })} />
        </Section>

        <Section title="Subscription">
          <InfoRow label="Plan" value={isPro ? activeProductIdentifier ?? 'Pro' : 'Free'} />
          <Divider />
          <ActionRow icon="card-outline" label="Manage subscription" onPress={() => showCustomerCenter().catch(() => undefined)} />
          <Divider />
          <ActionRow icon="refresh-outline" label="Restore purchases" onPress={() => restore().catch(() => undefined)} />
        </Section>

        <Section title="Privacy and legal">
          <NavRow icon="camera-outline" label="Camera and workout data" onPress={() => router.push('/(stack)/legal/data-camera' as any)} />
          <Divider />
          <NavRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/(stack)/legal/privacy' as any)} />
          <Divider />
          <NavRow icon="reader-outline" label="Terms of Use" onPress={() => router.push('/(stack)/legal/terms' as any)} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function cleanTime(value?: string | null) {
  const match = value?.match(/^(\d{1,2})(?::?(\d{0,2}))?$/);
  if (!match) return '07:30';

  const hours = Math.min(23, Number(match[1] || 7));
  const minutes = Math.min(59, Number((match[2] || '30').padEnd(2, '0')));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function reschedulePlanDays(days: Day[], preferredTime: string) {
  const [hours, minutes] = preferredTime.split(':').map(Number);

  return days.map((day) => {
    if (day.status === 'rest' || !day.scheduledAt) return day;

    const scheduledAt = new Date(day.scheduledAt);
    scheduledAt.setHours(hours, minutes, 0, 0);
    return { ...day, scheduledAt: scheduledAt.toISOString() };
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function TimeRow({
  value,
  displayValue,
  changed,
  saving,
  onChange,
  onSave,
}: {
  value: string;
  displayValue: string;
  changed: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.timeRow}>
      <View style={styles.timeCopy}>
        <Text style={styles.rowLabel}>Workout time</Text>
        <Text style={styles.rowValue}>{displayValue}</Text>
      </View>
      <View style={styles.timeEditor}>
        <TextInput
          style={styles.timeInput}
          value={value}
          onChangeText={onChange}
          placeholder="07:30"
          placeholderTextColor={colors.textMuted}
          maxLength={5}
          keyboardType="numbers-and-punctuation"
        />
        {changed ? (
          <Pressable style={styles.saveTimeButton} onPress={onSave} disabled={saving}>
            <Text style={styles.saveTimeText}>{saving ? '...' : 'Save'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function NavRow({ icon, label, value, onPress }: { icon: string; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.navLabel}>
        <Ionicons name={icon as any} size={19} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.navValue}>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.navLabel}>
        <Ionicons name={icon as any} size={19} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

function ToggleRow({ label, description, value, disabled, onChange }: { label: string; description: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={[styles.toggleRow, disabled && styles.disabledRow]}>
      <View style={styles.toggleCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.accent }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { ...typography.titleMedium, color: colors.textPrimary },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 112 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.textMuted, marginLeft: spacing.xs },
  sectionBody: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  infoRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  navRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  timeRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  timeCopy: { flex: 1, minWidth: 0 },
  timeEditor: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timeInput: {
    width: 68,
    minHeight: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
    textAlign: 'center',
    ...typography.bodyBold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xs,
  },
  saveTimeButton: {
    minWidth: 52,
    minHeight: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  saveTimeText: { ...typography.captionBold, color: colors.background },
  rowPressed: { backgroundColor: colors.cardSecondary },
  navLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navValue: { maxWidth: '46%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowLabel: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  rowValue: { ...typography.bodySmall, color: colors.textSecondary },
  rowDescription: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.md },
  toggleRow: {
    minHeight: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabledRow: { opacity: 0.5 },
  toggleCopy: { flex: 1 },
});
