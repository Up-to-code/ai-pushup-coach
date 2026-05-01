import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { useSettingsStore } from '../../src/store';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn || allowGuestMode) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
