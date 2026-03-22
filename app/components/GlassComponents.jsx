import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useAppSettingsSafe } from '../context/AppSettingsContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a valid colorScheme ('light' | 'dark' | 'system') for LiquidGlassView.
 */
const getColorScheme = (isDarkMode) => (isDarkMode ? 'dark' : 'light');

/**
 * Fallback glass container used when LiquidGlassView is not supported.
 * Provides a styled BlurView-based frosted-glass look for older iOS / Expo Go.
 */
const FallbackGlassView = ({ children, style, borderRadius = 16, isDarkMode }) => {
  const overlayColor = isDarkMode
    ? 'rgba(25, 25, 35, 0.50)'
    : 'rgba(255, 255, 255, 0.45)';

  const borderStyle = isDarkMode
    ? {}
    : { borderWidth: 0.5, borderColor: 'rgba(0, 0, 0, 0.10)' };

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, borderStyle, style]}>
      <BlurView
        intensity={isDarkMode ? 50 : 45}
        tint={isDarkMode ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
            borderRadius,
          },
        ]}
      />
      {children}
    </View>
  );
};


// ---------------------------------------------------------------------------
// GlassContainer — base building block
// ---------------------------------------------------------------------------

export const GlassContainer = ({
  children,
  style,
  borderRadius = 16,
}) => {
  const context = useAppSettingsSafe();
  const isDarkMode = context?.isDarkMode || false;

  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={style} borderRadius={borderRadius} isDarkMode={isDarkMode}>
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      style={[{ borderRadius }, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// GlassCard — card with padding (used by PostCard etc.)
// ---------------------------------------------------------------------------

export const GlassCard = ({
  children,
  style,
  padding = 16,
}) => {
  const context = useAppSettingsSafe();
  const isDarkMode = context?.isDarkMode || false;
  const borderRadius = 16;

  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={[{ padding }, style]} borderRadius={borderRadius} isDarkMode={isDarkMode}>
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      style={[{ borderRadius, padding }, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// GlassInput — glass-styled text input wrapper
// ---------------------------------------------------------------------------

export const GlassInput = ({
  children,
  style,
  focused = false,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;
  const primaryColor = theme.primary || '#007AFF';
  const borderColor = focused
    ? primaryColor
    : isDarkMode
    ? 'rgba(255, 255, 255, 0.15)'
    : 'rgba(0, 0, 0, 0.08)';
  const borderRadius = 16;

  const inputStyle = {
    borderRadius,
    borderWidth: focused ? 2 : 1,
    borderColor,
  };

  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={[inputStyle, style]} borderRadius={borderRadius} isDarkMode={isDarkMode}>
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      style={[inputStyle, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// GlassButton — solid primary/danger or glass secondary button
// ---------------------------------------------------------------------------

export const GlassButton = ({
  children,
  style,
  onPress: _onPress,
  variant = 'primary',
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;
  const borderRadius = 16;

  // Primary / Danger: solid coloured button (intentional, not glass)
  if (variant !== 'secondary') {
    const bgColor =
      variant === 'primary'
        ? theme.primary || '#007bff'
        : theme.danger || '#FF3B30';

    return (
      <View style={[styles.buttonBase, { borderRadius }, style]}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: bgColor,
              borderRadius,
              shadowColor: variant === 'primary' ? bgColor : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: variant === 'primary' ? 0.4 : 0.1,
              shadowRadius: 8,
              elevation: variant === 'primary' ? 6 : 2,
            },
          ]}
        />
        {children}
      </View>
    );
  }

  // Secondary: glass style
  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={[{ borderRadius }, style]} borderRadius={borderRadius} isDarkMode={isDarkMode}>
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      style={[{ borderRadius }, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// GlassIconButton — circular/square glass icon button
// ---------------------------------------------------------------------------

export const GlassIconButton = ({
  children,
  style,
  size = 40,
  borderRadiusValue,
  active = false,
  activeColor,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;
  const radius = borderRadiusValue ?? size / 2;
  const accentColor = activeColor || theme.primary || '#007AFF';

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    justifyContent: 'center',
    alignItems: 'center',
  };

  // Active tint overlay applied on top of the glass
  const activeTintColor = active
    ? isDarkMode
      ? `${accentColor}33`
      : `${accentColor}1A`
    : 'transparent';

  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={[baseStyle, style]} borderRadius={radius} isDarkMode={isDarkMode}>
        {active && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: activeTintColor }]}
          />
        )}
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      tintColor={active ? activeTintColor : undefined}
      style={[baseStyle, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// GlassPill — pill-shaped glass chip (e.g. filter tabs)
// ---------------------------------------------------------------------------

export const GlassPill = ({
  children,
  style,
  active = false,
  activeColor,
  borderRadiusValue = 20,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;
  const accentColor = activeColor || theme.primary || '#007AFF';

  const baseStyle = {
    borderRadius: borderRadiusValue,
    justifyContent: 'center',
    alignItems: 'center',
  };

  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={[baseStyle, style]} borderRadius={borderRadiusValue} isDarkMode={isDarkMode}>
        {active && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: borderRadiusValue, backgroundColor: accentColor }]}
          />
        )}
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      tintColor={active ? accentColor : undefined}
      style={[baseStyle, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// GlassModalCard — glass container for modals / bottom sheets
// ---------------------------------------------------------------------------

export const GlassModalCard = ({
  children,
  style,
  borderRadiusValue = 24,
}) => {
  const context = useAppSettingsSafe();
  const isDarkMode = context?.isDarkMode || false;

  if (!isLiquidGlassSupported) {
    return (
      <FallbackGlassView style={style} borderRadius={borderRadiusValue} isDarkMode={isDarkMode}>
        {children}
      </FallbackGlassView>
    );
  }

  return (
    <LiquidGlassView
      colorScheme={getColorScheme(isDarkMode)}
      effect="regular"
      style={[{ borderRadius: borderRadiusValue }, style]}
    >
      {children}
    </LiquidGlassView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  buttonBase: {
    position: 'relative',
    overflow: 'visible',
  },
});
