import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ProfilePicture from './ProfilePicture';
import { useAppSettings } from '../context/AppSettingsContext';
import { fontSize, spacing } from '../utils/responsive';

const UserCard = ({ 
  user, 
  onPress, 
  showBio = false,
  size = 50,
  compact = false,
  style 
}) => {
  const { theme, t } = useAppSettings();

  if (!user) return null;

  const displaySize = compact ? 40 : size;

  return (
    <TouchableOpacity 
      style={[styles.container, compact && styles.compactContainer, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <ProfilePicture
        uri={user.profilePicture}
        size={displaySize}
        name={user.fullName || user.name}
        showBorder
      />
      
      <View style={styles.infoContainer}>
        <Text 
          style={[
            styles.name, 
            { color: theme.text, fontSize: compact ? fontSize(14) : fontSize(16) }
          ]}
          numberOfLines={1}
        >
          {user.fullName || user.name || 'User'}
        </Text>
        
        {!compact && showBio && user.bio && (
          <Text 
            style={[styles.bio, { color: theme.textSecondary, fontSize: fontSize(13) }]}
            numberOfLines={2}
          >
            {user.bio}
          </Text>
        )}
        
        {(user.department || user.stage) && (
          <Text 
            style={[
              styles.details, 
              { color: theme.textSecondary, fontSize: compact ? fontSize(11) : fontSize(12) }
            ]}
            numberOfLines={1}
          >
            {user.department && t(`departments.${user.department}`)}
            {user.department && user.stage && ' • '}
            {user.stage && t(`stages.${user.stage}`)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  compactContainer: {
    padding: spacing.xs,
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontWeight: '600',
    marginBottom: 2,
  },
  bio: {
    marginTop: 2,
  },
  details: {
    marginTop: 2,
  },
});

export default memo(UserCard);
