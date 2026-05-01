import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useClientUserId, useIsGuestMode } from '../shared/currentUser';
import type { Id } from '../../../convex/_generated/dataModel';

export function useSocialInbox(limit = 50) {
  const clientUserId = useClientUserId();
  const isGuestMode = useIsGuestMode();
  const inbox = useQuery(api.socialNotifications.inbox, isGuestMode ? 'skip' : { clientUserId, limit });
  const markReadMutation = useMutation(api.socialNotifications.markRead);
  const markAllReadMutation = useMutation(api.socialNotifications.markAllRead);
  const followBackMutation = useMutation(api.socialNotifications.followBack);

  return {
    inbox: inbox ?? {
      items: [],
      unreadCount: 0,
    },
    loading: !isGuestMode && inbox === undefined,
    markRead: (notificationId: Id<'socialNotifications'>) =>
      markReadMutation({ clientUserId, notificationId }),
    markAllRead: () => markAllReadMutation({ clientUserId }),
    followBack: (notificationId: Id<'socialNotifications'>) =>
      followBackMutation({ clientUserId, notificationId }),
  };
}
