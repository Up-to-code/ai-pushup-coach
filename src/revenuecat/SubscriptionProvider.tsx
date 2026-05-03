import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import {
  configureRevenueCat,
  getActiveProductIdentifier,
  getConfiguredPackages,
  getCurrentOffering,
  getRevenueCatErrorMessage,
  isPushupCoachPro,
  isUserCancelledPurchase,
  presentCustomerCenter,
  purchaseProPackage,
  restorePurchases,
} from './revenueCat';
import { ProductIdentifierKey } from './config';
import { colors } from '../theme';
import { useUserStore } from '../store';

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  activeProductIdentifier: string | null;
  packages: PurchasesPackage[];
  productPackages: Record<ProductIdentifierKey, PurchasesPackage | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  buyPackage: (pkg: PurchasesPackage) => Promise<void>;
  buyProduct: (productKey: ProductIdentifierKey) => Promise<void>;
  restore: () => Promise<void>;
  showPaywall: () => Promise<boolean>;
  showCustomerCenter: () => Promise<void>;
  clearError: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

type PaywallPromise = {
  resolve: (unlocked: boolean) => void;
};

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const appUserID = useUserStore((state) => state.user.id);
  const updateProStatus = useUserStore((state) => state.updateProStatus);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [productPackages, setProductPackages] = useState<Record<ProductIdentifierKey, PurchasesPackage | null>>({
    yearly: null,
    monthly: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const paywallPromiseRef = useRef<PaywallPromise | null>(null);

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo) => {
      setCustomerInfo(info);
      updateProStatus(isPushupCoachPro(info) ? 'pro' : 'free');
    },
    [updateProStatus],
  );

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const [offering, info] = await Promise.all([
        getCurrentOffering(),
        Purchases.getCustomerInfo(),
      ]);

      setPackages(offering?.availablePackages ?? []);
      setProductPackages(getConfiguredPackages(offering));
      applyCustomerInfo(info);
    } catch (refreshError) {
      setError(getRevenueCatErrorMessage(refreshError, 'Unable to refresh subscription status.'));
    }
  }, [applyCustomerInfo]);

  useEffect(() => {
    const listener: CustomerInfoUpdateListener = (info) => {
      applyCustomerInfo(info);
    };

    async function initializeSubscriptions() {
      try {
        setLoading(true);
        setError(null);

        const info = await configureRevenueCat(appUserID);
        applyCustomerInfo(info);

        const offering = await getCurrentOffering();
        setPackages(offering?.availablePackages ?? []);
        setProductPackages(getConfiguredPackages(offering));

        Purchases.addCustomerInfoUpdateListener(listener);
      } catch (initializationError) {
        setError(getRevenueCatErrorMessage(initializationError, 'Unable to initialize subscriptions.'));
      } finally {
        setLoading(false);
      }
    }

    initializeSubscriptions();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [appUserID, applyCustomerInfo]);

  const buyPackage = useCallback(
    async (pkg: PurchasesPackage) => {
      setError(null);

      try {
        const info = await purchaseProPackage(pkg);
        applyCustomerInfo(info);
      } catch (purchaseError) {
        if (isUserCancelledPurchase(purchaseError)) {
          return;
        }

        const message = getRevenueCatErrorMessage(purchaseError, 'Purchase failed. Please try again.');
        setError(message);
        throw purchaseError;
      }
    },
    [applyCustomerInfo],
  );

  const buyProduct = useCallback(
    async (productKey: ProductIdentifierKey) => {
      const pkg = productPackages[productKey];
      if (!pkg) {
        const message = `The ${productKey} package is not available in the current RevenueCat offering.`;
        setError(message);
        throw new Error(message);
      }

      await buyPackage(pkg);
    },
    [buyPackage, productPackages],
  );

  const restore = useCallback(async () => {
    setError(null);

    try {
      const info = await restorePurchases();
      applyCustomerInfo(info);
    } catch (restoreError) {
      setError(getRevenueCatErrorMessage(restoreError, 'Unable to restore purchases.'));
      throw restoreError;
    }
  }, [applyCustomerInfo]);

  const finishPaywall = useCallback(
    (unlocked: boolean, info?: CustomerInfo) => {
      if (info) {
        applyCustomerInfo(info);
      }

      setPaywallVisible(false);
      paywallPromiseRef.current?.resolve(unlocked);
      paywallPromiseRef.current = null;
    },
    [applyCustomerInfo],
  );

  const showPaywall = useCallback(async () => {
    setError(null);

    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);

      if (isPushupCoachPro(info)) {
        return true;
      }

      if (paywallPromiseRef.current) {
        return false;
      }

      setPaywallVisible(true);

      return await new Promise<boolean>((resolve) => {
        paywallPromiseRef.current = { resolve };
      });
    } catch (paywallError) {
      setError(getRevenueCatErrorMessage(paywallError, 'Unable to open the paywall.'));
      return false;
    }
  }, [applyCustomerInfo]);

  const showCustomerCenter = useCallback(async () => {
    setError(null);

    try {
      await presentCustomerCenter(applyCustomerInfo);
      await refresh();
    } catch (customerCenterError) {
      setError(getRevenueCatErrorMessage(customerCenterError, 'Unable to open Customer Center.'));
      throw customerCenterError;
    }
  }, [applyCustomerInfo, refresh]);

  const value = useMemo(
    () => ({
      customerInfo,
      isPro: isPushupCoachPro(customerInfo),
      activeProductIdentifier: getActiveProductIdentifier(customerInfo),
      packages,
      productPackages,
      loading,
      error,
      refresh,
      buyPackage,
      buyProduct,
      restore,
      showPaywall,
      showCustomerCenter,
      clearError: () => setError(null),
    }),
    [
      buyPackage,
      buyProduct,
      customerInfo,
      error,
      loading,
      packages,
      productPackages,
      refresh,
      restore,
      showCustomerCenter,
      showPaywall,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <Modal
        animationType="slide"
        onRequestClose={() => finishPaywall(false)}
        presentationStyle="fullScreen"
        statusBarTranslucent
        visible={paywallVisible}
      >
        <View style={styles.paywallModal}>
          <RevenueCatUI.Paywall
            style={styles.paywall}
            options={{ displayCloseButton: false }}
            onDismiss={() => finishPaywall(false)}
            onPurchaseCompleted={({ customerInfo: purchasedCustomerInfo }) => {
              finishPaywall(isPushupCoachPro(purchasedCustomerInfo), purchasedCustomerInfo);
            }}
            onPurchaseError={({ error: purchaseError }) => {
              setError(getRevenueCatErrorMessage(purchaseError, 'Purchase failed. Please try again.'));
            }}
            onPurchaseCancelled={() => {
              setError(null);
            }}
            onRestoreCompleted={({ customerInfo: restoredCustomerInfo }) => {
              finishPaywall(isPushupCoachPro(restoredCustomerInfo), restoredCustomerInfo);
            }}
            onRestoreError={({ error: restoreError }) => {
              setError(getRevenueCatErrorMessage(restoreError, 'Unable to restore purchases.'));
            }}
          />
          <SafeAreaView pointerEvents="box-none" style={styles.closeLayer} edges={['top']}>
            <Pressable
              accessibilityLabel="Close paywall"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => finishPaywall(false)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used inside SubscriptionProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  paywallModal: {
    flex: 1,
    backgroundColor: colors.backgroundCanvas,
  },
  paywall: {
    flex: 1,
  },
  closeLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  closeButton: {
    width: 40,
    height: 40,
    marginTop: 50,
    marginRight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(10, 10, 10, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  closeButtonPressed: {
    opacity: 0.72,
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
