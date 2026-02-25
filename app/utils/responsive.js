import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getWidthScale = () => {
  const raw = SCREEN_WIDTH / guidelineBaseWidth;
  if (SCREEN_WIDTH >= 768) {
    return clamp(raw, 1, 1.3);
  }
  return clamp(raw, 0.92, 1.08);
};

const getHeightScale = () => {
  const raw = SCREEN_HEIGHT / guidelineBaseHeight;
  if (SCREEN_WIDTH >= 768) {
    return clamp(raw, 1, 1.2);
  }
  return clamp(raw, 0.92, 1.08);
};

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

export const horizontalScale = (size) => getWidthScale() * size;
export const verticalScale = (size) => getHeightScale() * size;
export const moderateScale = (size, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

// Normalize font size based on screen width, respects global font scale
export const normalize = (size) => {
  const scale = getWidthScale();
  const newSize = size * scale * _globalFontScale;
  const rounded = Math.round(PixelRatio.roundToNearestPixel(newSize));
  const BASE_TEXT_BUMP = 2;
  if (Platform.OS === 'ios') {
    return rounded + BASE_TEXT_BUMP;
  }
  return rounded + BASE_TEXT_BUMP;
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
  return normalize(size);
};

export const fontSizeWithScale = (size, scale = 1) => {
  return normalize(size * scale);
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
