import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { ACCOUNT_RESTORE_WINDOW_MS, assertActiveUser, isPendingDeletion } from './deletedUsers';
import type { Doc, TableNames } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { findLegacyFitnessUser, getBetterAuthDisplayName, getBetterAuthUserById } from './leaderboardProfiles';
import { capturePosthogEvent } from './posthog';
import {
  buildProfileCreatedProperties,
  buildSubscriptionUpdatedProperties,
} from './posthogEvents';

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

function valuesEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  }

  return false;
}

function hasPatchChanges<T extends Record<string, unknown>>(existing: T, patch: Partial<T>) {
  return Object.entries(patch).some(([key, value]) => !valuesEqual(existing[key], value));
}

export function resolveProfileCountry(
  existing: Pick<Doc<'users'>, 'countryCode' | 'countryName'> | null | undefined,
  incoming: { countryCode: string; countryName: string }
) {
  const incomingCountry = {
    countryCode: incoming.countryCode.trim().toUpperCase() || 'GLOBAL',
    countryName: incoming.countryName,
  };

  if (existing?.countryCode && existing.countryCode !== 'GLOBAL' && incomingCountry.countryCode === 'GLOBAL') {
    return {
      countryCode: existing.countryCode,
      countryName: existing.countryName,
    };
  }

  return incomingCountry;
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
    proStatus: v.optional(v.union(v.literal('free'), v.literal('pro'))),
    subscriptionStatus: v.optional(v.union(v.literal('free'), v.literal('pro'), v.literal('expired'), v.literal('unknown'))),
    subscriptionProvider: v.optional(v.union(v.literal('adapty'), v.literal('development'), v.literal('none'))),
    activeProductIdentifier: v.optional(v.string()),
    activeAccessLevelId: v.optional(v.string()),
    subscriptionUpdatedAt: v.optional(v.number()),
    subscriptionOwnerUserId: v.optional(v.string()),
    createdAt: v.union(v.string(), v.number()),
    streak: v.optional(v.number()),
    energy: v.optional(v.number()),
    totalReps: v.optional(v.number()),
    bestReps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);
    
    const now = Date.now();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    const country = resolveProfileCountry(existing, {
      countryCode: args.countryCode,
      countryName: args.countryName,
    });

    const payload = {
      clientUserId: args.clientUserId,
      name: args.name,
      displayName: args.displayName,
      nickname: args.nickname,
      bio: args.bio,
      coachTone: args.coachTone,
      personalityTags: args.personalityTags,
      countryCode: country.countryCode,
      countryName: country.countryName,
      avatar: args.avatar,
      proStatus: args.proStatus ?? existing?.proStatus ?? 'free',
      subscriptionStatus: args.subscriptionStatus ?? existing?.subscriptionStatus,
      subscriptionProvider: args.subscriptionProvider ?? existing?.subscriptionProvider,
      activeProductIdentifier: args.activeProductIdentifier ?? existing?.activeProductIdentifier,
      activeAccessLevelId: args.activeAccessLevelId ?? existing?.activeAccessLevelId,
      subscriptionUpdatedAt: args.subscriptionUpdatedAt ?? existing?.subscriptionUpdatedAt,
      subscriptionOwnerUserId: args.subscriptionOwnerUserId ?? existing?.subscriptionOwnerUserId,
      createdAt: normalizeCreatedAt(args.createdAt, now),
      streak: args.streak ?? existing?.streak ?? 0,
      energy: args.energy ?? existing?.energy ?? 100,
      totalReps: args.totalReps ?? existing?.totalReps ?? 0,
      bestReps: args.bestReps ?? existing?.bestReps ?? 0,
    };

    if (existing) {
      assertActiveUser(existing);
      const patch = {
        ...payload,
        deletionStatus: 'active' as const,
        // Preserve existing values if provided ones are lower (stale local data)
        streak: Math.max(existing.streak ?? 0, args.streak ?? 0),
        energy: args.energy ?? existing.energy ?? 100, // Energy is transient, keep provided or existing
        totalReps: Math.max(existing.totalReps ?? 0, args.totalReps ?? 0),
        bestReps: Math.max(existing.bestReps ?? 0, args.bestReps ?? 0),
      };

      if (hasPatchChanges(existing, patch)) {
        await ctx.db.patch(existing._id, {
          ...patch,
          updatedAt: now,
        });
      }

      return existing._id;
    }

    const userId = await ctx.db.insert('users', { ...payload, updatedAt: now, deletionStatus: 'active', restoreTokenVersion: 0 });
    const created = await ctx.db.get(userId);
    if (created) {
      await capturePosthogEvent(ctx, {
        distinctId: created.clientUserId,
        event: 'profile_created',
        properties: buildProfileCreatedProperties(created),
      });
    }
    return userId;
  },
});

