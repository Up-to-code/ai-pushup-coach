import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { cancelPlanNotifications } from '../../src/services/notifications';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore } from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

function formatDate(timestamp?: number) {
  if (!timestamp) return 'Unavailable';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RestoreAccountScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, signOut, userId } = useAuth();
  const plan = usePlanStore((state) => state.plan);
  const resetPlan = usePlanStore((state) => state.resetPlan);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const resetOnboarding = useSettingsStore((state) => state.resetOnboarding);
  const resetUser = useUserStore((state) => state.resetUser);
  const clearWorkouts = useWorkoutStore((state) => state.clearWorkouts);
  const restoreAccount = useMutation(api.users.restoreAccount);
  const permanentlyDeleteAccount = useMutation(api.users.permanentlyDeleteAccount);
  const deletionState = useQuery(
    api.users.deletionStatus,
    isLoaded && isSignedIn && userId ? { clientUserId: userId } : 'skip'
  );
  const [busy, setBusy] = useState<'restore' | 'delete' | null>(null);

  const expired = useMemo(
    () => Boolean(deletionState?.deleteAfter && deletionState.deleteAfter <= Date.now()),
    [deletionState?.deleteAfter]
  );

  const clearLocalData = async () => {
    if (plan) await cancelPlanNotifications(plan.notificationIds);
    clearWorkouts();
    resetPlan();
    resetOnboarding();
    resetSettings();
    resetUser();
  };

  const handleRestore = async () => {
    if (!userId || expired) return;
    setBusy('restore');
    try {
      const result = await restoreAccount({ clientUserId: userId });
      if (!result.ok) {
        Alert.alert('Restore unavailable', 'This account can no longer be restored. You can permanently delete it and start fresh.');
        return;
      }
      router.replace('/' as any);
    } catch (error) {
      console.warn('Account restore failed', error);
      Alert.alert('Restore failed', 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const handlePermanentDelete = () => {
    Alert.alert(
      'Permanently delete data?',
      'This removes synced app data now and cannot be undone. Active App Store subscriptions must still be managed from your Apple account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            setBusy('delete');
            try {
              await permanentlyDeleteAccount({ clientUserId: userId });
              await clearLocalData();
              await signOut();
              router.replace('/sign-in' as any);
            } catch (error) {
              console.warn('Permanent account deletion failed', error);
              Alert.alert('Delete failed', 'Check your connection and try again.');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  if (!isLoaded || !deletionState) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!isSignedIn || !userId) {
    router.replace('/sign-in' as any);
    return null;
  }

  if (deletionState.status !== 'pendingDeletion') {
    router.replace('/' as any);
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={expired ? 'alert-circle-outline' : 'archive-outline'} size={32} color={colors.accent} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{expired ? 'Restore window ended' : 'Account deletion requested'}</Text>
          <Text style={styles.body}>
            {expired
              ? 'This account is past the restore window. Permanently delete the remaining synced app data to start fresh.'
              : 'Your profile is hidden and synced app data is paused. You can restore your data until the final deletion date.'}
          </Text>
        </View>

        <View style={styles.details}>
          <Detail label="Deleted" value={formatDate(deletionState.deletedAt)} />
          <Detail label="Final deletion" value={formatDate(deletionState.deleteAfter)} />
        </View>

        <View style={styles.actions}>
          {!expired ? (
            <Pressable style={[styles.button, styles.primaryButton]} onPress={handleRestore} disabled={busy !== null}>
              {busy === 'restore' ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryText}>Restore my data</Text>}
            </Pressable>
          ) : null}
          <Pressable style={[styles.button, styles.dangerButton]} onPress={handlePermanentDelete} disabled={busy !== null}>
            {busy === 'delete' ? <ActivityIndicator color={colors.error} /> : <Text style={styles.dangerText}>Permanently delete</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  details: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    minHeight: 54,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  primaryText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerText: {
    ...typography.bodyBold,
    color: colors.error,
  },
});
