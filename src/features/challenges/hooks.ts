import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useClientUserId, useIsGuestMode } from '../shared/currentUser';

export function useChallenges(limit = 25) {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const rows = useQuery(api.challenges.list, isGuestMode ? 'skip' : { clientUserId, limit });
  const seedMutation = useMutation(api.challenges.seedDefaults);
  const joinMutation = useMutation(api.challenges.join);
  const leaveMutation = useMutation(api.challenges.leave);

  return {
    challenges: isGuestMode ? [] : rows,
    loading: !isGuestMode && rows === undefined,
    seedDefaults: () => seedMutation({ clientUserId }),
    join: (challengeId: Id<'challenges'>) => joinMutation({ clientUserId, challengeId }),
    leave: (challengeId: Id<'challenges'>) => leaveMutation({ clientUserId, challengeId }),
  };
}

export function useChallengeProgress() {
  return useChallenges();
}
