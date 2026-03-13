import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppSettingsSafe } from '../context/AppSettingsContext';

export const GlassContainer = ({ 
  children, 
  style, 
  intensity,
  borderRadius = 16,
  borderWidth = 0,
}) => {
  const context = useAppSettingsSafe();
  const theme = context?.theme || {};
  const isDarkMode = context?.isDarkMode || false;
  
  const isAndroid = Platform.OS === 'android';
  
  // More transparent backgrounds to blend with gradient
  // Light mode: more transparent to reduce layered appearance
  const glassBackground = theme.glass?.background || (
    isDarkMode 
      ? (isAndroid ? 'rgba(28, 28, 30, 0.85)' : 'rgba(28, 28, 30, 0.6)') 
      : (isAndroid ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.4)')
  );
  const glassIntensity = intensity || (isAndroid ? 80 : 25);
  const glassTint = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');
  
  // Light mode - no visible border to avoid layered look
  const lightModeBorder = {};
  
  return (
    <View style={[styles.container, { borderRadius }, style]}>
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={glassIntensity}
          tint={glassTint}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { 
              borderRadius,
              overflow: 'hidden',
            }
          ]}
        />
      )}
      {isAndroid && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              overflow: 'hidden',
            }
          ]}
        />
      )}
      <View 
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { 
            backgroundColor: glassBackground,
            borderRadius,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.4 : 0.06,
            shadowRadius: isDarkMode ? 8 : 4,
            elevation: isAndroid ? (isDarkMode ? 4 : 1) : 0,
            ...lightModeBorder,
          }
        ]} 
      />
      {isDarkMode && borderWidth > 0 && (
        <>
          <View 
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { 
                borderRadius,
                borderWidth: borderWidth * 0.5,
                borderColor: 'rgba(0, 0, 0, 0.2)',
              }
            ]} 
          />
          <View 
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { 
                borderRadius,
                borderTopWidth: borderWidth * 0.5,
                borderLeftWidth: borderWidth * 0.5,
                borderTopColor: 'rgba(255, 255, 255, 0.3)',
                borderLeftColor: 'rgba(255, 255, 255, 0.3)',
                borderBottomColor: 'transparent',
                borderRightColor: 'transparent',
              }
            ]} 
          />
        </>
      )}
      <View style={styles.content}>
        {children}
      </View>
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
      intensity={intensity}
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
  
  const isAndroid = Platform.OS === 'android';
  
  const glassTint = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');
  const primaryColor = theme.primary || '#007AFF';
  
  const backgroundColor = isDarkMode 
    ? (isAndroid ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.1)')
    : (isAndroid ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.03)');
  
  const borderColor = focused 
    ? primaryColor 
    : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)');
  
  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'ios' && isDarkMode && (
        <BlurView
          intensity={15}
          tint={glassTint}
          style={[
            StyleSheet.absoluteFill,
            styles.inputBlur,
          ]}
          pointerEvents="none"
        />
      )}
      <View 
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { 
            borderRadius: 16,
            backgroundColor: backgroundColor,
            borderWidth: focused ? 2 : 1,
            borderColor: borderColor,
          }
        ]} 
      />
      <View style={styles.content}>
        {children}
      </View>
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
  
  const isAndroid = Platform.OS === 'android';
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.primary || '#007bff';
      case 'secondary':
        return isDarkMode 
          ? (isAndroid ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)') 
          : (isAndroid ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.05)');
      case 'danger':
        return theme.danger || '#FF3B30';
      default:
        return theme.primary || '#007AFF';
    }
  };
  
  const glassTint = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');
  
  return (
    <View style={[styles.container, style]}>
      {variant === 'secondary' && Platform.OS === 'ios' && (
        <BlurView
          intensity={20}
          tint={glassTint}
          style={[StyleSheet.absoluteFill, styles.buttonBlur]}
        />
      )}
      <View 
        style={[
          StyleSheet.absoluteFill,
          { 
            backgroundColor: getBackgroundColor(),
            borderRadius: 16,
            shadowColor: variant === 'primary' ? theme.primary : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: variant === 'primary' ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: variant === 'primary' ? 4 : 2,
          }
        ]} 
      />
      <View style={styles.content}>
        {children}
      </View>
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
