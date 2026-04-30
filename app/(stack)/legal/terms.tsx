import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CFEView, StackHeader } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <CFEView>
      <View style={styles.header}>
        <StackHeader eyebrow="Legal" title="Terms of Use" subtitle="Training guidance and subscription terms." onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TermBlock title="Fitness guidance">
          Push-Up Coach provides training guidance and progress tracking, not medical advice. Stop exercising if you feel pain, dizziness, or unsafe symptoms.
        </TermBlock>
        <TermBlock title="User responsibility">
          You are responsible for choosing a safe training environment, using proper form, and selecting a plan that matches your current ability.
        </TermBlock>
        <TermBlock title="Subscriptions">
          Paid features, if enabled, are managed through Apple in-app purchase and RevenueCat. You can restore purchases and manage subscription status from Settings.
        </TermBlock>
        <TermBlock title="Availability">
          Camera tracking depends on device capability, lighting, framing, and OS permissions. Manual fallback states may appear when tracking is unavailable.
        </TermBlock>
      </ScrollView>
    </CFEView>
  );
}

function TermBlock({ title, children }: { title: string; children: React.ReactNode }) {
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
