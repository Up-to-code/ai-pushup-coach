import {
  adapty,
  type AdaptyPaywall,
  type AdaptyPaywallProduct,
  type AdaptyProfile,
} from 'react-native-adapty';
import {
  ADAPTY_PUBLIC_SDK_KEY,
  PAYWALL_PLACEMENT_ID,
  PRO_ACCESS_LEVEL_ID,
  PRODUCT_IDENTIFIERS,
  ProductIdentifierKey,
} from './config';

let activationPromise: Promise<void> | null = null;
let identifiedUserId: string | null = null;

type AdaptyErrorLike = {
  code?: string;
  message?: string;
};

export type SubscriptionMetadata = {
  proStatus: 'free' | 'pro';
  subscriptionStatus: 'free' | 'pro' | 'expired' | 'unknown';
  subscriptionProvider: 'adapty' | 'development' | 'none';
  activeProductIdentifier?: string;
  activeAccessLevelId?: string;
  subscriptionUpdatedAt: number;
};

const PRODUCTS_UNAVAILABLE_MESSAGE =
  'Apple StoreKit is not returning the subscription products yet. The App Store Connect and Adapty IDs are linked, but Apple may still be propagating the products. Restart the device and try again later, or test from a fresh TestFlight build.';

export function isPushupCoachPro(profile: AdaptyProfile | null): boolean {
  return profile?.accessLevels?.[PRO_ACCESS_LEVEL_ID]?.isActive === true;
}

export function getActiveProductIdentifier(profile: AdaptyProfile | null): string | null {
  return profile?.accessLevels?.[PRO_ACCESS_LEVEL_ID]?.vendorProductId ?? null;
}

export function getSubscriptionMetadata(profile: AdaptyProfile | null, now = Date.now()): SubscriptionMetadata {
  const accessLevel = profile?.accessLevels?.[PRO_ACCESS_LEVEL_ID];
  const isPro = accessLevel?.isActive === true;
  const hasKnownAccessLevel = Boolean(accessLevel);

  return {
    proStatus: isPro ? 'pro' as const : 'free' as const,
    subscriptionStatus: isPro ? 'pro' as const : hasKnownAccessLevel ? 'expired' as const : 'free' as const,
    subscriptionProvider: 'adapty' as const,
    activeProductIdentifier: accessLevel?.vendorProductId,
    activeAccessLevelId: PRO_ACCESS_LEVEL_ID,
    subscriptionUpdatedAt: now,
  };
}

export function getSubscriptionErrorMessage(error: unknown, fallback: string): string {
  const adaptyError = error as AdaptyErrorLike;
  const message = adaptyError?.message ?? (error instanceof Error ? error.message : null);
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (normalizedMessage.includes('api key') || normalizedMessage.includes('sdk key')) {
    return 'Subscriptions are unavailable in this build.';
  }

  if (normalizedMessage.includes('viewconfiguration')) {
    return 'The Adapty hosted paywall design is missing. Use the in-app paywall or finish the Adapty Paywall Builder setup.';
  }

  if (
    normalizedMessage.includes('badrequest') ||
    normalizedMessage.includes('in-app purchase') ||
    normalizedMessage.includes('noproductidsfound') ||
    normalizedMessage.includes('product') ||
    normalizedMessage.includes('placement') ||
    normalizedMessage.includes('not found')
  ) {
    return PRODUCTS_UNAVAILABLE_MESSAGE;
  }

  return adaptyError?.message ?? (error instanceof Error ? error.message : fallback);
}

export function getProductsUnavailableMessage(): string {
  return PRODUCTS_UNAVAILABLE_MESSAGE;
}

function getAdaptyNativeModuleUnavailableMessage(): string {
  return __DEV__
    ? 'Adapty native module is not available in this app binary. Rebuild the development client after installing react-native-adapty, or use the TestFlight/App Store build.'
    : 'Subscriptions are unavailable in this build.';
}

export function getAdaptyNativeModuleError(error: unknown): Error | null {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.toLowerCase().includes('adapty nativemodule is not defined')
    ? new Error(getAdaptyNativeModuleUnavailableMessage())
    : null;
}

