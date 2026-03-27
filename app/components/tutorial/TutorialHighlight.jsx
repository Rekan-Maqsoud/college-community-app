import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { publishTutorialMeasure } from './tutorialMeasureStore';

const hexToRgba = (hexColor, alpha) => {
  if (typeof hexColor !== 'string') {
    return `rgba(0, 122, 255, ${alpha})`;
  }

  const normalized = hexColor.trim();
  const match = normalized.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) {
    return `rgba(0, 122, 255, ${alpha})`;
  }

  const raw = match[1].length === 3
    ? match[1].split('').map((char) => `${char}${char}`).join('')
    : match[1];

  const value = parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TutorialHighlight = ({
  active,
  children,
  theme,
  isDarkMode,
  style,
  borderRadius = 14,
  pulseScale = 1.03,
  onMeasure,
  publishMeasure = true,
}) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const containerRef = useRef(null);

  const emitMeasure = useCallback(() => {
    if (!active || !publishMeasure || !containerRef.current?.measureInWindow) {
      return;
    }

    requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x = 0, y = 0, width = 0, height = 0) => {
        const measuredRect = {
          x,
          y,
          width,
          height,
          updatedAt: Date.now(),
        };

        publishTutorialMeasure(measuredRect);

        if (typeof onMeasure === 'function') {
          onMeasure(measuredRect);
        }
      });
    });
  }, [active, onMeasure, publishMeasure]);

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: pulseScale,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    emitMeasure();

    return () => {
      animation.stop();
      pulse.stopAnimation();
      pulse.setValue(1);
    };
  }, [active, emitMeasure, pulse, pulseScale]);

  const highlightColor = theme?.primary || '#007AFF';
  const activeStyle = useMemo(() => {
    if (!active) {
      return null;
    }

    return {
      borderColor: highlightColor,
      borderWidth: 2,
      borderRadius,
      backgroundColor: hexToRgba(highlightColor, isDarkMode ? 0.18 : 0.12),
    };
  }, [active, borderRadius, highlightColor, isDarkMode]);

  return (
    <Animated.View
      ref={containerRef}
      collapsable={false}
      onLayout={emitMeasure}
      style={[
        style,
        active ? styles.activeWrapper : null,
        activeStyle,
        active ? { transform: [{ scale: pulse }] } : null,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  activeWrapper: {
    overflow: 'hidden',
  },
});

export default React.memo(TutorialHighlight);
