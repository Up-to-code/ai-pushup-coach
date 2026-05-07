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
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AdaptyPaywallProduct, type AdaptyProfile } from 'react-native-adapty';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  configureSubscriptions,
  addLatestProfileLoadListener,
  getConfiguredProducts,
  getCurrentPaywallProducts,
  getProductsUnavailableMessage,
  getSubscriptionMetadata,
  getSubscriptionErrorMessage,
  isPushupCoachPro,
  logPaywallShown,
  purchaseProProduct,
  restorePurchases,
  type SubscriptionMetadata,
} from './adapty';
import { FORCE_PRO_FOR_TESTING, IS_ADAPTY_CONFIGURED, ProductIdentifierKey } from './config';
import { useBetterAuth } from '../auth';
import { privacyUrl, termsUrl } from '../config/links';
import { useUserStore, type User } from '../store';
import { ProPaywall } from '../components';

const DEFAULT_TRIAL_LABEL = '3-day free trial';

const signedOutSubscriptionMetadata = (): SubscriptionMetadata => ({
  proStatus: 'free',
  subscriptionStatus: 'unknown',
  subscriptionProvider: 'none',
  activeProductIdentifier: undefined,
  activeAccessLevelId: undefined,
  subscriptionUpdatedAt: Date.now(),
});

function getProfileCustomerUserId(profile: AdaptyProfile | null) {
  return (profile as { customerUserId?: string | null } | null)?.customerUserId ?? null;
}

function getSubscriptionOwnerUserId(provider: User['subscriptionProvider'], ownerId: string | null) {
  return provider && provider !== 'none' ? ownerId ?? undefined : undefined;
}

