import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

const ModalBackdrop = ({
  onPress,
  children,
  style,
  overlayColor = 'transparent',
  scrimColor = 'rgba(0, 0, 0, 0.4)',
  useBlur = false,
  blurIntensity = 24,
  blurTint = 'dark',
}) => {
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={[styles.container, { backgroundColor: overlayColor }, style]}
    >
      {useBlur ? <BlurView intensity={blurIntensity} tint={blurTint} style={StyleSheet.absoluteFill} /> : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor }]} />
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ModalBackdrop;