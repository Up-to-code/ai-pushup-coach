import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, StyleSheet } from 'react-native';
import { ClerkUserSync } from '../src/auth/ClerkUserSync';
import { ConvexBackendProvider } from '../src/backend';
import { SubscriptionProvider } from '../src/revenuecat';
import { colors } from '../src/theme';
import { WidgetDataSync } from '../src/widgets/WidgetDataSync';

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your Expo environment.');
}

LogBox.ignoreLogs(['Clerk: Clerk has been loaded with development keys']);

if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const first = args[0];
    if (typeof first === 'string' && first.includes('Clerk: Clerk has been loaded with development keys')) {
      return;
    }
    originalWarn(...args);
  };
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexBackendProvider>
        <SubscriptionProvider>
          <ClerkUserSync />
          <WidgetDataSync />
          <View style={styles.container}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            />
          </View>
        </SubscriptionProvider>
      </ConvexBackendProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
