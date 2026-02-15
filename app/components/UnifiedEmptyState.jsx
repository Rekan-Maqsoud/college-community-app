import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { wp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const UnifiedEmptyState = ({
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  actionIconName,
  compact = false,
  style,
}) => {
  const { theme, isDarkMode } = useAppSettings();

  const cardBackground = isDarkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.8)';

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View
        style={[
          styles.card,
          compact && styles.cardCompact,
          {
            backgroundColor: cardBackground,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          <Ionicons name={iconName} size={moderateScale(compact ? 36 : 48)} color={theme.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>

        {actionLabel && onAction ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={onAction}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            {actionIconName ? (
              <Ionicons name={actionIconName} size={moderateScale(16)} color="#FFFFFF" />
            ) : null}
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: spacing.xl,
  },
  containerCompact: {
    paddingVertical: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  cardCompact: {
    paddingVertical: spacing.lg,
  },
  iconContainer: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: moderateScale(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize(18),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize(13),
    textAlign: 'center',
    lineHeight: fontSize(18),
  },
  actionButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: fontSize(13),
    fontWeight: '600',
  },
});

export default UnifiedEmptyState;
