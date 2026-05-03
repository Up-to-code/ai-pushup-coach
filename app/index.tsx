import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useBetterAuth } from '../src/auth';
import { useSettingsStore } from '../src/store';

export default function AppEntryScreen() {
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  const [hydrated, setHydrated] = useState(Boolean(useSettingsStore.persist.hasHydrated()));

  useEffect(() => {
    const finishHydration = () => setHydrated(true);

    if (useSettingsStore.persist.hasHydrated()) {
      finishHydration();
    } else {
      return useSettingsStore.persist.onFinishHydration(finishHydration);
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
