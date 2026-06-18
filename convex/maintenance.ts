import { mutation, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { requireMatchingIdentity } from './auth';
import {
  ensureAppUserForClientId,
  findLegacyFitnessUsers,
  getBetterAuthUserById,
} from './leaderboardProfiles';

async function patchRows<T extends { _id: Id<any>; userId: Id<'users'> }>(
  rows: T[],
  fromUserId: Id<'users'>,
  toUserId: Id<'users'>,
  patch: (id: T['_id'], userId: Id<'users'>) => Promise<void>
) {
  let count = 0;
  for (const row of rows) {
    if (row.userId !== fromUserId) continue;
    await patch(row._id, toUserId);
    count += 1;
  }
  return count;
}

async function moveDailyStats(ctx: MutationCtx, fromUserId: Id<'users'>, toUserId: Id<'users'>) {
  let count = 0;
  const rows = await ctx.db
    .query('dailyStats')
    .withIndex('by_user_day', (q) => q.eq('userId', fromUserId))
    .take(1000);

  for (const row of rows) {
    const existing = await ctx.db
      .query('dailyStats')
      .withIndex('by_user_day', (q) => q.eq('userId', toUserId).eq('dayKey', row.dayKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reps: existing.reps + row.reps,
        workouts: existing.workouts + row.workouts,
        duration: existing.duration + row.duration,
        calories: existing.calories + row.calories,
        bestReps: Math.max(existing.bestReps, row.bestReps),
        updatedAt: Math.max(existing.updatedAt, row.updatedAt),
      });
      await ctx.db.delete(row._id);
    } else {
      await ctx.db.patch(row._id, { userId: toUserId });
    }
    count += 1;
  }

  return count;
}

async function recomputeTotals(ctx: MutationCtx, user: Doc<'users'>) {
  const workouts = await ctx.db
    .query('workoutResults')
    .withIndex('by_user_date', (q) => q.eq('userId', user._id))
    .take(1000);
  const completed = workouts.filter((row) => row.completed);
  const totalReps = completed.reduce((sum, row) => sum + row.reps, 0);
  const bestReps = completed.reduce((best, row) => Math.max(best, row.reps), 0);
  await ctx.db.patch(user._id, {
    totalReps,
    bestReps,
    updatedAt: Date.now(),
  });
  return { totalReps, bestReps };
}

export const repairLegacyUserDataForAuthUser = mutation({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);
    const authUser = await getBetterAuthUserById(ctx, clientUserId);
    if (!authUser) return { ok: false as const, status: 'missingAuthUser' as const };

    const target = await ensureAppUserForClientId(ctx, clientUserId);
    if (!target) return { ok: false as const, status: 'missingTargetUser' as const };

    const legacyUsers = (await findLegacyFitnessUsers(ctx, authUser)).filter((row) => row.userId !== target._id);
    const legacyUserIds = [...new Set(legacyUsers.map((row) => row.userId))];
    let moved = {
      userSettings: 0,
      workoutResults: 0,
      workoutEvents: 0,
      faceTrackingSamples: 0,
      dailyStats: 0,
      challengeMembers: 0,
      feedbackRequests: 0,
      feedbackVotes: 0,
      rateLimits: 0,
    };

    for (const legacyUserId of legacyUserIds) {
      moved.userSettings += await patchRows(
        await ctx.db.query('userSettings').withIndex('by_user_id', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
      moved.workoutResults += await patchRows(
        await ctx.db.query('workoutResults').withIndex('by_user_date', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
      moved.workoutEvents += await patchRows(
        await ctx.db.query('workoutEvents').withIndex('by_user_time', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
      moved.faceTrackingSamples += await patchRows(
        await ctx.db.query('faceTrackingSamples').withIndex('by_user_time', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
      moved.dailyStats += await moveDailyStats(ctx, legacyUserId, target._id);
      moved.challengeMembers += await patchRows(
        await ctx.db.query('challengeMembers').withIndex('by_user', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
      moved.feedbackRequests += await patchRows(
        await ctx.db.query('feedbackRequests').withIndex('by_author', (q) => q.eq('authorUserId', legacyUserId)).take(1000)
          .then((rows) => rows.map((row) => ({ ...row, userId: row.authorUserId }))),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { authorUserId: userId })
      );
      moved.feedbackVotes += await patchRows(
        await ctx.db.query('feedbackVotes').withIndex('by_user', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
      moved.rateLimits += await patchRows(
        await ctx.db.query('rateLimits').withIndex('by_user_bucket', (q) => q.eq('userId', legacyUserId)).take(1000),
        legacyUserId,
        target._id,
        (id, userId) => ctx.db.patch(id, { userId })
      );
    }

    const totals = await recomputeTotals(ctx, target);
    return {
      ok: true as const,
      status: 'repaired' as const,
      targetUserId: target._id,
      legacyUserIds,
      moved,
      totals,
    };
  },
});
