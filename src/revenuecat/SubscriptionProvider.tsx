import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  configureRevenueCat,
  getActiveProductIdentifier,
  getConfiguredPackages,
  getCurrentOffering,
  getRevenueCatErrorMessage,
  isPushupCoachPro,
  isUserCancelledPurchase,
  presentCustomerCenter,
  presentProPaywall,
  purchaseProPackage,
  restorePurchases,
} from './revenueCat';
import { IS_REVENUECAT_CONFIGURED, ProductIdentifierKey } from './config';
import { useBetterAuth } from '../auth';
import { useUserStore } from '../store';

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  activeProductIdentifier: string | null;
  packages: PurchasesPackage[];
  productPackages: Record<ProductIdentifierKey, PurchasesPackage | null>;
  configured: boolean;
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

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { isLoaded: authLoaded, isSignedIn, userId } = useBetterAuth();
  const appUserID = isSignedIn && userId ? userId : null;
  const updateProStatus = useUserStore((state) => state.updateProStatus);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [productPackages, setProductPackages] = useState<Record<ProductIdentifierKey, PurchasesPackage | null>>({
    yearly: null,
    monthly: null,
  });
  const [loading, setLoading] = useState(IS_REVENUECAT_CONFIGURED);
  const [error, setError] = useState<string | null>(null);

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
      const info = await configureRevenueCat(appUserID);
      const offering = await getCurrentOffering();

      setPackages(offering?.availablePackages ?? []);
      setProductPackages(getConfiguredPackages(offering));
      applyCustomerInfo(info);
    } catch (refreshError) {
      setError(getRevenueCatErrorMessage(refreshError, 'Unable to refresh subscription status.'));
    }
  }, [appUserID, applyCustomerInfo]);

  useEffect(() => {
    const listener: CustomerInfoUpdateListener = (info) => {
      applyCustomerInfo(info);
    };

    async function initializeSubscriptions() {
      if (!authLoaded) {
        return;
      }

      if (!IS_REVENUECAT_CONFIGURED) {
        setCustomerInfo(null);
        setPackages([]);
        setProductPackages(getConfiguredPackages(null));
        setError('Subscriptions are unavailable in this build.');
        setLoading(false);
        updateProStatus('free');
        return;
      }

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

    void initializeSubscriptions();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [appUserID, applyCustomerInfo, authLoaded]);

  const buyPackage = useCallback(
    async (pkg: PurchasesPackage) => {
      setError(null);

      try {
        await configureRevenueCat(appUserID);
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
    [appUserID, applyCustomerInfo],
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
      await configureRevenueCat(appUserID);
      const info = await restorePurchases();
      applyCustomerInfo(info);
    } catch (restoreError) {
      setError(getRevenueCatErrorMessage(restoreError, 'Unable to restore purchases.'));
      throw restoreError;
    }
  }, [appUserID, applyCustomerInfo]);

  const showPaywall = useCallback(async () => {
    setError(null);

    try {
      const info = await configureRevenueCat(appUserID);
      const offering = await getCurrentOffering();
      applyCustomerInfo(info);
      setPackages(offering?.availablePackages ?? []);
      setProductPackages(getConfiguredPackages(offering));

      if (isPushupCoachPro(info)) {
        return true;
      }

      if (!offering) {
        throw new Error('No RevenueCat offering is available. Check that the default offering is configured and published.');
      }

      const unlocked = await presentProPaywall();
      const refreshedInfo = await Purchases.getCustomerInfo();
      applyCustomerInfo(refreshedInfo);

      return unlocked || isPushupCoachPro(refreshedInfo);
    } catch (paywallError) {
      const message = getRevenueCatErrorMessage(paywallError, 'Unable to open the paywall.');
      setError(message);
      throw new Error(message);
    }
  }, [appUserID, applyCustomerInfo]);

  const showCustomerCenter = useCallback(async () => {
    setError(null);

    try {
      await configureRevenueCat(appUserID);
      await presentCustomerCenter(applyCustomerInfo);
      await refresh();
    } catch (customerCenterError) {
      setError(getRevenueCatErrorMessage(customerCenterError, 'Unable to open Customer Center.'));
      throw customerCenterError;
    }
  }, [appUserID, applyCustomerInfo, refresh]);

  const value = useMemo(
    () => ({
      customerInfo,
      isPro: isPushupCoachPro(customerInfo),
      activeProductIdentifier: getActiveProductIdentifier(customerInfo),
      packages,
      productPackages,
      configured: IS_REVENUECAT_CONFIGURED,
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
