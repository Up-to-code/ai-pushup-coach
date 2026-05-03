import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useSettingsStore } from '../src/store';

export default function AppEntryScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { userId } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  const [hydrated, setHydrated] = useState(
    Boolean((useSettingsStore as any).persist?.hasHydrated?.())
  );

  useEffect(() => {
    const persistApi = (useSettingsStore as any).persist;
    const finishHydration = () => setHydrated(true);

    if (!persistApi?.onFinishHydration || persistApi.hasHydrated?.()) {
      finishHydration();
    } else {
      persistApi.onFinishHydration(finishHydration);
    }
  }, []);

  const deletionState = useQuery(
    api.users.deletionStatus,
    isLoaded && isSignedIn && isConvexAuthenticated && userId ? { clientUserId: userId } : 'skip'
  );

  if (!isLoaded || !hydrated || (isSignedIn && isConvexAuthenticated && userId && !deletionState)) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!isSignedIn && !allowGuestMode) {
    return <Redirect href={'/sign-in' as any} />;
  }

  if (isSignedIn && deletionState?.status === 'pendingDeletion') {
    return <Redirect href={'/restore-account' as any} />;
  }

  return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
