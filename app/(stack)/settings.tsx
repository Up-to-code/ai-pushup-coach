import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { clearLocalAuthState, useAuth } from '../../src/auth';
import { ProBadge } from '../../src/components';
import { canUseFullSceneCamera, PRODUCT_IDENTIFIERS, useSubscription } from '../../src/subscriptions';
import { appWebUrl, privacyUrl, supportUrl, termsUrl } from '../../src/config/links';
import { usePlanStore, useSettingsStore, useUserStore, type Day } from '../../src/store';
import { cancelPlanNotifications, requestNotificationPermission, syncNotificationsForPlan } from '../../src/services/notifications';
import { formatPreferredTime } from '../../src/utils';

const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

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

function formatSubscriptionPlanLabel(productIdentifier: string | null) {
  if (!productIdentifier) return 'Pro';
  if (productIdentifier === 'development-pro') return 'Development Pro';
  if (productIdentifier === PRODUCT_IDENTIFIERS.yearly) return 'Pro Yearly';
  if (productIdentifier === PRODUCT_IDENTIFIERS.monthly) return 'Pro Monthly';
  return 'Pro';
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

export default function SettingsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const isSignedIn = auth.status === 'signedIn' || auth.status === 'pendingDeletion';
  const userId = auth.clientUserId;
  const {
    activeProductIdentifier,
    configured: subscriptionConfigured,
    error: subscriptionError,
    isPro,
    loading: subscriptionLoading,
    products: subscriptionProducts,
    restore,
    showCustomerCenter,
    showPaywall,
  } = useSubscription();
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setAllowGuestMode = useSettingsStore((state) => state.setAllowGuestMode);
  const plan = usePlanStore((state) => state.plan);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const [timeDraft, setTimeDraft] = useState(cleanTime(plan?.preferredTime ?? settings.defaultWorkoutTime));
  const [timeSaving, setTimeSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const resyncNotifications = async (nextSettings = settings, nextPlan = plan) => {
    if (!nextPlan) return [];
    const ids = await syncNotificationsForPlan({
      plan: nextPlan,
      user,
      notificationsEnabled: nextSettings.notificationsEnabled,
      workoutReminderEnabled: nextSettings.workoutReminderEnabled,
      missedReminderEnabled: nextSettings.missedReminderEnabled,
      habitNudgeEnabled: nextSettings.habitNudgeEnabled,
    });
    updatePlan({ notificationIds: ids });
    return ids;
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      if (plan) await cancelPlanNotifications(plan.notificationIds);
      updateSettings({ notificationsEnabled: false, workoutReminderEnabled: false, missedReminderEnabled: false, habitNudgeEnabled: false });
      updatePlan({ notificationIds: [] });
      return;
    }
    const granted = await requestNotificationPermission();
    const nextSettings = {
      ...settings,
      notificationsEnabled: granted,
      workoutReminderEnabled: granted,
      missedReminderEnabled: granted,
      habitNudgeEnabled: granted ? settings.habitNudgeEnabled : false,
    };
    updateSettings(nextSettings);
    await resyncNotifications(nextSettings);
    if (!granted) {
      Alert.alert('Notifications are off', 'Enable notifications in iOS Settings to receive workout reminders.');
    }
  };

  const updateReminderSetting = async (key: 'workoutReminderEnabled' | 'missedReminderEnabled' | 'habitNudgeEnabled', value: boolean) => {
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
    updateSettings({ defaultWorkoutTime: preferredTime });
    try {
      if (plan) {
        const days = reschedulePlanDays(plan.days, preferredTime);
        const nextPlan = { ...plan, preferredTime, days };
        updatePlan({ preferredTime, days });
        const notificationIds = await resyncNotifications(settings, nextPlan);
        updatePlan({ notificationIds });
      }
    } catch (error) {
      console.warn(error);
      Alert.alert('Time saved', 'The workout time was saved, but reminders could not be refreshed right now.');
    } finally {
      setTimeDraft(preferredTime);
      setTimeSaving(false);
    }
  };

  const preferredTime = cleanTime(plan?.preferredTime ?? settings.defaultWorkoutTime);
  const timeChanged = cleanTime(timeDraft) !== preferredTime;
  const paywallAvailable = subscriptionConfigured && subscriptionProducts.length > 0;

  const restoreSubscription = async () => {
    if (subscriptionLoading || !subscriptionConfigured) return;

    try {
      await restore();
      Alert.alert('Restore complete', 'Your subscription status has been refreshed.');
    } catch {
      Alert.alert('Restore unavailable', 'We could not restore purchases right now. Your local app access is unchanged.');
    }
  };

  const openPaywall = async () => {
    if (subscriptionLoading) return;

    if (!paywallAvailable) {
      Alert.alert(
        'Pro setup required',
        subscriptionError ??
          'Apple StoreKit is not returning the subscription products yet. Restart the device and try again later, or test from a fresh TestFlight build.'
      );
      return;
    }

    try {
      const unlocked = await showPaywall();
      if (unlocked) Alert.alert('Pro unlocked', 'Your subscription status has been refreshed.');
    } catch (error) {
      console.warn('Paywall failed', error);
      Alert.alert(
        'Could not open paywall',
        error instanceof Error ? error.message : 'Check your connection and Adapty setup, then try again.'
      );
    }
  };

  const openAppStoreSubscriptions = async () => {
    if (subscriptionLoading) return;

    if (!subscriptionConfigured) {
      try {
        await Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL);
      } catch {
        Alert.alert('Could not open subscriptions', 'Open iOS Settings, tap your Apple ID, then Subscriptions to manage your plan.');
      }
      return;
    }

    try {
      await showCustomerCenter();
    } catch {
      try {
        await Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL);
      } catch {
        Alert.alert('Could not open subscriptions', 'Open iOS Settings, tap your Apple ID, then Subscriptions to manage your plan.');
      }
    }
  };

  const openAppWebsite = async () => {
    await Linking.openURL(appWebUrl);
  };

  const openWebUrl = async (url: string) => {
    await Linking.openURL(url);
  };

  const logOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await auth.logout();
      router.replace('/sign-in' as any);
    } catch (error) {
      console.warn('Logout failed', error);
      Alert.alert('Could not log out', 'Check your connection and try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      isSignedIn ? 'Delete account and data?' : 'Clear local data?',
      isSignedIn
        ? 'Your profile will be hidden immediately and your local data will be cleared. Synced data can be restored for 30 days. Active App Store subscriptions must still be managed from your Apple account.'
        : 'This clears workout history, settings, onboarding, and local app data on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSignedIn ? 'Delete account' : 'Clear data',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              if (isSignedIn && userId) {
                await deleteAccount({ clientUserId: userId });
              }
              if (isSignedIn) {
                await auth.logout();
              } else {
                await clearLocalAuthState();
              }
              router.replace('/sign-in' as any);
            } catch (error) {
              console.warn('Account deletion failed', error);
              Alert.alert(
                'Could not delete account',
                'Check your connection and try again. If it still fails, use the support link on the Push Counter website.'
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#000']} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="Account">
            <NavRow icon="person-outline" label="Edit profile" value={user.displayName || user.name} onPress={() => router.push('/settings/edit-profile' as any)} />
            <Divider />
            <NavRow icon="flag-outline" label="Country" value={user.countryName} onPress={() => router.push('/settings/country' as any)} />
            {settings.allowGuestMode && (
              <>
                <Divider />
                <ActionRow
                  icon="log-in-outline"
                  label="Use signed-in account"
                  onPress={() => {
                    setAllowGuestMode(false);
                    router.replace('/sign-in' as any);
                  }}
                />
              </>
            )}
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
            <NavRow
              icon={isPro ? 'calendar-outline' : 'lock-closed-outline'}
              label="Rebuild plan"
              badge={!isPro}
              onPress={() => {
                if (!isPro) {
                  void openPaywall();
                  return;
                }
                if (plan) {
                  updateSetupDraft({
                    level: plan.level,
                    goal: plan.goal,
                    trainingDays: plan.trainingDays,
                    preferredTime,
                  });
                }
                router.push('/onboarding?mode=rebuild' as any);
              }}
            />
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
            <Divider />
            <ToggleRow
              label="Gentle habit nudge"
              description="Send one extra local prompt later on training days."
              value={settings.notificationsEnabled && settings.habitNudgeEnabled}
              onChange={(value) => updateReminderSetting('habitNudgeEnabled', value)}
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
              lockedValues={isPro ? [] : ['fullScene']}
              onLockedPress={() => {
                void openPaywall();
              }}
              onChange={(val) => {
                if (val === 'fullScene' && !canUseFullSceneCamera(isPro)) return;
                updateSettings({ defaultCameraMode: val as any });
              }}
            />
          </Section>

          <Section title="Subscription">
            <InfoRow
              label="Plan"
              value={subscriptionLoading ? 'Checking...' : isPro ? formatSubscriptionPlanLabel(activeProductIdentifier) : 'Free'}
            />
            {subscriptionError && (
              <>
                <Divider />
                <InfoRow label="Status" value={subscriptionConfigured ? 'Offline safe mode' : 'Not configured'} />
              </>
            )}
            {!isPro && (
              <>
                <Divider />
                <ActionRow
                  disabled={subscriptionLoading || !paywallAvailable}
                  icon="sparkles-outline"
                  label={
                    subscriptionLoading
                      ? 'Loading paywall...'
                      : paywallAvailable
                        ? 'Upgrade to Pro'
                        : 'Setup required'
                  }
                  badge={paywallAvailable}
                  onPress={openPaywall}
                />
              </>
            )}
            <Divider />
            <ActionRow
              disabled={subscriptionLoading || !subscriptionConfigured}
              icon="refresh-outline"
              label="Restore purchases"
              onPress={restoreSubscription}
            />
            <Divider />
            <ActionRow
              disabled={subscriptionLoading}
              icon="card-outline"
              label="Manage subscription"
              onPress={openAppStoreSubscriptions}
            />
          </Section>

          <Section title="Privacy and legal">
            <NavRow icon="camera-outline" label="Camera and workout data" onPress={() => router.push('/legal/data-camera' as any)} />
            <Divider />
            <ActionRow icon="document-text-outline" label="Privacy Policy" onPress={() => openWebUrl(privacyUrl)} />
            <Divider />
            <ActionRow icon="reader-outline" label="Terms of Use" onPress={() => openWebUrl(termsUrl)} />
            <Divider />
            <NavRow icon="chatbubbles-outline" label="Feature requests and bugs" onPress={() => router.push('/settings/feedback' as any)} />
            <Divider />
            <ActionRow icon="help-circle-outline" label="Support" onPress={() => openWebUrl(supportUrl)} />
            <Divider />
            <ActionRow icon="open-outline" label="Open Push Counter website" onPress={openAppWebsite} />
          </Section>

          <Section title="Data control">
            {isSignedIn && (
              <>
                <ActionRow
                  disabled={loggingOut}
                  icon="log-out-outline"
                  label={loggingOut ? 'Logging out...' : 'Log out'}
                  onPress={logOut}
                />
                <Divider />
              </>
            )}
            <ActionRow
              destructive
              disabled={deletingAccount}
              icon="trash-outline"
              label={deletingAccount ? 'Deleting...' : isSignedIn ? 'Delete account and data' : 'Clear local data'}
              onPress={confirmDeleteAccount}
            />
          </Section>

          {__DEV__ && (
            <Section title="Developer options">
              <NavRow icon="bug-outline" label="Debug logs" onPress={() => router.push('/debug-logs' as any)} />
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
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const TimeRow = ({ value, displayValue, changed, saving, onChange, onSave }: {
  value: string;
  displayValue: string;
  changed: boolean;
  saving: boolean;
  onChange: (val: string) => void;
  onSave: () => void;
}) => {
  const [hours, minutes] = value.split(':').map(Number);
  const initialDate = new Date();
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
          onChange={(_, selectedDate) => {
            if (selectedDate) {
              const newTime = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
              onChange(newTime);
            }
          }}
          textColor="#fff"
          style={{ width: 100 }}
        />
        {changed && (
          <Pressable style={styles.saveTimeButton} onPress={onSave} disabled={saving}>
            <Text style={styles.saveTimeText}>{saving ? '...' : 'Save'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const NavRow = ({ badge, icon, label, value, onPress }: { badge?: boolean; icon: string; label: string; value?: string; onPress: () => void }) => (
  <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.rowPressed]} onPress={onPress}>
    <View style={styles.navLabel}>
      <Ionicons name={icon as any} size={20} color="rgba(255,255,255,0.6)" />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <View style={styles.navValue}>
      {badge ? <ProBadge /> : null}
      {value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
    </View>
  </Pressable>
);

const ActionRow = ({ badge, disabled, destructive, icon, label, onPress }: {
  badge?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    disabled={disabled}
    style={({ pressed }) => [styles.navRow, pressed && styles.rowPressed, disabled && styles.disabledRow]}
    onPress={onPress}
  >
    <View style={styles.navLabel}>
      <Ionicons name={icon as any} size={20} color={destructive ? '#fb7185' : 'rgba(255,255,255,0.6)'} />
      <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>{label}</Text>
    </View>
    <View style={styles.navValue}>
      {badge ? <ProBadge /> : null}
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
    </View>
  </Pressable>
);

const ToggleRow = ({ label, description, value, disabled, onChange }: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}) => (
  <View style={[styles.toggleRow, disabled && styles.disabledRow]}>
    <View style={styles.toggleCopy}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#f43f5e' }}
      thumbColor="#fff"
    />
  </View>
);

const ChoiceRow = ({ label, description, options, value, lockedValues = [], onChange, onLockedPress }: {
  label: string;
  description: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  lockedValues?: string[];
  onChange: (val: string) => void;
  onLockedPress?: (val: string) => void;
}) => (
  <View style={styles.choiceRow}>
    <View style={styles.toggleCopy}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
    </View>
    <View style={styles.pillsContainer}>
      {options.map((opt) => {
        const active = value === opt.value;
        const locked = lockedValues.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (locked) {
                onLockedPress?.(opt.value);
                return;
              }
              onChange(opt.value);
            }}
            style={[styles.pill, active && styles.pillActive, locked && styles.pillLocked]}
          >
            <View style={styles.pillContent}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
              {locked ? <ProBadge size="tiny" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ---------- Modern Styles (aligned with onboarding) ----------
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112, gap: 28 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 56 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 56 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  navLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navValue: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '50%' },
  rowLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },
  destructiveText: { color: '#fb7185' },
  rowValue: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  infoValue: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.68)', flex: 1, textAlign: 'right', marginLeft: 16 },
  rowDescription: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 64, gap: 12 },
  timeCopy: { flex: 1 },
  timeEditor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveTimeButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f43f5e', borderRadius: 20, minWidth: 60, alignItems: 'center' },
  saveTimeText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  disabledRow: { opacity: 0.5 },
  toggleCopy: { flex: 1 },
  choiceRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  pillsContainer: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 40 },
  pill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 32 },
  pillContent: { minHeight: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pillActive: { backgroundColor: '#f43f5e' },
  pillLocked: { opacity: 0.58 },
  pillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  pillTextActive: { color: '#fff' },
});
