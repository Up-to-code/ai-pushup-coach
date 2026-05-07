import type { AuthActionStatus } from './authActionStore';
import type { AuthStatus } from './authState';
type AuthRouteGateInput = {
  status: AuthStatus;
  authActionStatus: AuthActionStatus;
  deletionLoading: boolean;
  hasCompletedOnboarding: boolean;
  hasPlan: boolean;
  segments: readonly string[];
};

function getRouteShape(segments: readonly string[]) {
  const group = segments[0];
  const leaf = segments[segments.length - 1];

  return {
    isRoot: segments.length === 0,
    isAuth: group === '(auth)',
    isTabs: group === '(tabs)',
    isOnboarding: leaf === 'onboarding',
    isRestore: leaf === 'restore-account',
  };
}

function isOnRoute(target: string, segments: readonly string[]) {
  const { isAuth, isTabs, isOnboarding, isRestore } = getRouteShape(segments);

  if (target === '/sign-in') {
    return isAuth && segments[segments.length - 1] === 'sign-in';
  }

  if (target === '/restore-account') {
    return isRestore;
  }

  if (target === '/onboarding') {
    return isOnboarding;
  }

  if (target === '/(tabs)') {
    return isTabs;
  }

  return false;
}

function resolveAuthenticatedTarget(hasCompletedOnboarding: boolean, hasPlan: boolean, segments: readonly string[]) {
  const { isRoot, isAuth, isTabs, isOnboarding, isRestore } = getRouteShape(segments);
  const effectiveOnboardingDone = hasCompletedOnboarding || hasPlan;
  const homeTarget = effectiveOnboardingDone ? '/(tabs)' : '/onboarding';

  if (isRoot || isAuth || isRestore) {
    return homeTarget;
  }

  if (isTabs && !effectiveOnboardingDone) {
    return '/onboarding';
  }

  return null;
}

export function getAuthRedirectTarget({
  status,
  authActionStatus,
  deletionLoading,
  hasCompletedOnboarding,
  hasPlan,
  segments,
}: AuthRouteGateInput) {
  if (status === 'loading' || deletionLoading || authActionStatus !== 'idle') {
    return null;
  }

  let target: string | null = null;
  if (status === 'signedOut') {
    const effectiveOnboardingDone = hasCompletedOnboarding || hasPlan;
    const { isAuth, isOnboarding } = getRouteShape(segments);
    if (!effectiveOnboardingDone && (isAuth || isOnboarding)) {
      return null;
    }
    const signedOutTarget = effectiveOnboardingDone ? '/sign-in' : '/onboarding';
    target = isOnRoute(signedOutTarget, segments) ? null : signedOutTarget;
  } else if (status === 'pendingDeletion') {
    target = isOnRoute('/restore-account', segments) ? null : '/restore-account';
  } else {
    target = resolveAuthenticatedTarget(hasCompletedOnboarding, hasPlan, segments);
  }

  if (!target || isOnRoute(target, segments)) {
    return null;
  }

  return target;
}
