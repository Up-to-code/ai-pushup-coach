import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardScope } from '../../src/features/leaderboard/hooks';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

const rankTabs: Array<{ id: LeaderboardScope; label: string }> = [
  { id: 'global', label: 'Global' },
  { id: 'country', label: 'Country' },
  { id: 'friends', label: 'Friends' },
];

const periodTabs: Array<{ id: LeaderboardPeriod; label: string; shortLabel: string }> = [
  { id: 'W', label: 'This Week', shortLabel: 'Week' },
  { id: 'M', label: 'This Month', shortLabel: 'Month' },
  { id: 'Y', label: 'This Year', shortLabel: 'Year' },
  { id: 'ALL', label: 'All Time', shortLabel: 'All' },
];

const getFlagEmoji = (countryCode?: string) => {
  if (!countryCode || countryCode === 'GLOBAL') return '🌍';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('W');
  const { rows, loading, isGlobalCountryFallback } = useLeaderboard(scope, period, 75);
  const activePeriod = periodTabs.find((tab) => tab.id === period) ?? periodTabs[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rank</Text>
        <Text style={styles.subtitle}>
          {isGlobalCountryFallback ? 'Choose a country in your profile to unlock country rank.' : `Ranking by ${activePeriod.label.toLowerCase()} reps.`}
        </Text>
        <View style={styles.periodTabs}>
          {periodTabs.map((tab) => {
            const active = tab.id === period;
            return (
              <Pressable
                key={tab.id}
                style={({ pressed }) => [
                  styles.periodTab,
                  active && styles.periodTabActive,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => setPeriod(tab.id)}
              >
                <Text style={[styles.periodTabText, active && styles.periodTabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateText}>Loading live ranks...</Text>
          </View>
        ) : rows && rows.length > 0 ? (
          rows.map((entry) => (
            <Pressable
              key={entry.id}
              style={({ pressed }) => [
                styles.row,
                entry.isCurrentUser && styles.rowActive,
                pressed && styles.rowPressed,
              ]}
              onPress={() => router.push(`/(stack)/user/${entry.id}` as any)}
            >
              <Text style={styles.rankText}>{entry.rank}</Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{entry.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.nameColumn}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText} numberOfLines={1}>{entry.name}</Text>
                  <Text style={styles.flagText}>{getFlagEmoji(entry.countryCode)}</Text>
                </View>
                {entry.isCurrentUser ? <Text style={styles.youText}>You</Text> : null}
              </View>
              <View style={styles.scoreColumn}>
                <Text style={styles.scoreText}>{entry.score.toLocaleString()}</Text>
                <Text style={styles.scoreLabel}>{activePeriod.shortLabel}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>No ranks yet</Text>
            <Text style={styles.stateText}>
              Complete a workout or follow people to build this leaderboard.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.floatingContainer}>
        <BlurView intensity={80} tint="dark" style={styles.floatingTabsContainer}>
          <View style={styles.floatingTabs}>
            {rankTabs.map((tab) => {
              const active = tab.id === scope;
              return (
                <Pressable
                  key={tab.id}
                  style={({ pressed }) => [
                    styles.floatingTabButton,
                    active && styles.floatingTabButtonActive,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => setScope(tab.id)}
                >
                  <Text style={[styles.floatingTabText, active && styles.floatingTabTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: { ...typography.titleLarge, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  periodTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  periodTab: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  periodTabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: colors.textInverse,
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  floatingTabsContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  floatingTabs: {
    flexDirection: 'row',
    padding: 6,
    gap: 4,
  },
  floatingTabButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabButtonActive: {
    backgroundColor: colors.textPrimary,
  },
  floatingTabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  floatingTabTextActive: {
    color: colors.textInverse,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 104 },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowActive: {
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowPressed: { opacity: 0.72 },
  rankText: { width: 32, ...typography.bodyBold, color: colors.textSecondary },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyBold, color: colors.textPrimary },
  nameColumn: { flex: 1, minWidth: 0, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nameText: { ...typography.bodyBold, color: colors.textPrimary, flexShrink: 1 },
  flagText: { fontSize: 14 },
  youText: { ...typography.caption, color: colors.accent, marginTop: 2 },
  scoreColumn: { minWidth: 76, alignItems: 'flex-end' },
  scoreText: { textAlign: 'right', ...typography.bodyBold, color: colors.textPrimary },
  scoreLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  stateBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stateTitle: { ...typography.bodyBold, color: colors.textPrimary, textAlign: 'center' },
  stateText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
