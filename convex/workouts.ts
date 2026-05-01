import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { assertRateLimit } from './rateLimit';
import { applyWorkoutToChallenges } from './challenges';

const workoutArgs = {
  clientUserId: v.string(),
  clientWorkoutId: v.string(),
  date: v.string(),
  type: v.union(v.literal('open'), v.literal('timer'), v.literal('limit'), v.literal('sets')),
  trainingCameraMode: v.union(v.literal('faceFocus'), v.literal('fullScene')),
  reps: v.number(),
  duration: v.number(),
  calories: v.number(),
  completed: v.boolean(),
  goal: v.optional(v.number()),
  sets: v.optional(v.array(v.number())),
  restTime: v.optional(v.number()),
  formFeedbackState: v.optional(v.union(
    v.literal('good'),
    v.literal('tooFast'),
    v.literal('badForm'),
    v.literal('incomplete')
  )),
  cameraPresentationState: v.optional(v.union(
    v.literal('permission'),
    v.literal('preparing'),
    v.literal('tracking'),
    v.literal('manualFallback'),
    v.literal('unavailable')
  )),
  qualityScore: v.optional(v.number()),
};
const profilePeriod = v.union(v.literal('W'), v.literal('M'), v.literal('Y'), v.literal('ALL'));

type ProfilePeriod = 'W' | 'M' | 'Y' | 'ALL';

function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function monthKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

function getDaysForPeriod(period: ProfilePeriod) {
  if (period === 'W') return 7;
  if (period === 'M') return 30;
  if (period === 'Y') return 365;
  return 99999;
}

function getMondayWeekStart(timestamp: number) {
  const start = new Date(timestamp);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getRangeForPeriod(period: ProfilePeriod, offset = 0, now = Date.now()) {
  if (period === 'ALL') return { start: 0, end: now, days: 99999 };

  const days = getDaysForPeriod(period);
  if (period === 'W') {
    const base = new Date(now);
    base.setDate(base.getDate() - offset * days);
    const start = getMondayWeekStart(base.getTime());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime(), days };
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offset * days);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return { start: start.getTime(), end: end.getTime(), days };
}

function formatSeriesLabel(key: string, period: ProfilePeriod) {
  if (period === 'ALL') return key;
  return key;
}

function emptySummary() {
  return {
    totalReps: 0,
    totalDuration: 0,
    totalCalories: 0,
    bestSession: 0,
    avgSpeed: '0',
    sessions: 0,
  };
}

function buildSummary(rows: Array<{ reps: number; duration: number; calories: number }>) {
  const totalReps = rows.reduce((sum, workout) => sum + workout.reps, 0);
  const totalDuration = rows.reduce((sum, workout) => sum + workout.duration, 0);
  const totalCalories = rows.reduce((sum, workout) => sum + workout.calories, 0);
  const bestSession = rows.length > 0 ? Math.max(...rows.map((workout) => workout.reps)) : 0;
  return {
    totalReps,
    totalDuration,
    totalCalories,
    bestSession,
    avgSpeed: totalDuration > 0 ? ((totalReps / totalDuration) * 60).toFixed(1) : '0',
    sessions: rows.length,
  };
}

function assertWorkoutBounds(args: { reps: number; duration: number; calories: number; goal?: number }) {
  if (!Number.isFinite(args.reps) || args.reps < 0 || args.reps > 1000) {
    throw new Error('Workout reps must be between 0 and 1000.');
  }
  if (!Number.isFinite(args.duration) || args.duration < 0 || args.duration > 24 * 60 * 60) {
    throw new Error('Workout duration is outside the accepted range.');
  }
  if (!Number.isFinite(args.calories) || args.calories < 0 || args.calories > 5000) {
    throw new Error('Workout calories are outside the accepted range.');
  }
  if (args.goal !== undefined && (!Number.isFinite(args.goal) || args.goal < 0 || args.goal > 1000)) {
    throw new Error('Workout goal must be between 0 and 1000.');
  }
}

