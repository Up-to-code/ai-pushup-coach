import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { ACCOUNT_RESTORE_WINDOW_MS, assertActiveUser, isPendingDeletion } from './deletedUsers';
import type { Doc, TableNames } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

async function deleteRows<TableName extends TableNames>(
  ctx: MutationCtx,
  rows: Array<Pick<Doc<TableName>, '_id'>>
) {
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

async function collectAccountRows(ctx: MutationCtx, user: Doc<'users'>) {
  const [
    settings,
    workouts,
    events,
    samples,
    dailyStats,
    following,
    followers,
    allNotifications,
    challengeMembers,
    feedbackRequests,
    allFeedbackVotes,
    rateLimits,
  ] = await Promise.all([
    ctx.db.query('userSettings').withIndex('by_user_id', (q) => q.eq('userId', user._id)).collect(),
    ctx.db.query('workoutResults').withIndex('by_user_date', (q) => q.eq('userId', user._id)).collect(),
    ctx.db.query('workoutEvents').withIndex('by_user_time', (q) => q.eq('userId', user._id)).collect(),
    ctx.db.query('faceTrackingSamples').withIndex('by_user_time', (q) => q.eq('userId', user._id)).collect(),
    ctx.db.query('dailyStats').withIndex('by_user_day', (q) => q.eq('userId', user._id)).collect(),
    ctx.db.query('follows').withIndex('by_follower', (q) => q.eq('followerUserId', user._id)).collect(),
    ctx.db.query('follows').withIndex('by_following', (q) => q.eq('followingUserId', user._id)).collect(),
    ctx.db.query('socialNotifications').collect(),
    ctx.db.query('challengeMembers').withIndex('by_user', (q) => q.eq('userId', user._id)).collect(),
    ctx.db.query('feedbackRequests').withIndex('by_author', (q) => q.eq('authorUserId', user._id)).collect(),
    ctx.db.query('feedbackVotes').collect(),
    ctx.db.query('rateLimits').collect(),
  ]);
  const feedbackRequestIds = new Set(feedbackRequests.map((row) => row._id));

  return {
    settings,
    workouts,
    events,
    samples,
    dailyStats,
    following,
    followers,
    notifications: allNotifications.filter((row) => row.recipientUserId === user._id || row.actorUserId === user._id),
    challengeMembers,
    feedbackRequests,
    feedbackVotes: allFeedbackVotes.filter((row) => row.userId === user._id || feedbackRequestIds.has(row.requestId)),
    rateLimits: rateLimits.filter((row) => row.userId === user._id),
  };
}

async function hardDeleteAccountRows(ctx: MutationCtx, user: Doc<'users'>) {
  const rows = await collectAccountRows(ctx, user);
  await deleteRows(ctx, rows.settings);
  await deleteRows(ctx, rows.workouts);
  await deleteRows(ctx, rows.events);
  await deleteRows(ctx, rows.samples);
  await deleteRows(ctx, rows.dailyStats);
  await deleteRows(ctx, rows.following);
  await deleteRows(ctx, rows.followers);
  await deleteRows(ctx, rows.notifications);
  await deleteRows(ctx, rows.challengeMembers);
  await deleteRows(ctx, rows.feedbackRequests);
  await deleteRows(ctx, rows.feedbackVotes);
  await deleteRows(ctx, rows.rateLimits);
  await ctx.db.delete(user._id);
}

function normalizeCreatedAt(createdAt: string | number, fallback: number) {
  if (typeof createdAt === 'number') {
    return Number.isFinite(createdAt) ? createdAt : fallback;
  }

  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
    createdAt: v.union(v.string(), v.number()),
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
      createdAt: normalizeCreatedAt(args.createdAt, now),
      updatedAt: now,
      streak: args.streak,
      energy: args.energy,
      totalReps: args.totalReps,
      bestReps: args.bestReps,
    };

    if (existing) {
      assertActiveUser(existing);
      await ctx.db.patch(existing._id, {
        ...payload,
        deletionStatus: 'active',
        totalReps: Math.max(existing.totalReps, args.totalReps),
        bestReps: Math.max(existing.bestReps, args.bestReps),
      });
      return existing._id;
    }

    return await ctx.db.insert('users', { ...payload, deletionStatus: 'active', restoreTokenVersion: 0 });
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

export const deleteAccount = mutation({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();

    if (!user) return { ok: true };
    if (isPendingDeletion(user)) {
      return { ok: true, deleteAfter: user.deleteAfter };
    }

    const now = Date.now();
    const deleteAfter = now + ACCOUNT_RESTORE_WINDOW_MS;
    const rows = await collectAccountRows(ctx, user);
    const feedbackRequestIds = new Set(rows.feedbackRequests.map((row) => row._id));

    await Promise.all([
      ...rows.following.map((row) => ctx.db.patch(row._id, { status: 'blocked', updatedAt: now })),
      ...rows.followers.map((row) => ctx.db.patch(row._id, { status: 'blocked', updatedAt: now })),
      ...rows.notifications.map((row) => ctx.db.delete(row._id)),
      ...rows.challengeMembers.map((row) => ctx.db.delete(row._id)),
      ...rows.feedbackRequests.map((row) => ctx.db.patch(row._id, { status: 'closed' as const, voteCount: 0, updatedAt: now })),
      ...rows.feedbackVotes
        .filter((row) => !feedbackRequestIds.has(row.requestId))
        .map(async (row) => {
          const request = await ctx.db.get(row.requestId);
          if (request) {
            await ctx.db.patch(row.requestId, {
              voteCount: Math.max(0, request.voteCount - 1),
              updatedAt: now,
            });
          }
        }),
      ...rows.feedbackVotes.map((row) => ctx.db.delete(row._id)),
    ]);

    await ctx.db.patch(user._id, {
      name: 'Deleted user',
      displayName: 'Deleted user',
      nickname: 'Deleted user',
      bio: undefined,
      personalityTags: [],
      countryCode: 'GLOBAL',
      countryName: 'Earth',
      avatar: undefined,
      deletionStatus: 'pendingDeletion',
      deletedAt: now,
      deleteAfter,
      restoreTokenVersion: (user.restoreTokenVersion ?? 0) + 1,
      updatedAt: now,
    });

    return { ok: true, deleteAfter };
  },
});

