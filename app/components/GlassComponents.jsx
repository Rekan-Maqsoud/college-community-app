import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettingsSafe } from '../context/AppSettingsContext';

export const GlassContainer = ({ 
  children, 
  style, 
  intensity,
  borderRadius = 16,
  borderWidth = 1,
  gradientOpacity = 0.15,
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
  
  // Use higher blur for a more 'liquid' look
  const glassIntensity = intensity || (isAndroid ? 50 : 45); 
  const glassTint = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');

  // Gradient stops for lighting reflection (liquid look)
  const gradientColors = isDarkMode
    ? [`rgba(255,255,255,${gradientOpacity})`, `rgba(255,255,255,0)`]
    : [`rgba(255,255,255,${gradientOpacity * 2})`, `rgba(255,255,255,0.1)`];

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      {/* Both iOS and modern Android can use BlurView */}
      <BlurView
        intensity={glassIntensity}
        tint={glassTint}
        experimentalBlurMethod="dimezisBlurView"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            overflow: 'hidden',
          }
        ]}
      />
      
      {/* Background color overlay */}
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

      {/* Shine/Reflection using Linear Gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius }
        ]}
        pointerEvents="none"
      />

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

  const glassTint = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');       
  const primaryColor = theme.primary || '#007AFF';

  const backgroundColor = isDarkMode
    ? 'rgba(25, 25, 30, 0.5)'
    : 'rgba(255, 255, 255, 0.6)';

  const borderColor = focused
    ? primaryColor
    : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)');       

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={30}
        tint={glassTint}
        experimentalBlurMethod="dimezisBlurView"
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

  const glassTint = theme.glass?.tint || (isDarkMode ? 'dark' : 'light');       

  return (
    <View style={[styles.container, style]}>
      {variant === 'secondary' && (
        <BlurView
          intensity={40}
          tint={glassTint}
          experimentalBlurMethod="dimezisBlurView"
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
