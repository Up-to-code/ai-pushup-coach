import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useClientUserId } from '../shared/currentUser';
import { useUserStore } from '../../store';
import type { TimePeriod } from '../profile/hooks';

export type LeaderboardScope = 'global' | 'country' | 'friends';
export type LeaderboardPeriod = TimePeriod;

export interface LeaderboardRow {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  countryCode: string;
  score: number;
  isCurrentUser: boolean;
}

function toRows(rows: Array<{
  clientUserId: string;
  displayName?: string;
  name: string;
  countryCode: string;
  avatar?: string;
  totalReps: number;
}> | undefined, currentClientUserId: string): LeaderboardRow[] | undefined {
  return rows?.map((row, index) => ({
    id: row.clientUserId,
    rank: index + 1,
    name: row.displayName ?? row.name,
    avatar: row.avatar,
    countryCode: row.countryCode,
    score: row.totalReps,
    isCurrentUser: row.clientUserId === currentClientUserId,
  }));
}

export function useLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod = 'W', limit = 50) {
  const clientUserId = useClientUserId();
  const { isSignedIn } = useAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const countryCode = useUserStore((state) => state.user.countryCode);
  const needsAuth = scope === 'friends';
  const skipAuthQuery = needsAuth && (!isSignedIn || !isConvexAuthenticated);
  const rows = useQuery(
    (api as any).leaderboard.rankedLeaderboard,
    skipAuthQuery
      ? 'skip'
      : {
          scope,
          period,
          clientUserId,
          countryCode,
          limit,
        }
  );

  return {
    rows: toRows(rows, clientUserId),
    loading: !skipAuthQuery && (isConvexAuthLoading || rows === undefined),
    isGlobalCountryFallback: scope === 'country' && countryCode === 'GLOBAL',
  };
}
