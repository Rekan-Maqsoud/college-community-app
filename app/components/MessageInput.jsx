import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  Text,
  Modal,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from './LeafletMap';
import GiphyPickerModal from './GiphyPickerModal';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  fontSize,
  spacing,
  moderateScale,
  wp,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { pickAndCompressImages, takePictureAndCompress } from '../utils/imageCompression';
import { uploadChatImage } from '../../database/chats';
import * as Location from 'expo-location';

const MAX_INPUT_LINES = 5;
const LINE_HEIGHT = moderateScale(20);
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_INPUT_LINES;

const MessageInput = ({
  onSend,
  disabled = false,
  placeholder,
  replyingTo,
  onCancelReply,
  showMentionButton = false,
  canMentionEveryone = false,
  groupMembers = [],
  friends = [],
  showAlert,
}) => {
  const { theme, isDarkMode, t } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [sendingGif, setSendingGif] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const inputRef = useRef(null);
  const actionSheetAnim = useRef(new Animated.Value(0)).current;

  // Animate action sheet
  useEffect(() => {
    Animated.spring(actionSheetAnim, {
      toValue: showActionSheet ? 1 : 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [showActionSheet]);

  // --- Mention logic ---
  const getMentionSuggestions = () => {
    const suggestions = [];
    if (canMentionEveryone) {
      suggestions.push({
        id: 'everyone',
        name: 'everyone',
        displayName: t('chats.mentionEveryone') || 'Everyone',
        isSpecial: true,
      });
    }
    const allUsers = [...groupMembers];
    friends.forEach((friend) => {
      if (!allUsers.find((u) => u.$id === friend.$id)) {
        allUsers.push(friend);
      }
    });
    const q = mentionQuery.toLowerCase();
    const filtered = allUsers.filter((user) => {
      const name = (user.name || user.fullName || '').toLowerCase();
      return name.includes(q);
    });
    filtered.slice(0, 3).forEach((user) => {
      suggestions.push({
        id: user.$id,
        name: user.name || user.fullName,
        displayName: user.name || user.fullName,
        profilePicture: user.profilePicture,
        isSpecial: false,
      });
    });
    return suggestions.slice(0, 4);
  };

  const handleTextChange = (text) => {
    setMessage(text);
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(true);
        return;
      }
    }
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const handleSelectMention = (suggestion) => {
    const beforeMention = message.slice(0, mentionStartIndex);
    const afterMention = message.slice(mentionStartIndex + mentionQuery.length + 1);
    const mentionText = suggestion.isSpecial ? '@everyone' : `@${suggestion.name}`;
    setMessage(beforeMention + mentionText + ' ' + afterMention);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const triggerAlert = (title, msg, type = 'error', buttons = []) => {
    if (showAlert) {
      showAlert({ type, title, message: msg, buttons });
    }
  };

  // --- Action handlers ---
  const closeActionSheet = () => setShowActionSheet(false);

  const handlePickImage = async () => {
    if (disabled || uploading) return;
    closeActionSheet();
    try {
      const result = await pickAndCompressImages({
        allowsMultipleSelection: false,
        maxImages: 1,
        quality: 'medium',
      });
      if (result && result.length > 0) {
        setSelectedImage(result[0]);
      }
    } catch (error) {
      triggerAlert(t('common.error'), error.message || t('chats.imagePickError'));
    }
  };

  const handleTakePicture = async () => {
    if (disabled || uploading) return;
    closeActionSheet();
    try {
      const result = await takePictureAndCompress({ quality: 'medium' });
      if (result) {
        setSelectedImage(result);
      }
    } catch (error) {
      triggerAlert(t('common.error'), error.message || t('chats.cameraError'));
    }
  };

  const handleSendLocation = async () => {
    closeActionSheet();
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        triggerAlert(t('common.error'), t('chats.locationPermissionDenied'));
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setPendingLocation({ lat: latitude, long: longitude });
      setShowLocationPreview(true);
    } catch {
      triggerAlert(t('common.error'), t('errors.locationFailed'));
    } finally {
      setLocationLoading(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (pendingLocation && onSend) {
      await onSend(`${pendingLocation.lat},${pendingLocation.long}`, null, 'location');
    }
    setShowLocationPreview(false);
    setPendingLocation(null);
  };

  const handleCancelLocation = () => {
    setShowLocationPreview(false);
    setPendingLocation(null);
  };

  const handleSendFile = () => {
    closeActionSheet();
    triggerAlert(t('chats.sendFile') || 'File', t('chats.comingSoon') || 'Coming soon', 'info');
  };

  const handleOpenGiphy = () => {
    closeActionSheet();
    Keyboard.dismiss();
    setTimeout(() => setShowGiphyPicker(true), 200);
  };

  const handleGifSelected = async (gifData) => {
    if (!onSend || sendingGif) return;
    setSendingGif(true);
    try {
      const metadata = {
        gif_url: gifData.url,
        gif_preview_url: gifData.previewUrl,
        gif_width: gifData.width,
        gif_height: gifData.height,
        gif_aspect_ratio: gifData.aspectRatio,
        gif_id: gifData.id,
        gif_title: gifData.title || '',
        gif_source: gifData.source || 'giphy',
        gif_type: gifData.type || 'gif',
      };
      await onSend(null, null, 'gif', metadata);
    } catch {
      triggerAlert(t('common.error'), t('chats.sendError'));
    } finally {
      setSendingGif(false);
    }
  };

  const handleTagUser = () => {
    closeActionSheet();
    setMessage((prev) => prev + '@');
    setMentionStartIndex(message.length);
    setMentionQuery('');
    setShowMentionSuggestions(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const uploadImage = async (imageAsset) => {
    try {
      if (!imageAsset?.uri) {
        throw new Error(t('errors.imageUploadFailed'));
      }
      const result = await uploadChatImage({
        uri: imageAsset.uri,
        name: imageAsset.fileName || `chat_image_${Date.now()}.jpg`,
        type: imageAsset.mimeType || 'image/jpeg',
      });
      return result?.viewUrl || null;
    } catch {
      throw new Error(t('errors.imageUploadFailed'));
    }
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedImage) return;
    if (!onSend) return;

    const messageToSend = trimmedMessage;
    const imageToSend = selectedImage;
    setMessage('');
    if (inputRef.current) inputRef.current.focus();

    try {
      let imageUrl = null;
      if (imageToSend) {
        setUploading(true);
        setSelectedImage(null);
        imageUrl = await uploadImage(imageToSend);
      }
      await onSend(messageToSend, imageUrl);
    } catch (error) {
      setMessage(messageToSend);
      triggerAlert(t('common.error'), error.message || t('chats.sendError'));
    } finally {
      setUploading(false);
    }
  };

  // --- Action sheet items ---
  const actionItems = [
    {
      key: 'gallery',
      icon: 'images',
      color: '#8B5CF6',
      label: t('chats.gallery') || 'Gallery',
      onPress: handlePickImage,
    },
    {
      key: 'camera',
      icon: 'camera',
      color: '#10B981',
      label: t('chats.camera') || 'Camera',
      onPress: handleTakePicture,
    },
    {
      key: 'location',
      icon: 'location',
      color: '#F59E0B',
      label: t('chats.location') || 'Location',
      onPress: handleSendLocation,
      loading: locationLoading,
    },
    {
      key: 'tag',
      icon: 'at',
      color: '#6366F1',
      label: t('chats.tagUser') || 'Tag',
      onPress: handleTagUser,
      hidden: !showMentionButton,
    },
    {
      key: 'file',
      icon: 'document',
      color: '#3B82F6',
      label: t('chats.file') || 'File',
      onPress: handleSendFile,
    },
    {
      key: 'gif',
      icon: 'happy',
      color: '#EC4899',
      label: t('chats.gifSticker') || 'GIF',
      onPress: handleOpenGiphy,
    },
  ].filter((item) => !item.hidden);

  const canSendMessage = (message.trim() || selectedImage) && !disabled && !uploading;

  // Colors
  const containerBg = isDarkMode ? '#1a1a2e' : '#F8F9FA';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: containerBg,
          borderTopColor: borderColor,
          paddingBottom: Math.max(Platform.OS === 'ios' ? spacing.xs : spacing.sm, insets.bottom),
        },
      ]}
    >
      {/* Reply preview bar */}
      {replyingTo && (
        <View
          style={[
            styles.replyPreview,
            { borderLeftColor: theme.primary, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' },
          ]}
        >
          <View style={styles.replyContent}>
            <Text style={[styles.replyLabel, { color: theme.primary, fontSize: fontSize(11) }]}>
              {t('chats.replyingTo')} {replyingTo.senderName}
            </Text>
            <Text
              style={[styles.replyText, { color: theme.textSecondary, fontSize: fontSize(12) }]}
              numberOfLines={1}
            >
              {replyingTo.content || t('chats.image')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            style={styles.cancelReplyBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewRow}>
          <View style={styles.imagePreviewWrap}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            {!uploading && (
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={handleRemoveImage}
                activeOpacity={0.7}
              >
                <View style={styles.removeImageCircle}>
                  <Ionicons name="close" size={moderateScale(14)} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Mention suggestions */}
      {showMentionSuggestions &&
        (groupMembers.length > 0 || friends.length > 0 || canMentionEveryone) && (
          <View
            style={[
              styles.mentionBox,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' },
            ]}
          >
            {getMentionSuggestions().map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                style={styles.mentionItem}
                onPress={() => handleSelectMention(suggestion)}
              >
                {suggestion.isSpecial ? (
                  <View style={[styles.mentionAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="people" size={moderateScale(16)} color={theme.primary} />
                  </View>
                ) : suggestion.profilePicture ? (
                  <Image source={{ uri: suggestion.profilePicture }} style={styles.mentionAvatarImg} />
                ) : (
                  <View style={[styles.mentionAvatar, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>
                      {suggestion.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={[styles.mentionName, { color: theme.text, fontSize: fontSize(14) }]}>
                  {suggestion.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      {/* Main input row */}
      <View style={styles.inputRow}>
        {/* "+" attachment button */}
        <TouchableOpacity
          style={[
            styles.plusButton,
            {
              backgroundColor: showActionSheet ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
              opacity: disabled || uploading ? 0.5 : 1,
            },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            setShowActionSheet((prev) => !prev);
          }}
          disabled={disabled || uploading}
          activeOpacity={0.7}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: actionSheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons
              name="add"
              size={moderateScale(22)}
              color={showActionSheet ? '#FFFFFF' : theme.primary}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Text input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: inputBg,
              borderColor: borderColor,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                fontSize: fontSize(14),
                color: theme.text,
                maxHeight: MAX_INPUT_HEIGHT,
              },
            ]}
            placeholder={placeholder || t('chats.typeMessage')}
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            editable={!disabled && !uploading}
            onFocus={() => setShowActionSheet(false)}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: canSendMessage ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            },
          ]}
          onPress={handleSend}
          disabled={!canSendMessage}
          activeOpacity={0.7}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={moderateScale(18)}
              color={canSendMessage ? '#FFFFFF' : theme.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Action Sheet (expandable grid) */}
      {showActionSheet && (
        <Animated.View
          style={[
            styles.actionSheet,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              opacity: actionSheetAnim,
              transform: [
                {
                  translateY: actionSheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.actionGrid}>
            {actionItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.actionItem}
                onPress={item.onPress}
                disabled={item.loading}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: item.color + '18' }]}>
                  {item.loading ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={moderateScale(22)} color={item.color} />
                  )}
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: theme.text, fontSize: fontSize(11) },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Giphy Picker Modal */}
      <GiphyPickerModal
        visible={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handleGifSelected}
      />

      {/* Location Preview Modal */}
      <Modal
        visible={showLocationPreview}
        transparent
        animationType="slide"
        onRequestClose={handleCancelLocation}
      >
        <Pressable style={styles.locationOverlay} onPress={handleCancelLocation}>
          <Pressable
            style={[
              styles.locationModal,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[
                styles.locationTitle,
                { color: theme.text, fontSize: fontSize(18) },
              ]}
            >
              {t('chats.locationPreview') || 'Send Location'}
            </Text>

            {pendingLocation && (
              <>
                <View style={styles.locationMapWrap}>
                  <LeafletMap
                    containerStyle={styles.locationMap}
                    interactive={false}
                    zoom={16}
                    markers={[
                      {
                        latitude: pendingLocation.lat,
                        longitude: pendingLocation.long,
                        title: t('chats.location'),
                      },
                    ]}
                    initialRegion={{
                      latitude: pendingLocation.lat,
                      longitude: pendingLocation.long,
                    }}
                  />
                </View>

                <View style={styles.locationCoords}>
                  <Ionicons
                    name="location-outline"
                    size={moderateScale(16)}
                    color={theme.primary}
                  />
                  <Text
                    style={[
                      styles.locationCoordsText,
                      { color: theme.textSecondary, fontSize: fontSize(13) },
                    ]}
                  >
                    {`${pendingLocation.lat.toFixed(6)}, ${pendingLocation.long.toFixed(6)}`}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.locationConfirm,
                    { color: theme.textSecondary, fontSize: fontSize(14) },
                  ]}
                >
                  {t('chats.sendLocationConfirm') || 'Send this location to the chat?'}
                </Text>
              </>
            )}

            <View style={styles.locationBtns}>
              <TouchableOpacity
                style={[
                  styles.locationCancelBtn,
                  {
                    borderColor: isDarkMode
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.15)',
                  },
                ]}
                onPress={handleCancelLocation}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.locationCancelText,
                    { color: theme.textSecondary, fontSize: fontSize(15) },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.locationSendBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmLocation}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={moderateScale(16)} color="#FFFFFF" />
                <Text style={[styles.locationSendText, { fontSize: fontSize(15) }]}>
                  {t('chats.sendLocationButton') || 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },

  // Reply preview
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  replyContent: { flex: 1 },
  replyLabel: { fontWeight: '600', marginBottom: 2 },
  replyText: { fontWeight: '400' },
  cancelReplyBtn: { padding: spacing.xs },

  // Image preview
  imagePreviewRow: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  imagePreviewWrap: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: moderateScale(4),
    right: moderateScale(4),
  },
  removeImageCircle: {
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(11),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },

  // Mention suggestions
  mentionBox: {
    position: 'absolute',
    bottom: moderateScale(60),
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
    maxHeight: moderateScale(180),
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  mentionAvatar: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionAvatarImg: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
  },
  mentionName: { fontWeight: '500', flex: 1 },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  plusButton: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(1),
  },
  inputContainer: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    justifyContent: 'center',
  },
  textInput: {
    lineHeight: LINE_HEIGHT,
    minHeight: moderateScale(22),
    textAlignVertical: 'center',
  },
  sendButton: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(1),
  },

  // Action sheet
  actionSheet: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    width: wp(18),
    marginBottom: spacing.sm,
  },
  actionIconCircle: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },

  // Location modal
  locationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  locationModal: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  locationTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  locationMapWrap: {
    width: '100%',
    height: moderateScale(180),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  locationMap: { width: '100%', height: '100%' },
  locationCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationCoordsText: { fontWeight: '500' },
  locationConfirm: { textAlign: 'center', marginBottom: spacing.lg },
  locationBtns: { flexDirection: 'row', gap: spacing.md },
  locationCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCancelText: { fontWeight: '600' },
  locationSendBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  locationSendText: { fontWeight: '600', color: '#FFFFFF' },
});

export default MessageInput;
