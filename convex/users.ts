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

export const publicProfile = query({
  args: {
    viewerClientUserId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { viewerClientUserId, userId }) => {
    await requireMatchingIdentity(ctx, viewerClientUserId);

    const viewer = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', viewerClientUserId))
      .unique();
    const profile = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', userId))
      .unique();

    if (!viewer || !profile) return null;

    const following = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerUserId', viewer._id).eq('followingUserId', profile._id))
      .unique();
    const followedBy = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerUserId', profile._id).eq('followingUserId', viewer._id))
      .unique();
    const followers = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingUserId', profile._id))
      .collect();
    const followingRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', profile._id))
      .collect();

    return {
      ...profile,
      isCurrentUser: viewer._id === profile._id,
      isFollowing: following?.status === 'active',
      followsYou: followedBy?.status === 'active',
      isFriend: following?.status === 'active' && followedBy?.status === 'active',
      followersCount: followers.filter((row) => row.status === 'active').length,
      followingCount: followingRows.filter((row) => row.status === 'active').length,
      friendsCount: followers.filter(
        (follower) =>
          follower.status === 'active' &&
          followingRows.some(
            (followingRow) =>
              followingRow.status === 'active' &&
              followingRow.followingUserId === follower.followerUserId
          )
      ).length,
    };
  },
});
