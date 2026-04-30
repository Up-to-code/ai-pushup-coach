import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';

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

function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export const submitWorkout = mutation({
  args: workoutArgs,
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const now = Date.now();
    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    if (!user) {
      throw new Error('User must be synced before workout submission.');
    }

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

    const nextTotalReps = Math.max(user.totalReps, 0) + (existing ? 0 : args.reps);
    await ctx.db.patch(user._id, {
      totalReps: existing ? Math.max(user.totalReps, args.reps) : nextTotalReps,
      bestReps: Math.max(user.bestReps, args.reps),
      updatedAt: now,
    });

    const key = dayKey(date);
    const daily = await ctx.db
      .query('dailyStats')
      .withIndex('by_user_day', (q) => q.eq('userId', user._id).eq('dayKey', key))
      .unique();

    if (daily) {
      await ctx.db.patch(daily._id, {
        reps: existing ? Math.max(daily.reps, args.reps) : daily.reps + args.reps,
        workouts: existing ? daily.workouts : daily.workouts + 1,
        duration: existing ? Math.max(daily.duration, args.duration) : daily.duration + args.duration,
        calories: existing ? Math.max(daily.calories, args.calories) : daily.calories + args.calories,
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
