import React from 'react';
import { Image } from 'expo-image';
import { useAppSettings } from '../context/AppSettingsContext';

const ImageWithPlaceholder = ({ 
  source, 
  style, 
  resizeMode = 'cover',
  contentFit,
  ...props 
}) => {
  const { isDarkMode } = useAppSettings();

  const placeholderColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.08)';

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit || resizeMode}
      placeholderContentFit="cover"
      placeholder={{ color: placeholderColor }}
      transition={300}
      cachePolicy="memory-disk"
      recyclingKey={typeof source === 'object' ? source?.uri : undefined}
      {...props}
    />
  );
};

export default ImageWithPlaceholder;
