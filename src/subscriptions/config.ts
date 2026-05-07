export const ADAPTY_PUBLIC_SDK_KEY = process.env.EXPO_PUBLIC_ADAPTY_PUBLIC_SDK_KEY ?? '';
export const IS_ADAPTY_CONFIGURED = ADAPTY_PUBLIC_SDK_KEY.length > 0;
export const FORCE_PRO_FOR_TESTING =
  typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_FORCE_PRO_FOR_TESTING === 'true';

export const PRO_ACCESS_LEVEL_ID = process.env.EXPO_PUBLIC_ADAPTY_PRO_ACCESS_LEVEL_ID ?? 'premium';
export const PAYWALL_PLACEMENT_ID = process.env.EXPO_PUBLIC_ADAPTY_PAYWALL_PLACEMENT_ID ?? 'main';

export const PRODUCT_IDENTIFIERS = {
  yearly: 'com.ahmedmansour.pushcounter.pro.yearly',
  monthly: 'com.ahmedmansour.pushcounter.monthly',
} as const;

export type ProductIdentifierKey = keyof typeof PRODUCT_IDENTIFIERS;
