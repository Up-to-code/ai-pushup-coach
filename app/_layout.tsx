import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { ClerkUserSync } from '../src/auth/ClerkUserSync';
import { ConvexBackendProvider } from '../src/backend';
import { SubscriptionProvider } from '../src/revenuecat';
import { colors } from '../src/theme';

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your Expo environment.');
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexBackendProvider>
        <SubscriptionProvider>
          <ClerkUserSync />
          <View style={styles.container}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen 
                name="(stack)/training-setup"
                options={{
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen 
                name="(stack)/session-ready"
                options={{
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen 
                name="(stack)/workout-session" 
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen 
                name="(stack)/workout-complete" 
                options={{
                  presentation: 'card',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen 
                name="(stack)/settings" 
                options={{
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen 
                name="(stack)/settings/edit-profile" 
                options={{
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen 
                name="(stack)/onboarding" 
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'fade',
                }}
              />
              <Stack.Screen name="(stack)/setup/level" />
              <Stack.Screen name="(stack)/setup/days" />
              <Stack.Screen name="(stack)/setup/goal" />
              <Stack.Screen name="(stack)/setup/time" />
              <Stack.Screen name="(stack)/legal/privacy" />
              <Stack.Screen name="(stack)/legal/terms" />
              <Stack.Screen name="(stack)/legal/data-camera" />
            </Stack>
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
