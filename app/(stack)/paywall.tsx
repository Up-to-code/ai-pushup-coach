import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSubscription } from '../../src/subscriptions';

export default function PaywallScreen() {
  const router = useRouter();
  const { showPaywall } = useSubscription();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void showPaywall()
      .catch(() => undefined)
      .finally(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      });
  }, [router, showPaywall]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color="#f43f5e" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});
