import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { GlassContainer } from './GlassComponents';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlobeIcon, PeopleIcon, SchoolHomeIcon } from './icons/home';
import { wp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { FEED_TYPES } from '../constants/feedCategories';

const FeedSelector = ({ selectedFeed, onFeedChange, height = moderateScale(44) }) => {
  const { t, theme, isDarkMode, reduceMotion, isRTL } = useAppSettings();
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(wp(60));
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;


  const feeds = useMemo(() => ([
    {
      type: FEED_TYPES.DEPARTMENT,
      icon: PeopleIcon,
      label: t('feed.department'),
      index: 0,
    },
    {
      type: FEED_TYPES.MAJOR,
      icon: SchoolHomeIcon,
      label: t('feed.major'),
      index: 1,
    },
    {
      type: FEED_TYPES.PUBLIC,
      icon: GlobeIcon,
      label: t('feed.public'),
      index: 2,
    },
  ]), [t]);

  const visualFeeds = useMemo(() => (isRTL ? [...feeds].reverse() : feeds), [feeds, isRTL]);
  const selectedIndex = Math.max(0, visualFeeds.findIndex(feed => feed.type === selectedFeed));

  useEffect(() => {
    const animation = reduceMotion
      ? Animated.timing(indicatorAnim, {
          toValue: selectedIndex,
          duration: 100,
          useNativeDriver: false,
        })
      : Animated.spring(indicatorAnim, {
          toValue: selectedIndex,
          useNativeDriver: false,
          tension: 68,
          friction: 12,
        });

    animation.start();
  }, [indicatorAnim, reduceMotion, selectedIndex]);

  const handleFeedChange = (feedType) => {
    onFeedChange(feedType);
  };

  const buttonWidth = useMemo(() => {
    if (containerWidth <= 0 || visualFeeds.length === 0) {
      return 0;
    }

    return containerWidth / visualFeeds.length;
  }, [containerWidth, visualFeeds.length]);

  const buttonWidths = useMemo(() => {
    if (containerWidth <= 0 || visualFeeds.length === 0) {
      return visualFeeds.map(() => 0);
    }

    const minShare = isSmallScreen ? 0.26 : 0.24;
    const availableShare = 1 - (minShare * visualFeeds.length);
    const rawWeights = visualFeeds.map((feed) => {
      const labelLength = String(feed.label || '').trim().length || 1;
      const departmentBoost = feed.type === FEED_TYPES.DEPARTMENT ? 1.2 : 1;
      return Math.max(1, labelLength * departmentBoost);
    });
    const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0) || 1;

    return rawWeights.map((weight) => {
      const weightedShare = minShare + (availableShare * (weight / totalWeight));
      return Math.max(0, containerWidth * weightedShare);
    });
  }, [containerWidth, isSmallScreen, visualFeeds]);

  const buttonOffsets = useMemo(() => {
    let runningOffset = 0;
    return buttonWidths.map((widthValue) => {
      const current = runningOffset;
      runningOffset += widthValue;
      return current;
    });
  }, [buttonWidths]);

  const translateX = indicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      buttonOffsets[0] || 0,
      buttonOffsets[1] || 0,
      buttonOffsets[2] || 0,
    ],
  });

  const indicatorWidth = indicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      buttonWidths[0] || buttonWidth || 0,
      buttonWidths[1] || buttonWidth || 0,
      buttonWidths[2] || buttonWidth || 0,
    ],
  });

  const maxLabelLength = useMemo(() => {
    return visualFeeds.reduce((maxLength, feed) => {
      const length = String(feed.label || '').trim().length;
      return Math.max(maxLength, length);
    }, 0);
  }, [visualFeeds]);

  const labelFontSize = useMemo(() => {
    if (isSmallScreen) {
      return maxLabelLength > 10 ? fontSize(8.5) : fontSize(9.5);
    }

    return maxLabelLength > 10 ? fontSize(9.5) : fontSize(10.5);
  }, [isSmallScreen, maxLabelLength]);

  const textColor = (isSelected) => {
    if (isSelected) return '#FFFFFF';
    return isDarkMode ? 'rgba(255, 255, 255, 0.84)' : theme.textSecondary;
  };

  const iconColor = (isSelected) => {
    if (isSelected) return '#FFFFFF';
    return isDarkMode ? 'rgba(255, 255, 255, 0.84)' : theme.textSecondary;
  };

  return (
    <View
      style={[
        styles.container,
        {
          height,
        }
      ]}
      onLayout={(event) => {
        const { width: layoutWidth } = event.nativeEvent.layout;
        if (layoutWidth && layoutWidth !== containerWidth) {
          setContainerWidth(layoutWidth);
        }
      }}
    >
      <GlassContainer
        style={StyleSheet.absoluteFill}
        borderRadius={borderRadius.lg}
      />
      <View style={styles.feedRow}>
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.primary,
              width: indicatorWidth,
              transform: [{ translateX }],
            },
          ]}
        />
        {visualFeeds.map((feed, visualIndex) => {
          const isSelected = selectedFeed === feed.type;
          const FeedIcon = feed.icon;
          
          return (
            <TouchableOpacity
              key={feed.type}
              style={[
                styles.feedButton,
                isRTL && styles.feedButtonRtl,
                { width: buttonWidths[visualIndex] || buttonWidth || `${100 / visualFeeds.length}%` },
              ]}
              onPress={() => handleFeedChange(feed.type)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={feed.label}
              accessibilityState={{ selected: isSelected }}
            >
              <FeedIcon
                size={moderateScale(isSmallScreen ? 14 : 16)}
                color={iconColor(isSelected)}
                style={[styles.feedIcon, isRTL ? styles.feedIconRtl : styles.feedIconLtr]}
              />
              <Text
                style={[
                  styles.feedLabel,
                  isRTL && styles.feedLabelRtl,
                  {
                    color: textColor(isSelected),
                    fontSize: labelFontSize,
                    fontWeight: isSelected ? '700' : '600',
                    textShadowColor: isSelected ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                    textShadowOffset: isSelected ? { width: 0, height: 1 } : { width: 0, height: 0 },
                    textShadowRadius: isSelected ? 2 : 0,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {feed.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: borderRadius.lg,
  },
  feedRow: {
    flexDirection: 'row',
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  indicator: {
    position: 'absolute',
    height: '100%',
    borderRadius: borderRadius.lg,
    zIndex: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  feedButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: spacing.xs * 0.7,
    gap: 3,
  },
  feedButtonRtl: {
    flexDirection: 'row-reverse',
  },
  feedIcon: {
    marginTop: 1,
    zIndex: 2,
  },
  feedIconLtr: {
    marginLeft: 2,
  },
  feedIconRtl: {
    marginRight: 2,
  },
  feedLabel: {
    textAlign: 'center',
    zIndex: 2,
  },
  feedLabelRtl: {
    writingDirection: 'rtl',
  },
});

export default FeedSelector;
