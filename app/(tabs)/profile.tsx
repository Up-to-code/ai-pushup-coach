import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore, useWorkoutStore } from '../../src/store';
import { calculateTotalStats, mockWorkouts } from '../../src/data';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { useResponsive } from '../../src/hooks';
import { SimpleLineChart } from '../../src/components';

type ProfileTab = 'stats' | 'history' | 'badges';

const profileTabs: Array<{ id: ProfileTab; label: string }> = [
  { id: 'stats', label: 'Stats' },
  { id: 'history', label: 'History' },
  { id: 'badges', label: 'Badges' },
];

const badgeRules = [
  { title: 'First 25', icon: 'flash', unlocks: (total: number, best: number) => best >= 25 || total >= 25 },
  { title: '50 Max', icon: 'flame', unlocks: (_total: number, best: number) => best >= 50 },
  { title: '100 Max', icon: 'trophy', unlocks: (_total: number, best: number) => best >= 100 },
  { title: '500 Total', icon: 'barbell', unlocks: (total: number) => total >= 500 },
  { title: '1K Total', icon: 'medal', unlocks: (total: number) => total >= 1000 },
  { title: '7 Streak', icon: 'calendar', unlocks: (_total: number, _best: number, streak: number) => streak >= 7 },
];

const socialLinks = [
  { icon: 'logo-instagram', label: 'Instagram' },
  { icon: 'logo-tiktok', label: 'TikTok' },
  { icon: 'link-outline', label: 'Link' },
];

const miniStatIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Max: 'flash',
  All: 'barbell',
  Count: 'calendar-outline',
  Joined: 'time-outline',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { horizontalPadding } = useResponsive();
  const screenWidth = Dimensions.get('window').width;
  const user = useUserStore((state) => state.user);
  const workouts = useWorkoutStore((state) => state.workouts);
  const source = workouts.length > 0 ? workouts : mockWorkouts;
  const totals = calculateTotalStats(source);
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats');
  const displayName = user.displayName || user.name;
  const chartData = source.slice(-7).map((session) => session.reps);
  const achievementBadges = badgeRules.map((badge) => ({
    ...badge,
    unlocked: badge.unlocks(totals.totalPushups, user.bestReps, user.streak),
  }));
  const chartWidth = screenWidth - horizontalPadding * 2 - spacing.md * 2;
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.title}>{displayName}</Text>
              <Text style={styles.meta}>{user.countryName}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/(stack)/settings/edit-profile' as any)}>
              <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/(stack)/settings' as any)}>
              <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bioBlock}>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          <View style={styles.profileNumbers}>
            <MiniStat label="Max" value={user.bestReps.toLocaleString()} />
            <MiniStat label="All" value={totals.totalPushups.toLocaleString()} />
            <MiniStat label="Count" value={source.length.toString()} />
            <MiniStat label="Joined" value={joinedDate} />
          </View>

          <View style={styles.socialRow}>
            {socialLinks.map((link) => (
              <Pressable key={link.label} style={styles.socialButton} accessibilityLabel={link.label}>
                <Ionicons name={link.icon as any} size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.tabRow}>
          {profileTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'stats' ? (
          <>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Pushups</Text>
                <Text style={styles.chartMeta}>Last {chartData.length} sessions</Text>
              </View>
              <SimpleLineChart data={chartData} width={chartWidth} height={120} color={colors.accent} />
            </View>

            <View style={styles.statsGrid}>
              <Stat label="All pushups" value={totals.totalPushups.toLocaleString()} />
              <Stat label="Count" value={source.length.toString()} />
              <Stat label="Streak" value={user.streak.toString()} />
              <Stat label="Max" value={user.bestReps.toString()} />
            </View>
          </>
        ) : null}

        {activeTab === 'history' ? (
          <View style={styles.list}>
            {source.slice().reverse().map((session) => (
              <View key={session.id} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{session.reps} reps</Text>
                  <Text style={styles.rowMeta}>{new Date(session.date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.badgeText}>{session.formFeedbackState ?? 'good'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === 'badges' ? (
          <View style={styles.badgeGrid}>
            {achievementBadges.map((badge) => (
              <View key={badge.title} style={[styles.bigBadgeIcon, !badge.unlocked && styles.lockedRow]}>
                <Ionicons name={badge.icon as any} size={24} color={badge.unlocked ? colors.accent : colors.textMuted} />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileNumber}>
      <Ionicons name={miniStatIcons[label]} size={16} color={colors.accent} />
      <Text style={styles.miniStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: 112,
    gap: spacing.md,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bioBlock: {
    gap: spacing.md,
  },
  profileNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  profileNumber: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
  },
  miniStatValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  miniStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chartCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  chartTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  chartMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statCard: {
    width: '48.5%',
    minHeight: 86,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    justifyContent: 'center',
  },
  statValue: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  list: {
    gap: spacing.sm,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bigBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  lockedRow: {
    opacity: 0.5,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    flex: 1,
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
