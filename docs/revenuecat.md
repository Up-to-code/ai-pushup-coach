# RevenueCat integration

This app uses `react-native-purchases` for subscription state and purchases, plus `react-native-purchases-ui` for RevenueCat Paywalls and Customer Center.

## Install

```sh
npm install --save react-native-purchases react-native-purchases-ui
```

This project is Expo-based, so real purchases require a development build or production build after installing the native modules. Expo Go can load the app in RevenueCat Preview API Mode, but it cannot complete real App Store or Play Store purchases.

## Environment

Set the RevenueCat public SDK API key in each build environment. Do not use a Test Store key for App Store builds.

```sh
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID=pro
```

If the RevenueCat dashboard entitlement identifier is changed later, update `EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID` instead of changing app code.

## RevenueCat dashboard setup

1. Create or open the Push Counter RevenueCat project.
2. Add the iOS app using bundle identifier `com.ahmedmansour.pushcounter`.
3. Add the Android app using the package identifier you use for the Play Store build.
4. Create one entitlement with identifier `pro`.
5. Add products in each store and import/map them in RevenueCat:
   - `com.ahmedmansour.pushcounter.pro.yearly`
   - `com.ahmedmansour.pushcounter.pro.monthly`
6. Attach both products to the `pro` entitlement.
7. Create an Offering with identifier `default`.
8. Add packages to the `default` offering:
   - Annual package mapped to product `com.ahmedmansour.pushcounter.pro.yearly`
   - Monthly package mapped to product `com.ahmedmansour.pushcounter.pro.monthly`
9. Create and attach a RevenueCat Paywall to the `default` offering.
10. Configure Customer Center in RevenueCat when you want users to self-serve restore, subscription management, refund/help flows, or cancellation feedback.

## App architecture

- `src/revenuecat/config.ts` contains the API key fallback, entitlement identifier, offering id, and product identifiers.
- `src/revenuecat/revenueCat.ts` wraps the SDK APIs: configure, fetch customer info, fetch offerings, purchase packages, restore, paywall, and Customer Center.
- `src/revenuecat/SubscriptionProvider.tsx` owns app subscription state and exposes `useSubscription()`.
- `app/_layout.tsx` mounts `SubscriptionProvider` around the whole app.
- `app/(stack)/settings.tsx` restores purchases and opens RevenueCat Customer Center, with an App Store subscription URL fallback.

## Hook examples

```tsx
import { Alert, Button } from 'react-native';
import { useSubscription } from '../src/revenuecat';

export function ProButton() {
  const {
    isPro,
    customerInfo,
    productPackages,
    buyProduct,
    restore,
    showPaywall,
    showCustomerCenter,
    error,
  } = useSubscription();

  async function buyMonthly() {
    try {
      await buyProduct('monthly');
      Alert.alert('Welcome to Pro');
    } catch (purchaseError) {
      Alert.alert('Purchase unavailable', 'Please try again in a moment.');
    }
  }

  return (
    <>
      <Button title={isPro ? 'Manage Pro' : 'See Pro'} onPress={isPro ? showCustomerCenter : showPaywall} />
      <Button title={`Monthly ${productPackages.monthly?.product.priceString ?? ''}`} onPress={buyMonthly} />
      <Button title="Restore purchases" onPress={restore} />
    </>
  );
}
```

## Best practices

- Gate premium features with the active entitlement, not with product identifiers.
- Use offerings/packages for purchases so App Store, Play Store, and future targeting changes stay remote-configurable.
- Use the same app user id across auth sessions; this app passes the local user id into RevenueCat.
- Always refresh or listen for `CustomerInfo` after purchase, restore, paywall, and Customer Center events.
- Treat purchase cancellation as a neutral result, not an error toast.
- Test purchases in a development build/TestFlight/internal build, not Expo Go.
- Keep RevenueCat product ids, offering ids, and entitlement ids exactly matched between the dashboard and `src/revenuecat/config.ts`.
