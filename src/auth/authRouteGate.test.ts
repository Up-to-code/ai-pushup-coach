import { describe, expect, it } from 'vitest';
import { getAuthRedirectTarget } from './authRouteGate';
import type { AuthActionStatus } from './authActionStore';
import type { AuthStatus } from './authState';

function target(
  status: AuthStatus,
  segments: string[],
  options: {
    authActionStatus?: AuthActionStatus;
    deletionLoading?: boolean;
    hasCompletedOnboarding?: boolean;
    hasPlan?: boolean;
  } = {}
) {
  return getAuthRedirectTarget({
    status,
    segments,
    authActionStatus: options.authActionStatus ?? 'idle',
    deletionLoading: options.deletionLoading ?? false,
    hasCompletedOnboarding: options.hasCompletedOnboarding ?? false,
    hasPlan: options.hasPlan ?? false,
  });
}

describe('getAuthRedirectTarget', () => {
  it('does not redirect while auth is unresolved or provider completion is settling', () => {
    expect(target('loading', [])).toBeNull();
    expect(target('signedIn', [], { authActionStatus: 'signingIn' })).toBeNull();
    expect(target('signedIn', [], { authActionStatus: 'settling' })).toBeNull();
    expect(target('signedIn', [], { deletionLoading: true })).toBeNull();
  });

  it('redirects only when the current route is not already the target route', () => {
    expect(target('signedOut', [])).toBe('/onboarding');
    expect(target('signedOut', ['(stack)', 'onboarding'])).toBeNull();
    expect(target('signedOut', ['(auth)', 'sign-in'])).toBeNull();
    expect(target('signedOut', ['(stack)', 'settings'])).toBe('/onboarding');
    expect(target('signedOut', [], { hasPlan: true })).toBe('/sign-in');
    expect(target('signedOut', ['(auth)', 'sign-in'], { hasPlan: true })).toBeNull();
    expect(target('signedOut', ['(stack)', 'onboarding'], { hasPlan: true })).toBe('/sign-in');

    expect(target('guest', [], { hasCompletedOnboarding: false })).toBe('/onboarding');
    expect(target('guest', ['(stack)', 'onboarding'], { hasCompletedOnboarding: false })).toBeNull();
    expect(target('guest', [], { hasPlan: true })).toBe('/(tabs)');

    expect(target('signedIn', [], { hasCompletedOnboarding: true })).toBe('/(tabs)');
    expect(target('signedIn', ['(tabs)'], { hasCompletedOnboarding: true })).toBeNull();
    expect(target('signedIn', [], { hasPlan: true })).toBe('/(tabs)');

    expect(target('pendingDeletion', ['(tabs)'], { hasCompletedOnboarding: true })).toBe('/restore-account');
    expect(target('pendingDeletion', ['(stack)', 'restore-account'], { hasCompletedOnboarding: true })).toBeNull();
  });

  it('does not bounce signed-in users out of normal protected stack routes', () => {
    expect(target('signedIn', ['(stack)', 'settings'], { hasCompletedOnboarding: true })).toBeNull();
    expect(target('signedIn', ['(stack)', 'user', '[id]'], { hasCompletedOnboarding: true })).toBeNull();
    expect(target('signedIn', ['(stack)', 'workout-session'], { hasCompletedOnboarding: true })).toBeNull();
    expect(target('guest', ['(stack)', 'settings'], { hasCompletedOnboarding: true })).toBeNull();
  });

  it('keeps onboarding available for plan rebuilds and restore mismatches aligned', () => {
    expect(target('signedIn', ['(stack)', 'onboarding'], { hasCompletedOnboarding: true })).toBeNull();
    expect(target('signedIn', ['(tabs)'], { hasCompletedOnboarding: false })).toBe('/onboarding');
    expect(target('signedIn', ['(tabs)'], { hasCompletedOnboarding: false, hasPlan: true })).toBeNull();
    expect(target('signedIn', ['(stack)', 'restore-account'], { hasCompletedOnboarding: true })).toBe('/(tabs)');
    expect(target('pendingDeletion', ['(stack)', 'settings'], { hasCompletedOnboarding: true })).toBe('/restore-account');
  });

  it('replaces auth/onboarding routes after successful authorization so swipe-back cannot reopen them', () => {
    expect(target('signedIn', ['(auth)', 'sign-in'], { hasCompletedOnboarding: true })).toBe('/(tabs)');
    expect(target('signedIn', ['(stack)', 'onboarding'], { hasCompletedOnboarding: false, hasPlan: true })).toBeNull();
    expect(target('signedOut', ['(stack)', 'onboarding'], { hasCompletedOnboarding: true })).toBe('/sign-in');
  });
});
