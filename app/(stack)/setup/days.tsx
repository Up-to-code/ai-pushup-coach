import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from '../../../src/components';
import { colors, spacing, typography, borderRadius } from '../../../src/theme';
import { usePlanStore } from '../../../src/store';
import { debugPlanSetup } from '../../../src/utils/debug';

const daysOfWeek = [
  { id: 'sun', name: 'Sunday', letter: 'S' },
  { id: 'mon', name: 'Monday', letter: 'M' },
  { id: 'tue', name: 'Tuesday', letter: 'T' },
  { id: 'wed', name: 'Wednesday', letter: 'W' },
  { id: 'thu', name: 'Thursday', letter: 'T' },
  { id: 'fri', name: 'Friday', letter: 'F' },
  { id: 'sat', name: 'Saturday', letter: 'S' },
];

export default function SetupDaysScreen() {
  const router = useRouter();
  const setupDraft = usePlanStore((state) => state.setupDraft);
  const updateSetupDraft = usePlanStore((state) => state.updateSetupDraft);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    setupDraft.trainingDays.length ? setupDraft.trainingDays : ['mon', 'wed', 'fri']
  );

  const toggleDay = (id: string) => {
    setSelectedDays((prev) => (prev.includes(id) ? prev.filter((day) => day !== id) : [...prev, id]));
  };

  const handleNext = () => {
    if (selectedDays.length === 0) return;
    debugPlanSetup('training days selected', { trainingDays: selectedDays });
    updateSetupDraft({ trainingDays: selectedDays });
    router.push('/(stack)/setup/goal');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepText}>Step 2 of 4</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pick realistic training days</Text>
        <Text style={styles.subtitle}>Three or four days a week is the sweet spot for most people: enough repetition, enough recovery.</Text>

        <View style={styles.daysContainer}>
          {daysOfWeek.map((day) => {
            const isActive = selectedDays.includes(day.id);
            return (
              <Pressable
                key={day.id}
                testID={`setup-day-${day.id}`}
                accessibilityLabel={`setup-day-${day.id}`}
                style={[styles.dayCard, isActive && styles.dayCardActive]}
                onPress={() => toggleDay(day.id)}
              >
                <View style={styles.dayInfo}>
                  <View style={[styles.letterBadge, isActive && styles.letterBadgeActive]}>
                    <Text style={styles.letterText}>{day.letter}</Text>
                  </View>
                  <View>
                    <Text style={styles.dayName}>{day.name}</Text>
                    <Text style={styles.dayMeta}>{isActive ? 'Workout day' : 'Recovery day'}</Text>
                  </View>
                </View>
                <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                  {isActive && <Ionicons name="checkmark" size={16} color={colors.textPrimary} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton title="Continue" onPress={handleNext} disabled={selectedDays.length === 0} testID="setup-days-continue" />
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
  daysContainer: { gap: spacing.sm },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
  },
  dayCardActive: { borderColor: colors.accent, backgroundColor: colors.accentAlpha },
  dayInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  letterBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeActive: { backgroundColor: colors.accent },
  letterText: { ...typography.bodyBold, color: colors.textPrimary },
  dayName: { ...typography.bodyBold, color: colors.textPrimary },
  dayMeta: { ...typography.caption, color: colors.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
});
