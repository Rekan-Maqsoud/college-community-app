import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const PHONE_BREAKPOINT = 600;
const TABLET_BREAKPOINT = 768;

const MAX_CONTENT_WIDTH = 1100;
const MAX_FORM_WIDTH = 760;
const MAX_CHAT_WIDTH = 1200;
const MAX_WIDE_WIDTH = 1320;

const getConstrainedStyle = (width, shouldConstrain, widthRatio, maxWidth) => {
  if (!shouldConstrain) {
    return {};
  }

  return {
    width: '100%',
    maxWidth: Math.min(Math.round(width * widthRatio), maxWidth),
    alignSelf: 'center',
  };
};

const useLayout = () => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const isWide = width >= PHONE_BREAKPOINT;
    const isTablet = width >= TABLET_BREAKPOINT;
    const needsConstraint = isLandscape || isWide;

    const baseContentStyle = getConstrainedStyle(width, needsConstraint, isTablet ? 0.94 : 0.96, MAX_CONTENT_WIDTH);
    const formStyle = getConstrainedStyle(width, needsConstraint, isTablet ? 0.88 : 0.92, MAX_FORM_WIDTH);
    const chatStyle = getConstrainedStyle(width, needsConstraint, isTablet ? 0.96 : 0.98, MAX_CHAT_WIDTH);
    const wideStyle = getConstrainedStyle(width, needsConstraint, 0.98, MAX_WIDE_WIDTH);
    const headerStyle = getConstrainedStyle(width, needsConstraint, isTablet ? 0.94 : 0.96, MAX_CONTENT_WIDTH);

    const compactFactor = isLandscape && !isWide ? 0.88 : isTablet ? 0.96 : isWide ? 0.94 : 1;

    return {
      width,
      height,
      isLandscape,
      isWide,
      isTablet,
      needsConstraint,
      contentStyle: baseContentStyle,
      formStyle,
      chatStyle,
      wideStyle,
      headerStyle,
      compactFactor,
      MAX_CONTENT_WIDTH,
      MAX_FORM_WIDTH,
      MAX_CHAT_WIDTH,
    };
  }, [width, height]);
};

export default useLayout;
