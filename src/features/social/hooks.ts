import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthenticatedBackendState, useClientUserId } from '../shared/currentUser';

export function useSocialCounts() {
  const clientUserId = useClientUserId();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const counts = useQuery(api.social.counts, canUseAuthenticatedBackend ? { clientUserId } : 'skip');
  return {
    counts: counts ?? {
      followersCount: 0,
      followingCount: 0,
      friendsCount: 0,
    },
    loading: authLoading || (canUseAuthenticatedBackend && counts === undefined),
  };
}

export function useFollowActions(targetClientUserId: string) {
  const clientUserId = useClientUserId();
  const followMutation = useMutation(api.social.follow);
  const unfollowMutation = useMutation(api.social.unfollow);

  return {
    follow: () => followMutation({ clientUserId, targetClientUserId }),
    unfollow: () => unfollowMutation({ clientUserId, targetClientUserId }),
  };
}
