import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Share,
  Dimensions,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from './CustomAlert';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ZoomableImage = ({ uri, onLongPress, isActive }) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    const timingConfig = { duration: 250, easing: Easing.out(Easing.cubic) };
    scale.value = withTiming(1, timingConfig);
    translateX.value = withTiming(0, timingConfig);
    translateY.value = withTiming(0, timingConfig);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (savedScale.value < 1) {
        const timingConfig = { duration: 250, easing: Easing.out(Easing.cubic) };
        scale.value = withTiming(1, timingConfig);
        translateX.value = withTiming(0, timingConfig);
        translateY.value = withTiming(0, timingConfig);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        const maxX = (SCREEN_WIDTH * (savedScale.value - 1)) / 2;
        const maxY = (SCREEN_HEIGHT * 0.4 * (savedScale.value - 1)) / 2;
        translateX.value = Math.max(-maxX, Math.min(maxX, savedTranslateX.value + e.translationX));
        translateY.value = Math.max(-maxY, Math.min(maxY, savedTranslateY.value + e.translationY));
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        const maxX = (SCREEN_WIDTH * (savedScale.value - 1)) / 2;
        const maxY = (SCREEN_HEIGHT * 0.4 * (savedScale.value - 1)) / 2;
        savedTranslateX.value = Math.max(-maxX, Math.min(maxX, savedTranslateX.value + e.translationX));
        savedTranslateY.value = Math.max(-maxY, Math.min(maxY, savedTranslateY.value + e.translationY));
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        runOnJS(resetZoom)();
      } else {
        scale.value = withTiming(2.5, { duration: 250, easing: Easing.out(Easing.cubic) });
        savedScale.value = 2.5;
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd((e, success) => {
      if (success && onLongPress) {
        runOnJS(onLongPress)();
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(doubleTapGesture, longPressGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.imageWrapper}>
      <GestureDetector gesture={composedGesture}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </GestureDetector>
    </View>
  );
};

const ZoomableImageModal = ({ 
  visible, 
  images, 
  initialIndex = 0, 
  onClose,
  showDownload = true,
  showShare = true,
}) => {
  const { t } = useAppSettings();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset index when modal opens with new images
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleScroll = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, images?.length]);

  const handleDownload = async () => {
    let permissionResult = null;
    let downloadResult = null;
    let fileUri = null;
    try {
      setIsDownloading(true);
      const imageUrl = images[currentIndex];
      
      if (!imageUrl) {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('post.downloadFailed'),
        });
        return;
      }

      // Request permissions
      permissionResult = await MediaLibrary.requestPermissionsAsync();
      const { status } = permissionResult;
      
      if (status !== 'granted') {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('post.galleryPermissionRequired'),
        });
        return;
      }

      // Extract extension from URL
      const urlWithoutQuery = imageUrl.split('?')[0];
      const urlParts = urlWithoutQuery.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'jpg';
      const validExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension) ? extension : 'jpg';
      const filename = `college_image_${Date.now()}.${validExtension}`;
      const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDirectory) {
        throw new Error(t('post.downloadErrorUnknown'));
      }
      fileUri = `${baseDirectory}${filename}`;

      // Download the image
      downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri, {
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'Mozilla/5.0 (compatible; CollegeCommunity/1.0)',
        },
      });
      
      if (downloadResult && downloadResult.status === 200 && downloadResult.uri) {
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        
        if (asset) {
          showAlert({
            type: 'success',
            title: t('common.success'),
            message: t('post.imageSaved'),
          });
        } else {
          throw new Error(t('post.downloadErrorAssetCreate'));
        }

        // Clean up temp file
        try {
          await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        } catch (deleteError) {
          // Ignore deletion errors
        }
      } else {
        throw new Error(t('post.downloadErrorDownload'));
      }
    } catch (error) {
      const imageUrl = images[currentIndex];
      const details = [
        `${t('post.downloadErrorReasonLabel')}: ${error?.message || t('post.downloadErrorUnknown')}`,
        `${t('post.downloadErrorStatusLabel')}: ${downloadResult?.status ?? t('post.downloadErrorUnknown')}`,
        `${t('post.downloadErrorPermissionLabel')}: ${permissionResult?.status ?? t('post.downloadErrorUnknown')}`,
        `${t('post.downloadErrorAccessLabel')}: ${permissionResult?.accessPrivileges ?? t('post.downloadErrorUnknown')}`,
        `${t('post.downloadErrorPlatformLabel')}: ${Platform.OS}`,
        `${t('post.downloadErrorUrlLabel')}: ${imageUrl || t('post.downloadErrorUnknown')}`,
        `${t('post.downloadErrorFileLabel')}: ${fileUri || t('post.downloadErrorUnknown')}`,
      ].join('\n');

      showAlert({
        type: 'error',
        title: t('common.error'),
        message: `${t('post.downloadFailed')}\n\n${details}`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const imageUrl = images[currentIndex];
      if (Platform.OS === 'ios') {
        await Share.share({ url: imageUrl, message: imageUrl });
      } else {
        await Share.share({ message: imageUrl });
      }
    } catch (error) {
      // Share cancelled or failed
    }
  };

  if (!visible || !images || images.length === 0) return null;

  const imageArray = Array.isArray(images) ? images : [images];

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {imageArray.length > 1 && (
            <Text style={styles.counter}>
              {currentIndex + 1} / {imageArray.length}
            </Text>
          )}
          
          <View style={styles.headerActions}>
            {showShare && (
              <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {showDownload && (
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {imageArray.length === 1 ? (
          <ZoomableImage 
            uri={imageArray[0]} 
            onLongPress={handleDownload}
            isActive={true}
          />
        ) : (
          <FlatList
            data={imageArray}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={handleScroll}
            keyExtractor={(item, index) => `image-${index}`}
            renderItem={({ item, index }) => (
              <ZoomableImage 
                uri={item} 
                onLongPress={handleDownload}
                isActive={index === currentIndex}
              />
            )}
          />
        )}

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {t('post.pinchToZoomRotate')}
          </Text>
        </View>

        <CustomAlert
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onDismiss={hideAlert}
        />
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  counter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default ZoomableImageModal;
