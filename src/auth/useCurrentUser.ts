import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './useAuth';
import type { User } from '../store';

type RemoteUserWithSubscriptionOwner = {
  subscriptionOwnerUserId?: string;
};

export function useCurrentUser() {
  const auth = useAuth();
  const remoteUser = useQuery(
    api.users.me,
    auth.status === 'signedIn' || auth.status === 'pendingDeletion'
      ? { clientUserId: auth.clientUserId ?? '' }
      : 'skip'
  );

  const user = useMemo<User>(() => {
    if (!remoteUser) {
      return auth.localUser;
    }

    return {
      ...auth.localUser,
      id: remoteUser.clientUserId,
      name: remoteUser.name,
      displayName: remoteUser.displayName ?? remoteUser.name,
      nickname: remoteUser.nickname,
      bio: remoteUser.bio,
      coachTone: remoteUser.coachTone ?? auth.localUser.coachTone,
      personalityTags: remoteUser.personalityTags ?? auth.localUser.personalityTags,
      countryCode: remoteUser.countryCode,
      countryName: remoteUser.countryName,
      avatar: remoteUser.avatar,
      proStatus: remoteUser.proStatus,
      subscriptionStatus: remoteUser.subscriptionStatus,
      subscriptionProvider: remoteUser.subscriptionProvider,
      activeProductIdentifier: remoteUser.activeProductIdentifier,
      activeAccessLevelId: remoteUser.activeAccessLevelId,
      subscriptionUpdatedAt: remoteUser.subscriptionUpdatedAt,
      subscriptionOwnerUserId: (remoteUser as RemoteUserWithSubscriptionOwner).subscriptionOwnerUserId,
      createdAt: new Date(remoteUser.createdAt).toISOString(),
      streak: remoteUser.streak,
      energy: remoteUser.energy,
      totalReps: remoteUser.totalReps,
      bestReps: remoteUser.bestReps,
    };
  }, [auth.localUser, remoteUser]);

  return {
    user,
    remoteUser,
    auth,
    loading: auth.status === 'loading' || (auth.status === 'signedIn' && remoteUser === undefined),
  };
}
