import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalize } from '../utils/responsive';

/**
 * Reusable representative badge.
 * size: 'small' (chat bubbles), 'medium' (profile), 'large' (profile header)
 */
const RepBadge = ({ size = 'small', colors, label }) => {
  const config = SIZES[size] || SIZES.small;
  const badgeColor = colors?.warning || '#F59E0B';
  const displayLabel = label || 'Rep';

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor, paddingHorizontal: config.px, paddingVertical: config.py, borderRadius: config.radius }]}>
      <Ionicons name="star" size={config.icon} color="#FFFFFF" />
      <Text style={[styles.text, { fontSize: config.font }]}>{displayLabel}</Text>
    </View>
  );
};

const SIZES = {
  small: { icon: 8, font: normalize(9), px: 4, py: 1, radius: 4 },
  medium: { icon: 10, font: normalize(11), px: 6, py: 2, radius: 6 },
  large: { icon: 12, font: normalize(12), px: 8, py: 3, radius: 8 },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default RepBadge;
