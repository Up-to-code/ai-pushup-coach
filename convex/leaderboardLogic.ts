export type LeaderboardPeriod = 'W' | 'M' | 'Y' | 'ALL';
export type LeaderboardScope = 'global' | 'country' | 'friends';

export type LeaderboardLogicProfile = {
  clientUserId: string;
  name: string;
  displayName?: string;
  countryCode: string;
  avatar?: string;
  totalReps: number;
  deletionStatus?: 'active' | 'pendingDeletion';
};

export type LeaderboardScoreRow = LeaderboardLogicProfile & {
  periodScore?: number | null;
};

export function isRealCountryCode(countryCode: string | undefined) {
  return Boolean(countryCode && countryCode !== 'GLOBAL');
}

export function normalizeCountryCode(countryCode: string | undefined) {
  return countryCode?.trim().toUpperCase();
}

export function filterLeaderboardScope<T extends LeaderboardLogicProfile>(
  rows: T[],
  scope: LeaderboardScope,
  countryCode?: string
) {
  if (scope !== 'country') return rows;
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!isRealCountryCode(normalizedCountryCode)) return [];
  return rows.filter((row) => normalizeCountryCode(row.countryCode) === normalizedCountryCode);
}

export function toLeaderboardOutputRow(row: LeaderboardScoreRow, period: LeaderboardPeriod) {
  return {
    clientUserId: row.clientUserId,
    name: row.name,
    displayName: row.displayName,
    countryCode: row.countryCode,
    avatar: row.avatar,
    totalReps: period === 'ALL' ? row.totalReps : row.periodScore ?? 0,
  };
}

export function rankLeaderboardRows<T extends LeaderboardScoreRow>(
  rows: T[],
  period: LeaderboardPeriod,
  limit?: number
) {
  return rows
    .map((row) => toLeaderboardOutputRow(row, period))
    .filter((row) => row.totalReps > 0)
    .sort((a, b) => b.totalReps - a.totalReps)
    .slice(0, Math.min(limit ?? 25, 100));
}
