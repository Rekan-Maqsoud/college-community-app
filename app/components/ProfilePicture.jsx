import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';

const ProfilePicture = ({ 
  uri, 
  size = 40, 
  name = 'User',
  style,
  showBorder = false,
  borderColor,
  borderWidth = 2.5
}) => {
  const { theme, isDarkMode } = useAppSettings();

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=667eea&color=fff&bold=true`;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    backgroundColor: theme.background,
    ...(showBorder && {
      borderWidth: borderWidth,
      borderColor: borderColor || (isDarkMode ? theme.primary : theme.border),
    }),
  };

  if (uri) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri: defaultAvatar }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ProfilePicture;
