import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton, CFEView } from '../../../src/components';
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
    router.push('/setup/goal');
  };

  return (
    <CFEView style={styles.container} withBackground={true}>
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
                    <Text style={[styles.letterText, isActive && styles.letterTextActive]}>{day.letter}</Text>
                  </View>
                  <View>
                    <Text style={styles.dayName}>{day.name}</Text>
                    <Text style={styles.dayMeta}>{isActive ? 'Workout day' : 'Recovery day'}</Text>
                  </View>
                </View>
                <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                  {isActive && <Ionicons name="checkmark" size={16} color={colors.background} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NeonButton title="Continue" onPress={handleNext} disabled={selectedDays.length === 0} testID="setup-days-continue" variant="white" />
      </View>
    </CFEView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { ...typography.headline, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  daysContainer: { gap: spacing.sm },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  dayCardActive: { backgroundColor: colors.surfaceStrong },
  dayInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  letterBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeActive: { backgroundColor: colors.textPrimary },
  letterText: { ...typography.bodyBold, color: colors.textPrimary },
  letterTextActive: { color: colors.textInverse },
  dayName: { ...typography.bodyBold, color: colors.textPrimary },
  dayMeta: { ...typography.caption, color: colors.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { borderColor: 'transparent', backgroundColor: colors.textPrimary },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
});
