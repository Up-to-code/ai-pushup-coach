import React, { useMemo, useState } from 'react';
import { Alert, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store';
import { formatDuration } from '../../src/utils';
import { getMondayWeekStart, useFriendComparison, useProfileRange, type TimePeriod, type WorkoutStats } from '../../src/features/profile/hooks';
import { useSocialCounts } from '../../src/features/social/hooks';
import { useSocialInbox } from '../../src/features/notifications/hooks';
import { colors, spacing, typography } from '../../src/theme';
import { useIsScreenFocused, useResponsive } from '../../src/hooks';
import { ProBadge, SimpleLineChart } from '../../src/components';
import { canUseProfileRange, resolveProfileRangeForAccess, useSubscription } from '../../src/subscriptions';
import { useAppLocale } from '../../src/localization';

type ProfileTab = 'stats' | 'history' | 'badges';

const profileTabs: Array<{ id: ProfileTab; labelKey: 'profile.stats' | 'profile.history' | 'profile.trophies'; icon: string }> = [
  { id: 'stats', labelKey: 'profile.stats', icon: 'stats-chart' },
  { id: 'history', labelKey: 'profile.history', icon: 'time-outline' },
  { id: 'badges', labelKey: 'profile.trophies', icon: 'trophy-outline' },
];

const periods: TimePeriod[] = ['W', 'M', 'Y', 'ALL'];
const emptyStats: WorkoutStats = {
  totalReps: 0,
  totalDuration: 0,
  totalCalories: 0,
  bestSession: 0,
  avgSpeed: '0',
  sessions: 0,
};

const badgeRules = [
  { title: 'First 25', icon: 'flash', unlocks: (total: number, best: number) => best >= 25 || total >= 25 },
  { title: '50 Max', icon: 'flame', unlocks: (_total: number, best: number) => best >= 50 },
  { title: '100 Max', icon: 'trophy', unlocks: (_total: number, best: number) => best >= 100 },
  { title: '500 Total', icon: 'barbell', unlocks: (total: number) => total >= 500 },
  { title: '1K Total', icon: 'medal', unlocks: (total: number) => total >= 1000 },
  { title: '7 Streak', icon: 'calendar', unlocks: (_total: number, _best: number, streak: number) => streak >= 7 },
];

function getDaysForPeriod(period: TimePeriod): number {
  switch (period) {
    case 'W': return 7;
    case 'M': return 30;
    case 'Y': return 365;
    case 'ALL': return 99999;
  }
}

function getPeriodLabel(period: TimePeriod, t: ReturnType<typeof useAppLocale>['t'], locale: string): string {
  switch (period) {
    case 'W': return t('profile.thisWeek');
    case 'M': {
      const now = new Date();
      return now.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();
    }
    case 'Y': return t('profile.thisYear');
    case 'ALL': return t('profile.allTime');
  }
}

function getCompareLabel(period: TimePeriod, t: ReturnType<typeof useAppLocale>['t']): string {
  switch (period) {
    case 'W': return t('profile.vsLastWeek');
    case 'M': return t('profile.vsLastMonth');
    case 'Y': return t('profile.vsLastYear');
    case 'ALL': return '';
  }
}

function formatWeekRange(offset: number, locale: string) {
  const base = new Date();
  base.setDate(base.getDate() - offset * 7);
  const start = getMondayWeekStart(base);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t, locale } = useAppLocale();
  const { horizontalPadding } = useResponsive();
  const isFocused = useIsScreenFocused();
  const screenWidth = Dimensions.get('window').width;
  const user = useUserStore((state) => state.user);
  const { isPro, showPaywall } = useSubscription();
  const { counts } = useSocialCounts(isFocused);
  const { inbox } = useSocialInbox(10, isFocused);
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats');
  const [period, setPeriod] = useState<TimePeriod>('W');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const profileAccessRange = resolveProfileRangeForAccess(period, periodOffset, isPro);
  const visiblePeriod = profileAccessRange.period as TimePeriod;
  const visibleOffset = profileAccessRange.offset;
  const { range: profileRange, loading: profileLoading } = useProfileRange(visiblePeriod, visibleOffset, isFocused);
  const { range: allTimeRange } = useProfileRange(isPro ? 'ALL' : 'W', 0, isFocused);
  const { comparison: friendComparison } = useFriendComparison('W', 0, isFocused);
  const rawDisplayName = user.displayName || user.name;
  const displayName = rawDisplayName.length > 4 ? `${rawDisplayName.slice(0, 4)}...` : rawDisplayName;
  const chartWidth = screenWidth - horizontalPadding * 2;

  const days = getDaysForPeriod(visiblePeriod);
  const current = profileRange?.summary ?? emptyStats;
  const previous = profileRange?.previousSummary ?? null;
  const chartData = profileRange?.dailySeries.map((point) => point.reps) ?? [];
  const history = profileRange?.history ?? [];
  const allTotals = allTimeRange?.summary ?? emptyStats;
  const achievementBadges = badgeRules.map((badge) => ({
    ...badge,
    unlocked: badge.unlocks(allTotals.totalReps, allTotals.bestSession, user.streak),
  }));

  const periodLabel = useMemo(() => {
    if (visibleOffset === 0) return getPeriodLabel(visiblePeriod, t, locale);
    const now = new Date();
    const target = new Date(now);
    target.setDate(target.getDate() - visibleOffset * days);
    if (visiblePeriod === 'W') {
      return formatWeekRange(visibleOffset, locale);
    }
    if (visiblePeriod === 'M') return target.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();
    return getPeriodLabel(visiblePeriod, t, locale);
  }, [visiblePeriod, visibleOffset, days, locale, t]);
  const compareLabel = getCompareLabel(visiblePeriod, t);

  /* Generate picker options */
  const pickerOptions = useMemo(() => {
    const opts: Array<{ label: string; offset: number }> = [];
    const count = visiblePeriod === 'W' ? 12 : visiblePeriod === 'M' ? 12 : 5;
    for (let i = 0; i < count; i++) {
      const now = new Date();
      const target = new Date(now);
      target.setDate(target.getDate() - i * days);
      let label = '';
      if (visiblePeriod === 'W') {
        const range = formatWeekRange(i, locale);
        label = i === 0 ? `${t('profile.thisWeek')} (${range})` : i === 1 ? `${t('profile.vsLastWeek').replace(/^vs /i, '')} (${range})` : range;
      } else if (visiblePeriod === 'M') {
        label = i === 0 ? t('profile.thisMonth') : i === 1 ? t('profile.vsLastMonth').replace(/^vs /i, '') : target.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      } else {
        label = i === 0 ? t('profile.thisYear') : `${new Date().getFullYear() - i}`;
      }
      opts.push({ label, offset: i });
    }
    return opts;
  }, [visiblePeriod, days, locale, t]);

  const promptPro = async () => {
    try {
      await showPaywall();
    } catch (error) {
      Alert.alert(
        'Pro feature',
        error instanceof Error ? error.message : 'Upgrade to Pro to unlock older history and longer date ranges.'
      );
    }
  };

  function formatCompare(curr: number, prev: number | undefined): string {
    if (prev === undefined || prev === null) return '';
    const diff = curr - prev;
    if (diff > 0) return `↑ ${diff}`;
    if (diff < 0) return `↓ ${Math.abs(diff)}`;
    return '—';
  }

  function getCompareColor(curr: number, prev: number | undefined): string {
    if (prev === undefined || prev === null) return colors.textMuted;
    if (curr > prev) return colors.success;
    if (curr < prev) return colors.accent;
    return colors.textMuted;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{rawDisplayName.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.title}>{displayName}</Text>
              <Text style={styles.meta}>{user.countryName}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name={inbox?.unreadCount ? 'notifications' : 'notifications-outline'} size={20} color={colors.textPrimary} />
              {inbox?.unreadCount ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/settings/edit-profile' as any)}>
              <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/settings' as any)}>
              <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Bio & Social */}
        <View style={styles.bioBlock}>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          <View style={styles.socialStats}>
            <Text style={styles.socialStatText}>{t('profile.followers', { count: counts?.followersCount ?? 0 })}</Text>
            <Text style={styles.socialStatText}>{t('profile.following', { count: counts?.followingCount ?? 0 })}</Text>
            <Text style={styles.socialStatText}>{t('profile.friends', { count: counts?.friendsCount ?? 0 })}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {profileTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={active ? colors.textPrimary : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t(tab.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' ? (
          <>
            {/* Period Header */}
            <View style={styles.periodHeader}>
              <Pressable
                onPress={() => {
                  if (!isPro) {
                    void promptPro();
                    return;
                  }
                  if (visiblePeriod !== 'ALL') setShowPicker(true);
                }}
              >
                <View style={styles.periodLabelRow}>
                  <Text style={styles.periodTitle}>{periodLabel}</Text>
                  {visiblePeriod !== 'ALL' && <Ionicons name="chevron-down" size={14} color={colors.accent} style={{ marginLeft: 4 }} />}
                </View>
                {compareLabel ? <Text style={styles.periodCompare}>{compareLabel}</Text> : null}
              </Pressable>
              <View style={styles.periodPills}>
                {periods.map((p) => {
                  const active = visiblePeriod === p;
                  const locked = !canUseProfileRange(p, 0, isPro);
                  return (
                    <Pressable
                      key={p}
                      style={[styles.periodPill, active && styles.periodPillActive, locked && styles.periodPillLocked]}
                      onPress={() => {
                        if (locked) {
                          void promptPro();
                          return;
                        }
                        setPeriod(p);
                        setPeriodOffset(0);
                      }}
                    >
                      <View style={styles.periodPillContent}>
                        <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>{p}</Text>
                        {locked ? <ProBadge size="tiny" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Chart */}
            {profileLoading ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyTitle}>{t('profile.loadingRealData')}</Text>
                <Text style={styles.emptyText}>{t('profile.readingDeviceWorkouts')}</Text>
              </View>
            ) : chartData.length > 1 ? (
              <View style={styles.chartCard}>
                <SimpleLineChart data={chartData} width={chartWidth} height={140} color={colors.accent} />
              </View>
            ) : (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyTitle}>{t('profile.noSessionsPeriod')}</Text>
                <Text style={styles.emptyText}>{t('profile.completeWorkoutStats')}</Text>
              </View>
            )}

            {/* Stat Cards 2x2 */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>{t('profile.totalPushups')}</Text>
                <View style={styles.statCardBody}>
                  <Ionicons name="barbell" size={22} color={colors.accent} />
                  <View>
                    <Text style={styles.statCardValue}>{current.totalReps} <Text style={styles.statCardUnit}>{t('profile.repsUnit')}</Text></Text>
                    {previous && (
                      <Text style={[styles.statCardCompare, { color: getCompareColor(current.totalReps, previous.totalReps) }]}>
                        {formatCompare(current.totalReps, previous.totalReps)} vs {previous.totalReps}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>{t('profile.totalDuration')}</Text>
                <View style={styles.statCardBody}>
                  <Ionicons name="time-outline" size={22} color={colors.accent} />
                  <View>
                    <Text style={styles.statCardValue}>{formatDuration(current.totalDuration)}</Text>
                    {previous && (
                      <Text style={[styles.statCardCompare, { color: getCompareColor(current.totalDuration, previous.totalDuration) }]}>
                        vs {formatDuration(previous.totalDuration)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>{t('profile.calories')}</Text>
                <View style={styles.statCardBody}>
                  <Ionicons name="flame-outline" size={22} color={colors.accent} />
                  <View>
                    <Text style={styles.statCardValue}>{current.totalCalories}<Text style={styles.statCardUnit}>kcal</Text></Text>
                    {previous && (
                      <Text style={[styles.statCardCompare, { color: getCompareColor(current.totalCalories, previous.totalCalories) }]}>
                        {formatCompare(current.totalCalories, previous.totalCalories)} vs {previous.totalCalories}kcal
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>{t('profile.practiceDays')}</Text>
                <View style={styles.statCardBody}>
                  <Ionicons name="calendar-outline" size={22} color={colors.accent} />
                  <View>
                    <Text style={styles.statCardValue}>{current.sessions}</Text>
                    {previous && (
                      <Text style={[styles.statCardCompare, { color: getCompareColor(current.sessions, previous.sessions) }]}>
                        {formatCompare(current.sessions, previous.sessions)} vs {previous.sessions}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Speed & Best */}
            <View style={styles.statsRow}>
              <View style={styles.statMini}>
                <Ionicons name="speedometer-outline" size={18} color={colors.accent} />
                <Text style={styles.statMiniValue}>{current.avgSpeed}</Text>
                <Text style={styles.statMiniLabel}>{t('profile.repsPerMinute')}</Text>
              </View>
              <View style={styles.statMiniDivider} />
              <View style={styles.statMini}>
                <Ionicons name="flash" size={18} color={colors.accent} />
                <Text style={styles.statMiniValue}>{current.bestSession}</Text>
                <Text style={styles.statMiniLabel}>{t('profile.bestSession')}</Text>
              </View>
              <View style={styles.statMiniDivider} />
              <View style={styles.statMini}>
                <Ionicons name="trending-up" size={18} color={colors.accent} />
                <Text style={styles.statMiniValue}>{user.streak}</Text>
                <Text style={styles.statMiniLabel}>{t('profile.streak')}</Text>
              </View>
            </View>

            <View style={styles.friendCompare}>
              <View style={styles.friendCompareHeader}>
                <View>
                  <Text style={styles.friendCompareEyebrow}>{t('profile.friendsThisWeek')}</Text>
                  <Text style={styles.friendCompareTitle}>
                    {friendComparison?.friendsCount ? t('profile.amongFriends', { rank: friendComparison.rank }) : t('profile.noMutualFriends')}
                  </Text>
                </View>
                <Ionicons name="people-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.friendCompareGrid}>
                <View style={styles.friendMetric}>
                  <Text style={styles.friendMetricValue}>{friendComparison?.score ?? 0}</Text>
                  <Text style={styles.friendMetricLabel}>{t('profile.yourReps')}</Text>
                </View>
                <View style={styles.friendMetric}>
                  <Text style={styles.friendMetricValue}>{friendComparison?.friendAverage ?? 0}</Text>
                  <Text style={styles.friendMetricLabel}>{t('profile.friendAvg')}</Text>
                </View>
                <View style={styles.friendMetric}>
                  <Text style={styles.friendMetricValue}>{friendComparison?.deltaToNext ?? 0}</Text>
                  <Text style={styles.friendMetricLabel}>{t('profile.toNext')}</Text>
                </View>
              </View>
              <Text style={styles.friendCompareNote}>
                {friendComparison?.friendsCount
                  ? friendComparison.deltaToNext > 0
                    ? t('profile.repsToNextFriend', { count: friendComparison.deltaToNext })
                    : t('profile.topFriendScore')
                  : t('profile.mutualFollowsNote')}
              </Text>
            </View>
          </>
        ) : null}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' ? (
          <View style={styles.list}>
            {history.length > 0 ? history.map((session) => (
              <View key={session.id} style={styles.row}>
                <View style={styles.rowIconWrap}>
                  <Ionicons name="fitness-outline" size={18} color={colors.accent} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{session.reps} reps</Text>
                  <Text style={styles.rowMeta}>
                    {new Date(session.date).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {'  •  '}
                    {formatDuration(session.duration)}
                  </Text>
                </View>
                <Text style={[styles.feedbackText, session.formFeedbackState === 'good' && { color: colors.success }]}>
                  {session.formFeedbackState ?? 'good'}
                </Text>
              </View>
            )) : (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyTitle}>{t('profile.noHistory')}</Text>
                <Text style={styles.emptyText}>{t('profile.historyBody')}</Text>
              </View>
            )}
            {!isPro ? (
              <Pressable style={styles.proLockPanel} onPress={() => void promptPro()}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.accent} />
                <View style={styles.proLockCopy}>
                  <View style={styles.proLockTitleRow}>
                    <Text style={styles.proLockTitle}>{t('profile.olderHistory')}</Text>
                    <ProBadge />
                  </View>
                  <Text style={styles.proLockText}>{t('profile.olderHistoryBody')}</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ── BADGES TAB ── */}
        {activeTab === 'badges' ? (
          <View style={styles.badgeGrid}>
            {achievementBadges.map((badge) => (
              <View key={badge.title} style={[styles.bigBadge, !badge.unlocked && styles.lockedRow]}>
                <Ionicons name={badge.icon as any} size={28} color={badge.unlocked ? colors.accent : colors.textMuted} />
                <Text style={[styles.bigBadgeLabel, badge.unlocked && { color: colors.textPrimary }]}>{badge.title}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* ── Period Picker Bottom Sheet ── */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPicker(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {visiblePeriod === 'W' ? t('profile.selectWeek') : visiblePeriod === 'M' ? t('profile.selectMonth') : t('profile.selectYear')}
            </Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {pickerOptions.map((opt) => {
                const isActive = periodOffset === opt.offset;
                return (
                  <Pressable
                    key={opt.offset}
                    style={[styles.sheetOption, isActive && styles.sheetOptionActive]}
                    onPress={() => { setPeriodOffset(opt.offset); setShowPicker(false); }}
                  >
                    <Text style={[styles.sheetOptionText, isActive && styles.sheetOptionTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: 112,
    gap: spacing.lg,
  },

  /* ── Header ── */
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 54,
    height: 54,
    resizeMode: 'cover',
  },
  avatarText: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 16,
    fontWeight: '400',
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
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Bio ── */
  bio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bioBlock: { gap: spacing.sm },
  /* ── Tab Bar ── */
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabButtonActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },

  /* ── Period Header (W M Y ALL) ── */
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodTitle: {
    ...typography.captionBold,
    color: colors.accent,
    letterSpacing: 1,
    fontSize: 12,
  },
  periodCompare: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  periodPills: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 3,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  periodPillContent: {
    minHeight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  periodPillActive: {
    backgroundColor: colors.accent,
  },
  periodPillLocked: {
    opacity: 0.45,
  },
  periodPillText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 12,
  },
  periodPillTextActive: {
    color: colors.textInverse,
  },

  /* ── Chart ── */
  chartCard: {
    paddingVertical: spacing.sm,
  },

  /* ── Stat Cards 2×2 ── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCardLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  statCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statCardValue: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 22,
  },
  statCardUnit: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  statCardCompare: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  socialStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  socialStatText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  emptyPanel: {
    minHeight: 118,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ── Speed / Best / Streak row ── */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  statMini: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statMiniValue: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 18,
  },
  statMiniLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  statMiniDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  friendCompare: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  friendCompareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  friendCompareEyebrow: {
    ...typography.captionBold,
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  friendCompareTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  friendCompareGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  friendMetric: {
    flex: 1,
    minHeight: 62,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  friendMetricValue: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 18,
  },
  friendMetricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  friendCompareNote: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* ── History ── */
  list: { gap: 2 },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentAlpha,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feedbackText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  proLockPanel: {
    marginTop: spacing.md,
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.accentAlpha,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  proLockCopy: {
    flex: 1,
    gap: 2,
  },
  proLockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  proLockTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  proLockText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* ── Badges ── */
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  bigBadge: {
    width: '30%',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  bigBadgeLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  lockedRow: {
    opacity: 0.35,
  },

  /* ── Bottom Sheet ── */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetOption: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetOptionActive: {
    backgroundColor: colors.accentAlpha,
  },
  sheetOptionText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontSize: 16,
  },
  sheetOptionTextActive: {
    color: colors.accent,
    fontSize: 18,
  },
});
