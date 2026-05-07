import { describe, expect, it } from 'vitest';
import { getBetterAuthDisplayName, toLocalUserUpdates } from './betterAuthUserProfile';

describe('getBetterAuthDisplayName', () => {
  it('prefers name over email', () => {
    expect(getBetterAuthDisplayName({ id: 'user_123', name: 'Ahmed Mansour', email: 'coach@example.com' })).toBe(
      'Ahmed Mansour'
    );
  });

  it('falls back through email prefix, then Athlete', () => {
    expect(getBetterAuthDisplayName({ id: 'user_123', email: 'coach@example.com' })).toBe('coach');
    expect(getBetterAuthDisplayName({ id: 'user_123' })).toBe('Athlete');
  });

  it('falls back to Athlete when Apple does not resend name or email', () => {
    expect(getBetterAuthDisplayName({ id: 'apple_user_123', name: null, email: null })).toBe('Athlete');
  });
});

describe('toLocalUserUpdates', () => {
  it('maps Better Auth user profile fields into the local user store shape', () => {
    const createdAt = new Date('2026-04-30T10:00:00.000Z');

    expect(
      toLocalUserUpdates({
        id: 'user_123',
        name: 'Ahmed Mansour',
        image: 'https://img.example.com/avatar.png',
        createdAt,
      })
    ).toEqual({
      id: 'user_123',
      name: 'Ahmed Mansour',
      displayName: 'Ahmed Mansour',
      avatar: 'https://img.example.com/avatar.png',
      createdAt: '2026-04-30T10:00:00.000Z',
    });
  });

  it('uses a deterministic fallback creation date when Better Auth has no createdAt', () => {
    const now = new Date('2026-04-30T12:00:00.000Z');

    expect(toLocalUserUpdates({ id: 'user_123' }, now).createdAt).toBe(
      '2026-04-30T12:00:00.000Z'
    );
  });
});
