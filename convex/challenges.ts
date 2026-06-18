import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { assertRateLimit } from './rateLimit';
import type { Id } from './_generated/dataModel';
import { assertActiveUser, isPendingDeletion } from './deletedUsers';
import { ensureAppUserForClientId } from './leaderboardProfiles';

const seedChallenges = [
  {
    slug: 'first-100-week',
    title: 'First 100 This Week',
    description: 'Accumulate 100 clean reps across any sessions this week.',
    category: 'Consistency',
    goalReps: 100,
    windowDays: 7,
    visibility: 'global' as const,
    reward: '100 Club badge progress',
  },
  {
    slug: 'country-climb-250',
    title: 'Country Climb 250',
    description: 'Help your country rank climb with 250 total reps.',
    category: 'Country',
    goalReps: 250,
    windowDays: 14,
    visibility: 'country' as const,
    reward: 'Country climber badge progress',
  },
  {
    slug: 'friends-sprint-50',
    title: 'Friends Sprint 50',
    description: 'A short sprint to compare effort with mutual friends.',
    category: 'Friends',
    goalReps: 50,
    windowDays: 3,
    visibility: 'friends' as const,
    reward: 'Friend sprint badge progress',
  },
];

async function getUser(ctx: QueryCtx | MutationCtx, clientUserId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
    .unique();
}

async function ensureSeedChallenges(ctx: MutationCtx) {
  const now = Date.now();
  const endsAt = now + 30 * 24 * 60 * 60 * 1000;

  for (const challenge of seedChallenges) {
    const existing = await ctx.db
      .query('challenges')
      .withIndex('by_slug', (q) => q.eq('slug', challenge.slug))
      .unique();

    if (!existing) {
      await ctx.db.insert('challenges', {
        ...challenge,
        startsAt: now,
        endsAt,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export const seedDefaults = mutation({
  args: { clientUserId: v.string() },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);
    const user = await ensureAppUserForClientId(ctx, clientUserId);
    if (!user) return { ok: false as const, status: 'missingUser' as const };
    assertActiveUser(user);
    await assertRateLimit(ctx, { userId: user._id, bucket: 'seedChallenges', limit: 3, windowMs: 60 * 60 * 1000 });
    await ensureSeedChallenges(ctx);
    return { ok: true as const, status: 'seeded' as const };
  },
});

export const list = query({
  args: {
    clientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await getUser(ctx, clientUserId);
    if (!user) return [];
    if (isPendingDeletion(user)) return [];

    const rows = await ctx.db.query('challenges').order('desc').take(Math.min(limit ?? 25, 50));
    const memberships = await ctx.db
      .query('challengeMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(1000);
    const membershipByChallenge = new Map<Id<'challenges'>, (typeof memberships)[number]>();
    memberships.forEach((row) => membershipByChallenge.set(row.challengeId, row));

    return rows.map((challenge) => {
      const membership = membershipByChallenge.get(challenge._id);
      return {
        ...challenge,
        joined: Boolean(membership),
        progressReps: membership?.progressReps ?? 0,
        completedAt: membership?.completedAt,
      };
    });
  },
});

export const join = mutation({
  args: {
    clientUserId: v.string(),
    challengeId: v.id('challenges'),
  },
  handler: async (ctx, { clientUserId, challengeId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ensureAppUserForClientId(ctx, clientUserId);
    const challenge = await ctx.db.get(challengeId);
    if (!user || !challenge) throw new Error('Challenge not found.');
    assertActiveUser(user);
    await assertRateLimit(ctx, { userId: user._id, bucket: 'joinChallenge', limit: 10, windowMs: 60 * 60 * 1000 });

    const existing = await ctx.db
      .query('challengeMembers')
      .withIndex('by_challenge_user', (q) => q.eq('challengeId', challengeId).eq('userId', user._id))
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert('challengeMembers', {
      challengeId,
      userId: user._id,
      progressReps: 0,
      joinedAt: now,
      updatedAt: now,
    });
  },
});

export const leave = mutation({
  args: {
    clientUserId: v.string(),
    challengeId: v.id('challenges'),
  },
  handler: async (ctx, { clientUserId, challengeId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ensureAppUserForClientId(ctx, clientUserId);
    if (!user) throw new Error('User not found.');
    assertActiveUser(user);
    const existing = await ctx.db
      .query('challengeMembers')
      .withIndex('by_challenge_user', (q) => q.eq('challengeId', challengeId).eq('userId', user._id))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export async function applyWorkoutToChallenges(
  ctx: MutationCtx,
  userId: Id<'users'>,
  reps: number
) {
  if (reps <= 0) return;

  const memberships = await ctx.db
    .query('challengeMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .take(1000);
  const now = Date.now();

  for (const membership of memberships) {
    if (membership.completedAt) continue;
    const challenge = await ctx.db.get(membership.challengeId);
    if (!challenge || challenge.endsAt < now) continue;

    const nextProgress = Math.min(challenge.goalReps, membership.progressReps + reps);
    const completedAt = nextProgress >= challenge.goalReps ? now : undefined;
    await ctx.db.patch(membership._id, {
      progressReps: nextProgress,
      completedAt,
      updatedAt: now,
    });

    if (completedAt) {
      await ctx.db.insert('socialNotifications', {
        recipientUserId: userId,
        type: 'challengeCompleted',
        title: 'Challenge completed',
        body: `You completed ${challenge.title}.`,
        entityId: challenge._id,
        createdAt: now,
      });
    }
  }
}
