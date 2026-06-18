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
import { useSaveBackendSettings } from '../../src/backend';
import { ProBadge } from '../../src/components';
import { canUseFullSceneCamera, PRODUCT_IDENTIFIERS, useSubscription } from '../../src/subscriptions';
import { appWebUrl, privacyUrl, supportUrl, termsUrl } from '../../src/config/links';
import { supportedLanguages, useAppLocale } from '../../src/localization';
import { localizePlanName } from '../../src/localization/planNames';
import type { TranslationKey } from '../../src/localization/translations';
import { usePlanStore, useSettingsStore, useUserStore, type Day } from '../../src/store';
import { cancelPlanNotifications, requestNotificationPermission, syncNotificationsForPlan } from '../../src/services/notifications';
import { isAppleHealthAvailable, requestAppleHealthWorkoutPermission, type AppleHealthStatus } from '../../src/services/appleHealth';
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

function formatSubscriptionPlanLabel(productIdentifier: string | null, t: (key: TranslationKey) => string) {
  if (!productIdentifier) return t('settings.pro');
  if (productIdentifier === 'development-pro') return t('settings.developmentPro');
  if (productIdentifier === PRODUCT_IDENTIFIERS.yearly) return t('settings.proYearly');
  if (productIdentifier === PRODUCT_IDENTIFIERS.monthly) return t('settings.proMonthly');
  return t('settings.pro');
}