export const submitWorkout = mutation({
  args: workoutArgs,
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);
    assertWorkoutBounds(args);

    const now = Date.now();
    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    if (!user) {
      throw new Error('User must be synced before workout submission.');
    }

    await assertRateLimit(ctx, {
      userId: user._id,
      bucket: 'submitWorkout',
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });

    const date = Date.parse(args.date) || now;
    const existing = await ctx.db
      .query('workoutResults')
      .withIndex('by_client_workout_id', (q) => q.eq('clientWorkoutId', args.clientWorkoutId))
      .unique();

    const payload = {
      userId: user._id,
      clientWorkoutId: args.clientWorkoutId,
      date,
      type: args.type,
      trainingCameraMode: args.trainingCameraMode,
      reps: args.reps,
      duration: args.duration,
      calories: args.calories,
      completed: args.completed,
      goal: args.goal,
      sets: args.sets,
      restTime: args.restTime,
      formFeedbackState: args.formFeedbackState,
      cameraPresentationState: args.cameraPresentationState,
      qualityScore: args.qualityScore,
      updatedAt: now,
    };

    let workoutId;
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      workoutId = existing._id;
    } else {
      workoutId = await ctx.db.insert('workoutResults', { ...payload, createdAt: now });
    }

    const shouldAddCompletedResult = !existing || (!existing.completed && args.completed);
    const repDelta = shouldAddCompletedResult ? Math.max(0, args.reps - (existing?.reps ?? 0)) : 0;
    const nextTotalReps = Math.max(user.totalReps, 0) + repDelta;
    await ctx.db.patch(user._id, {
      totalReps: nextTotalReps,
      bestReps: Math.max(user.bestReps, args.reps),
      updatedAt: now,
    });

    if (args.completed) {
      const key = dayKey(date);
      const daily = await ctx.db
        .query('dailyStats')
        .withIndex('by_user_day', (q) => q.eq('userId', user._id).eq('dayKey', key))
        .unique();

      if (daily) {
        await ctx.db.patch(daily._id, {
          reps: daily.reps + repDelta,
          workouts: shouldAddCompletedResult ? daily.workouts + 1 : daily.workouts,
          duration: shouldAddCompletedResult ? daily.duration + args.duration : Math.max(daily.duration, args.duration),
          calories: shouldAddCompletedResult ? daily.calories + args.calories : Math.max(daily.calories, args.calories),
          bestReps: Math.max(daily.bestReps, args.reps),
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('dailyStats', {
          userId: user._id,
          dayKey: key,
          reps: args.reps,
          workouts: 1,
          duration: args.duration,
          calories: args.calories,
          bestReps: args.reps,
          updatedAt: now,
        });
      }
    }

    if (shouldAddCompletedResult && args.completed && repDelta > 0) {
      await applyWorkoutToChallenges(ctx, user._id, repDelta);
    }

    return workoutId;
  },
});

export const recent = query({
  args: { clientUserId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query('workoutResults')
      .withIndex('by_user_date', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit ?? 20);
  },
});

export const historyForUser = query({
  args: {
    viewerClientUserId: v.string(),
    targetClientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { viewerClientUserId, targetClientUserId, limit }) => {
    await requireMatchingIdentity(ctx, viewerClientUserId);

    const target = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', targetClientUserId))
      .unique();
    if (!target) return [];

    return await ctx.db
      .query('workoutResults')
      .withIndex('by_user_date', (q) => q.eq('userId', target._id))
      .order('desc')
      .take(Math.min(limit ?? 50, 100));
  },
});

export const profileRange = query({
  args: {
    clientUserId: v.string(),
    period: profilePeriod,
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, period, offset }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) {
      return {
        summary: emptySummary(),
        previousSummary: period === 'ALL' ? null : emptySummary(),
        dailySeries: [],
        history: [],
      };
    }

    const safeOffset = Math.max(0, Math.min(offset ?? 0, 120));
    const range = getRangeForPeriod(period, safeOffset);
    const rows = await ctx.db
      .query('workoutResults')
      .withIndex('by_user_date', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(1000);
    const completed = rows.filter((row) => row.completed);
    const rangeRows =
      period === 'ALL'
        ? completed
        : completed.filter((row) => row.date >= range.start && row.date <= range.end);

    const previousRows =
      period === 'ALL'
        ? []
        : completed.filter((row) => {
            const previousRange = getRangeForPeriod(period, safeOffset + 1);
            return row.date >= previousRange.start && row.date <= previousRange.end;
          });

    const dailySeries =
      period === 'ALL'
        ? [...rangeRows.reduce((map, row) => {
            const key = monthKey(row.date);
            const current = map.get(key) ?? { key, label: formatSeriesLabel(key, period), reps: 0, workouts: 0 };
            current.reps += row.reps;
            current.workouts += 1;
            map.set(key, current);
            return map;
          }, new Map<string, { key: string; label: string; reps: number; workouts: number }>()).values()]
            .sort((a, b) => a.key.localeCompare(b.key))
        : Array.from({ length: range.days }, (_, index) => {
            const date = new Date(range.start);
            date.setDate(date.getDate() + index);
            const key = dayKey(date.getTime());
            return { key, label: formatSeriesLabel(key, period), reps: 0, workouts: 0 };
          }).map((bucket) => {
            const matches = rangeRows.filter((row) => dayKey(row.date) === bucket.key);
            return {
              ...bucket,
              reps: matches.reduce((sum, row) => sum + row.reps, 0),
              workouts: matches.length,
            };
          });

    return {
      summary: buildSummary(rangeRows),
      previousSummary: period === 'ALL' ? null : buildSummary(previousRows),
      dailySeries,
      history: rangeRows.slice(0, 100).map((row) => ({
        id: row._id,
        clientWorkoutId: row.clientWorkoutId,
        date: row.date,
        type: row.type,
        trainingCameraMode: row.trainingCameraMode,
        reps: row.reps,
        duration: row.duration,
        calories: row.calories,
        completed: row.completed,
        formFeedbackState: row.formFeedbackState,
        cameraPresentationState: row.cameraPresentationState,
        qualityScore: row.qualityScore,
      })),
    };
  },
});
