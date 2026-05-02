import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackHeader } from '../../../src/components';
import { colors, spacing, typography } from '../../../src/theme';

const sections = [
  {
    title: 'Camera access',
    body: 'Used during a live workout to estimate movement and count push‑up reps. The permission prompt clearly mentions rep tracking.',
  },
  {
    title: 'Workout telemetry',
    body: 'The app may sync reps, duration, camera state, quality score, and form feedback to support progress history and leaderboard features.',
  },
  {
    title: 'Local reminders',
    body: 'Workout and missed‑start reminders are scheduled locally for your chosen training days and time.',
  },
  {
    title: 'Release checklist',
    body: 'App Store Connect privacy labels include profile, fitness/workout, purchase, diagnostics, and camera‑related usage as applicable.',
  },
];

export default function DataCameraScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <StackHeader
          eyebrow="Product safety"
          title="Camera and data"
          subtitle="What the app needs, why it needs it, and how it supports Apple review."
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