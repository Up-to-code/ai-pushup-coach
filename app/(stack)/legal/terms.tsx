import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackHeader } from '../../../src/components';
import { colors, spacing, typography } from '../../../src/theme';

const sections = [
  {
    title: 'Fitness guidance',
    body: 'Push-Up Coach provides training guidance and progress tracking, not medical advice. Stop exercising if you feel pain, dizziness, or unsafe symptoms.',
  },
  {
    title: 'User responsibility',
    body: 'You are responsible for choosing a safe training environment, using proper form, and selecting a plan that matches your current ability.',
  },
  {
    title: 'Subscriptions',
    body: 'Paid features, if enabled, are managed through Apple in-app purchase and RevenueCat. The purchase flow shows available product, price, duration, and renewal terms before purchase. You can restore purchases and manage subscription status from Settings.',
  },
  {
    title: 'Account deletion',
    body: 'You can delete your synced account and app data from Settings. Account deletion does not cancel an active App Store subscription; manage cancellation from your Apple account.',
  },
  {
    title: 'Availability',
    body: 'Camera tracking depends on device capability, lighting, framing, and OS permissions. Manual fallback states may appear when tracking is unavailable.',
  },
  {
    title: 'Nexfiy app page',
    body: 'Website terms copy and app support live at https://pushcounter.online.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <StackHeader 
          eyebrow="Legal" 
          title="Terms of Use" 
          subtitle="Training guidance and subscription terms." 
          onBack={() => router.back()} 
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
