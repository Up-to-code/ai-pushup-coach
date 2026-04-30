import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { mockLeaderboard } from '../../src/data';
import { useUserStore } from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

type RankScope = 'global' | 'country' | 'friends';

const rankTabs: Array<{ id: RankScope; label: string }> = [
  { id: 'global', label: 'Global' },
  { id: 'country', label: 'Country' },
  { id: 'friends', label: 'Friends' },
];

const friendIds = new Set(['1', '3']);

export default function LeaderboardScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const [scope, setScope] = useState<RankScope>('global');

  const rows = useMemo(() => {
    const currentUserRow = {
      id: user.id,
      rank: Math.max(1, mockLeaderboard.find((entry) => entry.isCurrentUser)?.rank ?? 8),
      name: user.displayName || user.name,
      countryCode: user.countryCode,
      score: user.totalReps,
      isCurrentUser: true,
    };

    const allRows = mockLeaderboard
      .filter((entry) => !entry.isCurrentUser)
      .concat(currentUserRow)
      .sort((a, b) => b.score - a.score);

    return allRows
      .filter((entry) => {
        if (scope === 'country') return entry.countryCode === user.countryCode;
        if (scope === 'friends') return entry.isCurrentUser || friendIds.has(entry.id);
        return true;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [scope, user.countryCode, user.displayName, user.id, user.name, user.totalReps]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rank</Text>
        <View style={styles.tabRow}>
          {rankTabs.map((tab) => {
            const active = tab.id === scope;
            return (
              <Pressable
                key={tab.id}
                style={({ pressed }) => [
                  styles.tabButton,
                  active && styles.tabButtonActive,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => setScope(tab.id)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {rows.map((entry) => (
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
              <Text style={styles.nameText} numberOfLines={1}>{entry.name}</Text>
              {entry.isCurrentUser ? <Text style={styles.youText}>You</Text> : null}
            </View>
            <Text style={styles.scoreText}>{entry.score.toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.titleLarge, color: colors.textPrimary },
  tabRow: {
    minHeight: 42,
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: { backgroundColor: colors.accent },
  tabText: { ...typography.captionBold, color: colors.textSecondary },
  tabTextActive: { color: colors.background },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 104 },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowActive: {
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentAlpha,
    borderBottomColor: 'transparent',
  },
  rowPressed: { opacity: 0.72 },
  rankText: { width: 32, ...typography.bodyBold, color: colors.textSecondary },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyBold, color: colors.textPrimary },
  nameColumn: { flex: 1, minWidth: 0 },
  nameText: { ...typography.bodyBold, color: colors.textPrimary },
  youText: { ...typography.caption, color: colors.accent, marginTop: 2 },
  scoreText: { minWidth: 76, textAlign: 'right', ...typography.bodyBold, color: colors.textPrimary },
});
