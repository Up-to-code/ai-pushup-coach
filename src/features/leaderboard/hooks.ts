import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useClientUserId, useIsGuestMode } from '../shared/currentUser';
import { useUserStore } from '../../store';
import type { TimePeriod } from '../profile/hooks';

export type LeaderboardScope = 'global' | 'country' | 'friends';
export type LeaderboardPeriod = TimePeriod;

export interface LeaderboardRow {
  id: string;
  rank: number;
  name: string;
  countryCode: string;
  score: number;
  isCurrentUser: boolean;
}

function toRows(rows: Array<{
  clientUserId: string;
  displayName?: string;
  name: string;
  countryCode: string;
  totalReps: number;
}> | undefined, currentClientUserId: string): LeaderboardRow[] | undefined {
  return rows?.map((row, index) => ({
    id: row.clientUserId,
    rank: index + 1,
    name: row.displayName ?? row.name,
    countryCode: row.countryCode,
    score: row.totalReps,
    isCurrentUser: row.clientUserId === currentClientUserId,
  }));
}

export function useLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod = 'W', limit = 50) {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const countryCode = useUserStore((state) => state.user.countryCode);
  const rows = useQuery(
    (api as any).leaderboard.rankedLeaderboard,
    scope === 'friends' && isGuestMode
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
    loading: !isGuestMode && rows === undefined,
    isGlobalCountryFallback: scope === 'country' && countryCode === 'GLOBAL',
  };
}
