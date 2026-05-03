import { Redirect, Stack } from 'expo-router';
import { useBetterAuth } from '../../src/auth';
import { useSettingsStore } from '../../src/store';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useBetterAuth();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn || allowGuestMode) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
