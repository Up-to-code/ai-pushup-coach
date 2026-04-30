import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';

export const upsertSettings = mutation({
  args: {
    clientUserId: v.string(),
    soundEnabled: v.boolean(),
    hapticsEnabled: v.boolean(),
    theme: v.union(v.literal('dark'), v.literal('mirror')),
    accentColor: v.string(),
    notificationsEnabled: v.optional(v.boolean()),
    workoutReminderEnabled: v.optional(v.boolean()),
    missedReminderEnabled: v.optional(v.boolean()),
    defaultWorkoutTime: v.optional(v.string()),
    defaultCameraMode: v.optional(v.union(v.literal('faceFocus'), v.literal('fullScene'))),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    if (!user) {
      throw new Error('User must be synced before settings.');
    }

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .unique();

    const payload = {
      userId: user._id,
      soundEnabled: args.soundEnabled,
      hapticsEnabled: args.hapticsEnabled,
      theme: args.theme,
      accentColor: args.accentColor,
      notificationsEnabled: args.notificationsEnabled,
      workoutReminderEnabled: args.workoutReminderEnabled,
      missedReminderEnabled: args.missedReminderEnabled,
      defaultWorkoutTime: args.defaultWorkoutTime,
      defaultCameraMode: args.defaultCameraMode,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert('userSettings', payload);
  },
});

export const getSettings = query({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query('userSettings')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .unique();
  },
});
