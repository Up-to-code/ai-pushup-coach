export type ClerkProfileSource = {
  id: string;
  fullName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  createdAt?: Date | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
};

export function getClerkDisplayName(user: ClerkProfileSource) {
  return (
    user.fullName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Athlete'
  );
}

export function toLocalUserUpdates(user: ClerkProfileSource, now = new Date()) {
  const displayName = getClerkDisplayName(user);

  return {
    id: user.id,
    name: displayName,
    displayName,
    avatar: user.imageUrl ?? undefined,
    createdAt: user.createdAt?.toISOString() ?? now.toISOString(),
  };
}
