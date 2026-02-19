import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, moderateScale } from '../../utils/responsive';

const MessageStatusIndicator = ({ 
  status, 
  readBy, 
  deliveredTo,
  chatType, 
  otherUserPhoto, 
  otherUserName,
  participantCount,
  theme,
  isLastSeenMessage 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLastSeenMessage) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [isLastSeenMessage, opacityAnim, scaleAnim]);

  if (status === 'sending') {
    return (
      <View style={statusStyles.container}>
        <ActivityIndicator size={moderateScale(10)} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={statusStyles.container}>
        <Ionicons name="alert-circle" size={moderateScale(14)} color="#EF4444" />
      </View>
    );
  }

  const hasBeenRead = readBy && readBy.length > 0;
  const hasBeenDelivered = deliveredTo && deliveredTo.length > 0;

  if (chatType === 'private') {
    if (hasBeenRead) {
      if (isLastSeenMessage) {
        return (
          <Animated.View
            style={[
              statusStyles.container,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {otherUserPhoto ? (
              <Image source={{ uri: otherUserPhoto }} style={statusStyles.readAvatar} />
            ) : (
              <View style={[statusStyles.readAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={statusStyles.readAvatarText}>
                  {(otherUserName || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </Animated.View>
        );
      }
      return (
        <View style={statusStyles.container}>
          <Ionicons name="checkmark-done" size={moderateScale(12)} color="#60A5FA" />
        </View>
      );
    }

    if (hasBeenDelivered || status === 'delivered') {
      return (
        <View style={statusStyles.container}>
          <Ionicons name="checkmark-done" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
        </View>
      );
    }

    return (
      <View style={statusStyles.container}>
        <Ionicons name="checkmark" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  if (chatType === 'custom_group' || chatType === 'stage_group' || chatType === 'department_group') {
    if (hasBeenRead) {
      const allRead = participantCount && readBy.length >= participantCount - 1;
      return (
        <View style={statusStyles.container}>
          <Ionicons
            name="checkmark-done"
            size={moderateScale(12)}
            color={allRead ? '#60A5FA' : 'rgba(255,255,255,0.8)'}
          />
        </View>
      );
    }

    if (hasBeenDelivered || status === 'delivered') {
      return (
        <View style={statusStyles.container}>
          <Ionicons name="checkmark-done" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
        </View>
      );
    }

    return (
      <View style={statusStyles.container}>
        <Ionicons name="checkmark" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  return (
    <View style={statusStyles.container}>
      <Ionicons name="checkmark" size={moderateScale(12)} color="rgba(255,255,255,0.6)" />
    </View>
  );
};

const statusStyles = StyleSheet.create({
  container: {
    marginLeft: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: moderateScale(14),
  },
  readAvatar: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
  },
  readAvatarPlaceholder: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    justifyContent: 'center',
    alignItems: 'center',
  },
  readAvatarText: {
    color: '#FFFFFF',
    fontSize: moderateScale(8),
    fontWeight: '600',
  },
});

export default MessageStatusIndicator;
