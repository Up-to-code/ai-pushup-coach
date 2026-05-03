import { describe, expect, it } from 'vitest';
import { ACCOUNT_RESTORE_WINDOW_MS, assertActiveUser, isPendingDeletion, isPublicUser } from './deletedUsers';

describe('deleted user helpers', () => {
  it('uses a 30 day restore window', () => {
    expect(ACCOUNT_RESTORE_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('treats missing and active users as not pending deletion', () => {
    expect(isPendingDeletion(null)).toBe(false);
    expect(isPendingDeletion({ deletionStatus: undefined })).toBe(false);
    expect(isPendingDeletion({ deletionStatus: 'active' })).toBe(false);
    expect(isPublicUser({ deletionStatus: 'active' })).toBe(true);
  });

  it('hides pending deletion users from public surfaces', () => {
    expect(isPendingDeletion({ deletionStatus: 'pendingDeletion' })).toBe(true);
    expect(isPublicUser({ deletionStatus: 'pendingDeletion' })).toBe(false);
    expect(() => assertActiveUser({ deletionStatus: 'pendingDeletion' })).toThrow(
      'Account is pending deletion'
    );
  });
});
