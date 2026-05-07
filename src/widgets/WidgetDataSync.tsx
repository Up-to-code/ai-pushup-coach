import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { AppState, NativeModules, Platform } from 'react-native';
import { api } from '../../convex/_generated/api';
import { useBetterAuth } from '../auth';
import { useUserStore, useWorkoutStore } from '../store';
import { hasProAccess } from '../subscriptions';
import { buildLockedWidgetPayload, buildWidgetPayload, getWidgetPayloadSignature, type WidgetPayload } from './widgetPayload';

type WidgetDataModuleType = {
  updateWidgetData?: (payload: WidgetPayload) => Promise<boolean>;
};

const widgetDataModule = NativeModules.WidgetDataModule as WidgetDataModuleType | undefined;

export function WidgetDataSync() {
  const { isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const user = useUserStore((state) => state.user);
  const workouts = useWorkoutStore((state) => state.workouts);
  const isPro =
    hasProAccess(user.proStatus) &&
    Boolean(userId) &&
    user.id === userId &&
    user.subscriptionOwnerUserId === userId;
  const lastPayloadSignatureRef = useRef<string | null>(null);
  const friendComparison = useQuery(
    api.leaderboard.friendComparison,
    isPro && isSignedIn && isConvexAuthenticated && userId
      ? { clientUserId: userId, period: 'W', offset: 0, limit: 20 }
      : 'skip'
  );
  const payload = useMemo(
    () => isPro
      ? buildWidgetPayload({ user, workouts, friendComparison })
      : buildLockedWidgetPayload({ user }),
    [friendComparison, isPro, user, workouts]
  );
  const payloadSignature = useMemo(() => getWidgetPayloadSignature(payload), [payload]);

  const syncWidgetData = useCallback(() => {
    if (Platform.OS !== 'ios' || !widgetDataModule?.updateWidgetData) {
      return;
    }

    if (lastPayloadSignatureRef.current === payloadSignature) {
      return;
    }

    lastPayloadSignatureRef.current = payloadSignature;

    widgetDataModule.updateWidgetData(payload).catch((error) => {
      lastPayloadSignatureRef.current = null;
      console.warn('Widget data sync failed', error);
    });
  }, [payload, payloadSignature]);

  useEffect(() => {
    syncWidgetData();
  }, [syncWidgetData]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncWidgetData();
      }
    });

    return () => subscription.remove();
  }, [syncWidgetData]);

  return null;
}
