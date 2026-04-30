import { describe, expect, it } from 'vitest';
import { getClerkDisplayName, toLocalUserUpdates } from './clerkUserProfile';

describe('getClerkDisplayName', () => {
  it('prefers full name over username and email', () => {
    expect(
      getClerkDisplayName({
        id: 'user_123',
        fullName: 'Ahmed Mansour',
        username: 'ahmed',
        primaryEmailAddress: { emailAddress: 'coach@example.com' },
      })
    ).toBe('Ahmed Mansour');
  });

  it('falls back through username, email prefix, then Athlete', () => {
    expect(getClerkDisplayName({ id: 'user_123', username: 'pushupking' })).toBe(
      'pushupking'
    );
    expect(
      getClerkDisplayName({
        id: 'user_123',
        primaryEmailAddress: { emailAddress: 'coach@example.com' },
      })
    ).toBe('coach');
    expect(getClerkDisplayName({ id: 'user_123' })).toBe('Athlete');
  });
});

describe('toLocalUserUpdates', () => {
  it('maps Clerk user profile fields into the local user store shape', () => {
    const createdAt = new Date('2026-04-30T10:00:00.000Z');

    expect(
      toLocalUserUpdates({
        id: 'user_123',
        fullName: 'Ahmed Mansour',
        imageUrl: 'https://img.clerk.com/avatar.png',
        createdAt,
      })
    ).toEqual({
      id: 'user_123',
      name: 'Ahmed Mansour',
      displayName: 'Ahmed Mansour',
      avatar: 'https://img.clerk.com/avatar.png',
      createdAt: '2026-04-30T10:00:00.000Z',
    });
  });

  it('uses a deterministic fallback creation date when Clerk has no createdAt', () => {
    const now = new Date('2026-04-30T12:00:00.000Z');

    expect(toLocalUserUpdates({ id: 'user_123' }, now).createdAt).toBe(
      '2026-04-30T12:00:00.000Z'
    );
  });
});
