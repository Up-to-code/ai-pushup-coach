import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { usePlanStore, type PlanGoal } from '../../../src/store';
import { debugPlanSetup } from '../../../src/utils/debug';

const goals: Array<{ id: PlanGoal; title: string; desc: string; icon: string }> = [
  { id: 'first_25', title: 'First 25', desc: 'Build a stable base', icon: 'flag-outline' },
  { id: 'road_50', title: 'Road to 50', desc: 'Strength plus consistency', icon: 'trending-up-outline' },
  { id: 'road_100', title: 'Road to 100', desc: 'Advanced volume target', icon: 'trophy-outline' },
];

export default function SetupGoalScreen() {
  const router = useRouter();
  const setupDraft = usePlanStore((state) => state.setupDraft);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const [selectedGoal, setSelectedGoal] = useState<PlanGoal | null>(setupDraft.goal ?? null);

  const handleNext = () => {
    if (!selectedGoal) return;
    debugPlanSetup('goal selected', { goal: selectedGoal });
    updateSetupDraft({ goal: selectedGoal });
    router.push('/(stack)/setup/time');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepText}>Step 3 of 4</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Choose one goal</Text>
        <Text style={styles.subtitle}>This screen only sets the target the plan will build toward.</Text>

        <View style={styles.section}>
          <Text style={styles.label}>TARGET</Text>
          {goals.map((goal) => {
            const active = selectedGoal === goal.id;
            return (
              <Pressable
                key={goal.id}
                testID={`setup-goal-${goal.id}`}
                accessibilityLabel={`setup-goal-${goal.id}`}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setSelectedGoal(goal.id)}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons name={goal.icon as any} size={24} color={active ? colors.textPrimary : colors.textSecondary} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{goal.title}</Text>
                  <Text style={styles.optionDesc}>{goal.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton title="Continue" onPress={handleNext} disabled={!selectedGoal} testID="setup-goal-continue" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  stepText: { ...typography.bodyBold, color: colors.textSecondary },
  placeholder: { width: 40 },
  content: { padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  title: { ...typography.headline, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  section: { gap: spacing.md },
  label: { ...typography.label, color: colors.accent },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
    gap: spacing.md,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.accent },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { ...typography.bodyBold, color: colors.textPrimary },
  optionDesc: { ...typography.caption, color: colors.textSecondary },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
});
