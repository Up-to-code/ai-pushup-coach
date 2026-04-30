import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ImageBackground, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mockLeaderboard } from '../../../src/data';
import { colors, spacing, typography } from '../../../src/theme';
import { SimpleLineChart } from '../../../src/components';
import { useResponsive } from '../../../src/hooks';
import { useUserStore } from '../../../src/store';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { normalize, horizontalPadding } = useResponsive();
  const screenWidth = Dimensions.get('window').width;
  
  const currentUser = useUserStore((state) => state.user);
  const user = mockLeaderboard.find(u => u.id === id) || mockLeaderboard[0];
  const isMe = user.id === 'user-ahmed' || user.name === currentUser.name;
  
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock data for charts
  const getDynamicData = () => [20, 45, 30, 60, 50, 75, 40];

  return (
    <ImageBackground 
      source={require('../../../assets/images/home_bg.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topNav}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </Pressable>
          <Text style={styles.navTitle}>{isMe ? 'MY PROFILE' : 'USER PROFILE'}</Text>
          <Pressable style={styles.backButton}>
            <Ionicons name="share-outline" size={22} color={colors.accent} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.profileMain}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.name[0]}</Text>
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeNumber}>{user.rank}</Text>
                </View>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.usernameRow}>
                  <Text style={styles.username}>@{user.name.toLowerCase().replace(' ', '')}</Text>
                  {isMe && <View style={styles.meTag}><Text style={styles.meTagText}>YOU</Text></View>}
                  {!isMe && <Ionicons name="shield-checkmark" size={18} color={colors.accent} />}
                </View>
                <View style={styles.rankFriendsRow}>
                  <View style={styles.rankLabelBox}>
                    <Text style={styles.rankLabelText}>{user.rank <= 3 ? 'ELITE ATHLETE' : 'APPRENTICE'}</Text>
                  </View>
                  <Text style={styles.friendsCount}><Text style={styles.friendsNumber}>{isMe ? '128' : '42'}</Text> Followers</Text>
                </View>
              </View>
            </View>

            <View style={styles.bioContainer}>
              <Text style={styles.bioText}>
                {isMe ? 'Pushing boundaries, one rep at a time.' : 'Always looking for a challenge. Let\'s hit 100 reps together!'}
              </Text>
              <View style={styles.statsSummaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="barbell" size={14} color={colors.textSecondary} />
                  <Text style={styles.summaryText}>{user.score}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.flagEmoji}>🇪🇬</Text>
                  <Text style={styles.summaryText}>Egypt</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.summaryText}>Joined 2025</Text>
                </View>
              </View>
            </View>

            {!isMe && (
              <View style={styles.actionRow}>
                <Pressable 
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={() => setIsFollowing(!isFollowing)}
                >
                  <Ionicons 
                    name={isFollowing ? "checkmark-circle" : "person-add"} 
                    size={18} 
                    color={isFollowing ? colors.accent : colors.background} 
                  />
                  <Text style={[styles.followText, isFollowing && styles.followingText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
                
                <Pressable style={styles.messageButton}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.messageText}>Message</Text>
                </Pressable>
              </View>
            )}

            {isMe && (
              <Pressable style={styles.editButton} onPress={() => router.push('/(stack)/settings/edit-profile' as any)}>
                <Ionicons name="create-outline" size={18} color={colors.background} />
                <Text style={styles.editButtonText}>Edit My Profile</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.tabContent}>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.statusTitle}>PERFORMANCE TREND</Text>
                  <Text style={styles.statusSubtitle}>Activity over the last 30 days</Text>
                </View>
                <View style={styles.trendIndicator}>
                  <Ionicons name="trending-up" size={12} color="#2ECC71" />
                  <Text style={styles.trendText}>+12%</Text>
                </View>
              </View>
              <View style={styles.chartWrapper}>
                <SimpleLineChart 
                  data={getDynamicData()} 
                  width={screenWidth - horizontalPadding * 2 - 40} 
                  height={normalize(120)}
                  color={colors.accent}
                />
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statsCardContainer}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsCardLabel}>Total Pushups</Text>
                  <View style={styles.statsCardBody}>
                    <Ionicons name="body" size={22} color={colors.accent} />
                    <Text style={styles.statsCardValue}>{user.score}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsCardContainer}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsCardLabel}>Global Rank</Text>
                  <View style={styles.statsCardBody}>
                    <Ionicons name="trophy" size={22} color={colors.accent} />
                    <Text style={styles.statsCardValue}>#{user.rank}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.badgesSection}>
              <Text style={styles.sectionTitle}>UNLOCKED TROPHIES</Text>
              <View style={styles.badgeGrid}>
                {[
                  { icon: 'flame', color: '#E67E22', title: '100 Streak' },
                  { icon: 'calendar', color: '#CD7F32', title: '7 Day' },
                  { icon: 'medal', color: '#FFD700', title: 'Iron Chest' },
                ].map((b, i) => (
                  <View key={i} style={styles.miniBadgeCard}>
                    <Ionicons name={b.icon as any} size={28} color={b.color} />
                    <Text style={styles.miniBadgeTitle}>{b.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    letterSpacing: 2,
    fontSize: 10,
  },
  content: {
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    fontSize: 36,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  rankBadgeNumber: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
    gap: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 22,
  },
  meTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  meTagText: {
    color: colors.textPrimary,
    fontSize: 8,
    fontWeight: '900',
  },
  rankFriendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankLabelBox: {
    backgroundColor: 'rgba(218, 63, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(218, 63, 69, 0.2)',
  },
  rankLabelText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  friendsCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  friendsNumber: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  bioContainer: {
    marginBottom: spacing.lg,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11,
  },
  flagEmoji: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  followButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  followingButton: {
    backgroundColor: 'rgba(218, 63, 69, 0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  followText: {
    ...typography.bodyBold,
    color: colors.background,
  },
  followingText: {
    color: colors.accent,
  },
  messageButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  messageText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  editButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },
  tabContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    fontSize: 12,
  },
  statusSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    ...typography.captionBold,
    color: '#2ECC71',
    fontSize: 10,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsCardContainer: {
    width: '50%',
    padding: 6,
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
    minHeight: 100,
    justifyContent: 'center',
  },
  statsCardLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statsCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsCardValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 20,
  },
  badgesSection: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textMuted,
    letterSpacing: 2,
    fontSize: 10,
  },
  badgeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  miniBadgeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  miniBadgeTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 9,
  },
});

