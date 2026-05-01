import React from 'react';
import {
  Platform,
  UIManager,
  View,
  ViewProps,
  requireNativeComponent,
} from 'react-native';

export interface FaceMetricsEvent {
  nativeEvent: {
    status: 'ready' | 'tracking' | 'searching' | 'denied' | 'unavailable';
    cameraReady: boolean;
    faceDetected: boolean;
    faceHeight: number;
    centerX: number;
    centerY: number;
    quality?: number;
    brightnessState?: 'ok' | 'dark' | 'unknown';
    timestamp: number;
  };
}

interface NativePushupCameraViewProps extends ViewProps {
  paused?: boolean;
  onFaceMetrics?: (event: FaceMetricsEvent) => void;
}

const COMPONENT_NAME = 'PushupCameraView';

const isAvailable =
  Platform.OS === 'ios' && UIManager.getViewManagerConfig(COMPONENT_NAME);

const NativeView = isAvailable
  ? requireNativeComponent<NativePushupCameraViewProps>(COMPONENT_NAME)
  : null;

export function PushupCameraView(props: NativePushupCameraViewProps) {
  if (!NativeView) {
    return <View {...props} />;
  }

  return <NativeView {...props} />;
}

export const pushupCameraAvailable = Boolean(isAvailable);
