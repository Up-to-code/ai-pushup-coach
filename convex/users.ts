import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';

export const upsertProfile = mutation({
  args: {
    clientUserId: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    nickname: v.string(),
    bio: v.optional(v.string()),
    coachTone: v.optional(v.union(v.literal('balanced'), v.literal('jokey'), v.literal('strict'))),
    personalityTags: v.optional(v.array(v.string())),
    countryCode: v.string(),
    countryName: v.string(),
    avatar: v.optional(v.string()),
    proStatus: v.union(v.literal('free'), v.literal('pro')),
    createdAt: v.string(),
    streak: v.number(),
    energy: v.number(),
    totalReps: v.number(),
    bestReps: v.number(),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const now = Date.now();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();

    const payload = {
      clientUserId: args.clientUserId,
      name: args.name,
      displayName: args.displayName,
      nickname: args.nickname,
      bio: args.bio,
      coachTone: args.coachTone,
      personalityTags: args.personalityTags,
      countryCode: args.countryCode,
      countryName: args.countryName,
      avatar: args.avatar,
      proStatus: args.proStatus,
      createdAt: Date.parse(args.createdAt) || now,
      updatedAt: now,
      streak: args.streak,
      energy: args.energy,
      totalReps: args.totalReps,
      bestReps: args.bestReps,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        totalReps: Math.max(existing.totalReps, args.totalReps),
        bestReps: Math.max(existing.bestReps, args.bestReps),
      });
      return existing._id;
    }

    return await ctx.db.insert('users', payload);
  },
});

export const me = query({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    return await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
  },
});
