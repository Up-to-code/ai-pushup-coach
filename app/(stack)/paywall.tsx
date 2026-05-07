import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ProPaywall } from '../../src/components/ProPaywall';
import { useSubscription } from '../../src/subscriptions';
import { type ProductIdentifierKey } from '../../src/subscriptions/config';

export default function PaywallScreen() {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<ProductIdentifierKey | 'restore' | null>(null);
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
        busyKey={busyKey}
        message={error}
        onClose={handleClose}
        onPurchase={async (key, product) => {
          setBusyKey(key);
          try {
            await buyPackage(product);
          } finally {
            setBusyKey(null);
          }
        }}
        onRestore={async () => {
          setBusyKey('restore');
          try {
            await restore();
          } finally {
            setBusyKey(null);
          }
        }}
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
