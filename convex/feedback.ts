import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { assertRateLimit } from './rateLimit';
import { assertActiveUser, isPendingDeletion } from './deletedUsers';
import type { Id } from './_generated/dataModel';
import { ensureAppUserForClientId, getReadableFitnessUserIdForClientId } from './leaderboardProfiles';
import { capturePosthogEvent } from './posthog';
import { buildFeedbackSubmittedProperties, buildFeedbackVoteProperties } from './posthogEvents';

async function getUser(ctx: QueryCtx | MutationCtx, clientUserId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
    .unique();
}

function normalizeText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function fingerprint(kind: 'feature' | 'bug', title: string) {
  return `${kind}:${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
}

async function isExistingUserId(ctx: QueryCtx, userId: Id<'users'>) {
  return Boolean(await ctx.db.get(userId));
}

export const list = query({
  args: {
    clientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUser(ctx, clientUserId);
    if (user && isPendingDeletion(user)) return [];
    const readableUserId = user?._id ?? await getReadableFitnessUserIdForClientId(ctx, clientUserId);
    if (!readableUserId) return [];

    const rows = await ctx.db
      .query('feedbackRequests')
      .withIndex('by_created_at')
      .order('desc')
      .take(Math.min(limit ?? 50, 100));

    const votes = await ctx.db
      .query('feedbackVotes')
      .withIndex('by_user', (q) => q.eq('userId', readableUserId))
      .take(1000);
    const votedRequestIds = new Set<Id<'feedbackRequests'>>();
    votes.forEach((vote) => votedRequestIds.add(vote.requestId));
    const mineRequestIds = new Set<Id<'feedbackRequests'>>();
    let hasExactMine = false;
    for (const request of rows) {
      if (request.authorUserId === readableUserId) {
        mineRequestIds.add(request._id);
        hasExactMine = true;
      }
    }

    if (!hasExactMine) {
      const authorIds = Array.from(new Set(rows.map((row) => row.authorUserId)));
      const existingAuthorIds = new Set<Id<'users'>>();
      for (const authorId of authorIds) {
        if (await isExistingUserId(ctx, authorId)) {
          existingAuthorIds.add(authorId);
        }
      }

      rows.forEach((request) => {
        if (!existingAuthorIds.has(request.authorUserId)) {
          mineRequestIds.add(request._id);
        }
      });
    }

    return rows.map((request) => ({
      ...request,
      voted: votedRequestIds.has(request._id),
      isMine: mineRequestIds.has(request._id),
    }));
  },
});

export const submit = mutation({
  args: {
    clientUserId: v.string(),
    kind: v.union(v.literal('feature'), v.literal('bug')),
    title: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ensureAppUserForClientId(ctx, args.clientUserId);
    if (!user) throw new Error('User must exist before sending feedback.');
    assertActiveUser(user);

    await assertRateLimit(ctx, {
      userId: user._id,
      bucket: 'submitFeedback',
      limit: 5,
      windowMs: 24 * 60 * 60 * 1000,
    });

    const title = normalizeText(args.title, 120);
    const details = args.details ? normalizeText(args.details, 1200) : undefined;
    if (title.length < 6) {
      throw new Error('Please add a little more detail to the title.');
    }

    const requestFingerprint = fingerprint(args.kind, title);
    const existing = await ctx.db
      .query('feedbackRequests')
      .withIndex('by_author_fingerprint', (q) =>
        q.eq('authorUserId', user._id).eq('fingerprint', requestFingerprint)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        details: details ?? existing.details,
        updatedAt: now,
      });
      await capturePosthogEvent(ctx, {
        distinctId: user.clientUserId,
        event: 'feedback_submitted',
        properties: buildFeedbackSubmittedProperties(user, { kind: args.kind, status: 'updated' }),
      });
      return existing._id;
    }

    const requestId = await ctx.db.insert('feedbackRequests', {
      authorUserId: user._id,
      kind: args.kind,
      title,
      details,
      fingerprint: requestFingerprint,
      status: 'open',
      voteCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('feedbackVotes', {
      requestId,
      userId: user._id,
      createdAt: now,
    });
    await capturePosthogEvent(ctx, {
      distinctId: user.clientUserId,
      event: 'feedback_submitted',
      properties: buildFeedbackSubmittedProperties(user, { kind: args.kind, status: 'created' }),
    });
    return requestId;
  },
});

export const setVote = mutation({
  args: {
    clientUserId: v.string(),
    requestId: v.id('feedbackRequests'),
    voted: v.boolean(),
  },
  handler: async (ctx, { clientUserId, requestId, voted }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ensureAppUserForClientId(ctx, clientUserId);
    const request = await ctx.db.get(requestId);
    if (!user || !request) throw new Error('Feedback request not found.');
    assertActiveUser(user);

    await assertRateLimit(ctx, {
      userId: user._id,
      bucket: 'voteFeedback',
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });

    const existing = await ctx.db
      .query('feedbackVotes')
      .withIndex('by_request_user', (q) => q.eq('requestId', requestId).eq('userId', user._id))
      .unique();

    const now = Date.now();
    if (voted && !existing) {
      await ctx.db.insert('feedbackVotes', {
        requestId,
        userId: user._id,
        createdAt: now,
      });
      await ctx.db.patch(requestId, {
        voteCount: request.voteCount + 1,
        updatedAt: now,
      });
      await capturePosthogEvent(ctx, {
        distinctId: user.clientUserId,
        event: 'feedback_voted',
        properties: buildFeedbackVoteProperties(user, {
          kind: request.kind,
          voteCount: request.voteCount + 1,
        }),
      });
    } else if (!voted && existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(requestId, {
        voteCount: Math.max(0, request.voteCount - 1),
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});
