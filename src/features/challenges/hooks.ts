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

  return {
    challenges: canUseAuthenticatedBackend ? rows : [],
    loading: authLoading || (canUseAuthenticatedBackend && rows === undefined),
    seedDefaults: () => seedMutation({ clientUserId }),
    join: (challengeId: Id<'challenges'>) => joinMutation({ clientUserId, challengeId }),
    leave: (challengeId: Id<'challenges'>) => leaveMutation({ clientUserId, challengeId }),
  };
}

export function useChallengeProgress() {
  return useChallenges();
}
