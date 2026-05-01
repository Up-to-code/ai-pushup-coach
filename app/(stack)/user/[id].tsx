import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePublicUserProfile, useWorkoutHistory, computeWorkoutStats } from '../../../src/features/profile/hooks';
import { useFollowActions } from '../../../src/features/social/hooks';
import { borderRadius, colors, spacing, typography } from '../../../src/theme';
import { formatDuration } from '../../../src/utils';
import type { Workout } from '../../../src/store';

function toWorkout(row: {
  _id: string;
  clientWorkoutId: string;
  date: number;
  type: Workout['type'];
  trainingCameraMode: Workout['trainingCameraMode'];
  reps: number;
  duration: number;
  calories: number;
  completed: boolean;
  goal?: number;
  sets?: number[];
  restTime?: number;
  formFeedbackState?: Workout['formFeedbackState'];
  cameraPresentationState?: Workout['cameraPresentationState'];
  qualityScore?: number;
}): Workout {
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
  const params = useLocalSearchParams();
  const targetClientUserId = String(params.id ?? '');
  const { profile, loading } = usePublicUserProfile(targetClientUserId);
  const { workouts } = useWorkoutHistory(targetClientUserId, 50);
  const { follow, unfollow } = useFollowActions(targetClientUserId);
  const [busy, setBusy] = useState(false);

  const history = workouts?.map(toWorkout) ?? [];
  const stats = computeWorkoutStats(history);
  const displayName = profile?.displayName ?? profile?.name ?? 'User';
  const canFollow = profile && !profile.isCurrentUser;
  const relationshipLabel = profile?.isFriend
    ? 'Friends'
    : profile?.isFollowing
      ? 'Following'
      : profile?.followsYou
        ? 'Follow back'
        : 'Follow';
  const relationshipIcon = profile?.isFriend
    ? 'people'
    : profile?.isFollowing
      ? 'checkmark'
      : profile?.followsYou
        ? 'person-add'
        : 'person-add-outline';

  const toggleFollow = async () => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      if (profile.isFollowing) {
        await unfollow();
      } else {
        await follow();
      }
    } catch (error) {
      console.warn('Follow action failed', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>PROFILE</Text>
        <View style={styles.iconButton} />
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading profile...</Text>
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.title}>{displayName}</Text>
              <Text style={styles.meta}>{profile.countryName} • {profile.totalReps.toLocaleString()} reps</Text>
            </View>
          </View>

          <View style={styles.socialStats}>
            <Stat label="Followers" value={profile.followersCount} />
            <Stat label="Following" value={profile.followingCount} />
            <Stat label="Friends" value={profile.friendsCount} />
          </View>

          {canFollow ? (
            <Pressable style={[styles.primaryButton, (profile.isFollowing || profile.isFriend) && styles.secondaryButton]} onPress={toggleFollow} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={profile.isFollowing || profile.isFriend ? colors.textPrimary : colors.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name={relationshipIcon}
                    size={18}
                    color={profile.isFollowing || profile.isFriend ? colors.textPrimary : colors.textInverse}
                  />
                  <Text style={[styles.primaryButtonText, (profile.isFollowing || profile.isFriend) && styles.secondaryButtonText]}>
                    {relationshipLabel}
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.statsGrid}>
            <Metric label="Total reps" value={stats.totalReps.toLocaleString()} icon="barbell" />
            <Metric label="Sessions" value={stats.sessions.toLocaleString()} icon="calendar-outline" />
            <Metric label="Duration" value={formatDuration(stats.totalDuration)} icon="time-outline" />
            <Metric label="Avg speed" value={`${stats.avgSpeed}/min`} icon="speedometer-outline" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
          </View>

          {history.length > 0 ? (
            history.slice(0, 12).map((session) => (
              <View key={session.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="fitness-outline" size={18} color={colors.accent} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{session.reps} reps</Text>
                  <Text style={styles.rowMeta}>{new Date(session.date).toLocaleDateString()} • {formatDuration(session.duration)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.statePanel}>
              <Text style={styles.stateTitle}>No public sessions yet</Text>
              <Text style={styles.stateText}>When this user saves workouts, they will appear here.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Profile unavailable</Text>
          <Text style={styles.stateText}>This user has not synced yet.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon as any} size={19} color={colors.accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  nav: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  navTitle: { ...typography.captionBold, color: colors.textSecondary, letterSpacing: 2 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: { ...typography.titleMedium, color: colors.textPrimary },
  identityCopy: { flex: 1, minWidth: 0 },
  title: { ...typography.titleLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  socialStats: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  stat: { flex: 1, alignItems: 'center', padding: spacing.md, gap: 2 },
  statValue: { ...typography.bodyBold, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  primaryButton: {
    minHeight: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: { ...typography.bodyBold, color: colors.textInverse },
  secondaryButtonText: { color: colors.textPrimary },
  bio: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '48%',
    minHeight: 96,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricValue: { ...typography.bodyBold, color: colors.textPrimary },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
  sectionHeader: { paddingTop: spacing.sm },
  sectionTitle: { ...typography.captionBold, color: colors.textSecondary, letterSpacing: 1.4 },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentAlpha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1 },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  statePanel: {
    minHeight: 130,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  stateTitle: { ...typography.bodyBold, color: colors.textPrimary, textAlign: 'center' },
  stateText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