function formatLanguageLabel(languageLocale: string, systemLabel: string) {
  if (!languageLocale || languageLocale === 'system') return systemLabel;
  return supportedLanguages.find((language) => language.locale === languageLocale)?.nativeName ?? systemLabel;
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
  const { isRTL, t } = useAppLocale();
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
  const saveBackendSettings = useSaveBackendSettings();
  const setAllowGuestMode = useSettingsStore((state) => state.setAllowGuestMode);
  const plan = usePlanStore((state) => state.plan);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const [timeDraft, setTimeDraft] = useState(cleanTime(plan?.preferredTime ?? settings.defaultWorkoutTime));
  const [timeSaving, setTimeSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [appleHealthStatus, setAppleHealthStatus] = useState<AppleHealthStatus>(
    isAppleHealthAvailable()
      ? settings.appleHealthWorkoutExportEnabled
        ? 'connected'
        : 'notConnected'
      : 'unavailable'
  );

  const saveSettings = async (nextSettings: typeof settings) => {
    updateSettings(nextSettings);
    try {
      await saveBackendSettings(nextSettings);
    } catch (error) {
      console.warn('Settings save failed', error);
    }
  };

  const updateAndSaveSettings = (partialSettings: Partial<typeof settings>) => {
    const nextSettings = { ...settings, ...partialSettings };
    updateSettings(partialSettings);
    void saveBackendSettings(nextSettings).catch((error) => {
      console.warn('Settings save failed', error);
    });
  };

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
      await saveSettings({
        ...settings,
        notificationsEnabled: false,
        workoutReminderEnabled: false,
        missedReminderEnabled: false,
        habitNudgeEnabled: false,
      });
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
    await saveSettings(nextSettings);
    await resyncNotifications(nextSettings);
    if (!granted) {
      Alert.alert(t('settings.alertNotificationsOffTitle'), t('settings.alertNotificationsOffBody'));
    }
  };

  const updateReminderSetting = async (key: 'workoutReminderEnabled' | 'missedReminderEnabled' | 'habitNudgeEnabled', value: boolean) => {
    const nextSettings = { ...settings, [key]: value };
    await saveSettings(nextSettings);
    await resyncNotifications(nextSettings);
  };

  const toggleAppleHealthExport = async (enabled: boolean) => {
    if (!enabled) {
      setAppleHealthStatus(isAppleHealthAvailable() ? 'notConnected' : 'unavailable');
      updateAndSaveSettings({ appleHealthWorkoutExportEnabled: false });
      return;
    }

    const status = await requestAppleHealthWorkoutPermission();
    setAppleHealthStatus(status);
    updateAndSaveSettings({ appleHealthWorkoutExportEnabled: status === 'connected' });
    if (status === 'permissionNeeded') {
      Alert.alert(t('settings.appleHealthPermissionTitle'), t('settings.appleHealthPermissionBody'));
    }
  };

  const saveWorkoutTime = async () => {
    const preferredTime = cleanTime(timeDraft);
    if (!isValidTime(preferredTime)) {
      Alert.alert(t('settings.alertCheckTimeTitle'), t('settings.alertCheckTimeBody'));
      return;
    }
    setTimeSaving(true);
    const nextSettings = { ...settings, defaultWorkoutTime: preferredTime };
    updateSettings({ defaultWorkoutTime: preferredTime });
    try {
      await saveBackendSettings(nextSettings);
      if (plan) {
        const days = reschedulePlanDays(plan.days, preferredTime);
        const nextPlan = { ...plan, preferredTime, days };
        updatePlan({ preferredTime, days });
        const notificationIds = await resyncNotifications(nextSettings, nextPlan);
        updatePlan({ notificationIds });
      }
    } catch (error) {
      console.warn(error);
      Alert.alert(t('settings.alertTimeSavedTitle'), t('settings.alertTimeSavedBody'));
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
      Alert.alert(t('settings.alertRestoreCompleteTitle'), t('settings.alertRestoreCompleteBody'));
    } catch {
      Alert.alert(t('settings.alertRestoreUnavailableTitle'), t('settings.alertRestoreUnavailableBody'));
    }
  };

  const openPaywall = async () => {
    if (subscriptionLoading) return;

    if (!paywallAvailable) {
      Alert.alert(
        t('settings.alertProSetupTitle'),
        subscriptionError ??
          t('settings.alertProSetupBody')
      );
      return;
    }

    try {
      const unlocked = await showPaywall();
      if (unlocked) Alert.alert(t('settings.alertProUnlockedTitle'), t('settings.alertProUnlockedBody'));
    } catch (error) {
      console.warn('Paywall failed', error);
      Alert.alert(
        t('settings.alertPaywallFailedTitle'),
        error instanceof Error ? error.message : t('settings.alertPaywallFailedBody')
      );
    }
  };

  const openAppStoreSubscriptions = async () => {
    if (subscriptionLoading) return;

    if (!subscriptionConfigured) {
      try {
        await Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL);
      } catch {
        Alert.alert(t('settings.alertSubscriptionsFailedTitle'), t('settings.alertSubscriptionsFailedBody'));
      }
      return;
    }

    try {
      await showCustomerCenter();
    } catch {
      try {
        await Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL);
      } catch {
        Alert.alert(t('settings.alertSubscriptionsFailedTitle'), t('settings.alertSubscriptionsFailedBody'));
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
      Alert.alert(t('settings.alertLogoutFailedTitle'), t('settings.alertLogoutFailedBody'));
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      isSignedIn ? t('settings.confirmDeleteTitle') : t('settings.confirmClearTitle'),
      isSignedIn
        ? t('settings.confirmDeleteBody')
        : t('settings.confirmClearBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isSignedIn ? t('settings.deleteAccount') : t('settings.clearLocalData'),
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
                t('settings.alertDeleteFailedTitle'),
                t('settings.alertDeleteFailedBody')
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
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section icon="person-circle-outline" title={t('settings.account')} isRTL={isRTL}>
            <NavRow icon="person-outline" label={t('settings.editProfile')} value={user.displayName || user.name} onPress={() => router.push('/settings/edit-profile' as any)} />
            <Divider />
            <NavRow icon="flag-outline" label={t('settings.country')} value={user.countryName} onPress={() => router.push('/settings/country' as any)} />
            <Divider />
            <NavRow
              icon="language-outline"
              label={t('settings.language')}
              value={formatLanguageLabel(settings.languageLocale, t('settings.languageSystem'))}
              onPress={() => router.push('/settings/language' as any)}
            />
            {settings.allowGuestMode && (
              <>
                <Divider />
                <ActionRow
                  icon="log-in-outline"
                  label={t('settings.useSignedInAccount')}
                  onPress={() => {
                    setAllowGuestMode(false);
                    router.replace('/sign-in' as any);
                  }}
                />
              </>
            )}
          </Section>

          <Section icon="barbell-outline" title={t('settings.training')} isRTL={isRTL}>
            <InfoRow label={t('settings.currentPlan')} value={plan ? localizePlanName(plan.name, t) : t('settings.noPlan')} />
            <Divider />
            <TimeRow
              workoutTimeLabel={t('settings.workoutTime')}
              saveLabel={t('common.save')}
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
              label={t('settings.rebuildPlan')}
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
                router.push('/onboarding?mode=rebuild&returnTo=settings' as any);
              }}
            />
          </Section>

          <Section icon="notifications-outline" title={t('settings.reminders')} isRTL={isRTL}>
            <ToggleRow
              label={t('settings.workoutReminders')}
              description={t('settings.workoutReminderDescription')}
              value={settings.notificationsEnabled && settings.workoutReminderEnabled}
              onChange={(value) => (value ? toggleNotifications(true) : updateReminderSetting('workoutReminderEnabled', false))}
            />
            <Divider />
            <ToggleRow
              label={t('settings.missedReminder')}
              description={t('settings.missedReminderDescription')}
              value={settings.notificationsEnabled && settings.missedReminderEnabled}
              onChange={(value) => updateReminderSetting('missedReminderEnabled', value)}
              disabled={!settings.notificationsEnabled}
            />
            <Divider />
            <ToggleRow
              label={t('settings.habitNudge')}
              description={t('settings.habitNudgeDescription')}
              value={settings.notificationsEnabled && settings.habitNudgeEnabled}
              onChange={(value) => updateReminderSetting('habitNudgeEnabled', value)}
              disabled={!settings.notificationsEnabled}
            />
          </Section>

          <Section icon="pulse-outline" title={t('settings.workoutFeedback')} isRTL={isRTL}>
            <ToggleRow label={t('settings.sound')} description={t('settings.soundDescription')} value={settings.soundEnabled} onChange={(soundEnabled) => updateAndSaveSettings({ soundEnabled })} />
            <Divider />
            <ToggleRow label={t('settings.haptics')} description={t('settings.hapticsDescription')} value={settings.hapticsEnabled} onChange={(hapticsEnabled) => updateAndSaveSettings({ hapticsEnabled })} />
          </Section>

          <Section icon="heart-outline" title={t('settings.appleHealth')} isRTL={isRTL}>
            <ToggleRow
              label={t('settings.appleHealthExport')}
              description={t('settings.appleHealthExportDescription')}
              value={settings.appleHealthWorkoutExportEnabled && appleHealthStatus === 'connected'}
              onChange={(value) => {
                void toggleAppleHealthExport(value);
              }}
              disabled={appleHealthStatus === 'unavailable'}
            />
            <Divider />
            <InfoRow label={t('settings.status')} value={t(`settings.appleHealthStatus.${appleHealthStatus}` as TranslationKey)} />
          </Section>

          <Section icon="scan-circle-outline" title={t('settings.sessionBehavior')} isRTL={isRTL}>
            <ChoiceRow
              label={t('settings.cameraFocusMode')}
              description={t('settings.cameraFocusDescription')}
              options={[
                { label: t('settings.faceFocus'), value: 'faceFocus' },
                { label: t('settings.fullScene'), value: 'fullScene' }
              ]}
              value={settings.defaultCameraMode}
              lockedValues={isPro ? [] : ['fullScene']}
              onLockedPress={() => {
                void openPaywall();
              }}
              onChange={(val) => {
                if (val === 'fullScene' && !canUseFullSceneCamera(isPro)) return;
                updateAndSaveSettings({ defaultCameraMode: val as any });
              }}
            />
          </Section>

          <Section icon="diamond-outline" title={t('settings.subscription')} isRTL={isRTL}>
            <InfoRow
              label={t('settings.plan')}
              value={subscriptionLoading ? t('settings.checking') : isPro ? formatSubscriptionPlanLabel(activeProductIdentifier, t) : t('settings.free')}
            />
            {subscriptionError && (
              <>
                <Divider />
                <InfoRow label={t('settings.status')} value={subscriptionConfigured ? t('settings.offlineSafeMode') : t('settings.notConfigured')} />
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
                      ? t('settings.loadingPaywall')
                      : paywallAvailable
                        ? t('settings.upgradeToPro')
                        : t('settings.setupRequired')
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
              label={t('settings.restorePurchases')}
              onPress={restoreSubscription}
            />
            <Divider />
            <ActionRow
              disabled={subscriptionLoading}
              icon="card-outline"
              label={t('settings.manageSubscription')}
              onPress={openAppStoreSubscriptions}
            />
          </Section>

          <Section icon="shield-checkmark-outline" title={t('settings.privacyLegal')} isRTL={isRTL}>
            <NavRow icon="camera-outline" label={t('settings.cameraData')} onPress={() => router.push('/legal/data-camera' as any)} />
            <Divider />
            <ActionRow icon="document-text-outline" label={t('settings.privacyPolicy')} onPress={() => openWebUrl(privacyUrl)} />
            <Divider />
            <ActionRow icon="reader-outline" label={t('settings.termsOfUse')} onPress={() => openWebUrl(termsUrl)} />
            <Divider />
            <NavRow icon="chatbubbles-outline" label={t('settings.feedback')} onPress={() => router.push('/settings/feedback' as any)} />
            <Divider />
            <ActionRow icon="help-circle-outline" label={t('settings.support')} onPress={() => openWebUrl(supportUrl)} />
            <Divider />
            <ActionRow icon="open-outline" label={t('settings.openWebsite')} onPress={openAppWebsite} />
          </Section>

          <Section icon="server-outline" title={t('settings.dataControl')} isRTL={isRTL}>
            {isSignedIn && (
              <>
                <ActionRow
                  disabled={loggingOut}
                  icon="log-out-outline"
                  label={loggingOut ? t('settings.loggingOut') : t('settings.logOut')}
                  onPress={logOut}
                />
                <Divider />
              </>
            )}
            <ActionRow
              destructive
              disabled={deletingAccount}
              icon="trash-outline"
              label={deletingAccount ? t('settings.deleting') : isSignedIn ? t('settings.deleteAccount') : t('settings.clearLocalData')}
              onPress={confirmDeleteAccount}
            />
          </Section>

          {__DEV__ && (
            <Section icon="code-slash-outline" title={t('settings.developerOptions')} isRTL={isRTL}>
              <NavRow icon="bug-outline" label={t('settings.debugLogs')} onPress={() => router.push('/debug-logs' as any)} />
              <Divider />
              <ActionRow
                icon="refresh-circle-outline"
                label={t('settings.redoOnboarding')}
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

const Section = ({ icon, title, children, isRTL }: { icon: string; title: string; children: React.ReactNode; isRTL?: boolean }) => (
  <View style={styles.section}>
    <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
      <Ionicons name={icon as any} size={15} color="rgba(255,255,255,0.48)" />
      <Text style={[styles.sectionTitle, isRTL && styles.textRtl]}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.rowLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const TimeRow = ({ workoutTimeLabel, saveLabel, value, displayValue, changed, saving, onChange, onSave }: {
  workoutTimeLabel: string;
  saveLabel: string;
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
      <Text style={styles.rowLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>{workoutTimeLabel}</Text>
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
            <Text style={styles.saveTimeText}>{saving ? '...' : saveLabel}</Text>
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
      <Text style={styles.rowLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>{label}</Text>
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
      <Text style={[styles.rowLabel, destructive && styles.destructiveText]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>{label}</Text>
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
      <Text style={styles.rowLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>{label}</Text>
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
      <Text style={styles.rowLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>{label}</Text>
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
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112, gap: 24 },
  section: { gap: 9 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.52)', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 54 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 54 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  navLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  navValue: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '50%' },
  rowLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#fff', flexShrink: 1 },
  destructiveText: { color: '#fb7185' },
  rowValue: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.58)' },
  infoValue: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.68)', flex: 1, textAlign: 'right', marginLeft: 16 },
  rowDescription: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.48)', marginTop: 3, lineHeight: 17 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 64, gap: 12 },
  timeCopy: { flex: 1 },
  timeEditor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveTimeButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f43f5e', borderRadius: 20, minWidth: 60, alignItems: 'center' },
  saveTimeText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 16 },
  disabledRow: { opacity: 0.5 },
  toggleCopy: { flex: 1, minWidth: 0 },
  choiceRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  pillsContainer: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.045)', padding: 4, borderRadius: 14 },
  pill: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', borderRadius: 10 },
  pillContent: { minHeight: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pillActive: { backgroundColor: '#f43f5e' },
  pillLocked: { opacity: 0.58 },
  pillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  pillTextActive: { color: '#fff' },
  rowReverse: { flexDirection: 'row-reverse' },
  textRtl: { textAlign: 'right', writingDirection: 'rtl' },
});
