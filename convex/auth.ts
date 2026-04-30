import type { MutationCtx, QueryCtx } from './_generated/server';

export async function requireMatchingIdentity(
  ctx: MutationCtx | QueryCtx,
  clientUserId: string
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error('Authentication required.');
  }

  if (identity.subject !== clientUserId) {
    throw new Error('Authenticated user does not match requested user.');
  }

  return identity;
}
