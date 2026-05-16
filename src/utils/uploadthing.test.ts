import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireOptionalNativeModule } from 'expo-modules-core';

vi.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: vi.fn(),
}));

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn(),
  },
  Linking: {
    openSettings: vi.fn(),
  },
}));

const requireOptionalNativeModuleMock = vi.mocked(requireOptionalNativeModule);
const originalConvexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

describe('pickAndUploadAvatar', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL = 'https://example.test';
  });

  afterEach(() => {
    if (originalConvexSiteUrl === undefined) {
      delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    } else {
      process.env.EXPO_PUBLIC_CONVEX_SITE_URL = originalConvexSiteUrl;
    }
    vi.restoreAllMocks();
  });

  it('launches the native image picker with Expo 55 lowercase image media type', async () => {
    const launchImageLibraryAsync = vi.fn(async () => ({
      canceled: false,
      assets: [
        {
          uri: 'file:///avatar.jpg',
          fileName: 'avatar.jpg',
          fileSize: 123,
          mimeType: 'image/jpeg',
          type: 'image',
        },
      ],
    }));

    requireOptionalNativeModuleMock.mockReturnValue({
      getMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true, canAskAgain: false })),
      requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true, canAskAgain: false })),
      launchImageLibraryAsync,
    });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ url: 'https://upload.example.test/avatar', key: 'avatar-key' }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ufsUrl: 'https://cdn.example.test/avatar.jpg' }),
        })
    );

    const { pickAndUploadAvatar } = await import('./uploadthing');
    const uploadedUrl = await pickAndUploadAvatar();

    expect(uploadedUrl).toBe('https://cdn.example.test/avatar.jpg');
    expect(launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
  });
});
