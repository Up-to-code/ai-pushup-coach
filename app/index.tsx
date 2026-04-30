import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '@clerk/clerk-expo';
import { colors, spacing, typography } from '../src/theme';
import { useSettingsStore } from '../src/store';
import { BrandLogo } from '../src/components';

export default function AppEntryScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const [hydrated, setHydrated] = useState(
    Boolean((useSettingsStore as any).persist?.hasHydrated?.())
  );

  // We add an artificial delay to the splash screen so the user can enjoy the brand logo animation
  // In a real app, this would be tied to data fetching or heavy initialization
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let hydrationDone = false;
    
    const persistApi = (useSettingsStore as any).persist;
    
    const finishHydration = () => {
      hydrationDone = true;
      setHydrated(true);
    };

    if (!persistApi?.onFinishHydration || persistApi.hasHydrated?.()) {
      finishHydration();
    } else {
      const unsubscribe = persistApi.onFinishHydration(finishHydration);
      // Clean up the listener when the component unmounts
      // (Effect cleanup will handle this but we must return it or call it)
    }

    // Keep splash screen visible for at least 2 seconds for branding
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded || !hydrated || showSplash) {
    return (
      <View style={styles.loading}>
        <Animated.View entering={ZoomIn.duration(800).springify()}>
          <BrandLogo size={80} />
        </Animated.View>
        <Animated.Text 
          entering={FadeInDown.delay(400).duration(600)} 
          style={styles.loadingText}
        >
          PUSHUP COACH
        </Animated.Text>
        <Animated.Text 
          entering={FadeIn.delay(800).duration(600)} 
          style={styles.subText}
        >
          Initializing engine...
        </Animated.Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href={'/(auth)/sign-in' as any} />;
  }

  return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/(stack)/onboarding'} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
  subText: {
    ...typography.caption,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
