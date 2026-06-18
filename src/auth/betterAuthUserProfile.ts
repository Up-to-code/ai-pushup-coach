export type BetterAuthProfileSource = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt?: Date | string | null;
};

export function getBetterAuthDisplayName(user: BetterAuthProfileSource) {
  return user.name || user.email?.split('@')[0] || 'Athlete';
}

export function toLocalUserUpdates(
  user: BetterAuthProfileSource,
  fallbackCreatedAt: Date | string = new Date()
) {
  const displayName = getBetterAuthDisplayName(user);
  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : user.createdAt || (fallbackCreatedAt instanceof Date ? fallbackCreatedAt.toISOString() : fallbackCreatedAt);

  return {
    id: user.id,
    name: displayName,
    displayName,
    avatar: user.image ?? undefined,
    createdAt,
  };
}
