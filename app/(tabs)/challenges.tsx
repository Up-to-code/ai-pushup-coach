import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '../../src/features/challenges/hooks';
import { colors, typography } from '../../src/theme';
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
  const { normalize, horizontalPadding, verticalScale } = useResponsive();
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
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: normalize(24) }]}
      >
        <View style={[styles.header, { marginBottom: verticalScale(32) }]}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { fontSize: normalize(34) }]}>Challenges</Text>
            <Pressable style={[styles.settingsButton, { width: normalize(42), height: normalize(42), borderRadius: normalize(21) }]}>
              <Ionicons name="settings-outline" size={normalize(22)} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { fontSize: normalize(16) }]}>
            Fuel your ritual with community goals.
          </Text>
        </View>

        <View style={styles.list}>
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={[styles.stateText, { fontSize: normalize(14) }]}>Syncing challenges…</Text>
            </View>
          ) : challenges && challenges.length > 0 ? (
            challenges.map((challenge) => (
              <ChallengeRow
                key={challenge._id}
                challenge={challenge}
                busy={busyId === challenge._id}
                onPress={() => toggleJoin(challenge)}
                normalize={normalize}
              />
            ))
          ) : (
            <View style={styles.stateBox}>
              <View style={[styles.emptyIcon, { width: normalize(72), height: normalize(72), borderRadius: normalize(36) }]}>
                <Ionicons name="trophy-outline" size={normalize(32)} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={[styles.stateTitle, { fontSize: normalize(18) }]}>No active challenges</Text>
              <Text style={[styles.stateText, { fontSize: normalize(14) }]}>
                New missions appear as you progress.
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
  normalize,
}: {
  challenge: ChallengeRowData;
  busy: boolean;
  onPress: () => void;
  normalize: (v: number) => number;
}) {
  const progress = Math.min(1, challenge.progressReps / Math.max(1, challenge.goalReps));
  const progressLabel = `${challenge.progressReps}/${challenge.goalReps}`;
  const completed = Boolean(challenge.completedAt);

  const pillLabel = completed ? 'Done' : challenge.joined ? 'Leave' : 'Join';
  const pillColor = completed ? colors.success : '#fff';
  const textColor = completed ? '#fff' : '#000';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { padding: normalize(20), borderRadius: normalize(28) },
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      disabled={busy}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <View style={styles.categoryRow}>
            <Text style={[styles.categoryText, { fontSize: normalize(11) }]}>{challenge.category}</Text>
          </View>
          <Text style={[styles.rowTitle, { fontSize: normalize(19) }]} numberOfLines={1}>
            {challenge.title}
          </Text>
        </View>
        <Text style={[styles.progressValue, { fontSize: normalize(14) }]}>{progressLabel}</Text>
      </View>

      <Text style={[styles.description, { fontSize: normalize(15) }]} numberOfLines={2}>
        {challenge.description}
      </Text>

      <View style={[styles.progressTrack, { height: normalize(5), marginTop: normalize(6) }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={[styles.rowFooter, { marginTop: normalize(16) }]}>
        <View style={styles.rewardContainer}>
          <Ionicons name="gift-outline" size={normalize(14)} color="rgba(255,255,255,0.4)" />
          <Text style={[styles.rewardText, { fontSize: normalize(12) }]} numberOfLines={1}>
            {challenge.reward}
          </Text>
        </View>
        <Pressable
          onPress={onPress}
          disabled={busy}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: pillColor,
              paddingHorizontal: normalize(18),
              paddingVertical: normalize(10),
              borderRadius: normalize(24),
              opacity: pressed ? 0.9 : 1
            }
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text style={[styles.pillLabel, { fontSize: normalize(14), color: textColor }]}>
              {pillLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingVertical: 32,
    paddingBottom: 120,
  },
  header: {
    gap: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingsButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  list: {
    gap: 20,
  },
  row: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  rowPressed: {
    transform: [{ scale: 0.99 }],
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  categoryRow: {
    marginBottom: 2,
  },
  categoryText: {
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rowTitle: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  description: {
    lineHeight: 22,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  progressValue: {
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    opacity: 0.8,
  },
  progressTrack: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
  },
  pillLabel: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    gap: 16,
  },
  emptyIcon: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stateTitle: {
    fontWeight: '700',
    color: '#fff',
  },
  stateText: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 240,
  },
});
