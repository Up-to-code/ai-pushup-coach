import { useWindowDimensions, PixelRatio } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  
  // Standard screen size bases
  const isSmallDevice = width < 375;
  const isLargeDevice = width >= 768;
  const isTablet = width >= 600;

  // Scale value based on width (base width 375)
  const scale = width / 375;
  
  const normalize = (size: number) => {
    const newSize = size * scale;
    if (isSmallDevice) {
      return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  // Horizontal padding based on screen width
  const horizontalPadding = width > 450 ? 24 : 16;
  
  // Grid item width based on columns
  const getGridItemWidth = (columns: number, gap: number = 16) => {
    const totalGap = gap * (columns - 1);
    const availableWidth = width - (horizontalPadding * 2) - totalGap;
    return availableWidth / columns;
  };

  return {
    width,
    height,
    isSmallDevice,
    isLargeDevice,
    isTablet,
    normalize,
    horizontalPadding,
    getGridItemWidth,
  };
};