export const deletionStatus = query({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();

    if (!user) return { status: 'missing' as const };
    return {
      status: user.deletionStatus ?? 'active',
      deletedAt: user.deletedAt,
      deleteAfter: user.deleteAfter,
    };
  },
});

export const restoreAccount = mutation({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) return { ok: false, status: 'missing' as const };
    if (!isPendingDeletion(user)) return { ok: true, status: 'active' as const };
    if (user.deleteAfter && user.deleteAfter <= Date.now()) {
      return { ok: false, status: 'expired' as const, deleteAfter: user.deleteAfter };
    }

    await ctx.db.patch(user._id, {
      deletionStatus: 'active',
      deletedAt: undefined,
      deleteAfter: undefined,
      name: user.name === 'Deleted user' ? 'Athlete' : user.name,
      displayName: user.displayName === 'Deleted user' ? 'Athlete' : user.displayName,
      nickname: user.nickname === 'Deleted user' ? 'Coach' : user.nickname,
      updatedAt: Date.now(),
    });

    return { ok: true, status: 'active' as const };
  },
});

export const permanentlyDeleteAccount = mutation({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) return { ok: true };

    await hardDeleteAccountRows(ctx, user);
    return { ok: true };
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

    if (!viewer || !profile || isPendingDeletion(profile)) return null;

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
      .take(1000);
    const followingRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', profile._id))
      .take(1000);

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

export const sharedProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', userId))
      .unique();

    if (!profile || isPendingDeletion(profile)) return null;

    const followers = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingUserId', profile._id))
      .take(1000);
    const followingRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', profile._id))
      .take(1000);

    return {
      clientUserId: profile.clientUserId,
      displayName: profile.displayName ?? profile.name,
      nickname: profile.nickname,
      bio: profile.bio,
      countryCode: profile.countryCode,
      countryName: profile.countryName,
      avatar: profile.avatar,
      streak: profile.streak,
      totalReps: profile.totalReps,
      bestReps: profile.bestReps,
      followersCount: followers.filter((row) => row.status === 'active').length,
      followingCount: followingRows.filter((row) => row.status === 'active').length,
      updatedAt: profile.updatedAt,
    };
  },
});
