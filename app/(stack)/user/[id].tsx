import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePublicUserProfile, useWorkoutHistory, computeWorkoutStats, type ProfileWorkoutRow } from '../../../src/features/profile/hooks';
import { useFollowActions } from '../../../src/features/social/hooks';
import { profileShareUrl } from '../../../src/config/links';
import { borderRadius, colors, spacing, typography } from '../../../src/theme';
import { formatDuration } from '../../../src/utils';
import type { Workout } from '../../../src/store';

type UserWorkoutRow = Omit<ProfileWorkoutRow, 'id'> & Pick<Workout, 'goal' | 'sets' | 'restTime'>;

function toWorkout(row: UserWorkoutRow): Workout {
  return {
    id: row.clientWorkoutId,
    date: new Date(row.date).toISOString(),
    type: row.type,
    trainingCameraMode: row.trainingCameraMode,
    reps: row.reps,
    duration: row.duration,
    calories: row.calories,
    completed: row.completed,
    goal: row.goal,
    sets: row.sets,
    restTime: row.restTime,
    formFeedbackState: row.formFeedbackState,
    cameraPresentationState: row.cameraPresentationState,
    qualityScore: row.qualityScore,
  };
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const targetUserId = String(id ?? '');
  const { profile, loading } = usePublicUserProfile(targetUserId);
  const { workouts } = useWorkoutHistory(targetUserId, 50);
  const { follow, unfollow } = useFollowActions(targetUserId);
  const [busy, setBusy] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const history = workouts?.map(toWorkout) ?? [];
  const stats = computeWorkoutStats(history);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.stateTitle}>Profile unavailable</Text>
        <Text style={styles.stateText}>This user has not synced yet.</Text>
      </SafeAreaView>
    );
  }

  const displayName = profile.displayName ?? profile.name ?? 'User';
  const isOwn = profile.isCurrentUser;
  const relationshipLabel = profile.isFriend
    ? 'Friends'
    : profile.isFollowing
      ? 'Following'
      : profile.followsYou
        ? 'Follow back'
        : 'Follow';
  const relationshipIcon = profile.isFriend
    ? 'people'
    : profile.isFollowing
      ? 'checkmark'
      : profile.followsYou
        ? 'person-add'
        : 'person-add-outline';

  const toggleFollow = async () => {
    if (isOwn || busy) return;
    setBusy(true);
    try {
      profile.isFollowing ? await unfollow() : await follow();
    } finally {
      setBusy(false);
    }
  };

  const shareProfile = async () => {
    const url = profileShareUrl(targetUserId);
    await Share.share({
      title: `${displayName} on Push Counter`,
      message: `See ${displayName}'s Push Counter profile: ${url}`,
      url,
    });
  };

  const visibleSessions = showAllSessions ? history : history.slice(0, 5);
  const hasMore = history.length > 5 && !showAllSessions;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Nav – back button left, title centered */}
      <View style={styles.nav}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(displayName[0] || '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.identity}>
            <Text style={styles.title}>{displayName}</Text>
            {profile.countryName ? (
              <Text style={styles.meta}>
                {profile.countryName}  ·  {profile.totalReps.toLocaleString()} reps
              </Text>
            ) : null}
            <View style={styles.inlineStats}>
              <Text style={styles.inlineStat}>
                <Text style={styles.inlineStatValue}>{profile.followersCount}</Text> followers
              </Text>
              <Text style={styles.inlineStat}>
                <Text style={styles.inlineStatValue}>{profile.followingCount}</Text> following
              </Text>
              <Text style={styles.inlineStat}>
                <Text style={styles.inlineStatValue}>{profile.friendsCount}</Text> friends
              </Text>
            </View>
          </View>
        </View>

        {/* Follow button */}
        {!isOwn && (
          <Pressable
            style={[styles.button, (profile.isFollowing || profile.isFriend) && styles.buttonSecondary]}
            onPress={toggleFollow}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator
                color={profile.isFollowing || profile.isFriend ? colors.textPrimary : colors.textInverse}
              />
            ) : (
              <>
                <Ionicons
                  name={relationshipIcon as any}
                  size={18}
                  color={profile.isFollowing || profile.isFriend ? colors.textPrimary : colors.textInverse}
                />
                <Text style={[styles.buttonText, (profile.isFollowing || profile.isFriend) && styles.buttonTextSecondary]}>
                  {relationshipLabel}
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={shareProfile}>
          <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Share profile</Text>
        </Pressable>

        {/* Bio */}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {/* Metrics grid */}
        <View style={styles.grid}>
          <Metric label="Total reps" value={stats.totalReps.toLocaleString()} icon="barbell" />
          <Metric label="Sessions" value={stats.sessions.toLocaleString()} icon="calendar-outline" />
          <Metric label="Duration" value={formatDuration(stats.totalDuration)} icon="time-outline" />
          <Metric label="Avg speed" value={`${stats.avgSpeed}/min`} icon="speedometer-outline" />
        </View>

        {/* Recent sessions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent sessions</Text>
        </View>

        {history.length > 0 ? (
          <>
            {visibleSessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="fitness-outline" size={18} color={colors.accent} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{session.reps} reps</Text>
                  <Text style={styles.sessionMeta}>
                    {new Date(session.date).toLocaleDateString()}  ·  {formatDuration(session.duration)}
                  </Text>
                </View>
              </View>
            ))}
            {hasMore && (
              <Pressable style={styles.showMoreButton} onPress={() => setShowAllSessions(true)}>
                <Text style={styles.showMoreText}>Show all {history.length} sessions</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.stateTitle}>No public sessions yet</Text>
            <Text style={styles.stateText}>When this user saves workouts, they will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon as any} size={18} color={colors.accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  nav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  identity: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 6,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inlineStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 6,
  },
  inlineStat: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inlineStatValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  button: {
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  buttonTextSecondary: {
    color: colors.textPrimary,
  },
  bio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metric: {
    width: '48%',
    minHeight: 90,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  sessionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentAlpha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  sessionMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  showMoreText: {
    ...typography.captionBold,
    color: colors.accent,
  },
  emptyPanel: {
    minHeight: 80,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  stateTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