type SubscriptionContextValue = {
  profile: AdaptyProfile | null;
  isPro: boolean;
  activeProductIdentifier: string | null;
  products: AdaptyPaywallProduct[];
  productPackages: Record<ProductIdentifierKey, AdaptyPaywallProduct | null>;
  configured: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  buyPackage: (product: AdaptyPaywallProduct) => Promise<void>;
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
  const accountUser = useUserStore((state) => state.user);
  const subscriptionUserID = appUserID ?? accountUser.id;
  const updateUser = useUserStore((state) => state.updateUser);
  const updateSubscription = useMutation(api.users.updateSubscription);
  const isForcedPro = FORCE_PRO_FOR_TESTING;
  const accountSubscriptionBelongsToCurrentUser =
    Boolean(subscriptionUserID) &&
    accountUser.subscriptionOwnerUserId === subscriptionUserID;
  const accountIsPro = accountSubscriptionBelongsToCurrentUser && accountUser.proStatus === 'pro';
  const accountCanRefreshFromAdapty = accountSubscriptionBelongsToCurrentUser && accountUser.subscriptionProvider === 'adapty';
  const currentSubscriptionUserIDRef = useRef<string | null>(subscriptionUserID);
  const [profile, setProfile] = useState<AdaptyProfile | null>(null);
  const [profileOwnerId, setProfileOwnerId] = useState<string | null>(subscriptionUserID);
  const [products, setProducts] = useState<AdaptyPaywallProduct[]>([]);
  const [productPackages, setProductPackages] = useState<Record<ProductIdentifierKey, AdaptyPaywallProduct | null>>({
    yearly: null,
    monthly: null,
  });
  const [loading, setLoading] = useState(IS_ADAPTY_CONFIGURED);
  const [error, setError] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallBusyKey, setPaywallBusyKey] = useState<ProductIdentifierKey | 'restore' | null>(null);
  const [paywallMessage, setPaywallMessage] = useState<string | null>(null);

  const applySubscriptionMetadata = useCallback(
    (
      metadata: SubscriptionMetadata,
      options: { ownerId?: string | null; syncBackend?: boolean } = {}
    ) => {
      updateUser({
        ...metadata,
        subscriptionOwnerUserId: getSubscriptionOwnerUserId(
          metadata.subscriptionProvider,
          options.ownerId ?? subscriptionUserID
        ),
      });

      if (!appUserID || !options.syncBackend) {
        return;
      }

      void updateSubscription({
        clientUserId: appUserID,
        ...metadata,
        subscriptionOwnerUserId: getSubscriptionOwnerUserId(
          metadata.subscriptionProvider,
          options.ownerId ?? subscriptionUserID
        ),
      }).catch((syncError) => {
        console.warn('Convex subscription sync failed', syncError);
      });
    },
    [appUserID, updateSubscription, updateUser]
  );

  const applyProfile = useCallback(
    (nextProfile: AdaptyProfile, ownerId: string | null, options: { syncAccount?: boolean } = {}) => {
      if (!ownerId || currentSubscriptionUserIDRef.current !== ownerId) {
        return;
      }

      const profileCustomerUserId = getProfileCustomerUserId(nextProfile);
      if (profileCustomerUserId && profileCustomerUserId !== ownerId) {
        return;
      }

      setProfile(nextProfile);
      setProfileOwnerId(ownerId);

      if (options.syncAccount) {
        applySubscriptionMetadata(getSubscriptionMetadata(nextProfile), {
          ownerId,
          syncBackend: true,
        });
      }
    },
    [applySubscriptionMetadata]
  );

  useEffect(() => {
    currentSubscriptionUserIDRef.current = subscriptionUserID;
    setProfile(null);
    setProfileOwnerId(subscriptionUserID);

    if (!isForcedPro) {
      updateUser({
        ...signedOutSubscriptionMetadata(),
        subscriptionOwnerUserId: undefined,
      });
    }
  }, [isForcedPro, subscriptionUserID, updateUser]);

  const refresh = useCallback(async () => {
    setError(null);

    if (isForcedPro) {
      applySubscriptionMetadata({
        proStatus: 'pro',
        subscriptionStatus: 'pro',
        subscriptionProvider: 'development',
        activeProductIdentifier: 'development-pro',
        activeAccessLevelId: 'development',
        subscriptionUpdatedAt: Date.now(),
      }, { ownerId: subscriptionUserID });
      setLoading(false);
      return;
    }

    if (!subscriptionUserID) {
      setProfile(null);
      setProfileOwnerId(null);
      updateUser({
        ...signedOutSubscriptionMetadata(),
        subscriptionOwnerUserId: undefined,
      });
      setLoading(false);
      return;
    }

    try {
      const nextProfile = await configureSubscriptions(subscriptionUserID);
      const { products: nextProducts } = await getCurrentPaywallProducts();

      setProducts(nextProducts);
      setProductPackages(getConfiguredProducts(nextProducts));
      applyProfile(nextProfile, subscriptionUserID, {
        syncAccount: Boolean(appUserID && (accountCanRefreshFromAdapty || isPushupCoachPro(nextProfile))),
      });
    } catch (refreshError) {
      setError(getSubscriptionErrorMessage(refreshError, 'Unable to refresh subscription status.'));
    }
  }, [accountCanRefreshFromAdapty, appUserID, applyProfile, applySubscriptionMetadata, isForcedPro, subscriptionUserID, updateUser]);

  useEffect(() => {
    const listener = addLatestProfileLoadListener((nextProfile) => {
      applyProfile(nextProfile, currentSubscriptionUserIDRef.current, {
        syncAccount: Boolean(appUserID && (accountCanRefreshFromAdapty || isPushupCoachPro(nextProfile))),
      });
    });

    async function initializeSubscriptions() {
      if (!authLoaded) {
        return;
      }

      if (isForcedPro) {
        setProfile(null);
        setProducts([]);
        setProductPackages(getConfiguredProducts([]));
        setError(null);
        setLoading(false);
        applySubscriptionMetadata({
          proStatus: 'pro',
          subscriptionStatus: 'pro',
          subscriptionProvider: 'development',
          activeProductIdentifier: 'development-pro',
          activeAccessLevelId: 'development',
          subscriptionUpdatedAt: Date.now(),
        }, { ownerId: subscriptionUserID });
        return;
      }

      if (!IS_ADAPTY_CONFIGURED) {
        setProfile(null);
        setProfileOwnerId(null);
        setProducts([]);
        setProductPackages(getConfiguredProducts([]));
        setError('Subscriptions are unavailable in this build.');
        setLoading(false);
        updateUser({
          ...signedOutSubscriptionMetadata(),
          subscriptionOwnerUserId: undefined,
        });
        return;
      }

      if (!subscriptionUserID) {
        setProfile(null);
        setProfileOwnerId(null);
        setProducts([]);
        setProductPackages(getConfiguredProducts([]));
        setError(null);
        setLoading(false);
        updateUser({
          ...signedOutSubscriptionMetadata(),
          subscriptionOwnerUserId: undefined,
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const nextProfile = await configureSubscriptions(subscriptionUserID);
        applyProfile(nextProfile, subscriptionUserID, {
          syncAccount: Boolean(appUserID && (accountCanRefreshFromAdapty || isPushupCoachPro(nextProfile))),
        });

        const { products: nextProducts } = await getCurrentPaywallProducts();
        setProducts(nextProducts);
        setProductPackages(getConfiguredProducts(nextProducts));
      } catch (initializationError) {
        setError(getSubscriptionErrorMessage(initializationError, 'Unable to initialize subscriptions.'));
      } finally {
        setLoading(false);
      }
    }

    void initializeSubscriptions();

    return () => listener.remove();
  }, [accountCanRefreshFromAdapty, appUserID, applyProfile, applySubscriptionMetadata, authLoaded, isForcedPro, subscriptionUserID, updateUser]);

  const buyPackage = useCallback(
    async (product: AdaptyPaywallProduct) => {
      setError(null);

      try {
        const currentProfile = await configureSubscriptions(subscriptionUserID);
        applyProfile(currentProfile, subscriptionUserID, { syncAccount: Boolean(appUserID && accountCanRefreshFromAdapty) });

        if (isPushupCoachPro(currentProfile) && !accountIsPro) {
          applyProfile(currentProfile, subscriptionUserID, { syncAccount: Boolean(appUserID) });
          return;
        }

        const nextProfile = await purchaseProProduct(product);
        if (nextProfile) applyProfile(nextProfile, subscriptionUserID, { syncAccount: Boolean(appUserID) });
      } catch (purchaseError) {
        const message = getSubscriptionErrorMessage(purchaseError, 'Purchase failed. Please try again.');
        setError(message);
        throw purchaseError;
      }
    },
    [accountCanRefreshFromAdapty, accountIsPro, appUserID, applyProfile, subscriptionUserID]
  );

  const buyProduct = useCallback(
    async (productKey: ProductIdentifierKey) => {
      const product = productPackages[productKey];
      if (!product) {
        const message = getProductsUnavailableMessage();
        setError(message);
        throw new Error(message);
      }

      await buyPackage(product);
    },
    [buyPackage, productPackages]
  );

  const restore = useCallback(async () => {
    setError(null);

    if (isForcedPro) {
      applySubscriptionMetadata({
        proStatus: 'pro',
        subscriptionStatus: 'pro',
        subscriptionProvider: 'development',
        activeProductIdentifier: 'development-pro',
        activeAccessLevelId: 'development',
        subscriptionUpdatedAt: Date.now(),
      }, { ownerId: subscriptionUserID });
      return;
    }

    try {
      await configureSubscriptions(subscriptionUserID);
      const nextProfile = await restorePurchases();
      applyProfile(nextProfile, subscriptionUserID, { syncAccount: Boolean(appUserID) });
    } catch (restoreError) {
      setError(getSubscriptionErrorMessage(restoreError, 'Unable to restore purchases.'));
      throw restoreError;
    }
  }, [appUserID, applyProfile, applySubscriptionMetadata, isForcedPro, subscriptionUserID]);

  const showPaywall = useCallback(async () => {
    setError(null);
    setPaywallMessage(null);

    if (isForcedPro) {
      applySubscriptionMetadata({
        proStatus: 'pro',
        subscriptionStatus: 'pro',
        subscriptionProvider: 'development',
        activeProductIdentifier: 'development-pro',
        activeAccessLevelId: 'development',
        subscriptionUpdatedAt: Date.now(),
      }, { ownerId: subscriptionUserID });
      return true;
    }

    try {
      const nextProfile = await configureSubscriptions(subscriptionUserID);
      applyProfile(nextProfile, subscriptionUserID, {
        syncAccount: Boolean(appUserID && (accountCanRefreshFromAdapty || isPushupCoachPro(nextProfile))),
      });

      if (accountIsPro && isPushupCoachPro(nextProfile)) {
        return true;
      }

      const { paywall, products: nextProducts } = await getCurrentPaywallProducts();
      setProducts(nextProducts);
      setProductPackages(getConfiguredProducts(nextProducts));

      if (!nextProducts.length) {
        throw new Error(getProductsUnavailableMessage());
      }

      await logPaywallShown(paywall);
      setPaywallVisible(true);
      return false;
    } catch (paywallError) {
      const message = getSubscriptionErrorMessage(paywallError, 'Unable to open the paywall.');
      setError(message);
      setPaywallMessage(message);
      throw new Error(message);
    }
  }, [accountCanRefreshFromAdapty, accountIsPro, appUserID, applyProfile, applySubscriptionMetadata, isForcedPro, subscriptionUserID]);

  const purchaseFromPaywall = useCallback(
    async (productKey: ProductIdentifierKey, product: AdaptyPaywallProduct) => {
      setPaywallBusyKey(productKey);
      setPaywallMessage(null);

      try {
        const currentProfile = await configureSubscriptions(subscriptionUserID);
        applyProfile(currentProfile, subscriptionUserID, { syncAccount: Boolean(appUserID && accountCanRefreshFromAdapty) });

        if (isPushupCoachPro(currentProfile) && !accountIsPro) {
          applyProfile(currentProfile, subscriptionUserID, { syncAccount: Boolean(appUserID) });
          setPaywallVisible(false);
          return;
        }

        const nextProfile = await purchaseProProduct(product);

        if (nextProfile) {
          applyProfile(nextProfile, subscriptionUserID, { syncAccount: Boolean(appUserID) });
          setPaywallVisible(false);
          return;
        }

        setPaywallMessage('Purchase was cancelled before completion.');
      } catch (purchaseError) {
        setPaywallMessage(getSubscriptionErrorMessage(purchaseError, 'Purchase failed. Please try again.'));
      } finally {
        setPaywallBusyKey(null);
      }
    },
    [accountCanRefreshFromAdapty, accountIsPro, appUserID, applyProfile, subscriptionUserID]
  );

  const restoreFromPaywall = useCallback(async () => {
    setPaywallBusyKey('restore');
    setPaywallMessage(null);

    try {
      await restore();
      setPaywallVisible(false);
    } catch (restoreError) {
      setPaywallMessage(getSubscriptionErrorMessage(restoreError, 'Unable to restore purchases.'));
    } finally {
      setPaywallBusyKey(null);
    }
  }, [restore]);

  const showCustomerCenter = useCallback(async () => {
    throw new Error('Adapty does not provide an in-app customer center. Open App Store subscriptions instead.');
  }, []);

  const scopedProfile = profileOwnerId === subscriptionUserID ? profile : null;
  const accountScopedProfile = accountIsPro ? scopedProfile : null;

  const value = useMemo(
    () => ({
      profile: accountScopedProfile,
      isPro: isForcedPro || accountIsPro,
      activeProductIdentifier: isForcedPro
        ? 'development-pro'
        : accountIsPro
          ? accountUser.activeProductIdentifier ?? null
          : null,
      products,
      productPackages,
      configured: isForcedPro || IS_ADAPTY_CONFIGURED,
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
      error,
      loading,
      isForcedPro,
      productPackages,
      products,
      refresh,
      restore,
      showCustomerCenter,
      showPaywall,
      accountIsPro,
      accountScopedProfile,
      accountUser.activeProductIdentifier,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <Modal animationType="slide" onRequestClose={() => setPaywallVisible(false)} transparent={false} visible={paywallVisible}>
        <ProPaywall
          busyKey={paywallBusyKey}
          message={paywallMessage}
          onClose={() => setPaywallVisible(false)}
          onPurchase={purchaseFromPaywall}
          onRestore={restoreFromPaywall}
          productPackages={productPackages}
          isScreen={false}
        />
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

const styles = StyleSheet.create({});
