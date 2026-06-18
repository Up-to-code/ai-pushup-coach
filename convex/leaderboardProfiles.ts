import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { components } from './_generated/api';
import { isPublicUser } from './deletedUsers';
import { capturePosthogEvent } from './posthog';
import { buildProfileCreatedProperties } from './posthogEvents';

export type BetterAuthUserDoc = {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: number;
};

export type LeaderboardProfile = {
  _id?: Doc<'users'>['_id'];
  clientUserId: string;
  name: string;
  displayName?: string;
  countryCode: string;
  avatar?: string;
  totalReps: number;
  deletionStatus?: 'active' | 'pendingDeletion';
};

const legacyProfileMatchWindowMs = 24 * 60 * 60 * 1000;

export function getBetterAuthDisplayName(user: Pick<BetterAuthUserDoc, 'name' | 'email'>) {
  return user.name || user.email?.split('@')[0] || 'Athlete';
}

export async function getAppUserByClientId(ctx: QueryCtx | MutationCtx, clientUserId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
    .unique();
}

export async function getBetterAuthUserById(ctx: QueryCtx | MutationCtx, clientUserId: string) {
  return await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'user',
    where: [{ field: '_id', value: clientUserId }],
  }) as BetterAuthUserDoc | null;
}

export function buildProfileFromBetterAuthUser(
  authUser: BetterAuthUserDoc,
  existing?: Pick<Doc<'users'>, 'countryCode' | 'countryName'> | null
) {
  const displayName = getBetterAuthDisplayName(authUser);
  const now = Date.now();
  return {
    clientUserId: authUser._id,
    name: displayName,
    displayName,
    nickname: displayName,
    countryCode: existing?.countryCode ?? 'GLOBAL',
    countryName: existing?.countryName ?? 'Earth',
    avatar: authUser.image ?? undefined,
    createdAt: authUser.createdAt || now,
  };
}

export async function listBetterAuthUsers(ctx: QueryCtx, limit?: number) {
  const page = await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: 'user',
    paginationOpts: {
      numItems: Math.min(limit ?? 500, 500),
      cursor: null,
    },
  });
  return page.page as BetterAuthUserDoc[];
}

export async function ensureAppUserFromBetterAuthUser(ctx: MutationCtx, authUser: BetterAuthUserDoc) {
  const existing = await getAppUserByClientId(ctx, authUser._id);
  const now = Date.now();
  const payload = buildProfileFromBetterAuthUser(authUser, existing);

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...payload,
      deletionStatus: existing.deletionStatus ?? 'active',
      updatedAt: now,
    });
    return { ...existing, ...payload, deletionStatus: existing.deletionStatus ?? 'active' };
  }

  const id = await ctx.db.insert('users', {
    ...payload,
    proStatus: 'free',
    streak: 0,
    energy: 100,
    totalReps: 0,
    bestReps: 0,
    updatedAt: now,
    deletionStatus: 'active',
    restoreTokenVersion: 0,
  });

  const created = await ctx.db.get(id);
  if (!created) throw new Error('Failed to create app user from Better Auth user.');
  await capturePosthogEvent(ctx, {
    distinctId: created.clientUserId,
    event: 'profile_created',
    properties: buildProfileCreatedProperties(created),
  });
  return created;
}

export async function ensureAppUserForClientId(ctx: MutationCtx, clientUserId: string) {
  const existing = await getAppUserByClientId(ctx, clientUserId);
  if (existing) return existing;

  const authUser = await getBetterAuthUserById(ctx, clientUserId);
  if (!authUser) return null;

  return await ensureAppUserFromBetterAuthUser(ctx, authUser);
}

