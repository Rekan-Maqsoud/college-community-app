import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from './icons/CompatIonicon';
import { GlassContainer } from './GlassComponents';
import { useAppSettings } from '../context/AppSettingsContext';
import { wp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const LECTURE_WINDOWS = {
  COMMUNITY: 'community',
  OFFICIAL: 'official',
};

const LectureWindowSelector = ({ selectedWindow, onWindowChange, height = moderateScale(44) }) => {
  const { t, theme, isDarkMode, reduceMotion, isRTL } = useAppSettings();
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(wp(92));
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;

  const windows = [
    {
      type: LECTURE_WINDOWS.COMMUNITY,
      icon: 'people-outline',
      label: t('lectures.communityWindow'),
      index: 0,
    },
    {
      type: LECTURE_WINDOWS.OFFICIAL,
      icon: 'school-outline',
      label: t('lectures.officialWindow'),
      index: 1,
    },
  ];

  const selectedIndex = Math.max(0, windows.findIndex(w => w.type === selectedWindow));
  const visibleWindows = isRTL ? [...windows].reverse() : windows;
  const selectedVisualIndex = isRTL ? (windows.length - 1 - selectedIndex) : selectedIndex;

  useEffect(() => {
    const animation = reduceMotion
      ? Animated.timing(indicatorAnim, {
          toValue: selectedVisualIndex,
          duration: 100,
          useNativeDriver: true,
        })
      : Animated.spring(indicatorAnim, {
          toValue: selectedVisualIndex,
          useNativeDriver: true,
          tension: 68,
          friction: 12,
        });

    animation.start();
  }, [indicatorAnim, reduceMotion, selectedVisualIndex]);

  const buttonWidths = useMemo(() => [containerWidth / 2, containerWidth / 2], [containerWidth]);
  
  const translateX = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, buttonWidths[0]],
  });

  const textColor = (isSelected) => {
    if (isSelected) return '#FFFFFF';
    return isDarkMode ? 'rgba(255, 255, 255, 0.94)' : (theme.text || theme.textSecondary);
  };

  const iconColor = (isSelected) => {
    if (isSelected) return '#FFFFFF';
    return isDarkMode ? 'rgba(255, 255, 255, 0.92)' : (theme.text || theme.textSecondary);
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
        borderRadius={borderRadius.round}
      />
      <View style={styles.feedRow}>
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.primary,
              width: buttonWidths[selectedVisualIndex] || 0,
              transform: [{ translateX }],
            },
          ]}
        />
        {visibleWindows.map((w, index) => {
          const isSelected = selectedWindow === w.type;
          
          return (
            <TouchableOpacity
              key={w.type}
              style={[
                styles.feedButton,
                { width: buttonWidths[index] },
              ]}
              onPress={() => onWindowChange(w.type)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={w.icon}
                size={moderateScale(isSmallScreen ? 14 : 16)}
                color={iconColor(isSelected)}
                style={[
                  styles.feedIcon,
                  isRTL ? styles.feedIconRtl : styles.feedIconLtr,
                  index === 0 && (isRTL ? { marginRight: 2 } : { marginLeft: 2 }),
                ]}
              />
              <Text
                style={[
                  styles.feedLabel,
                  isRTL && styles.feedLabelRtl,
                  {
                    color: textColor(isSelected),
                    fontSize: fontSize(isSmallScreen ? 11 : 13),
                    fontWeight: isSelected ? '800' : '700',
                    textShadowColor: isSelected
                      ? 'rgba(0, 0, 0, 0.26)'
                      : isDarkMode
                      ? 'rgba(0, 0, 0, 0.16)'
                      : 'rgba(255, 255, 255, 0.35)',
                    textShadowOffset: isSelected ? { width: 0, height: 1 } : { width: 0, height: 0 },
                    textShadowRadius: isSelected ? 3 : 1,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {w.label}
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
    borderRadius: borderRadius.round,
    overflow: 'hidden',
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
    borderRadius: borderRadius.round,
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
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  feedIcon: {
    marginTop: 1,
    zIndex: 2,
  },
  feedIconLtr: {
    marginRight: 0,
  },
  feedIconRtl: {
    marginLeft: 0,
  },
  feedLabel: {
    textAlign: 'center',
    zIndex: 2,
  },
  feedLabelRtl: {
    writingDirection: 'rtl',
  },
});

export default LectureWindowSelector;
