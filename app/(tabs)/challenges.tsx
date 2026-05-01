import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '../../src/features/challenges/hooks';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { useResponsive } from '../../src/hooks';
import type { Id } from '../../convex/_generated/dataModel';

type ChallengeRowData = {
  _id: Id<'challenges'>;
  title: string;
  category: string;
  description: string;
  goalReps: number;
  progressReps: number;
  reward: string;
  joined: boolean;
  completedAt?: number;
};

export default function ChallengesScreen() {
  const { horizontalPadding } = useResponsive();
  const { challenges, loading, seedDefaults, join, leave } = useChallenges(30);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (challenges && challenges.length === 0) {
      void seedDefaults().catch((error) => console.warn('Challenge seed failed', error));
    }
  }, [challenges, seedDefaults]);

  const toggleJoin = async (challenge: ChallengeRowData) => {
    if (busyId) return;
    setBusyId(challenge._id);
    try {
      if (challenge.joined) {
        await leave(challenge._id);
      } else {
        await join(challenge._id);
      }
    } catch (error) {
      console.warn('Challenge action failed', error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Challenges</Text>
          <Text style={styles.subtitle}>Small comparisons that make showing up feel visible.</Text>
        </View>

        <View style={styles.list}>
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.stateText}>Loading live challenges...</Text>
            </View>
          ) : challenges && challenges.length > 0 ? (
            challenges.map((challenge) => (
              <ChallengeRow
                key={challenge._id}
                challenge={challenge}
                busy={busyId === challenge._id}
                onPress={() => toggleJoin(challenge)}
              />
            ))
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>No challenges yet</Text>
              <Text style={styles.stateText}>Check back after your profile finishes syncing.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChallengeRow({
  challenge,
  busy,
  onPress,
}: {
  challenge: ChallengeRowData;
  busy: boolean;
  onPress: () => void;
}) {
  const progress = Math.min(1, challenge.progressReps / Math.max(1, challenge.goalReps));
  const progressLabel = `${challenge.progressReps}/${challenge.goalReps}`;
  const completed = Boolean(challenge.completedAt);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress} disabled={busy}>
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle} numberOfLines={1}>{challenge.title}</Text>
          <Text style={styles.rowMeta}>{challenge.category}</Text>
        </View>
        <Text style={styles.progressValue}>{progressLabel}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>{challenge.description}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.rowFooter}>
        <Text style={styles.rewardText} numberOfLines={1}>{challenge.reward}</Text>
        <View style={[styles.joinPill, challenge.joined && styles.joinPillActive]}>
          {busy ? (
            <ActivityIndicator color={colors.textPrimary} size="small" />
          ) : (
            <>
              <Ionicons
                name={completed ? 'checkmark-circle' : challenge.joined ? 'remove-circle-outline' : 'add-circle-outline'}
                size={16}
                color={challenge.joined ? colors.textPrimary : colors.textInverse}
              />
              <Text style={[styles.joinText, challenge.joined && styles.joinTextActive]}>
                {completed ? 'Done' : challenge.joined ? 'Joined' : 'Join'}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    minHeight: 42,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  subtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  list: {
    gap: spacing.sm,
  },
  row: {
    minHeight: 142,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  description: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  progressValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rewardText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
  },
  joinPill: {
    minWidth: 78,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  joinPillActive: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinText: { ...typography.captionBold, color: colors.textInverse },
  joinTextActive: { color: colors.textPrimary },
  stateBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateTitle: { ...typography.bodyBold, color: colors.textPrimary },
  stateText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
