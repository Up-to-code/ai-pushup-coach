import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { assertRateLimit } from './rateLimit';
import { assertActiveUser, isPendingDeletion } from './deletedUsers';
import { ensureAppUserForClientId } from './leaderboardProfiles';

async function getUserByClientId(ctx: QueryCtx | MutationCtx, clientUserId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
    .unique();
}

export const follow = mutation({
  args: {
    clientUserId: v.string(),
    targetClientUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const actor = await ensureAppUserForClientId(ctx, args.clientUserId);
    const target = await ensureAppUserForClientId(ctx, args.targetClientUserId);
    if (!actor || !target) throw new Error('Both users must exist before following.');
    assertActiveUser(actor);
    assertActiveUser(target);
    if (actor._id === target._id) throw new Error('You cannot follow yourself.');

    await assertRateLimit(ctx, {
      userId: actor._id,
      bucket: 'follow',
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const now = Date.now();
    const existing = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerUserId', actor._id).eq('followingUserId', target._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: 'active', updatedAt: now });
    } else {
      await ctx.db.insert('follows', {
        followerUserId: actor._id,
        followingUserId: target._id,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }

    const targetFollowsActor = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerUserId', target._id).eq('followingUserId', actor._id))
      .unique();

    await ctx.db.insert('socialNotifications', {
      recipientUserId: target._id,
      actorUserId: actor._id,
      type: targetFollowsActor?.status === 'active' ? 'followBack' : 'followedYou',
      title: targetFollowsActor?.status === 'active' ? 'You are friends now' : 'New follower',
      body: `${actor.displayName ?? actor.name} followed you.`,
      entityId: actor.clientUserId,
      createdAt: now,
    });

    return { ok: true };
  },
});

export const unfollow = mutation({
  args: {
    clientUserId: v.string(),
    targetClientUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const actor = await ensureAppUserForClientId(ctx, args.clientUserId);
    const target = await ensureAppUserForClientId(ctx, args.targetClientUserId);
    if (!actor || !target) throw new Error('Both users must exist before unfollowing.');
    assertActiveUser(actor);

    const existing = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerUserId', actor._id).eq('followingUserId', target._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: 'blocked', updatedAt: Date.now() });
    }

    return { ok: true };
  },
});

export const counts = query({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUserByClientId(ctx, clientUserId);
    if (!user) return { followersCount: 0, followingCount: 0, friendsCount: 0 };
    if (isPendingDeletion(user)) return { followersCount: 0, followingCount: 0, friendsCount: 0 };

    const followers = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingUserId', user._id))
      .take(1000);
    const following = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerUserId', user._id))
      .take(1000);
    const [activeFollowers, activeFollowing] = await Promise.all([
      Promise.all(followers.filter((row) => row.status === 'active').map(async (row) => {
        const follower = await ctx.db.get(row.followerUserId);
        return follower && !isPendingDeletion(follower) ? row : null;
      })),
      Promise.all(following.filter((row) => row.status === 'active').map(async (row) => {
        const followed = await ctx.db.get(row.followingUserId);
        return followed && !isPendingDeletion(followed) ? row : null;
      })),
    ]).then(([followerRows, followingRows]) => [
      followerRows.filter((row): row is NonNullable<typeof row> => row !== null),
      followingRows.filter((row): row is NonNullable<typeof row> => row !== null),
    ]);
    const followingIds = new Set(activeFollowing.map((row) => row.followingUserId));

    return {
      followersCount: activeFollowers.length,
      followingCount: activeFollowing.length,
      friendsCount: activeFollowers.filter((row) => followingIds.has(row.followerUserId)).length,
    };
  },
});
