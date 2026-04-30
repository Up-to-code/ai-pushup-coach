import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { mockChallenges, type Challenge } from '../../src/data';
import { useResponsive } from '../../src/hooks';

export default function ChallengesScreen() {
  const { horizontalPadding } = useResponsive();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Challenges</Text>
        </View>

        <View style={styles.list}>
          {mockChallenges.map((challenge) => (
            <ChallengeRow key={challenge.id} challenge={challenge} onPress={() => {}} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChallengeRow({ challenge, onPress }: { challenge: Challenge; onPress: () => void }) {
  const progress = challenge.goal ? Math.min(1, (challenge.progress || 0) / challenge.goal) : 0;
  const progressLabel = challenge.goal ? `${challenge.progress || 0}/${challenge.goal}` : 'Not started';

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle} numberOfLines={1}>{formatTitle(challenge.title)}</Text>
          <Text style={styles.rowMeta}>{challenge.category}</Text>
        </View>
        <Text style={styles.progressValue}>{progressLabel}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.rowFooter}>
        <Text style={styles.rewardText} numberOfLines={1}>{challenge.rewards[0]}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function formatTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    minHeight: 42,
    justifyContent: 'center',
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    minHeight: 112,
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
});
