import { describe, expect, it, vi } from 'vitest';
import { getSubscriptionMetadata } from './adapty';

vi.mock('react-native-adapty', () => ({
  adapty: {},
}));

describe('getSubscriptionMetadata', () => {
  it('maps an active Adapty profile to pro metadata', () => {
    expect(
      getSubscriptionMetadata(
        {
          accessLevels: {
            premium: {
              isActive: true,
              vendorProductId: 'com.ahmedmansour.pushcounter.pro.yearly',
            },
          },
        } as any,
        123
      )
    ).toEqual({
      proStatus: 'pro',
      subscriptionStatus: 'pro',
      subscriptionProvider: 'adapty',
      activeProductIdentifier: 'com.ahmedmansour.pushcounter.pro.yearly',
      activeAccessLevelId: 'premium',
      subscriptionUpdatedAt: 123,
    });
  });

  it('maps an inactive known access level to expired/free access', () => {
    expect(
      getSubscriptionMetadata(
        {
          accessLevels: {
            premium: {
              isActive: false,
              vendorProductId: 'com.ahmedmansour.pushcounter.monthly',
            },
          },
        } as any,
        456
      )
    ).toMatchObject({
      proStatus: 'free',
      subscriptionStatus: 'expired',
      subscriptionProvider: 'adapty',
      activeProductIdentifier: 'com.ahmedmansour.pushcounter.monthly',
      activeAccessLevelId: 'premium',
      subscriptionUpdatedAt: 456,
    });
  });

  it('maps a missing profile to free Adapty metadata', () => {
    expect(getSubscriptionMetadata(null, 789)).toEqual({
      proStatus: 'free',
      subscriptionStatus: 'free',
      subscriptionProvider: 'adapty',
      activeProductIdentifier: undefined,
      activeAccessLevelId: 'premium',
      subscriptionUpdatedAt: 789,
    });
  });
});
