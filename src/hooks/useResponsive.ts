import { useWindowDimensions, PixelRatio, Platform } from 'react-native';
import { useMemo } from 'react';
import { scale, verticalScale, moderateScale, moderateVerticalScale } from 'react-native-size-matters';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  return useMemo(() => {
    const isPortrait = height >= width;
    const isTablet = Math.min(width, height) >= 600;
    const isPhone = !isTablet;
    const isLargeTablet = isTablet && Math.max(width, height) >= 900;
    
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
