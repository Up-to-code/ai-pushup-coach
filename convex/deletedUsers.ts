import type { Doc } from './_generated/dataModel';

export const ACCOUNT_RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isPendingDeletion(user: Pick<Doc<'users'>, 'deletionStatus'> | null | undefined) {
  return user?.deletionStatus === 'pendingDeletion';
}

export function isPublicUser(user: Pick<Doc<'users'>, 'deletionStatus'> | null | undefined) {
  return Boolean(user) && !isPendingDeletion(user);
}

export function assertActiveUser(user: Pick<Doc<'users'>, 'deletionStatus'> | null | undefined) {
  if (isPendingDeletion(user)) {
    throw new Error('Account is pending deletion. Restore the account before continuing.');
  }
}
