import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CFEView, StackHeader } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <CFEView>
      <View style={styles.header}>
        <StackHeader eyebrow="Legal" title="Privacy Policy" subtitle="How Push-Up Coach handles app data." onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PolicyBlock title="Data we use">
          We store your profile, training schedule, workout results, camera tracking state, settings, and subscription status so the app can create plans, track progress, and sync your account.
        </PolicyBlock>
        <PolicyBlock title="Camera">
          Camera access is used during live workouts to estimate rep motion and form state. The app does not need to save workout video to your photo library.
        </PolicyBlock>
        <PolicyBlock title="Sync and purchases">
          Convex may receive profile, settings, workout, and telemetry records. RevenueCat handles subscription status and purchase management.
        </PolicyBlock>
        <PolicyBlock title="Notifications">
          Workout reminders are scheduled locally on your device for the days and time you choose.
        </PolicyBlock>
        <PolicyBlock title="Control">
          You can edit your profile, disable reminders, rebuild your plan, restore purchases, and manage subscriptions from Settings.
        </PolicyBlock>
        <PolicyBlock title="Nexfiy app page">
          Website privacy copy and app support live at https://nexfiy.com/apps/ai-pushup-coach.
        </PolicyBlock>
      </ScrollView>
    </CFEView>
  );
}

function PolicyBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  block: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(32, 37, 50, 0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  blockTitle: { ...typography.bodyBold, color: colors.textPrimary },
  blockText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 21 },
});
