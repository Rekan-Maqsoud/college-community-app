import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const MAX_CONTENT_WIDTH = 700;
const MAX_FORM_WIDTH = 560;
const MAX_CHAT_WIDTH = 820;
const MAX_WIDE_WIDTH = 900;

const WIDE_BREAKPOINT = 600;

const useLayout = () => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const isWide = width >= WIDE_BREAKPOINT;
    const needsConstraint = isLandscape || isWide;

    const baseContentStyle = needsConstraint
      ? { maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }
      : {};

    const formStyle = needsConstraint
      ? { maxWidth: MAX_FORM_WIDTH, width: '100%', alignSelf: 'center' }
      : {};

    const chatStyle = needsConstraint
      ? { maxWidth: MAX_CHAT_WIDTH, width: '100%', alignSelf: 'center' }
      : {};

    const wideStyle = needsConstraint
      ? { maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }
      : {};

    const headerStyle = needsConstraint
      ? { maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }
      : {};

    const compactFactor = isLandscape && !isWide ? 0.8 : isWide ? 0.9 : 1;

    return {
      width,
      height,
      isLandscape,
      isWide,
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
