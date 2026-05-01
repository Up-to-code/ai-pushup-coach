import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/theme';
import { useWorkoutStore } from '../../src/store';
import { calculateTotalStats } from '../../src/utils';
import { StackHeader } from '../../src/components';

const BADGE_LEVELS = [
  { reps: 100, label: 'BRONZE', color: '#CD7F32', description: 'First 100 Pushups' },
  { reps: 1000, label: 'SILVER', color: '#C0C0C0', description: '1,000 Pushups Milestone' },
  { reps: 10000, label: 'GOLD', color: '#FFD700', description: 'Elite 10,000 Club' },
  { reps: 50000, label: 'DIAMOND', color: '#B9F2FF', description: 'Institutional Legend' },
];

export default function BadgesScreen() {
  const router = useRouter();
  const workouts = useWorkoutStore((state) => state.workouts);
  const totals = calculateTotalStats(workouts);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <StackHeader 
          title="Badge Levels" 
          onBack={() => router.back()} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL PUSHUPS</Text>
          <Text style={styles.summaryValue}>{totals.totalPushups.toLocaleString()}</Text>
        </View>

        <View style={styles.badgeList}>
          {BADGE_LEVELS.map((badge, idx) => {
            const isUnlocked = totals.totalPushups >= badge.reps;
            const progress = Math.min(1, totals.totalPushups / badge.reps);
            
            return (
              <View key={idx} style={[styles.badgeItem, !isUnlocked && styles.badgeItemLocked]}>
                <View style={[styles.badgeIconLarge, { backgroundColor: colors.accentDark, borderColor: badge.color }]}>
                  <Ionicons name="trophy" size={32} color={badge.color} />
                </View>
                
                <View style={styles.badgeInfo}>
                  <View style={styles.badgeTitleRow}>
                    <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                    {isUnlocked && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                  </View>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: badge.color }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {totals.totalPushups.toLocaleString()} / {badge.reps.toLocaleString()} REPS
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  summaryValue: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    fontSize: 42,
  },
  badgeList: {
    gap: 16,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeItemLocked: {
    opacity: 0.6,
  },
  badgeIconLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeInfo: {
    flex: 1,
    gap: 4,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeLabel: {
    ...typography.titleMedium,
    fontSize: 20,
    letterSpacing: 1,
  },
  badgeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 8,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
  },
});
