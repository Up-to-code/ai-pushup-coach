import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';

export const globalLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_total_reps')
      .order('desc')
      .take(limit ?? 25);
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
      .take(limit ?? 25);
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
