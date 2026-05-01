import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

export async function assertRateLimit(
  ctx: MutationCtx,
  input: {
    userId: Id<'users'>;
    bucket: string;
    limit: number;
    windowMs: number;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query('rateLimits')
    .withIndex('by_user_bucket', (q) =>
      q.eq('userId', input.userId).eq('bucket', input.bucket)
    )
    .unique();

  if (!existing || now - existing.windowStart > input.windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, {
        windowStart: now,
        count: 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('rateLimits', {
        userId: input.userId,
        bucket: input.bucket,
        windowStart: now,
        count: 1,
        updatedAt: now,
      });
    }
    return;
  }

  if (existing.count >= input.limit) {
    throw new Error('Too many actions. Please slow down and try again shortly.');
  }

  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
    updatedAt: now,
  });
}
