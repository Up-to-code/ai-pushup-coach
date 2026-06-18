import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useBetterAuth, useCurrentUser } from '../../auth';
import { useClientUserId } from '../shared/currentUser';
import { useUserStore } from '../../store';
import type { TimePeriod } from '../profile/hooks';
import {
  normalizeLeaderboardCountryCode,
  resolveLeaderboardCountryCode,
} from './country';

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

export function useLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod = 'W', limit = 50, enabled = true) {
  const clientUserId = useClientUserId();
  const { isSignedIn } = useBetterAuth();
  const { remoteUser, loading: currentUserLoading } = useCurrentUser();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const localCountryCode = useUserStore((state) => state.user.countryCode);
  const remoteCountryCode = remoteUser?.countryCode;
  const normalizedRemoteCountryCode = normalizeLeaderboardCountryCode(remoteCountryCode);
  const normalizedLocalCountryCode = normalizeLeaderboardCountryCode(localCountryCode);
  const countryCode = resolveLeaderboardCountryCode({
    isSignedIn,
    localCountryCode,
    remoteCountryCode,
  });
  const needsAuth = scope === 'friends';
  const waitingForSignedInCountry = scope === 'country' && isSignedIn && currentUserLoading;
  const waitingForFriendsAuth = enabled && needsAuth && isSignedIn && isConvexAuthLoading;
  const skipAuthQuery = !enabled || waitingForSignedInCountry || (needsAuth && (!isSignedIn || !isConvexAuthenticated));
  const rows = useQuery(
    api.leaderboard.rankedLeaderboard,
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
    loading: waitingForSignedInCountry || waitingForFriendsAuth || (!skipAuthQuery && rows === undefined),
    isGlobalCountryFallback: scope === 'country' && countryCode === 'GLOBAL',
    diagnostics: {
      scope,
      period,
      clientUserId,
      localCountryCode: normalizedLocalCountryCode,
      remoteCountryCode: normalizedRemoteCountryCode,
      countryCode,
      countrySource: isSignedIn ? 'backend' as const : 'local' as const,
      rowsCount: rows?.length ?? 0,
      skipped: skipAuthQuery,
      convexAuthLoading: isConvexAuthLoading,
    },
  };
}
