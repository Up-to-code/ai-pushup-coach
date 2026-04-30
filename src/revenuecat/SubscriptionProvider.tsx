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
  getCurrentOffering,
  isPushupCoachPro,
  presentCustomerCenter,
  presentProPaywallIfNeeded,
  purchaseProPackage,
  restorePurchases,
} from './revenueCat';
import { useUserStore } from '../store';

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  activeProductIdentifier: string | null;
  packages: PurchasesPackage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  buyPackage: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
  showPaywall: () => Promise<boolean>;
  showCustomerCenter: () => Promise<void>;
  clearError: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const appUserID = useUserStore((state) => state.user.id);
  const updateProStatus = useUserStore((state) => state.updateProStatus);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [offering, info] = await Promise.all([
        getCurrentOffering(),
        Purchases.getCustomerInfo(),
      ]);

      setPackages(offering?.availablePackages ?? []);
      applyCustomerInfo(info);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, 'Unable to refresh subscription status.'));
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

        Purchases.addCustomerInfoUpdateListener(listener);
      } catch (initializationError) {
        setError(getErrorMessage(initializationError, 'Unable to initialize subscriptions.'));
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
      } catch (purchaseError: any) {
        if (purchaseError?.userCancelled) {
          return;
        }

        const message = purchaseError?.message ?? 'Purchase failed. Please try again.';
        setError(message);
        throw purchaseError;
      }
    },
    [applyCustomerInfo],
  );

  const restore = useCallback(async () => {
    setError(null);

    try {
      const info = await restorePurchases();
      applyCustomerInfo(info);
    } catch (restoreError) {
      setError(getErrorMessage(restoreError, 'Unable to restore purchases.'));
      throw restoreError;
    }
  }, [applyCustomerInfo]);

  const showPaywall = useCallback(async () => {
    setError(null);

    try {
      const result = await presentProPaywallIfNeeded();
      await refresh();
      return result;
    } catch (paywallError) {
      setError(getErrorMessage(paywallError, 'Unable to open the paywall.'));
      return false;
    }
  }, [refresh]);

  const showCustomerCenter = useCallback(async () => {
    setError(null);

    try {
      await presentCustomerCenter();
      await refresh();
    } catch (customerCenterError) {
      setError(getErrorMessage(customerCenterError, 'Unable to open Customer Center.'));
      throw customerCenterError;
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      customerInfo,
      isPro: isPushupCoachPro(customerInfo),
      activeProductIdentifier: getActiveProductIdentifier(customerInfo),
      packages,
      loading,
      error,
      refresh,
      buyPackage,
      restore,
      showPaywall,
      showCustomerCenter,
      clearError: () => setError(null),
    }),
    [
      buyPackage,
      customerInfo,
      error,
      loading,
      packages,
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
