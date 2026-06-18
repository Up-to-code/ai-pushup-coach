import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthProvider, AuthRoutingGate } from '../src/auth';
import { AnalyticsProvider } from '../src/analytics';
import { ConvexBackendProvider } from '../src/backend';
import { SubscriptionProvider } from '../src/subscriptions';
import { colors } from '../src/theme';
import { WidgetDataSync } from '../src/widgets/WidgetDataSync';

export default function RootLayout() {
  return (
    <ConvexBackendProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <SubscriptionProvider>
            <AuthRoutingGate />
            <WidgetDataSync />
            <View style={styles.container}>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                }}
              />
            </View>
          </SubscriptionProvider>
        </AnalyticsProvider>
      </AuthProvider>
    </ConvexBackendProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
