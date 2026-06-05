import { useWindowDimensions, PixelRatio, Platform } from 'react-native';
import { useMemo } from 'react';

// Baseline guidelines based on standard mobile viewport (375x812)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  return useMemo(() => {
    const isPortrait = height >= width;
    const isTablet = Math.min(width, height) >= 600;
    const isPhone = !isTablet;
    const isLargeTablet = isTablet && Math.max(width, height) >= 900;
    
    // Scale values base calculations
    // For tablets, we cap the scaling base dimensions to prevent oversized fonts/elements in multi-column views
    const scalingWidth = isTablet ? Math.min(width, 480) : width;
    const scalingHeight = isTablet ? Math.min(height, 850) : height;

    const scale = (size: number) => (scalingWidth / GUIDELINE_BASE_WIDTH) * size;
    const verticalScale = (size: number) => (scalingHeight / GUIDELINE_BASE_HEIGHT) * size;
    const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
    const moderateVerticalScale = (size: number, factor = 0.5) => size + (verticalScale(size) - size) * factor;

    // Font scaling with iOS Dynamic Type / Android font accessibility support
    // Capped at 1.5x to prevent layout breakage on extremely large system font settings
    const maxFontScale = 1.5;
    const effectiveFontScale = Math.min(fontScale, maxFontScale);
    const fs = (size: number, factor = 0.5) => {
      const scaledSize = moderateScale(size, factor);
      return scaledSize * effectiveFontScale;
    };

    return {
      width,
      height,
      isPortrait,
      isPhone,
      isTablet,
      isLargeTablet,
      s: scale,
      vs: verticalScale,
      ms: moderateScale,
      mvs: moderateVerticalScale,
      fs,
    };
  }, [width, height, fontScale]);
}
