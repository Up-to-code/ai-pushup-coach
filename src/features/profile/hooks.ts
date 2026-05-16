import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { api } from '../../../convex/_generated/api';
import { useWorkoutStore } from '../../store';
import { useAuthenticatedBackendState, useClientUserId, useIsGuestMode } from '../shared/currentUser';
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

export function useCurrentUserProfile(enabled = true) {
  const clientUserId = useClientUserId();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const shouldQuery = enabled && canUseAuthenticatedBackend;
  const profile = useQuery(api.users.me, shouldQuery ? { clientUserId } : 'skip');
  return { profile, loading: authLoading || (shouldQuery && profile === undefined), clientUserId };
}

export function usePublicUserProfile(targetClientUserId: string) {
  const viewerClientUserId = useClientUserId();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const profile = useQuery(
    api.users.publicProfile,
    canUseAuthenticatedBackend ? { viewerClientUserId, userId: targetClientUserId } : 'skip'
  );
  return { profile, loading: authLoading || (canUseAuthenticatedBackend && profile === undefined), viewerClientUserId };
}

export function useWorkoutHistory(targetClientUserId?: string, limit = 100) {
  const viewerClientUserId = useClientUserId();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const history = useQuery(
    api.workouts.historyForUser,
    targetClientUserId && canUseAuthenticatedBackend ? { viewerClientUserId, targetClientUserId, limit } : 'skip'
  );
  return { workouts: history, loading: authLoading || (targetClientUserId && canUseAuthenticatedBackend ? history === undefined : false) };
}

export function useProfileRange(period: TimePeriod, offset = 0, enabled = true) {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const shouldQuery = enabled && canUseAuthenticatedBackend;
  
  const range = useQuery(
    api.workouts.profileRange,
    shouldQuery ? { clientUserId, period, offset } : 'skip'
  );

  return {
    range,
    loading: authLoading || (!isGuestMode && shouldQuery && range === undefined),
    clientUserId,
  };
}

export function useFriendComparison(period: Exclude<TimePeriod, 'ALL'> = 'W', offset = 0, enabled = true) {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const shouldQuery = enabled && canUseAuthenticatedBackend;
  const comparison = useQuery(api.leaderboard.friendComparison, shouldQuery ? { clientUserId, period, offset } : 'skip');
  return {
    comparison: comparison ?? {
      rank: 1,
      score: 0,
      friendsCount: 0,
      friendAverage: 0,
      deltaToNext: 0,
    },
    loading: authLoading || (!isGuestMode && shouldQuery && comparison === undefined),
  };
}
