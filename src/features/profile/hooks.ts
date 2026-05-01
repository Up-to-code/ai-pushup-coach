import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { api } from '../../../convex/_generated/api';
import { useWorkoutStore } from '../../store';
import { useClientUserId, useIsGuestMode } from '../shared/currentUser';
export {
  buildDailySeries,
  computeWorkoutStats,
  filterWorkoutsByPeriod,
  formatSeriesLabel,
  getDaysForPeriod,
  getMondayWeekStart,
  getRangeForPeriod,
  type DailySeriesPoint,
  type ProfileWorkoutRow,
  type TimePeriod,
  type WorkoutStats,
} from './analytics';
import {
  buildDailySeries,
  computeWorkoutStats,
  filterWorkoutsByPeriod,
  type ProfileWorkoutRow,
  type TimePeriod,
} from './analytics';

export function useCurrentUserProfile() {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const profile = useQuery(api.users.me, isGuestMode ? 'skip' : { clientUserId });
  return { profile, loading: !isGuestMode && profile === undefined, clientUserId };
}

export function usePublicUserProfile(targetClientUserId: string) {
  const viewerClientUserId = useClientUserId();
  const profile = useQuery(api.users.publicProfile, {
    viewerClientUserId,
    userId: targetClientUserId,
  });
  return { profile, loading: profile === undefined, viewerClientUserId };
}

export function useWorkoutHistory(targetClientUserId?: string, limit = 100) {
  const viewerClientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const history = useQuery(
    api.workouts.historyForUser,
    targetClientUserId && !isGuestMode ? { viewerClientUserId, targetClientUserId, limit } : 'skip'
  );
  return { workouts: history, loading: targetClientUserId && !isGuestMode ? history === undefined : false };
}

export function useProfileRange(period: TimePeriod, offset = 0) {
  const clientUserId = useClientUserId();
  const workouts = useWorkoutStore((state) => state.workouts);
  const range = useMemo(() => {
    const rows: ProfileWorkoutRow[] = workouts
      .map((workout) => ({
        id: workout.id,
        clientWorkoutId: workout.id,
        date: Date.parse(workout.date) || 0,
        type: workout.type,
        trainingCameraMode: workout.trainingCameraMode,
        reps: workout.reps,
        duration: workout.duration,
        calories: workout.calories,
        completed: workout.completed,
        formFeedbackState: workout.formFeedbackState,
        cameraPresentationState: workout.cameraPresentationState,
        qualityScore: workout.qualityScore,
      }))
      .sort((a, b) => b.date - a.date);
    const currentRows = filterWorkoutsByPeriod(rows, period, offset);
    const previousRows = period === 'ALL' ? [] : filterWorkoutsByPeriod(rows, period, offset + 1);

    return {
      summary: computeWorkoutStats(currentRows),
      previousSummary: period === 'ALL' ? null : computeWorkoutStats(previousRows),
      dailySeries: buildDailySeries(rows, period, offset),
      history: currentRows.slice(0, 100),
    };
  }, [offset, period, workouts]);

  return {
    range,
    loading: false,
    clientUserId,
  };
}

export function useFriendComparison(period: Exclude<TimePeriod, 'ALL'> = 'W', offset = 0) {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const comparison = useQuery(api.leaderboard.friendComparison, isGuestMode ? 'skip' : { clientUserId, period, offset });
  return {
    comparison: comparison ?? {
      rank: 1,
      score: 0,
      friendsCount: 0,
      friendAverage: 0,
      deltaToNext: 0,
    },
    loading: !isGuestMode && comparison === undefined,
  };
}
