import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthRoutingGate, BetterAuthUserSync, ConvexUserSync } from '../src/auth';
import { ConvexBackendProvider } from '../src/backend';
import { SubscriptionProvider } from '../src/subscriptions';
import { colors } from '../src/theme';
import { WidgetDataSync } from '../src/widgets/WidgetDataSync';

export default function RootLayout() {
  return (
    <ConvexBackendProvider>
      <SubscriptionProvider>
        <AuthRoutingGate />
        <BetterAuthUserSync />
        <ConvexUserSync />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
