import { describe, expect, it } from 'vitest';
import { getAuthEntryRoute, resolveAuthStatus } from './authState';

describe('resolveAuthStatus', () => {
  it('stays loading until auth and settings are hydrated', () => {
    expect(
      resolveAuthStatus({
        authLoaded: false,
        settingsHydrated: true,
        isSignedIn: false,
        allowGuestMode: false,
        deletionState: null,
      })
    ).toBe('loading');

    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: false,
        isSignedIn: false,
        allowGuestMode: false,
        deletionState: null,
      })
    ).toBe('loading');
  });

  it('resolves signed out and guest states without backend data', () => {
    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: true,
        isSignedIn: false,
        allowGuestMode: false,
        deletionState: null,
      })
    ).toBe('signedOut');

    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: true,
        isSignedIn: false,
        allowGuestMode: true,
        deletionState: null,
      })
    ).toBe('guest');
  });

  it('waits for backend account state before resolving a signed-in session', () => {
    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: true,
        isSignedIn: true,
        allowGuestMode: false,
        clientUserId: 'user_123',
        deletionState: null,
      })
    ).toBe('loading');

    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: true,
        isSignedIn: true,
        allowGuestMode: false,
        clientUserId: 'user_123',
        deletionState: { status: 'missing' },
      })
    ).toBe('loading');

    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: true,
        isSignedIn: true,
        allowGuestMode: false,
        clientUserId: 'user_123',
        deletionState: { status: 'active' },
      })
    ).toBe('signedIn');
  });

  it('detects pending deletion accounts', () => {
    expect(
      resolveAuthStatus({
        authLoaded: true,
        settingsHydrated: true,
        isSignedIn: true,
        allowGuestMode: false,
        clientUserId: 'user_123',
        deletionState: { status: 'pendingDeletion' },
      })
    ).toBe('pendingDeletion');
  });
});

describe('getAuthEntryRoute', () => {
  it('maps auth states to stable entry routes without premature redirects', () => {
    expect(getAuthEntryRoute('loading', false)).toBeNull();
    expect(getAuthEntryRoute('signedOut', false)).toBe('/sign-in');
    expect(getAuthEntryRoute('guest', false)).toBe('/onboarding');
    expect(getAuthEntryRoute('signedIn', true)).toBe('/(tabs)');
    expect(getAuthEntryRoute('pendingDeletion', true)).toBe('/restore-account');
  });
});
