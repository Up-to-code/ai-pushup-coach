# Adapty integration

This app uses `react-native-adapty` for subscription state, purchases, restore purchases, and Adapty Paywall Builder presentation.

## Install

```bash
npx expo install react-native-adapty
npx expo prebuild
```

This project is Expo-based, so real purchases require a development build or production build. Expo Go can only use Adapty mock mode; it cannot complete real App Store or Play Store purchases.

## Environment

Set the Adapty Public SDK Key in each build environment. Do not use the Secret Key in the client app.

```bash
EXPO_PUBLIC_ADAPTY_PUBLIC_SDK_KEY=public_live_bdJ5pzeE.2hyFut1RrKMoXFOODM1c
EXPO_PUBLIC_ADAPTY_PRO_ACCESS_LEVEL_ID=premium
EXPO_PUBLIC_ADAPTY_PAYWALL_PLACEMENT_ID=main
```

If the Adapty access level or placement identifiers change later, update the env values instead of changing app code.

## Adapty dashboard setup

1. Create or open the Push Counter app in Adapty.
2. Connect the App Store app and bundle identifier `com.aipushupcoach.app`.
3. Use the existing access level SDK ID `premium`.
4. Add App Store products:
   - `com.ahmedmansour.pushcounter.pro.yearly`
   - `com.ahmedmansour.pushcounter.monthly`
5. Configure a 3-day free trial introductory offer for the yearly subscription product only in App Store Connect.
6. Attach both products to the `premium` access level.
7. Create a paywall and connect it to the `main` placement.
8. Publish the paywall for the target audience used by App Review.

## App integration

- `src/subscriptions/config.ts` contains the SDK key, access level id, placement id, and product identifiers.
- `src/subscriptions/adapty.ts` wraps the SDK APIs: activation, profile checks, products, purchases, restore, and paywall presentation.
- `src/subscriptions/SubscriptionProvider.tsx` owns app subscription state and exposes `useSubscription()`.
- `app/_layout.tsx` mounts `SubscriptionProvider` around the whole app.
- `app/(stack)/settings.tsx` restores purchases and opens the Adapty paywall, with an App Store subscription management fallback.

## Notes

- Use the same app user id across auth sessions; this app identifies Adapty profiles with the Better Auth user id.
- Missing Adapty config does not block app launch. The app keeps core local use available and marks subscriptions unavailable.
- Adapty does not provide an in-app customer center in this integration; subscription management opens Apple subscriptions.
