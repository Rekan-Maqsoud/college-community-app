import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  } else {
    return (
      (adjustedWidth >= 1920 || adjustedHeight >= 1920) || 
      (SCREEN_WIDTH >= 768)
    );
  }
};

export const isSmallDevice = () => SCREEN_WIDTH < 375;
export const isMediumDevice = () => SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
export const isLargeDevice = () => SCREEN_WIDTH >= 768;

export const horizontalScale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

// Normalize font size based on screen width
export const normalize = (size) => {
  const scale = SCREEN_WIDTH / guidelineBaseWidth;
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

export const wp = (percentage) => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(value);
};

export const hp = (percentage) => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(value);
};

// Global font scale factor, updated by AppSettingsContext
let _globalFontScale = 1;

export const setGlobalFontScale = (scale) => {
  _globalFontScale = scale;
};

export const getGlobalFontScale = () => _globalFontScale;

export const fontSize = (size) => {
  const scaledSize = size * _globalFontScale;
  if (isTablet()) {
    return moderateScale(scaledSize * 1.2);
  }
  return moderateScale(scaledSize);
};

export const fontSizeWithScale = (size, scale = 1) => {
  const scaledSize = size * scale;
  if (isTablet()) {
    return moderateScale(scaledSize * 1.2);
  }
  return moderateScale(scaledSize);
};

export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

export const getResponsiveSize = (small, medium, large) => {
  if (isTablet()) return large || medium;
  if (isSmallDevice()) return small;
  return medium;
};

export const deviceWidth = SCREEN_WIDTH;
export const deviceHeight = SCREEN_HEIGHT;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
