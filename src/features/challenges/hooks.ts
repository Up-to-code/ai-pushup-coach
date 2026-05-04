import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthenticatedBackendState, useClientUserId } from '../shared/currentUser';

export function useChallenges(limit = 25) {
  const clientUserId = useClientUserId();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const rows = useQuery(api.challenges.list, canUseAuthenticatedBackend ? { clientUserId, limit } : 'skip');
  const seedMutation = useMutation(api.challenges.seedDefaults);
  const joinMutation = useMutation(api.challenges.join);
  const leaveMutation = useMutation(api.challenges.leave);
  const requireAuthenticatedBackend = useCallback(() => {
    if (!canUseAuthenticatedBackend) {
      throw new Error('Authenticated backend is not ready.');
    }
  }, [canUseAuthenticatedBackend]);

  return {
    challenges: canUseAuthenticatedBackend ? rows : undefined,
    loading: authLoading || (canUseAuthenticatedBackend && rows === undefined),
    canSeedDefaults: canUseAuthenticatedBackend,
    seedDefaults: useCallback(() => {
      requireAuthenticatedBackend();
      return seedMutation({ clientUserId });
    }, [clientUserId, requireAuthenticatedBackend, seedMutation]),
    join: useCallback((challengeId: Id<'challenges'>) => {
      requireAuthenticatedBackend();
      return joinMutation({ clientUserId, challengeId });
    }, [clientUserId, joinMutation, requireAuthenticatedBackend]),
    leave: useCallback((challengeId: Id<'challenges'>) => {
      requireAuthenticatedBackend();
      return leaveMutation({ clientUserId, challengeId });
    }, [clientUserId, leaveMutation, requireAuthenticatedBackend]),
  };
}

export function useChallengeProgress() {
  return useChallenges();
}
