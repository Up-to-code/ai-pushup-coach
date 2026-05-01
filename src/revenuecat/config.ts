export const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? 'test_IikqirdLPxZXRfasXAvObzjofrg';

export const PRO_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ?? 'pushup-coach Pro';

export const LEGACY_PRO_ENTITLEMENT_ID = 'pushup_coach_pro';

export const PRODUCT_IDENTIFIERS = {
  lifetime: 'lifetime',
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

export type ProductIdentifierKey = keyof typeof PRODUCT_IDENTIFIERS;

export const DEFAULT_OFFERING_ID = 'default';
