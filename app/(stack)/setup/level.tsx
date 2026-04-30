import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { usePlanStore, type PlanLevel } from '../../../src/store';
import { debugPlanSetup } from '../../../src/utils/debug';

const levels: Array<{ id: PlanLevel; title: string; desc: string; icon: string }> = [
  { id: 'beginner', title: 'Beginner', desc: '0-10 clean reps', icon: 'walk' },
  { id: 'intermediate', title: 'Intermediate', desc: '11-30 clean reps', icon: 'body' },
  { id: 'advanced', title: 'Advanced', desc: '31+ clean reps', icon: 'flame' },
];

export default function SetupLevelScreen() {
  const router = useRouter();
  const setupDraft = usePlanStore((state) => state.setupDraft);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const [selectedLevel, setSelectedLevel] = useState<PlanLevel | null>(setupDraft.level ?? null);

  const handleNext = () => {
    if (!selectedLevel) return;
    debugPlanSetup('level selected', { level: selectedLevel });
    updateSetupDraft({ level: selectedLevel });
    router.push('/(stack)/setup/days');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepText}>Step 1 of 4</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Choose your push-up state</Text>
        <Text style={styles.subtitle}>Pick the level that matches your clean reps today. This screen only sets your starting point.</Text>

        <View style={styles.section}>
          <Text style={styles.label}>CURRENT LEVEL</Text>
          {levels.map((level) => {
            const active = selectedLevel === level.id;
            return (
              <Pressable
                key={level.id}
                testID={`setup-level-${level.id}`}
                accessibilityLabel={`setup-level-${level.id}`}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setSelectedLevel(level.id)}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons name={level.icon as any} size={24} color={active ? colors.textPrimary : colors.textSecondary} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{level.title}</Text>
                  <Text style={styles.optionDesc}>{level.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton title="Continue" onPress={handleNext} disabled={!selectedLevel} testID="setup-level-continue" />
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
