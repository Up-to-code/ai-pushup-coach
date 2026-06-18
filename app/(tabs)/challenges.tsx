import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../src/analytics';
import { useChallenges } from '../../src/features/challenges/hooks';
import { colors, typography } from '../../src/theme';
import { useIsScreenFocused, useResponsive } from '../../src/hooks';
import type { Id } from '../../convex/_generated/dataModel';
import { useAppLocale } from '../../src/localization';

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
  const posthog = useAnalytics();
  const { t } = useAppLocale();
  const { normalize, horizontalPadding, verticalScale } = useResponsive();
  const isFocused = useIsScreenFocused();
  const { challenges, loading, join, leave } = useChallenges(30, isFocused);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleJoin = async (challenge: ChallengeRowData) => {
    if (busyId) return;
    setBusyId(challenge._id);
    const eventName = challenge.joined ? 'challenge_left' : 'challenge_joined';
    try {
      if (challenge.joined) {
        await leave(challenge._id);
      } else {
        await join(challenge._id);
      }
      posthog.capture(eventName, { challenge_id: challenge._id, title: challenge.title, category: challenge.category });
    } catch (error) {
      console.warn('Challenge action failed', error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../../assets/bg.png')} style={StyleSheet.absoluteFill}>
        <View style={styles.overlay} />
      </ImageBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: normalize(24) }]}
        >
          <View style={[styles.header, { marginBottom: verticalScale(24) }]}>
            <Text style={[styles.title, { fontSize: normalize(34) }]}>{t('challenges.title')}</Text>
          </View>

          <View style={styles.list}>
            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : challenges && challenges.length > 0 ? (
              challenges.map((challenge) => (
                <ChallengeRow
                  key={challenge._id}
                  challenge={challenge}
                  busy={busyId === challenge._id}
                  onPress={() => toggleJoin(challenge)}
                  normalize={normalize}
                  labels={{ done: t('common.done'), join: t('challenges.join'), leave: t('challenges.leave') }}
                />
              ))
            ) : (
              <View style={styles.stateBox}>
                <View style={[styles.emptyIcon, { width: normalize(72), height: normalize(72), borderRadius: normalize(36) }]}>
                  <Ionicons name="trophy-outline" size={normalize(32)} color="rgba(255,255,255,0.2)" />
                </View>
                <Text style={[styles.stateTitle, { fontSize: normalize(18) }]}>{t('challenges.emptyTitle')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ChallengeRow({
  challenge,
  busy,
  onPress,
  normalize,
  labels,
}: {
  challenge: ChallengeRowData;
  busy: boolean;
  onPress: () => void;
  normalize: (v: number) => number;
  labels: { done: string; join: string; leave: string };
}) {
  const progress = Math.min(1, challenge.progressReps / Math.max(1, challenge.goalReps));
  const progressLabel = `${challenge.progressReps}/${challenge.goalReps}`;
  const completed = Boolean(challenge.completedAt);

  const pillLabel = completed ? labels.done : challenge.joined ? labels.leave : labels.join;
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
          <Text style={[styles.categoryText, { fontSize: normalize(11) }]}>{challenge.category}</Text>
          <Text style={[styles.rowTitle, { fontSize: normalize(19) }]} numberOfLines={1}>
            {challenge.title}
          </Text>
        </View>
        <Text style={[styles.progressValue, { fontSize: normalize(14) }]}>{progressLabel}</Text>
      </View>

      <View style={[styles.progressTrack, { height: normalize(5), marginTop: normalize(4) }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={[styles.rowFooter, { marginTop: normalize(14) }]}>
        <View />
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
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scrollContent: {
    paddingVertical: 32,
    paddingBottom: 120,
  },
  header: {},
  title: {
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  list: {
    gap: 16,
  },
  row: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
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
