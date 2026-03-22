import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettingsSafe } from '../context/AppSettingsContext';

export const GlassContainer = ({ 
  children, 
  style, 
  intensity,
  borderRadius = 16,
  borderWidth = 1,
  gradientOpacity = 0.15,
  disableBackgroundOverlay = false,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;

  const isAndroid = Platform.OS === 'android';

  // Liquid glass looks best with slightly tinted translucent backgrounds
  const glassBackground = theme.glass?.background || (
    isDarkMode
      ? 'rgba(20, 20, 25, 0.4)' 
      : 'rgba(255, 255, 255, 0.5)' 
  );
  
  const glassScheme = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      {/* LiquidGlassView replaces BlurView */}
      <LiquidGlassView
        colorScheme={glassScheme}
        effect="regular"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            overflow: 'hidden',
          }
        ]}
      />
      
      {!disableBackgroundOverlay && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: glassBackground,
              borderRadius,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: isDarkMode ? 12 : 8,
              elevation: isAndroid ? (isDarkMode ? 5 : 2) : 0,
            }
          ]}
        />
      )}

      {/* Liquid Glass Borders (Highlight Top-Left, Shadow Bottom-Right) */}
      {borderWidth > 0 && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              borderWidth,
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)',
              borderBottomColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              borderRightColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            }
          ]}
        />
      )}
      
      {children}
    </View>
  );
};

export const GlassCard = ({
  children,
  style,
  intensity,
  padding = 16,
}) => {
  return (
    <GlassContainer
      style={[{ padding }, style]}
      borderWidth={1}
      gradientOpacity={0.15}
    >
      {children}
    </GlassContainer>
  );
};

export const GlassInput = ({
  children,
  style,
  focused = false,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;

  const glassScheme = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');       
  const primaryColor = theme.primary || '#007AFF';

  const backgroundColor = isDarkMode
    ? 'rgba(25, 25, 30, 0.5)'
    : 'rgba(255, 255, 255, 0.6)';

  const borderColor = focused
    ? primaryColor
    : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)');       

  return (
    <View style={[styles.container, style]}>
      <LiquidGlassView
        colorScheme={glassScheme}
        effect="regular"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.inputBlur,
        ]}
      />
      
      {/* Inset shadow/depth illusion for input */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)'] : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.01)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 16 }
        ]}
        pointerEvents="none"
      />
      
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 16,
            backgroundColor: backgroundColor,
            borderWidth: focused ? 2 : 1,
            borderColor: borderColor,
            borderBottomColor: focused ? borderColor : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
          }
        ]}
      />
      {children}
    </View>
  );
};

export const GlassButton = ({
  children,
  style,
  onPress: _onPress,
  variant = 'primary',
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.primary || '#007bff';
      case 'secondary':
        return isDarkMode
          ? 'rgba(40, 40, 45, 0.6)'
          : 'rgba(255, 255, 255, 0.6)';
      case 'danger':
        return theme.danger || '#FF3B30';
      default:
        return theme.primary || '#007AFF';
    }
  };

  const glassScheme = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');       

  return (
    <View style={[styles.container, style]}>
      {variant === 'secondary' && (
        <LiquidGlassView
          colorScheme={glassScheme}
          effect="regular"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.buttonBlur]}
        />
      )}
      
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: getBackgroundColor(),
            borderRadius: 16,
            shadowColor: variant === 'primary' ? (theme.primary || '#007AFF') : '#000',        
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: variant === 'primary' ? 0.4 : 0.1,
            shadowRadius: 8,
            elevation: variant === 'primary' ? 6 : 2,
          }
        ]}
      />
      
      {/* Sheen on the button for liquid feel */}
      <LinearGradient
        colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 16 }
        ]}
        pointerEvents="none"
      />
      
      {/* Top highlight border */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'transparent',
            borderTopColor: 'rgba(255, 255, 255, 0.3)',
            borderLeftColor: 'rgba(255, 255, 255, 0.2)',
          }
        ]}
      />
      
      {children}
    </View>
  );
};

/**
 * GlassIconButton — Small circular glass button for header actions.
 * Replaces inline `rgba(255,255,255,0.08)` / `rgba(0,0,0,0.04)` icon containers.
 */
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

  const glassScheme = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');
  const radius = borderRadiusValue ?? size / 2;
  const accentColor = activeColor || theme.primary || '#007AFF';

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, position: 'relative', overflow: 'visible', justifyContent: 'center', alignItems: 'center' }, style]}>
      <LiquidGlassView
        colorScheme={glassScheme}
        effect="regular"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, overflow: 'hidden' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: active
              ? (isDarkMode ? `${accentColor}33` : `${accentColor}1A`)
              : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.45)'),
            borderWidth: 0.5,
            borderColor: active
              ? `${accentColor}60`
              : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)'),
            borderBottomColor: active
              ? `${accentColor}40`
              : (isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)'),
          },
        ]}
      />
      {children}
    </View>
  );
};

/**
 * GlassPill — Pill-shaped glass element for filters, tabs, switchers.
 * Replaces inline rgba filter pills and window-switcher buttons.
 */
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

  const glassScheme = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');
  const accentColor = activeColor || theme.primary || '#007AFF';

  return (
    <View style={[{ borderRadius: borderRadiusValue, position: 'relative', overflow: 'visible', justifyContent: 'center', alignItems: 'center' }, style]}>
      {!active && (
        <LiquidGlassView
          colorScheme={glassScheme}
          effect="regular"
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: borderRadiusValue, overflow: 'hidden' },
          ]}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: borderRadiusValue,
            backgroundColor: active
              ? accentColor
              : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)'),
            borderWidth: 0.5,
            borderColor: active
              ? accentColor
              : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.45)'),
          },
        ]}
      />
      {children}
    </View>
  );
};

/**
 * GlassModalCard — Glass-styled modal content card.
 * Replaces opaque modal cards with a liquid glass frosted panel.
 */
export const GlassModalCard = ({
  children,
  style,
  borderRadiusValue = 24,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;

  const isAndroid = Platform.OS === 'android';
  const glassScheme = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');

  return (
    <View style={[style, { borderRadius: borderRadiusValue, overflow: 'hidden', position: 'relative' }]}>
      <LiquidGlassView
        colorScheme={glassScheme}
        effect="regular"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode
              ? 'rgba(20, 20, 28, 0.55)'
              : 'rgba(255, 255, 255, 0.6)',
          },
        ]}
      />
      {/* Top-left highlight border */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: borderRadiusValue,
            borderWidth: 1,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)',
            borderBottomColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
            borderRightColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  inputBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
