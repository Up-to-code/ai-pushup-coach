import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackHeader } from '../../../src/components';
import { colors, spacing, typography } from '../../../src/theme';

const sections = [
  {
    title: 'Data we use',
    body: 'We store your profile, training schedule, workout results, camera tracking state, settings, and subscription status so the app can create plans, track progress, and sync your account.',
  },
  {
    title: 'Camera',
    body: 'Camera access is used during live workouts to estimate rep motion and form state. The app does not need to save workout video to your photo library.',
  },
  {
    title: 'Sync and purchases',
    body: 'Convex may receive profile, settings, workout, and telemetry records. RevenueCat handles subscription status and purchase management.',
  },
  {
    title: 'Notifications',
    body: 'Workout reminders are scheduled locally on your device for the days and time you choose.',
  },
  {
    title: 'Control',
    body: 'You can edit your profile, disable reminders, rebuild your plan, restore purchases, and manage subscriptions from Settings.',
  },
  {
    title: 'Nexfiy app page',
    body: 'Website privacy copy and app support live at https://nexfiy.com/apps/ai-pushup-coach.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <StackHeader
          eyebrow="Legal"
          title="Privacy Policy"
          subtitle="How Push-Up Coach handles app data."
          onBack={() => router.back()}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.title}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
            {index < sections.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginTop: spacing.md,
  },
});