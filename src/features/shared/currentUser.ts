import { useAuth } from '@clerk/clerk-expo';
import { useUserStore } from '../../store';
import { useSettingsStore } from '../../store';

export function useIsGuestMode() {
  const { isSignedIn } = useAuth();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  return allowGuestMode && !isSignedIn;
}

export function useClientUserId() {
  const { userId } = useAuth();
  const localUserId = useUserStore((state) => state.user.id);
  return userId ?? localUserId;
}
