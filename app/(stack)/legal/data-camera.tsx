import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CFEView, StackHeader } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';

const items = [
  { icon: 'camera-outline', title: 'Camera access', body: 'Used during a live workout to estimate movement and count push-up reps. The permission prompt should clearly mention rep tracking.' },
  { icon: 'analytics-outline', title: 'Workout telemetry', body: 'The app may sync reps, duration, camera state, quality score, and form feedback to support progress history and leaderboard features.' },
  { icon: 'notifications-outline', title: 'Local reminders', body: 'Workout and missed-start reminders are scheduled locally for your chosen training days and time.' },
  { icon: 'lock-closed-outline', title: 'Release checklist', body: 'App Store Connect privacy labels should include profile, fitness/workout, purchase, diagnostics, and camera-related usage as applicable.' },
];

export default function DataCameraScreen() {
  const router = useRouter();
  return (
    <CFEView>
      <View style={styles.header}>
        <StackHeader eyebrow="Product safety" title="Camera and data use" subtitle="What the app needs, why it needs it, and how it supports Apple review." onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <View key={item.title} style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name={item.icon as any} size={22} color={colors.textPrimary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </CFEView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(32, 37, 50, 0.55)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.bodyBold, color: colors.textPrimary },
  body: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 21 },
});
