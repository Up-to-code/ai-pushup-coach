export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
export const IS_REVENUECAT_CONFIGURED = REVENUECAT_API_KEY.length > 0;

export const PRO_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ?? 'pro';

export const LEGACY_PRO_ENTITLEMENT_ID = 'pushup-coach Pro';

export const PRODUCT_IDENTIFIERS = {
  yearly: 'com.ahmedmansour.pushcounter.pro.yearly',
  monthly: 'com.ahmedmansour.pushcounter.pro.monthly',
} as const;

export type ProductIdentifierKey = keyof typeof PRODUCT_IDENTIFIERS;

export const DEFAULT_OFFERING_ID = 'default';
