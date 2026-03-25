import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassContainer } from './GlassComponents';
import { useAppSettings } from '../context/AppSettingsContext';
import { wp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import {
  AlertCircleOutlineIcon,
  ArchiveOutlineSvgIcon,
  ArrowBackOutlineIcon,
  ArrowForwardOutlineIcon,
  BookmarkOutlineIcon,
  ChatbubblesOutlineIcon,
  NotificationsOutlineIcon,
  PeopleOutlineSvgIcon,
  PersonAddOutlineIcon,
  RefreshOutlineIcon,
  SearchOutlineIcon,
} from './icons';

const EMPTY_STATE_ICON_MAP = {
  'alert-circle-outline': AlertCircleOutlineIcon,
  'archive-outline': ArchiveOutlineSvgIcon,
  'bookmark-outline': BookmarkOutlineIcon,
  'chatbubbles-outline': ChatbubblesOutlineIcon,
  'notifications-outline': NotificationsOutlineIcon,
  'people-outline': PeopleOutlineSvgIcon,
  'person-add-outline': PersonAddOutlineIcon,
};

const EMPTY_STATE_ACTION_ICON_MAP = {
  'arrow-back': ArrowBackOutlineIcon,
  'arrow-forward': ArrowForwardOutlineIcon,
  'refresh-outline': RefreshOutlineIcon,
  search: SearchOutlineIcon,
};

const UnifiedEmptyState = ({
  iconName,
  iconComponent,
  title,
  description,
  actionLabel,
  onAction,
  actionIconName,
  actionIconComponent,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionIconName,
  secondaryActionIconComponent,
  compact = false,
  style,
}) => {
  const { theme, isDarkMode } = useAppSettings();
  const iconSize = moderateScale(compact ? 36 : 48);
  const actionIconSize = moderateScale(16);
  const IconRenderer = iconComponent || (iconName ? EMPTY_STATE_ICON_MAP[iconName] : null);
  const ActionIconRenderer = actionIconComponent || (actionIconName ? EMPTY_STATE_ACTION_ICON_MAP[actionIconName] : null);
  const SecondaryActionIconRenderer = secondaryActionIconComponent || (secondaryActionIconName ? EMPTY_STATE_ACTION_ICON_MAP[secondaryActionIconName] : null);

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <GlassContainer
        borderRadius={borderRadius.xl}
        style={[
          styles.card,
          compact && styles.cardCompact,
        ]}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          {IconRenderer ? IconRenderer({ size: iconSize, color: theme.primary, accessible: false }) : null}
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>

        {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
          <View style={styles.actionsRow}>
            {actionLabel && onAction ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={onAction}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
              >
                {ActionIconRenderer ? ActionIconRenderer({ size: actionIconSize, color: '#FFFFFF' }) : null}
                <Text style={styles.actionText}>{actionLabel}</Text>
              </TouchableOpacity>
            ) : null}

            {secondaryActionLabel && onSecondaryAction ? (
              <TouchableOpacity
                style={[styles.secondaryActionButton, { borderColor: theme.primary }]}
                onPress={onSecondaryAction}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={secondaryActionLabel}
              >
                {SecondaryActionIconRenderer ? SecondaryActionIconRenderer({ size: actionIconSize, color: theme.primary }) : null}
                <Text style={[styles.secondaryActionText, { color: theme.primary }]}>{secondaryActionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </GlassContainer>
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
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryActionButton: {
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: fontSize(13),
    fontWeight: '600',
  },
  secondaryActionText: {
    fontSize: fontSize(13),
    fontWeight: '600',
  },
});

export default UnifiedEmptyState;
