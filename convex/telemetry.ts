import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';

export const logWorkoutEvent = mutation({
  args: {
    clientUserId: v.string(),
    clientWorkoutId: v.string(),
    type: v.union(
      v.literal('sessionStarted'),
      v.literal('repCounted'),
      v.literal('phaseChanged'),
      v.literal('formFeedback'),
      v.literal('cameraState'),
      v.literal('sessionPaused'),
      v.literal('sessionResumed'),
      v.literal('sessionEnded')
    ),
    rep: v.optional(v.number()),
    phase: v.optional(v.string()),
    formFeedbackState: v.optional(v.string()),
    cameraPresentationState: v.optional(v.string()),
    message: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    const workout = await ctx.db
      .query('workoutResults')
      .withIndex('by_client_workout_id', (q) => q.eq('clientWorkoutId', args.clientWorkoutId))
      .unique();
    if (!user || !workout) {
      throw new Error('User and workout must exist before telemetry submission.');
    }

    return await ctx.db.insert('workoutEvents', {
      workoutId: workout._id,
      userId: user._id,
      type: args.type,
      rep: args.rep,
      phase: args.phase,
      formFeedbackState: args.formFeedbackState,
      cameraPresentationState: args.cameraPresentationState,
      message: args.message,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

export const logFaceTrackingSample = mutation({
  args: {
    clientUserId: v.string(),
    clientWorkoutId: v.string(),
    timestamp: v.optional(v.number()),
    faceDetected: v.boolean(),
    faceHeight: v.number(),
    centerX: v.number(),
    centerY: v.number(),
    trackingPhase: v.optional(v.string()),
    trackingProblem: v.optional(v.string()),
    brightnessState: v.optional(v.union(v.literal('ok'), v.literal('dark'), v.literal('unknown'))),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    const workout = await ctx.db
      .query('workoutResults')
      .withIndex('by_client_workout_id', (q) => q.eq('clientWorkoutId', args.clientWorkoutId))
      .unique();
    if (!user || !workout) {
      throw new Error('User and workout must exist before tracking sample submission.');
    }

    return await ctx.db.insert('faceTrackingSamples', {
      workoutId: workout._id,
      userId: user._id,
      timestamp: args.timestamp ?? Date.now(),
      faceDetected: args.faceDetected,
      faceHeight: args.faceHeight,
      centerX: args.centerX,
      centerY: args.centerY,
      trackingPhase: args.trackingPhase,
      trackingProblem: args.trackingProblem,
      brightnessState: args.brightnessState,
    });
  },
});
