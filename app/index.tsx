import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useSettingsStore } from '../src/store';

export default function AppEntryScreen() {
  const { isLoaded, isSignedIn } = useAuth();
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

  if (!isLoaded || !hydrated) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!isSignedIn && !allowGuestMode) {
    return <Redirect href={'/(auth)/sign-in' as any} />;
  }

  return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/(stack)/onboarding'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