export const updateSubscription = mutation({
  args: {
    clientUserId: v.string(),
    proStatus: v.union(v.literal('free'), v.literal('pro')),
    subscriptionStatus: v.union(v.literal('free'), v.literal('pro'), v.literal('expired'), v.literal('unknown')),
    subscriptionProvider: v.union(v.literal('adapty'), v.literal('development'), v.literal('none')),
    activeProductIdentifier: v.optional(v.string()),
    activeAccessLevelId: v.optional(v.string()),
    subscriptionUpdatedAt: v.number(),
    subscriptionOwnerUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();

    if (!user) {
      return { ok: false, status: 'missing' as const };
    }

    assertActiveUser(user);

    await ctx.db.patch(user._id, {
      proStatus: args.proStatus,
      subscriptionStatus: args.subscriptionStatus,
      subscriptionProvider: args.subscriptionProvider,
      activeProductIdentifier: args.activeProductIdentifier,
      activeAccessLevelId: args.activeAccessLevelId,
      subscriptionUpdatedAt: args.subscriptionUpdatedAt,
      subscriptionOwnerUserId:
        args.subscriptionProvider === 'none'
          ? undefined
          : args.subscriptionOwnerUserId ?? args.clientUserId,
      updatedAt: Date.now(),
    });

    await capturePosthogEvent(ctx, {
      distinctId: user.clientUserId,
      event: 'subscription_updated',
      properties: buildSubscriptionUpdatedProperties(user, args),
    });

    return { ok: true, status: 'updated' as const };
  },
});

export const me = query({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const appUser = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();

    if (appUser) {
      return appUser;
    }

    const authUser = await getBetterAuthUserById(ctx, clientUserId);
    if (!authUser) {
      return null;
    }

    const displayName = getBetterAuthDisplayName(authUser);
    return {
      clientUserId,
      name: displayName,
      displayName,
      nickname: displayName,
      bio: undefined,
      coachTone: undefined,
      personalityTags: undefined,
      countryCode: 'GLOBAL',
      countryName: 'Earth',
      avatar: authUser.image ?? undefined,
      proStatus: 'free' as const,
      subscriptionStatus: undefined,
      subscriptionProvider: undefined,
      activeProductIdentifier: undefined,
      activeAccessLevelId: undefined,
      subscriptionUpdatedAt: undefined,
      subscriptionOwnerUserId: undefined,
      createdAt: authUser.createdAt || Date.now(),
      streak: 0,
      energy: 100,
      totalReps: 0,
      bestReps: 0,
      deletionStatus: 'active' as const,
      updatedAt: authUser.createdAt || Date.now(),
    };
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { status: 'unauthenticated' as const };
    if (identity.subject !== clientUserId) return { status: 'mismatch' as const };

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();

    if (!user) {
      const authUser = await getBetterAuthUserById(ctx, clientUserId);
      return authUser ? { status: 'active' as const } : { status: 'missing' as const };
    }
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
    const authProfile = profile ? null : await getBetterAuthUserById(ctx, userId);

    if (!profile && !authProfile) return null;
    if (profile && isPendingDeletion(profile)) return null;

    const publicProfile = profile ?? {
      clientUserId: authProfile!._id,
      name: getBetterAuthDisplayName(authProfile!),
      displayName: getBetterAuthDisplayName(authProfile!),
      nickname: getBetterAuthDisplayName(authProfile!),
      countryCode: 'GLOBAL',
      countryName: '',
      avatar: authProfile!.image ?? undefined,
      bio: undefined,
      streak: 0,
      totalReps: (await findLegacyFitnessUser(ctx, authProfile!))?.totalReps ?? 0,
      bestReps: 0,
    };

    if (!viewer || !profile) {
      return {
        ...publicProfile,
        isCurrentUser: viewerClientUserId === userId,
        isFollowing: false,
        followsYou: false,
        isFriend: false,
        followersCount: 0,
        followingCount: 0,
        friendsCount: 0,
      };
    }

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
    const authProfile = profile ? null : await getBetterAuthUserById(ctx, userId);

    if (!profile && !authProfile) return null;
    if (profile && isPendingDeletion(profile)) return null;

    if (!profile) {
      const displayName = getBetterAuthDisplayName(authProfile!);
      const legacyFitnessUser = await findLegacyFitnessUser(ctx, authProfile!);
      return {
        clientUserId: authProfile!._id,
        displayName,
        nickname: displayName,
        bio: undefined,
        countryCode: 'GLOBAL',
        countryName: '',
        avatar: authProfile!.image ?? undefined,
        streak: 0,
        totalReps: legacyFitnessUser?.totalReps ?? 0,
        bestReps: 0,
        followersCount: 0,
        followingCount: 0,
        totalWorkouts: 0,
        totalDuration: 0,
        totalCalories: 0,
        recentDays: [],
        updatedAt: authProfile!.createdAt,
      };
    }

    const followers = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingUserId', profile._id))
      .take(1000);
    const followingRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', profile._id))
      .take(1000);
    const allStats = await ctx.db
      .query('dailyStats')
      .withIndex('by_user_day', (q) => q.eq('userId', profile._id))
      .order('desc')
      .take(1000);
    const recentStats = allStats.slice(0, 14);

    const totalWorkouts = allStats.reduce((sum, row) => sum + row.workouts, 0);
    const totalDuration = allStats.reduce((sum, row) => sum + row.duration, 0);
    const totalCalories = allStats.reduce((sum, row) => sum + row.calories, 0);

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
      totalWorkouts,
      totalDuration,
      totalCalories,
      recentDays: recentStats
        .map((row) => ({
          dayKey: row.dayKey,
          reps: row.reps,
          workouts: row.workouts,
        }))
        .reverse(),
      updatedAt: profile.updatedAt,
    };
  },
});
