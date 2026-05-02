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
  const isGuestMode = useIsGuestMode();
  
  const range = useQuery(
    api.workouts.profileRange,
    isGuestMode ? 'skip' : { clientUserId, period, offset }
  );

  return {
    range,
    loading: !isGuestMode && range === undefined,
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
