import { describe, expect, it } from 'vitest';
import {
  filterLeaderboardScope,
  isRealCountryCode,
  rankLeaderboardRows,
  type LeaderboardScoreRow,
} from './leaderboardLogic';

function row(
  clientUserId: string,
  countryCode: string,
  totalReps: number,
  periodScore?: number | null
): LeaderboardScoreRow {
  return {
    clientUserId,
    name: clientUserId,
    countryCode,
    totalReps,
    periodScore,
  };
}

describe('leaderboard scope rules', () => {
  it('does not treat GLOBAL as a country filter', () => {
    expect(isRealCountryCode('GLOBAL')).toBe(false);
    expect(filterLeaderboardScope([row('global-user', 'GLOBAL', 50)], 'country', 'GLOBAL')).toEqual([]);
  });

  it('filters country rankings to the selected country only', () => {
    const rows = [
      row('us-high', 'US', 30),
      row('eg-high', 'EG', 100),
      row('us-low', 'US', 10),
      row('global', 'GLOBAL', 999),
    ];

    expect(filterLeaderboardScope(rows, 'country', 'US').map((entry) => entry.clientUserId)).toEqual([
      'us-high',
      'us-low',
    ]);
  });

  it('normalizes country filters before comparing rows', () => {
    const rows = [
      row('us-upper', 'US', 30),
      row('eg-upper', 'EG', 100),
    ];

    expect(filterLeaderboardScope(rows, 'country', 'us').map((entry) => entry.clientUserId)).toEqual([
      'us-upper',
    ]);
  });
});

describe('leaderboard ranking rules', () => {
  it('uses all-time reps for all-time rankings', () => {
    const ranked = rankLeaderboardRows([row('old-total', 'US', 40, 1), row('new-week', 'US', 5, 50)], 'ALL');

    expect(ranked.map((entry) => [entry.clientUserId, entry.totalReps])).toEqual([
      ['old-total', 40],
      ['new-week', 5],
    ]);
  });

  it('uses period scores for week, month, and year rankings', () => {
    const ranked = rankLeaderboardRows([row('all-time-leader', 'US', 1000, 2), row('week-leader', 'EG', 20, 12)], 'W');

    expect(ranked.map((entry) => [entry.clientUserId, entry.totalReps])).toEqual([
      ['week-leader', 12],
      ['all-time-leader', 2],
    ]);
  });

  it('excludes users with no reps from rankings', () => {
    const ranked = rankLeaderboardRows([
      row('zero-total', 'US', 0, 0),
      row('zero-period', 'US', 100, 0),
      row('active', 'EG', 20, 12),
    ], 'W');

    expect(ranked.map((entry) => entry.clientUserId)).toEqual(['active']);
  });

  it('excludes zero-rep users from all-time rankings too', () => {
    const ranked = rankLeaderboardRows([
      row('zero-total', 'US', 0, 99),
      row('active-total', 'EG', 20, 0),
    ], 'ALL');

    expect(ranked.map((entry) => entry.clientUserId)).toEqual(['active-total']);
  });
});
