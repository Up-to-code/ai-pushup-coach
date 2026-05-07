import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ProPaywall } from '../../src/components/ProPaywall';
import { useSubscription } from '../../src/subscriptions';

export default function PaywallScreen() {
  const router = useRouter();
  const { 
    loading, 
    products, 
    productPackages, 
    buyPackage, 
    restore, 
    error 
  } = useSubscription();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (loading && !products.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ff4d6d" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProPaywall
        busyKey={null} // Simplified for screen, hooks into state below if needed
        message={error}
        onClose={handleClose}
        onPurchase={(key, product) => buyPackage(product)}
        onRestore={restore}
        productPackages={productPackages}
        isScreen={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
