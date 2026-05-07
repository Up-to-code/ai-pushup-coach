import { describe, expect, it } from 'vitest';
import { authCallbackPath, authCallbackUrl } from './links';

describe('auth callback links', () => {
  it('uses the native app deep link for Expo OAuth completion', () => {
    expect(authCallbackPath).toBe('/auth/callback');
    expect(authCallbackUrl).toBe('pushcounter:///auth/callback');
  });
});
