import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing, typography } from '../../src/theme';
import { useSubscription } from '../../src/revenuecat';
import { usePlanStore, useSettingsStore, useUserStore, type Day } from '../../src/store';
import { cancelPlanNotifications, requestNotificationPermission, syncNotificationsForPlan } from '../../src/services/notifications';
import { formatPreferredTime } from '../../src/utils';

const APP_URL = 'https://nexfiy.com/apps/ai-pushup-coach';
const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export default function SettingsScreen() {
  const router = useRouter();
  const { activeProductIdentifier, error: subscriptionError, isPro, restore, showCustomerCenter, showPaywall } = useSubscription();
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setAllowGuestMode = useSettingsStore((state) => state.setAllowGuestMode);
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

  const restoreSubscription = async () => {
    try {
      await restore();
      Alert.alert('Restore complete', 'Your subscription status has been refreshed.');
    } catch (error) {
      Alert.alert(
        'Restore unavailable',
        'We could not restore purchases right now. Your local app access is unchanged.'
      );
    }
  };

  const openPaywall = async () => {
    const unlocked = await showPaywall();
    if (unlocked) {
      Alert.alert('Pro unlocked', 'Your subscription status has been refreshed.');
    }
  };

  const openAppStoreSubscriptions = async () => {
    try {
      await showCustomerCenter();
    } catch (error) {
      try {
        await Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL);
      } catch {
        Alert.alert(
          'Could not open subscriptions',
          'Open iOS Settings, tap your Apple ID, then Subscriptions to manage your plan.'
        );
      }
    }
  };

  const openAppWebsite = async () => {
    const canOpen = await Linking.canOpenURL(APP_URL);
    if (canOpen) {
      await Linking.openURL(APP_URL);
    } else {
      Alert.alert('Link unavailable', APP_URL);
    }
  };

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
          <Divider />
          <NavRow icon="flag-outline" label="Country" value={user.countryName} onPress={() => router.push('/(stack)/settings/country' as any)} />
          {settings.allowGuestMode ? (
            <>
              <Divider />
              <ActionRow
                icon="log-in-outline"
                label="Use signed-in account"
                onPress={() => {
                  setAllowGuestMode(false);
                  router.replace('/(auth)/sign-in' as any);
                }}
              />
            </>
          ) : null}
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

        <Section title="Session behavior">
          <ChoiceRow
            label="Camera focus mode"
            description="Face Focus tracks your head height. Full Scene uses the whole frame."
            options={[
              { label: 'Face Focus', value: 'faceFocus' },
              { label: 'Full Scene', value: 'fullScene' }
            ]}
            value={settings.defaultCameraMode}
            onChange={(val) => updateSettings({ defaultCameraMode: val as any })}
          />
        </Section>

        <Section title="Subscription">
          <InfoRow label="Plan" value={isPro ? activeProductIdentifier ?? 'Pro' : 'Free'} />
          {subscriptionError ? (
            <>
              <Divider />
              <InfoRow label="Status" value="Offline safe mode" />
            </>
          ) : null}
          {!isPro ? (
            <>
              <Divider />
              <ActionRow icon="sparkles-outline" label="Upgrade to Pro" onPress={openPaywall} />
            </>
          ) : null}
          <Divider />
          <ActionRow icon="refresh-outline" label="Restore purchases" onPress={restoreSubscription} />
          <Divider />
          <ActionRow icon="card-outline" label="Manage subscription" onPress={openAppStoreSubscriptions} />
        </Section>

        <Section title="Privacy and legal">
          <NavRow icon="camera-outline" label="Camera and workout data" onPress={() => router.push('/(stack)/legal/data-camera' as any)} />
          <Divider />
          <NavRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/(stack)/legal/privacy' as any)} />
          <Divider />
          <NavRow icon="reader-outline" label="Terms of Use" onPress={() => router.push('/(stack)/legal/terms' as any)} />
          <Divider />
          <ActionRow icon="open-outline" label="Open Nexfiy app page" onPress={openAppWebsite} />
        </Section>

        {/* Developer / Testing Options */}
        {__DEV__ ? (
          <Section title="Developer options">
            <NavRow icon="bug-outline" label="Debug logs" onPress={() => router.push('/(stack)/debug-logs' as any)} />
            <Divider />
            <ActionRow
              icon="refresh-circle-outline"
              label="Redo onboarding"
              onPress={() => {
                useSettingsStore.getState().resetOnboarding();
                router.replace('/');
              }}
            />
          </Section>
        ) : null}
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
  const initialDate = new Date();
  const [hours, minutes] = value.split(':').map(Number);
  initialDate.setHours(hours, minutes || 0, 0, 0);

  return (
    <View style={styles.timeRow}>
      <View style={styles.timeCopy}>
        <Text style={styles.rowLabel}>Workout time</Text>
        <Text style={styles.rowValue}>{displayValue}</Text>
      </View>
      <View style={styles.timeEditor}>
        <DateTimePicker
          value={initialDate}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              const newTime = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
              onChange(newTime);
            }
          }}
          textColor={colors.textPrimary}
          style={{ width: 100 }}
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

function ChoiceRow({ 
  label, 
  description, 
  options, 
  value, 
  onChange 
}: { 
  label: string; 
  description: string; 
  options: Array<{ label: string; value: string }>; 
  value: string; 
  onChange: (val: string) => void; 
}) {
  return (
    <View style={styles.choiceRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <View style={styles.pillsContainer}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable 
              key={opt.value} 
              onPress={() => onChange(opt.value)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
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
  saveTimeButton: {
    minWidth: 52,
    minHeight: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  saveTimeText: { ...typography.captionBold, color: colors.textInverse },
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
  choiceRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 4,
    borderRadius: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textInverse,
  },
});
