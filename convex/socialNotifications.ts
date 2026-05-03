import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { assertRateLimit } from './rateLimit';
import { assertActiveUser, isPendingDeletion } from './deletedUsers';

async function getUser(ctx: QueryCtx | MutationCtx, clientUserId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
    .unique();
}

export const inbox = query({
  args: {
    clientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUser(ctx, clientUserId);
    if (!user) return { unreadCount: 0, items: [] };
    if (isPendingDeletion(user)) return { unreadCount: 0, items: [] };

    const rows = await ctx.db
      .query('socialNotifications')
      .withIndex('by_recipient_time', (q) => q.eq('recipientUserId', user._id))
      .order('desc')
      .take(Math.min(limit ?? 50, 100));

    const actorStates = await Promise.all(
      rows.map(async (row) => {
        if (!row.actorUserId) {
          return {
            actor: null,
            actorFollowsYou: false,
            youFollowActor: false,
            isFriend: false,
          };
        }

        const [actor, actorFollowsYou, youFollowActor] = await Promise.all([
          ctx.db.get(row.actorUserId),
          ctx.db
            .query('follows')
            .withIndex('by_pair', (q) => q.eq('followerUserId', row.actorUserId!).eq('followingUserId', user._id))
            .unique(),
          ctx.db
            .query('follows')
            .withIndex('by_pair', (q) => q.eq('followerUserId', user._id).eq('followingUserId', row.actorUserId!))
            .unique(),
        ]);
        const actorFollowsYouActive = actorFollowsYou?.status === 'active';
        const youFollowActorActive = youFollowActor?.status === 'active';

        return {
          actor: actor && !isPendingDeletion(actor) ? actor : null,
          actorFollowsYou: actorFollowsYouActive,
          youFollowActor: youFollowActorActive,
          isFriend: actorFollowsYouActive && youFollowActorActive,
        };
      })
    );

    return {
      unreadCount: rows.filter((row) => !row.readAt).length,
      items: rows.map((row, index) => ({
        ...row,
        actor: actorStates[index].actor
          ? {
              clientUserId: actorStates[index].actor!.clientUserId,
              name: actorStates[index].actor!.displayName ?? actorStates[index].actor!.name,
              countryCode: actorStates[index].actor!.countryCode,
            }
          : null,
        actorFollowsYou: actorStates[index].actorFollowsYou,
        youFollowActor: actorStates[index].youFollowActor,
        isFriend: actorStates[index].isFriend,
      })),
    };
  },
});

export const markRead = mutation({
  args: {
    clientUserId: v.string(),
    notificationId: v.id('socialNotifications'),
  },
  handler: async (ctx, { clientUserId, notificationId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUser(ctx, clientUserId);
    const notification = await ctx.db.get(notificationId);
    if (!user || !notification || notification.recipientUserId !== user._id) {
      throw new Error('Notification not found.');
    }
    assertActiveUser(user);

    await ctx.db.patch(notificationId, { readAt: Date.now() });
    return { ok: true };
  },
});

export const markAllRead = mutation({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUser(ctx, clientUserId);
    if (!user) return { ok: true };
    assertActiveUser(user);

    const rows = await ctx.db
      .query('socialNotifications')
      .withIndex('by_recipient_time', (q) => q.eq('recipientUserId', user._id))
      .take(100);
    const now = Date.now();
    await Promise.all(rows.filter((row) => !row.readAt).map((row) => ctx.db.patch(row._id, { readAt: now })));

    return { ok: true };
  },
});

export const followBack = mutation({
  args: {
    clientUserId: v.string(),
    notificationId: v.id('socialNotifications'),
  },
  handler: async (ctx, { clientUserId, notificationId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUser(ctx, clientUserId);
    const notification = await ctx.db.get(notificationId);
    if (!user || !notification || notification.recipientUserId !== user._id || !notification.actorUserId) {
      throw new Error('Notification not found.');
    }
    if (notification.type !== 'followedYou' && notification.type !== 'followBack') {
      throw new Error('This notification cannot be used for follow back.');
    }
    assertActiveUser(user);

    await assertRateLimit(ctx, {
      userId: user._id,
      bucket: 'followBack',
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const now = Date.now();
    const existing = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerUserId', user._id).eq('followingUserId', notification.actorUserId!))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: 'active', updatedAt: now });
    } else {
      await ctx.db.insert('follows', {
        followerUserId: user._id,
        followingUserId: notification.actorUserId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }

    const relatedRows = await ctx.db
      .query('socialNotifications')
      .withIndex('by_recipient_time', (q) => q.eq('recipientUserId', user._id))
      .take(100);

    const actor = await ctx.db.get(notification.actorUserId);
    const friendshipPatch = {
      type: 'followBack' as const,
      title: 'You are friends now',
      body: `${actor?.displayName ?? actor?.name ?? 'This athlete'} and you follow each other.`,
      readAt: now,
    };

    await Promise.all(
      relatedRows
        .filter(
          (row) =>
            row.actorUserId === notification.actorUserId &&
            (row.type === 'followedYou' || row.type === 'followBack')
        )
        .map((row) => ctx.db.patch(row._id, friendshipPatch))
    );

    return { ok: true };
  },
});
