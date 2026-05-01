import { query, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';

const comparisonPeriod = v.union(v.literal('W'), v.literal('M'), v.literal('Y'));
const leaderboardPeriod = v.union(v.literal('W'), v.literal('M'), v.literal('Y'), v.literal('ALL'));
const leaderboardScope = v.union(v.literal('global'), v.literal('country'), v.literal('friends'));
type ComparisonPeriod = 'W' | 'M' | 'Y';
type LeaderboardPeriod = ComparisonPeriod | 'ALL';

function getDaysForPeriod(period: ComparisonPeriod) {
  if (period === 'W') return 7;
  if (period === 'M') return 30;
  return 365;
}

function getMondayWeekStart(timestamp: number) {
  const start = new Date(timestamp);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getRangeForPeriod(period: ComparisonPeriod, offset = 0, now = Date.now()) {
  const days = getDaysForPeriod(period);
  if (period === 'W') {
    const base = new Date(now);
    base.setDate(base.getDate() - offset * days);
    const start = getMondayWeekStart(base.getTime());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offset * days);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start: start.getTime(), end: end.getTime() };
}

async function scoreUserForPeriod(
  ctx: QueryCtx,
  userId: Id<'users'>,
  period: LeaderboardPeriod
) {
  if (period === 'ALL') return null;
  const range = getRangeForPeriod(period);
  const workouts = await ctx.db
    .query('workoutResults')
    .withIndex('by_user_date', (q) => q.eq('userId', userId))
    .order('desc')
    .take(1000);

  return workouts
    .filter((workout) => workout.completed && workout.date >= range.start && workout.date <= range.end)
    .reduce((sum, workout) => sum + workout.reps, 0);
}

async function rankUsersForPeriod(
  ctx: QueryCtx,
  users: Array<{
    _id: Id<'users'>;
    clientUserId: string;
    name: string;
    displayName?: string;
    countryCode: string;
    totalReps: number;
  }>,
  period: LeaderboardPeriod,
  limit?: number
) {
  const rows = await Promise.all(
    users.map(async (user) => {
      const periodScore = await scoreUserForPeriod(ctx, user._id, period);
      return {
        clientUserId: user.clientUserId,
        name: user.name,
        displayName: user.displayName,
        countryCode: user.countryCode,
        totalReps: periodScore ?? user.totalReps,
      };
    })
  );

  return rows
    .sort((a, b) => b.totalReps - a.totalReps)
    .slice(0, Math.min(limit ?? 25, 100));
}

export const rankedLeaderboard = query({
  args: {
    scope: leaderboardScope,
    period: v.optional(leaderboardPeriod),
    clientUserId: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { scope, period = 'W', clientUserId, countryCode, limit }) => {
    if (scope === 'friends') {
      if (!clientUserId) return [];
      await requireMatchingIdentity(ctx, clientUserId);

      const user = await ctx.db
        .query('users')
        .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
        .unique();
      if (!user) return [];

      const following = await ctx.db
        .query('follows')
        .withIndex('by_follower', (q) => q.eq('followerUserId', user._id))
        .collect();
      const followers = await ctx.db
        .query('follows')
        .withIndex('by_following', (q) => q.eq('followingUserId', user._id))
        .collect();
      const followingIds = new Set(
        following.filter((row) => row.status === 'active').map((row) => row.followingUserId)
      );
      const friendIds = followers
        .filter((row) => row.status === 'active' && followingIds.has(row.followerUserId))
        .map((row) => row.followerUserId)
        .slice(0, 100);
      const users = await Promise.all([user._id, ...friendIds].map((id) => ctx.db.get(id)));
      return rankUsersForPeriod(
        ctx,
        users.filter((row): row is NonNullable<typeof row> => row !== null),
        period,
        limit
      );
    }

    if (period === 'ALL') {
      if (scope === 'country' && countryCode && countryCode !== 'GLOBAL') {
        return await ctx.db
          .query('users')
          .withIndex('by_country_total_reps', (q) => q.eq('countryCode', countryCode))
          .order('desc')
          .take(Math.min(limit ?? 25, 100));
      }

      return await ctx.db
        .query('users')
        .withIndex('by_total_reps')
        .order('desc')
        .take(Math.min(limit ?? 25, 100));
    }

    const users =
      scope === 'country' && countryCode && countryCode !== 'GLOBAL'
        ? await ctx.db
            .query('users')
            .withIndex('by_country_total_reps', (q) => q.eq('countryCode', countryCode))
            .take(500)
        : await ctx.db.query('users').take(500);

    return rankUsersForPeriod(ctx, users, period, limit);
  },
});

export const globalLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_total_reps')
      .order('desc')
      .take(Math.min(limit ?? 25, 100));
  },
});

