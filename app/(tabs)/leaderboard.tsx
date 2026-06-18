import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardScope } from '../../src/features/leaderboard/hooks';
import { useAppLocale } from '../../src/localization';
import { colors, typography } from '../../src/theme';
import { useIsScreenFocused, useResponsive } from '../../src/hooks';

const rankTabs: Array<{ id: LeaderboardScope; labelKey: 'common.global' | 'common.country' | 'common.friends' }> = [
  { id: 'global', labelKey: 'common.global' },
  { id: 'country', labelKey: 'common.country' },
  { id: 'friends', labelKey: 'common.friends' },
];

const periodTabs: Array<{ id: LeaderboardPeriod; labelKey: 'common.week' | 'common.month' | 'common.year' | 'common.all' }> = [
  { id: 'W', labelKey: 'common.week' },
  { id: 'M', labelKey: 'common.month' },
  { id: 'Y', labelKey: 'common.year' },
  { id: 'ALL', labelKey: 'common.all' },
];

const getFlagEmoji = (countryCode?: string) => {
  if (!countryCode || countryCode === 'GLOBAL') return '🌍';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { t } = useAppLocale();
  const { normalize, verticalScale } = useResponsive();
  const isFocused = useIsScreenFocused();
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('W');
  const { rows, loading, isGlobalCountryFallback, diagnostics } = useLeaderboard(scope, period, 75, isFocused);

  React.useEffect(() => {
    if (!__DEV__ || !isFocused) return;
    console.log('[leaderboard:screen]', diagnostics);
  }, [diagnostics, isFocused]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: normalize(24), marginTop: verticalScale(16) }]}>
        <Text style={[styles.title, { fontSize: normalize(34) }]}>{t('leaderboard.title')}</Text>
        <Text style={[styles.subtitle, { fontSize: normalize(15) }]}>
          {isGlobalCountryFallback ? t('leaderboard.subtitleCountryLocked') : t('leaderboard.subtitleGlobal')}
        </Text>

        <View style={[styles.periodTabs, { marginTop: verticalScale(16) }]}>
          {periodTabs.map((tab) => {
            const active = tab.id === period;
            return (
              <Pressable
                key={tab.id}
                style={[styles.periodTab, active && styles.periodTabActive]}
                onPress={() => setPeriod(tab.id)}
              >
                <Text style={[styles.periodTabText, { fontSize: normalize(13) }, active && styles.periodTabTextActive]}>
                  {t(tab.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingHorizontal: normalize(24), paddingTop: verticalScale(16) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : rows && rows.length > 0 ? (
          rows.map((entry) => (
            <Pressable
              key={entry.id}
              style={({ pressed }) => [
                styles.row,
                { paddingVertical: verticalScale(12) },
                entry.isCurrentUser && styles.rowActive,
                pressed && styles.rowPressed,
              ]}
              onPress={() => router.push(`/user/${entry.id}` as any)}
            >
              <Text style={[styles.rankText, { fontSize: normalize(16) }]}>{entry.rank}</Text>
              <View style={[styles.avatar, { width: normalize(44), height: normalize(44), borderRadius: normalize(22) }]}>
                {entry.avatar ? (
                  <Image source={{ uri: entry.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { fontSize: normalize(16) }]}>{entry.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.nameColumn}>
                <View style={styles.nameRow}>
                  <Text style={[styles.nameText, { fontSize: normalize(17) }]} numberOfLines={1}>{entry.name}</Text>
                  <Text style={{ fontSize: normalize(14) }}>{getFlagEmoji(entry.countryCode)}</Text>
                </View>
                {entry.isCurrentUser ? <Text style={[styles.youText, { fontSize: normalize(11) }]}>{t('leaderboard.you')}</Text> : null}
              </View>
              <View style={styles.scoreColumn}>
                <Text style={[styles.scoreText, { fontSize: normalize(18) }]}>{entry.score.toLocaleString()}</Text>
                <Text style={[styles.scoreLabel, { fontSize: normalize(11) }]}>{t('workout.reps')}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.stateBox}>
            <Text style={[styles.stateTitle, { fontSize: normalize(18) }]}>{t('leaderboard.emptyTitle')}</Text>
            <Text style={[styles.stateText, { fontSize: normalize(14) }]}>
              {t('leaderboard.emptyBody')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.floatingContainer, { bottom: verticalScale(32) }]}>
        <BlurView intensity={20} tint="dark" style={styles.floatingTabsContainer}>
          <View style={styles.floatingTabs}>
            {rankTabs.map((tab) => {
              const active = tab.id === scope;
              return (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.floatingTabButton,
                    { paddingHorizontal: normalize(20), paddingVertical: normalize(10) },
                    active && styles.floatingTabButtonActive,
                  ]}
                  onPress={() => setScope(tab.id)}
                >
                  <Text style={[
                    styles.floatingTabText,
                    { fontSize: normalize(13) },
                    active && styles.floatingTabTextActive
                  ]}>
                    {t(tab.labelKey)}
                  </Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    gap: 4,
  },
  title: { fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontWeight: '500', lineHeight: 20 },
  periodTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  periodTabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  periodTabText: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  periodTabTextActive: {
    color: '#000',
  },
  floatingContainer: {
    position: 'absolute',
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabButtonActive: {
    backgroundColor: '#fff',
  },
  floatingTabText: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  floatingTabTextActive: {
    color: '#000',
  },
  list: { paddingBottom: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderBottomWidth: 0,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  rowPressed: { opacity: 0.7 },
  rankText: { width: 30, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontWeight: '800', color: '#fff' },
  nameColumn: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  youText: { fontWeight: '800', color: colors.accent, marginTop: 1, letterSpacing: 1 },
  scoreColumn: { alignItems: 'flex-end' },
  scoreText: { fontWeight: '800', color: '#fff' },
  scoreLabel: { fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginTop: 1 },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  stateTitle: { fontWeight: '700', color: '#fff' },
  stateText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
});
