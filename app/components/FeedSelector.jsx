import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassContainer } from './GlassComponents';
import { wp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { FEED_TYPES } from '../constants/feedCategories';

const FeedSelector = ({ selectedFeed, onFeedChange, height = moderateScale(44) }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(wp(60));
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;

  const feeds = [
    {
      type: FEED_TYPES.DEPARTMENT,
      icon: 'people-outline',
      label: t('feed.department'),
      index: 0,
    },
    {
      type: FEED_TYPES.MAJOR,
      icon: 'school-outline',
      label: t('feed.major'),
      index: 1,
    },
    {
      type: FEED_TYPES.PUBLIC,
      icon: 'globe-outline',
      label: t('feed.public'),
      index: 2,
    },
  ];

  useEffect(() => {
    const selectedIndex = feeds.findIndex(feed => feed.type === selectedFeed);
    Animated.spring(indicatorAnim, {
      toValue: selectedIndex,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [selectedFeed]);

  const handleFeedChange = (feedType) => {
    onFeedChange(feedType);
  };

  const buttonRatios = [0.426, 0.273, 0.301];
  const buttonWidths = useMemo(() => (
    buttonRatios.map(ratio => Math.max(0, containerWidth * ratio))
  ), [containerWidth]);
  const selectedIndex = feeds.findIndex(feed => feed.type === selectedFeed);
  
  const translateX = indicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, buttonWidths[0], buttonWidths[0] + buttonWidths[1]],
  });

  const textColor = (isSelected) => {
    if (isSelected) return '#FFFFFF';
    return isDarkMode ? theme.subText : theme.textSecondary;
  };

  const iconColor = (isSelected) => {
    if (isSelected) return '#FFFFFF';
    return isDarkMode ? theme.subText : theme.textSecondary;
  };

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.04)',
          borderWidth: 0.5,
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(0, 0, 0, 0.08)',
        }
      ]}
      onLayout={(event) => {
        const { width: layoutWidth } = event.nativeEvent.layout;
        if (layoutWidth && layoutWidth !== containerWidth) {
          setContainerWidth(layoutWidth);
        }
      }}
    >
      <View style={styles.feedRow}>
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.primary,
              width: buttonWidths[selectedIndex] || 0,
              transform: [{ translateX }],
            },
          ]}
        />
        {feeds.map((feed, index) => {
          const isSelected = selectedFeed === feed.type;
          
          return (
            <TouchableOpacity
              key={feed.type}
              style={[
                styles.feedButton,
                { width: buttonWidths[index] },
              ]}
              onPress={() => handleFeedChange(feed.type)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={feed.icon}
                size={moderateScale(isSmallScreen ? 14 : 16)}
                color={iconColor(isSelected)}
                style={[styles.feedIcon, index === 0 && { marginLeft: 2 }]}
              />
              <Text
                style={[
                  styles.feedLabel,
                  {
                    color: textColor(isSelected),
                    fontSize: fontSize(isSmallScreen ? 9.5 : 10.5),
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
  feedIcon: {
    marginTop: 1,
    zIndex: 2,
  },
  feedLabel: {
    textAlign: 'center',
    zIndex: 2,
  },
});

export default FeedSelector;