export const countryLeaderboard = query({
  args: {
    countryCode: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { countryCode, limit }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_country_total_reps', (q) => q.eq('countryCode', countryCode))
      .order('desc')
      .take(Math.min(limit ?? 25, 100));
  },
});

export const friendsLeaderboard = query({
  args: {
    clientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) return [];

    const following = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', user._id))
      .collect();
    const followers = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingUserId', user._id))
      .collect();

    const followingIds = new Set(
      following.filter((row) => row.status === 'active').map((row) => row.followingUserId)
    );
    const friendIds = followers
      .filter((row) => row.status === 'active' && followingIds.has(row.followerUserId))
      .map((row) => row.followerUserId);

    const rows = await Promise.all([user._id, ...friendIds].map((id) => ctx.db.get(id)));
    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.totalReps - a.totalReps)
      .slice(0, Math.min(limit ?? 25, 100));
  },
});

export const countrySnapshot = query({
  args: {
    clientUserId: v.string(),
    countryCode: v.string(),
  },
  handler: async (ctx, { clientUserId, countryCode }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    const users = await ctx.db
      .query('users')
      .withIndex('by_country_total_reps', (q) => q.eq('countryCode', countryCode))
      .collect();

    const countryAverage =
      users.length === 0
        ? 0
        : Math.round(users.reduce((sum, row) => sum + row.totalReps, 0) / users.length);

    return {
      userScore: user?.totalReps ?? 0,
      countryAverage,
      deltaToBeat: Math.max(0, countryAverage - (user?.totalReps ?? 0)),
      countrySize: users.length,
    };
  },
});

export const friendComparison = query({
  args: {
    clientUserId: v.string(),
    period: v.optional(comparisonPeriod),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, period, offset, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) {
      return {
        rank: 0,
        score: 0,
        friendAverage: 0,
        deltaToNext: 0,
        friendsCount: 0,
        rows: [],
      };
    }

    const following = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', user._id))
      .collect();
    const followers = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingUserId', user._id))
      .collect();
    const followingIds = new Set(
      following.filter((row) => row.status === 'active').map((row) => row.followingUserId)
    );
    const friendIds = followers
      .filter((row) => row.status === 'active' && followingIds.has(row.followerUserId))
      .map((row) => row.followerUserId)
      .slice(0, 100);
    const range = getRangeForPeriod(period ?? 'W', Math.max(0, Math.min(offset ?? 0, 120)));
    const ids = [user._id, ...friendIds].slice(0, Math.min(limit ?? 100, 100));

    const rows = await Promise.all(ids.map(async (id) => {
      const profile = await ctx.db.get(id);
      const workouts = await ctx.db
        .query('workoutResults')
        .withIndex('by_user_date', (q) => q.eq('userId', id))
        .order('desc')
        .take(1000);
      const score = workouts
        .filter((workout) => workout.completed && workout.date >= range.start && workout.date <= range.end)
        .reduce((sum, workout) => sum + workout.reps, 0);
      return profile
        ? {
            clientUserId: profile.clientUserId,
            name: profile.displayName ?? profile.name,
            countryCode: profile.countryCode,
            score,
            isCurrentUser: profile._id === user._id,
          }
        : null;
    }));

    const rankedRows = rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.score - a.score)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const current = rankedRows.find((row) => row.isCurrentUser);
    const friendRows = rankedRows.filter((row) => !row.isCurrentUser);
    const nextAhead = current
      ? rankedRows.filter((row) => row.score > current.score).sort((a, b) => a.score - b.score)[0]
      : undefined;

    return {
      rank: current?.rank ?? 0,
      score: current?.score ?? 0,
      friendAverage:
        friendRows.length === 0
          ? 0
          : Math.round(friendRows.reduce((sum, row) => sum + row.score, 0) / friendRows.length),
      deltaToNext: nextAhead && current ? Math.max(0, nextAhead.score - current.score) : 0,
      friendsCount: friendRows.length,
      rows: rankedRows,
    };
  },
});
