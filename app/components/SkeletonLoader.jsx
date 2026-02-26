import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { wp, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

export const PostCardSkeleton = () => {
  const { theme, isDarkMode } = useAppSettings();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.08)';
    
  const cardBackground = isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(255, 255, 255, 0.85)';

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: cardBackground,
        borderRadius: borderRadius.lg,
        borderWidth: isDarkMode ? 0 : 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',
      }
    ]}>
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.avatar,
            { backgroundColor: skeletonColor, opacity },
          ]}
        />
        <View style={styles.headerInfo}>
          <Animated.View
            style={[
              styles.nameSkeleton,
              { backgroundColor: skeletonColor, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.timeSkeleton,
              { backgroundColor: skeletonColor, opacity },
            ]}
          />
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.titleSkeleton,
            { backgroundColor: skeletonColor, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.textSkeleton,
            { backgroundColor: skeletonColor, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.textSkeletonShort,
            { backgroundColor: skeletonColor, opacity },
          ]}
        />
      </View>

      <View style={styles.footer}>
        {[1, 2, 3].map((item) => (
          <Animated.View
            key={item}
            style={[
              styles.footerItem,
              { backgroundColor: skeletonColor, opacity },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export const ProfileSkeleton = () => {
  const { theme, isDarkMode } = useAppSettings();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.1)';

  return (
    <View style={styles.profileContainer}>
      <Animated.View
        style={[
          styles.profileAvatar,
          { backgroundColor: skeletonColor, opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.profileName,
          { backgroundColor: skeletonColor, opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.profileBio,
          { backgroundColor: skeletonColor, opacity },
        ]}
      />
    </View>
  );
};

export const ChatListSkeleton = ({ count = 6 }) => {
  const { isDarkMode } = useAppSettings();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.08)';

  const cardBackground = isDarkMode
    ? 'rgba(255, 255, 255, 0.04)'
    : 'rgba(255, 255, 255, 0.85)';

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`chat-skeleton-${index}`}
          style={[
            styles.listSkeletonCard,
            {
              backgroundColor: cardBackground,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          <Animated.View
            style={[
              styles.listSkeletonAvatar,
              { backgroundColor: skeletonColor, opacity },
            ]}
          />
          <View style={styles.listSkeletonContent}>
            <Animated.View
              style={[
                styles.listSkeletonTitle,
                { backgroundColor: skeletonColor, opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.listSkeletonSubtitle,
                { backgroundColor: skeletonColor, opacity },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

export const NotificationSkeleton = ({ count = 6 }) => {
  const { isDarkMode } = useAppSettings();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.08)';

  const cardBackground = isDarkMode
    ? 'rgba(255, 255, 255, 0.04)'
    : 'rgba(255, 255, 255, 0.85)';

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`notif-skeleton-${index}`}
          style={[
            styles.listSkeletonCard,
            {
              backgroundColor: cardBackground,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          <Animated.View
            style={[
              styles.listSkeletonAvatar,
              { backgroundColor: skeletonColor, opacity },
            ]}
          />
          <View style={styles.listSkeletonContent}>
            <Animated.View
              style={[
                styles.listSkeletonTitle,
                { backgroundColor: skeletonColor, opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.listSkeletonSubtitle,
                { backgroundColor: skeletonColor, opacity, width: '80%' },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

export const MessageListSkeleton = ({ count = 8 }) => {
  const { isDarkMode } = useAppSettings();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.08)';

  // Realistic chat-bubble pattern: alternating sides with varied widths & heights
  const BUBBLE_PATTERNS = [
    { mine: false, width: '70%', height: moderateScale(44) },
    { mine: false, width: '52%', height: moderateScale(44) },
    { mine: true,  width: '60%', height: moderateScale(60) },
    { mine: true,  width: '44%', height: moderateScale(44) },
    { mine: false, width: '76%', height: moderateScale(80) },
    { mine: false, width: '58%', height: moderateScale(44) },
    { mine: true,  width: '65%', height: moderateScale(96) },
    { mine: false, width: '48%', height: moderateScale(44) },
    { mine: true,  width: '54%', height: moderateScale(60) },
    { mine: false, width: '80%', height: moderateScale(44) },
    { mine: true,  width: '42%', height: moderateScale(44) },
    { mine: false, width: '66%', height: moderateScale(64) },
  ];

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => {
        const { mine, width, height } = BUBBLE_PATTERNS[index % BUBBLE_PATTERNS.length];

        return (
          <View
            key={`message-skeleton-${index}`}
            style={[
              styles.messageSkeletonRow,
              { justifyContent: mine ? 'flex-end' : 'flex-start' },
            ]}
          >
            <Animated.View
              style={[
                styles.messageSkeletonBubble,
                {
                  backgroundColor: skeletonColor,
                  opacity,
                  width,
                  height,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

export const SavedPostSkeleton = ({ count = 3 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`saved-post-skeleton-${index}`} style={styles.postContainer}>
          <PostCardSkeleton />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameSkeleton: {
    height: 16,
    width: '40%',
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  timeSkeleton: {
    height: 12,
    width: '25%',
    borderRadius: 4,
  },
  content: {
    marginBottom: spacing.md,
  },
  titleSkeleton: {
    height: 18,
    width: '70%',
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  textSkeleton: {
    height: 14,
    width: '100%',
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  textSkeletonShort: {
    height: 14,
    width: '60%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  footerItem: {
    height: 20,
    width: 60,
    borderRadius: 4,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  profileAvatar: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    marginBottom: spacing.md,
  },
  profileName: {
    height: 24,
    width: '50%',
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  profileBio: {
    height: 16,
    width: '70%',
    borderRadius: 4,
  },
  listSkeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listSkeletonAvatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    marginRight: spacing.sm,
  },
  listSkeletonContent: {
    flex: 1,
  },
  listSkeletonTitle: {
    height: moderateScale(14),
    borderRadius: 4,
    width: '62%',
    marginBottom: spacing.xs,
  },
  listSkeletonSubtitle: {
    height: moderateScale(12),
    borderRadius: 4,
    width: '78%',
  },
  messageSkeletonRow: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  messageSkeletonBubble: {
    borderRadius: borderRadius.lg,
  },
  postContainer: {
    marginBottom: spacing.md,
  },
});