function normalizeAdaptyError(error: unknown): never {
  throw getAdaptyNativeModuleError(error) ?? error;
}

export function addLatestProfileLoadListener(
  listener: (profile: AdaptyProfile) => void
): { remove: () => void } {
  try {
    return adapty.addEventListener('onLatestProfileLoad', listener);
  } catch (error) {
    const nativeModuleError = getAdaptyNativeModuleError(error);
    if (nativeModuleError) {
      console.warn(nativeModuleError.message);
      return { remove: () => undefined };
    }

    throw error;
  }
}

export async function configureSubscriptions(appUserID?: string | null): Promise<AdaptyProfile> {
  if (!ADAPTY_PUBLIC_SDK_KEY) {
    throw new Error('Adapty public SDK key is missing.');
  }

  if (!activationPromise) {
    try {
      activationPromise = adapty.activate(ADAPTY_PUBLIC_SDK_KEY, {
        customerUserId: appUserID || undefined,
        logLevel: __DEV__ ? 'verbose' : 'error',
        __ignoreActivationOnFastRefresh: __DEV__,
        ipAddressCollectionDisabled: true,
        ios: {
          idfaCollectionDisabled: true,
        },
        android: {
          adIdCollectionDisabled: true,
          localAccessLevelAllowed: true,
        },
      });
    } catch (error) {
      normalizeAdaptyError(error);
    }
    identifiedUserId = appUserID ?? null;
  }

  try {
    await activationPromise;

    if (appUserID && identifiedUserId !== appUserID) {
      await adapty.identify(appUserID);
      identifiedUserId = appUserID;
    } else if (!appUserID && identifiedUserId) {
      await adapty.logout();
      identifiedUserId = null;
    }

    return adapty.getProfile();
  } catch (error) {
    normalizeAdaptyError(error);
  }
}

export async function detachSubscriptionIdentity() {
  if (!activationPromise) {
    identifiedUserId = null;
    return;
  }

  try {
    await activationPromise;

    if (identifiedUserId) {
      await adapty.logout();
      identifiedUserId = null;
    }
  } catch (error) {
    normalizeAdaptyError(error);
  }
}

export async function getProfile(): Promise<AdaptyProfile> {
  try {
    return await adapty.getProfile();
  } catch (error) {
    normalizeAdaptyError(error);
  }
}

export async function getCurrentPaywallProducts(): Promise<{
  paywall: AdaptyPaywall;
  products: AdaptyPaywallProduct[];
}> {
  try {
    const paywall = await adapty.getPaywall(PAYWALL_PLACEMENT_ID);
    const products = await adapty.getPaywallProducts(paywall);
    return { paywall, products };
  } catch (error) {
    normalizeAdaptyError(error);
  }
}

export function getConfiguredProducts(
  products: AdaptyPaywallProduct[]
): Record<ProductIdentifierKey, AdaptyPaywallProduct | null> {
  return Object.fromEntries(
    (Object.keys(PRODUCT_IDENTIFIERS) as ProductIdentifierKey[]).map((key) => [
      key,
      products.find((product) => product.vendorProductId === PRODUCT_IDENTIFIERS[key]) ?? null,
    ])
  ) as Record<ProductIdentifierKey, AdaptyPaywallProduct | null>;
}

export async function purchaseProProduct(product: AdaptyPaywallProduct): Promise<AdaptyProfile | null> {
  try {
    const result = await adapty.makePurchase(product);
    return result.type === 'success' ? result.profile : null;
  } catch (error) {
    normalizeAdaptyError(error);
  }
}

export async function restorePurchases(): Promise<AdaptyProfile> {
  try {
    return await adapty.restorePurchases();
  } catch (error) {
    normalizeAdaptyError(error);
  }
}

export async function logPaywallShown(paywall: AdaptyPaywall): Promise<void> {
  try {
    await adapty.logShowPaywall(paywall);
  } catch (error) {
    normalizeAdaptyError(error);
  }
}