export async function getTotalRepsForFitnessUserId(ctx: QueryCtx | MutationCtx, userId: Doc<'users'>['_id']) {
  const [dailyStats, workouts] = await Promise.all([
    ctx.db
      .query('dailyStats')
      .withIndex('by_user_day', (q) => q.eq('userId', userId))
      .take(1000),
    ctx.db
      .query('workoutResults')
      .withIndex('by_user_date', (q) => q.eq('userId', userId))
      .take(1000),
  ]);
  const dailyReps = dailyStats.reduce((sum, row) => sum + row.reps, 0);
  const workoutReps = workouts
    .filter((row) => row.completed)
    .reduce((sum, row) => sum + row.reps, 0);
  return Math.max(dailyReps, workoutReps);
}

export async function findLegacyFitnessUsers(ctx: QueryCtx | MutationCtx, authUser: BetterAuthUserDoc) {
  const settings = await ctx.db.query('userSettings').take(1000);
  const directUser = await getAppUserByClientId(ctx, authUser._id);
  const directUserId = directUser?._id;
  const settingCandidates = await Promise.all(
    settings
      .filter((row) => {
        const delta = row._creationTime - authUser.createdAt;
        return delta >= -5 * 60 * 1000 && delta <= legacyProfileMatchWindowMs;
      })
      .map(async (row) => {
        if (row.userId === directUserId) return null;
        return {
          userId: row.userId,
          createdAtDelta: Math.abs(row._creationTime - authUser.createdAt),
          totalReps: await getTotalRepsForFitnessUserId(ctx, row.userId),
        };
      })
  );
  const workoutCandidates = await Promise.all(
    (await ctx.db.query('workoutResults').take(1000))
      .filter((row) => {
        const delta = row._creationTime - authUser.createdAt;
        return row.userId !== directUserId && delta >= -5 * 60 * 1000 && delta <= legacyProfileMatchWindowMs;
      })
      .map(async (row) => ({
        userId: row.userId,
        createdAtDelta: Math.abs(row._creationTime - authUser.createdAt),
        totalReps: await getTotalRepsForFitnessUserId(ctx, row.userId),
      }))
  );

  const byUserId = new Map<Id<'users'>, { userId: Id<'users'>; createdAtDelta: number; totalReps: number }>();
  for (const candidate of [...settingCandidates, ...workoutCandidates]) {
    if (!candidate) continue;
    const existing = byUserId.get(candidate.userId);
    if (!existing || candidate.totalReps > existing.totalReps || candidate.createdAtDelta < existing.createdAtDelta) {
      byUserId.set(candidate.userId, candidate);
    }
  }

  return [...byUserId.values()]
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => {
      if (right.totalReps !== left.totalReps) return right.totalReps - left.totalReps;
      return left.createdAtDelta - right.createdAtDelta;
    });
}

export async function findLegacyFitnessUser(ctx: QueryCtx | MutationCtx, authUser: BetterAuthUserDoc) {
  return (await findLegacyFitnessUsers(ctx, authUser))[0];
}

export async function getLeaderboardProfilesFromBetterAuth(ctx: QueryCtx, limit?: number) {
  const authUsers = await listBetterAuthUsers(ctx, limit);
  const rows = await Promise.all(
    authUsers.map(async (authUser): Promise<LeaderboardProfile> => {
      const appUser = await getAppUserByClientId(ctx, authUser._id);

      if (appUser) {
        return {
          ...appUser,
          _id: appUser._id,
          totalReps: Math.max(appUser.totalReps, await getTotalRepsForFitnessUserId(ctx, appUser._id)),
        };
      }

      const displayName = getBetterAuthDisplayName(authUser);
      return {
        clientUserId: authUser._id,
        name: displayName,
        displayName,
        countryCode: 'GLOBAL',
        avatar: authUser.image ?? undefined,
        totalReps: 0,
        deletionStatus: 'active',
      };
    })
  );

  return rows.filter(isPublicUser);
}

export async function getReadableFitnessUserIdForClientId(ctx: QueryCtx, clientUserId: string) {
  const appUser = await getAppUserByClientId(ctx, clientUserId);
  if (appUser) return appUser._id;

  return null;
}
