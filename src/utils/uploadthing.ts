import 'text-encoding-polyfill';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Alert, Linking } from 'react-native';

type NativePermissionResponse = {
  granted: boolean;
  canAskAgain: boolean;
};

type NativeImagePickerModule = {
  getMediaLibraryPermissionsAsync: (writeOnly?: boolean) => Promise<NativePermissionResponse>;
  requestMediaLibraryPermissionsAsync: (writeOnly?: boolean) => Promise<NativePermissionResponse>;
  launchImageLibraryAsync: (options?: {
    mediaTypes?: 'Images' | 'Videos' | 'All';
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }) => Promise<{
    canceled?: boolean;
    cancelled?: boolean;
    assets?: PickedImageAsset[] | null;
  }>;
};

type PickedImageAsset = {
  uri: string;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  type?: string;
};

type ReactNativeUploadFile = {
  uri: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

const uploadthingUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL
  ? `${process.env.EXPO_PUBLIC_CONVEX_SITE_URL}/api/uploadthing`
    : process.env.EXPO_PUBLIC_SERVER_URL
    ? `${process.env.EXPO_PUBLIC_SERVER_URL}/api/uploadthing`
    : undefined;

function loadImagePicker(): NativeImagePickerModule | null {
  try {
    const ImagePicker = requireOptionalNativeModule<NativeImagePickerModule>('ExponentImagePicker');
    if (!ImagePicker?.launchImageLibraryAsync) {
      throw new Error('ExponentImagePicker native module is not available');
    }

    return ImagePicker;
  } catch (error) {
    console.error('Image picker module is unavailable:', error);
    Alert.alert(
      'Rebuild Required',
      'The photo picker is not available in this app build. Rebuild the app on your device, then try again.',
    );
    return null;
  }
}

function createTraceHeaders() {
  const makeHex = (length: number) => {
    const chars = 'abcdef0123456789';
    let value = '';
    for (let index = 0; index < length; index += 1) {
      value += chars[Math.floor(Math.random() * chars.length)];
    }
    return value;
  };

  const traceId = makeHex(32);
  const spanId = makeHex(16);

  return {
    b3: `${traceId}-${spanId}-01`,
    traceparent: `00-${traceId}-${spanId}-01`,
  };
}

async function toUploadFile(asset: PickedImageAsset): Promise<ReactNativeUploadFile> {
  const name = asset.fileName || asset.uri.split('/').pop() || 'avatar.jpg';
  const type = asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : 'application/octet-stream');
  let size = asset.fileSize;

  if (!size) {
    try {
      const blob = await fetch(asset.uri).then((response) => response.blob());
      size = blob.size;
    } catch {
      size = 1;
    }
  }

  return {
    uri: asset.uri,
    name,
    type,
    size,
    lastModified: Date.now(),
  };
}

async function uploadAvatarFile(file: ReactNativeUploadFile): Promise<string | null> {
  if (!uploadthingUrl) return null;

  const traceHeaders = createTraceHeaders();
  const presignUrl = new URL(uploadthingUrl);
  presignUrl.searchParams.set('actionType', 'upload');
  presignUrl.searchParams.set('slug', 'avatarImage');

  const presignRes = await fetch(presignUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-uploadthing-package': 'push-counter',
      'x-uploadthing-version': '7.7.4',
      b3: traceHeaders.b3,
      traceparent: traceHeaders.traceparent,
    },
    body: JSON.stringify({
      input: null,
      files: [
        {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
      ],
    }),
  });

  if (!presignRes.ok) {
    throw new Error(`Upload setup failed: ${await presignRes.text()}`);
  }

  const presigned = await presignRes.json();
  const uploadTarget = presigned?.[0];
  if (!uploadTarget?.url || !uploadTarget?.key) {
    throw new Error('Upload setup did not return a file URL.');
  }

  const body = new FormData();
  body.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const uploadRes = await fetch(uploadTarget.url, {
    method: 'PUT',
    headers: {
      Range: 'bytes=0-',
      'x-uploadthing-version': '7.7.4',
      b3: traceHeaders.b3,
      traceparent: traceHeaders.traceparent,
    },
    body,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${await uploadRes.text()}`);
  }

  const uploadJson = await uploadRes.json().catch(() => null);
  return uploadJson?.ufsUrl ?? uploadJson?.url ?? `https://utfs.io/f/${uploadTarget.key}`;
}

/**
 * Pick an image from the device photo library and upload it to UploadThing.
 * Uses Expo's optional native module lookup so stale builds can show an alert
 * instead of crashing when the image picker native code is not installed.
 *
 * Returns the public URL of the uploaded image, or null if cancelled / failed.
 */
export async function pickAndUploadAvatar(): Promise<string | null> {
  if (!uploadthingUrl) {
    Alert.alert('Upload Unavailable', 'Missing EXPO_PUBLIC_CONVEX_SITE_URL in the app environment.');
    return null;
  }

  const ImagePicker = loadImagePicker();
  if (!ImagePicker) return null;

  let granted = false;

  try {
    const currentPermissions = await ImagePicker.getMediaLibraryPermissionsAsync(false);
    granted = currentPermissions.granted;

    if (!granted && currentPermissions.canAskAgain) {
      const requestedPermissions = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
      granted = requestedPermissions.granted;
    }
  } catch (error) {
    console.error('Photo permission check failed:', error);
    Alert.alert('Photo Picker Unavailable', 'The photo picker could not open on this build.');
    return null;
  }

  if (!granted) {
    Alert.alert(
      'Permission Needed',
      'Grant photo library access to upload an avatar.',
      [
        { text: 'Dismiss' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ],
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'Images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  }).catch((error) => {
    console.error('Photo picker launch failed:', error);
    Alert.alert('Photo Picker Failed', error?.message || 'The photo picker could not open.');
    return null;
  });

  if (!result || result.canceled || result.cancelled || !result.assets?.[0]) return null;

  try {
    const file = await toUploadFile(result.assets[0]);
    return await uploadAvatarFile(file);
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    Alert.alert('Upload Failed', error.message || 'Something went wrong.');
    return null;
  }
}
