import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PACKAGE_TYPE,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  LEGACY_PRO_ENTITLEMENT_ID,
  PRODUCT_IDENTIFIERS,
  PRO_ENTITLEMENT_ID,
  ProductIdentifierKey,
  REVENUECAT_API_KEY,
} from './config';

type PurchasesErrorLike = {
  code?: string;
  message?: string;
  userCancelled?: boolean;
};

const PRO_ENTITLEMENT_IDS = [PRO_ENTITLEMENT_ID, LEGACY_PRO_ENTITLEMENT_ID];

const PACKAGE_TYPE_BY_PRODUCT_KEY: Record<ProductIdentifierKey, PACKAGE_TYPE> = {
  lifetime: PACKAGE_TYPE.LIFETIME,
  yearly: PACKAGE_TYPE.ANNUAL,
  monthly: PACKAGE_TYPE.MONTHLY,
};

export function isPushupCoachPro(customerInfo: CustomerInfo | null): boolean {
  return PRO_ENTITLEMENT_IDS.some(
    (entitlementId) => customerInfo?.entitlements.active[entitlementId]?.isActive === true,
  );
}

export function getActiveProductIdentifier(customerInfo: CustomerInfo | null): string | null {
  for (const entitlementId of PRO_ENTITLEMENT_IDS) {
    const productIdentifier = customerInfo?.entitlements.active[entitlementId]?.productIdentifier;
    if (productIdentifier) return productIdentifier;
  }

  return null;
}

export function isUserCancelledPurchase(error: unknown): boolean {
  const purchaseError = error as PurchasesErrorLike;
  return purchaseError?.userCancelled === true || purchaseError?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function getRevenueCatErrorMessage(error: unknown, fallback: string): string {
  const purchaseError = error as PurchasesErrorLike;
  return purchaseError?.message ?? (error instanceof Error ? error.message : fallback);
}

export async function configureRevenueCat(appUserID?: string): Promise<CustomerInfo> {
  const isConfigured = await Purchases.isConfigured();

  if (!isConfigured) {
    if (!REVENUECAT_API_KEY) {
      throw new Error('RevenueCat API key is missing.');
    }

    await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID,
    });
  } else if (appUserID) {
    const currentAppUserID = await Purchases.getAppUserID();
    if (currentAppUserID !== appUserID) {
      const { customerInfo } = await Purchases.logIn(appUserID);
      return customerInfo;
    }
  }

  return Purchases.getCustomerInfo();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export function getConfiguredPackages(offering: PurchasesOffering | null): Record<ProductIdentifierKey, PurchasesPackage | null> {
  const emptyPackages = {
    lifetime: null,
    yearly: null,
    monthly: null,
  };

  if (!offering) return emptyPackages;

  return Object.fromEntries(
    (Object.keys(PRODUCT_IDENTIFIERS) as ProductIdentifierKey[]).map((key) => [
      key,
      findPackageForProduct(key, offering.availablePackages),
    ]),
  ) as Record<ProductIdentifierKey, PurchasesPackage | null>;
}

function findPackageForProduct(key: ProductIdentifierKey, packages: PurchasesPackage[]) {
  const productIdentifier = PRODUCT_IDENTIFIERS[key];
  const packageType = PACKAGE_TYPE_BY_PRODUCT_KEY[key];

  return (
    packages.find((pkg) => pkg.product.identifier === productIdentifier) ??
    packages.find((pkg) => pkg.identifier === productIdentifier) ??
    packages.find((pkg) => pkg.packageType === packageType) ??
    null
  );
}

export async function purchaseProPackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function presentProPaywallIfNeeded(): Promise<boolean> {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
    displayCloseButton: true,
  });

  return (
    result === PAYWALL_RESULT.NOT_PRESENTED ||
    result === PAYWALL_RESULT.PURCHASED ||
    result === PAYWALL_RESULT.RESTORED
  );
}

export async function presentProPaywall(): Promise<boolean> {
  const result = await RevenueCatUI.presentPaywall({
    displayCloseButton: true,
  });

  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentCustomerCenter(onRestoreCompleted?: (customerInfo: CustomerInfo) => void): Promise<void> {
  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      onRestoreCompleted: ({ customerInfo }) => {
        onRestoreCompleted?.(customerInfo);
      },
      onRestoreFailed: ({ error }) => {
        console.warn('RevenueCat restore from Customer Center failed.', error);
      },
    },
  });
}
