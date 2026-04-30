import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { PRO_ENTITLEMENT_ID, REVENUECAT_API_KEY } from './config';

export function isPushupCoachPro(customerInfo: CustomerInfo | null): boolean {
  return customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive === true;
}

export function getActiveProductIdentifier(customerInfo: CustomerInfo | null): string | null {
  return customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]?.productIdentifier ?? null;
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
    await Purchases.logIn(appUserID);
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

export async function presentCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}
