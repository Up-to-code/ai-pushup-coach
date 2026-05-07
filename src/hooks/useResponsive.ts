import { useWindowDimensions, PixelRatio } from 'react-native';

// Design base dimensions (based on iPhone X/11 Pro/13 Mini)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  /**
   * Scales a dimension based on the screen width.
   * Best for: widths, margins, paddings, icon sizes.
   */
  const scale = (size: number) => (width / GUIDELINE_BASE_WIDTH) * size;

  /**
   * Scales a dimension based on the screen height.
   * Best for: heights.
   */
  const verticalScale = (size: number) => (height / GUIDELINE_BASE_HEIGHT) * size;

  /**
   * Scales a dimension with a resize factor to prevent it from growing too large on big screens.
   * Best for: font sizes, border radii.
   * @param size The base size.
   * @param factor Resize factor (default 0.5). Higher means more scaling.
   */
  const moderateScale = (size: number, factor = 0.5) =>
    size + (scale(size) - size) * factor;

  /**
   * Normalizes a size for pixel-perfect rendering across densities.
   */
  const normalize = (size: number) => {
    const newSize = scale(size);
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  const isSmallDevice = width < 375;
  const isLargeDevice = width >= 768;
  const isTablet = width >= 600;
  const horizontalPadding = width > 450 ? 24 : 16;

  const getGridItemWidth = (columns: number, gap = 16) => {
    const totalGap = gap * Math.max(0, columns - 1);
    const availableWidth = width - horizontalPadding * 2 - totalGap;
    return availableWidth / Math.max(1, columns);
  };

  return {
    width,
    height,
    scale,
    verticalScale,
    moderateScale,
    normalize,
    isSmallDevice,
    isLargeDevice,
    isTablet,
    horizontalPadding,
    getGridItemWidth,
    // Convenient shortcuts
    s: scale,
    vs: verticalScale,
    ms: moderateScale,
  };
};
