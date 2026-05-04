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
  const { challenges, loading, canSeedDefaults, seedDefaults, join, leave } = useChallenges(30);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && canSeedDefaults && challenges?.length === 0) {
      void seedDefaults().catch((error) => console.warn('Challenge seed failed', error));
    }
  }, [canSeedDefaults, challenges, loading, seedDefaults]);

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
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Challenges</Text>
          <Text style={styles.subtitle}>
            Small comparisons that make showing up feel visible.
          </Text>
        </View>

        <View style={styles.list}>
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.stateText}>Loading live challenges…</Text>
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
              <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.stateTitle}>No challenges yet</Text>
              <Text style={styles.stateText}>
                Check back after your profile finishes syncing.
              </Text>
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

  const pillStyle = completed
    ? styles.pillDone
    : challenge.joined
    ? styles.pillJoined
    : styles.pillJoin;

  const pillIcon = completed
    ? 'checkmark-circle'
    : challenge.joined
    ? 'remove-circle-outline'
    : 'add-circle-outline';

  const pillLabel = completed ? 'Done' : challenge.joined ? 'Joined' : 'Join';

  const pillIconColor = completed
    ? colors.success
    : challenge.joined
    ? colors.textSecondary
    : '#fff';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      disabled={busy}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {challenge.title}
          </Text>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{challenge.category}</Text>
          </View>
        </View>
        <Text style={styles.progressValue}>{progressLabel}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {challenge.description}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.rowFooter}>
        <Text style={styles.rewardText} numberOfLines={1}>
          🎁 {challenge.reward}
        </Text>
        <View style={[styles.pill, pillStyle]}>
          {busy ? (
            <ActivityIndicator size="small" color={pillIconColor} />
          ) : (
            <>
              <Ionicons name={pillIcon} size={16} color={pillIconColor} />
              <Text style={[styles.pillLabel, { color: pillIconColor }]}>
                {pillLabel}
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
    backgroundColor: colors.background, // ensure a light/neutral background
  },
  scrollContent: {
    paddingVertical: 32,
    gap: 24,
    paddingBottom: 48,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  list: {
    gap: 16,
  },
  row: {
    borderRadius: 20,
    backgroundColor: colors.card,
    padding: 20,
    gap: 14,
    // modern card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  rowPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowCopy: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardSecondary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
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
  },
  rewardText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minWidth: 80,
  },
  pillJoin: {
    backgroundColor: colors.accent,
  },
  pillJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillDone: {
    backgroundColor: '#E8F5E9', // light green background
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
  },
  stateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
