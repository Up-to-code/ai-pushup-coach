export type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'signedIn' | 'pendingDeletion';

export type DeletionStateLike = {
  status: 'missing' | 'active' | 'pendingDeletion';
} | null | undefined;

type ResolveAuthStatusInput = {
  authLoaded: boolean;
  settingsHydrated: boolean;
  isSignedIn: boolean;
  allowGuestMode: boolean;
  clientUserId?: string | null;
  deletionState: DeletionStateLike;
};

export function resolveAuthStatus({
  authLoaded,
  settingsHydrated,
  isSignedIn,
  allowGuestMode,
  clientUserId,
  deletionState,
}: ResolveAuthStatusInput): AuthStatus {
  if (!authLoaded || !settingsHydrated) {
    return 'loading';
  }

  if (!isSignedIn) {
    return allowGuestMode ? 'guest' : 'signedOut';
  }

  if (!clientUserId) {
    return 'loading';
  }

  return deletionState?.status === 'pendingDeletion' ? 'pendingDeletion' : 'signedIn';
}

export function getAuthEntryRoute(status: AuthStatus, hasCompletedOnboarding: boolean) {
  if (status === 'loading') return null;
  if (status === 'signedOut') return '/sign-in';
  if (status === 'pendingDeletion') return '/restore-account';
  return hasCompletedOnboarding ? '/(tabs)' : '/onboarding';
}
