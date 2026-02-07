import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickAndCompressImages, takePictureAndCompress } from '../utils/imageCompression';
import { useTranslation } from '../hooks/useTranslation';
import { useCustomAlert } from '../hooks/useCustomAlert';

const ImagePickerComponent = ({ 
  images = [], 
  onImagesChange, 
  maxImages = 10,
  disabled = false 
}) => {
  const { t } = useTranslation();
  const { showAlert } = useCustomAlert();
  const [loading, setLoading] = useState(false);

  const handlePickImages = async () => {
    if (disabled) return;
    
    try {
      setLoading(true);
      const remainingSlots = maxImages - images.length;
      
      if (remainingSlots <= 0) {
        showAlert(
          t('post.imageLimit'),
          t('post.maxImagesReached', { max: maxImages })
        );
        return;
      }

      const result = await pickAndCompressImages({
        allowsMultipleSelection: true,
        maxImages: remainingSlots,
        quality: 'medium',
      });

      if (result && result.length > 0) {
        onImagesChange([...images, ...result]);
      }
    } catch (error) {
      showAlert(
        t('common.error'),
        error.message || t('post.imagePickError')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTakePicture = async () => {
    if (disabled) return;
    
    try {
      setLoading(true);
      
      if (images.length >= maxImages) {
        showAlert(
          t('post.imageLimit'),
          t('post.maxImagesReached', { max: maxImages })
        );
        return;
      }

      const result = await takePictureAndCompress({
        quality: 'medium',
      });

      if (result) {
        onImagesChange([...images, result]);
      }
    } catch (error) {
      showAlert(
        t('common.error'),
        error.message || t('post.cameraError')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (index) => {
    if (disabled) return;
    
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const showImageOptions = () => {
    if (Platform.OS === 'web') {
      handlePickImages();
      return;
    }

    showAlert({
      type: 'info',
      title: t('post.addImage'),
      message: t('post.selectImageSource'),
      buttons: [
        {
          text: t('post.camera'),
          onPress: handleTakePicture,
        },
        {
          text: t('post.gallery'),
          onPress: handlePickImages,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>
          {t('post.images')} ({images.length}/{maxImages})
        </Text>
      </View>

      {images.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image 
                source={{ uri: image.uri }} 
                style={styles.image}
                resizeMode="cover"
              />
              {!disabled && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {!disabled && images.length < maxImages && (
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={showImageOptions}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={24} color="#fff" />
              <Text style={styles.addButtonText}>
                {t('post.addImages')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  imageScroll: {
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ImagePickerComponent;
