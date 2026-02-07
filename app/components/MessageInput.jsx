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
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { pickAndCompressImages, takePictureAndCompress } from '../utils/imageCompression';
import { uploadChatImage } from '../../database/chats';
import * as Location from 'expo-location';

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
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const inputRef = useRef(null);

  // Get mention suggestions based on context
  const getMentionSuggestions = () => {
    const suggestions = [];
    
    // Add @everyone option if allowed
    if (canMentionEveryone) {
      suggestions.push({ 
        id: 'everyone', 
        name: 'everyone', 
        displayName: t('chats.mentionEveryone') || 'Everyone',
        isSpecial: true 
      });
    }
    
    // Combine group members and friends, prioritize group members
    const allUsers = [...groupMembers];
    friends.forEach(friend => {
      if (!allUsers.find(u => u.$id === friend.$id)) {
        allUsers.push(friend);
      }
    });
    
    // Filter by query
    const query = mentionQuery.toLowerCase();
    const filteredUsers = allUsers.filter(user => {
      const name = (user.name || user.fullName || '').toLowerCase();
      return name.includes(query);
    });
    
    // Add users to suggestions (limit to 3)
    filteredUsers.slice(0, 3).forEach(user => {
      suggestions.push({
        id: user.$id,
        name: user.name || user.fullName,
        displayName: user.name || user.fullName,
        profilePicture: user.profilePicture,
        isSpecial: false,
      });
    });
    
    return suggestions.slice(0, 4); // Max 4 suggestions (1 everyone + 3 users)
  };

  const handleTextChange = (text) => {
    setMessage(text);
    
    // Check for @ mention trigger
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
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

  const handleInsertMention = (mention) => {
    setMessage(prev => prev + mention + ' ');
    setShowMentionSuggestions(false);
  };

  const triggerAlert = (title, message, type = 'error', buttons = []) => {
    if (showAlert) {
      showAlert({ type, title, message, buttons });
    }
  };

  const handlePickImage = async () => {
    if (disabled || uploading) return;
    setShowAttachmentsMenu(false);
    
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
    setShowAttachmentsMenu(false);
    
    try {
      const result = await takePictureAndCompress({
        quality: 'medium',
      });

      if (result) {
        setSelectedImage(result);
      }
    } catch (error) {
      triggerAlert(t('common.error'), error.message || t('chats.cameraError'));
    }
  };

  const handleSendLocation = async () => {
    setShowAttachmentsMenu(false);
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        triggerAlert(
          t('common.error'),
          t('chats.locationPermissionDenied')
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setPendingLocation({ lat: latitude, long: longitude });
      setShowLocationPreview(true);
    } catch (error) {
      triggerAlert(
        t('common.error'),
        t('errors.locationFailed')
      );
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
    setShowAttachmentsMenu(false);
    triggerAlert(
      t('chats.sendFile'),
      t('chats.comingSoon'),
      'info'
    );
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
    } catch (error) {
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
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
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

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDarkMode 
          ? 'rgba(255,255,255,0.05)' 
          : 'rgba(0,0,0,0.02)',
        borderTopColor: isDarkMode 
          ? 'rgba(255,255,255,0.1)' 
          : 'rgba(0,0,0,0.05)',
        paddingBottom: Platform.OS === 'ios' ? spacing.sm : spacing.md,
      }
    ]}>
        {replyingTo && (
          <View style={[
            styles.replyPreview,
            { 
              backgroundColor: 'transparent',
              borderLeftColor: theme.primary,
            }
          ]}>
            <View style={styles.replyContent}>
              <Text style={[styles.replyLabel, { color: theme.primary, fontSize: fontSize(11) }]}>
                {t('chats.replyingTo')} {replyingTo.senderName}
              </Text>
              <Text 
                style={[styles.replyText, { color: theme.textSecondary, fontSize: fontSize(12) }]}
                numberOfLines={1}>
                {replyingTo.content || t('chats.image')}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onCancelReply}
              style={styles.cancelReplyButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image 
              source={{ uri: selectedImage.uri }} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
            {!uploading && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
                activeOpacity={0.7}>
                <Ionicons name="close-circle" size={moderateScale(24)} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mention suggestions popup */}
        {showMentionSuggestions && (groupMembers.length > 0 || friends.length > 0 || canMentionEveryone) && (
          <View style={[
            styles.mentionSuggestions,
            { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
          ]}>
            {getMentionSuggestions().map((suggestion) => (
              <TouchableOpacity 
                key={suggestion.id}
                style={styles.mentionSuggestionItem}
                onPress={() => handleSelectMention(suggestion)}>
                {suggestion.isSpecial ? (
                  <View style={[styles.mentionIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="people" size={moderateScale(16)} color={theme.primary} />
                  </View>
                ) : suggestion.profilePicture ? (
                  <Image 
                    source={{ uri: suggestion.profilePicture }} 
                    style={styles.mentionAvatar} 
                  />
                ) : (
                  <View style={[styles.mentionIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>
                      {suggestion.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={[styles.mentionSuggestionText, { color: theme.text, fontSize: fontSize(14) }]}>
                  {suggestion.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          {/* Attachments menu button (9-dot grid) */}
          <TouchableOpacity
            style={[
              styles.imageIconButton,
              { 
                opacity: disabled || uploading ? 0.5 : 1,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              }
            ]}
            onPress={() => setShowAttachmentsMenu(true)}
            disabled={disabled || uploading}
            activeOpacity={0.7}>
            <Ionicons 
              name="apps-outline" 
              size={moderateScale(20)} 
              color={theme.primary} 
            />
          </TouchableOpacity>

          {/* @ mention button */}
          {showMentionButton && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { opacity: disabled || uploading ? 0.5 : 1 }
              ]}
              onPress={() => {
                setMessage(prev => prev + '@');
                setMentionStartIndex(message.length);
                setMentionQuery('');
                setShowMentionSuggestions(true);
              }}
              disabled={disabled || uploading}
              activeOpacity={0.7}>
              <Ionicons 
                name="at" 
                size={moderateScale(24)} 
                color={showMentionSuggestions ? theme.primary : theme.textSecondary} 
              />
            </TouchableOpacity>
          )}

          <View style={[
            styles.inputContainer,
            {
              backgroundColor: isDarkMode 
                ? 'rgba(255,255,255,0.1)' 
                : 'rgba(0,0,0,0.05)',
            }
          ]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                { 
                  fontSize: fontSize(14),
                  color: theme.text,
                }
              ]}
              placeholder={placeholder || t('chats.typeMessage')}
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
              editable={!disabled && !uploading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: (message.trim() || selectedImage) && !disabled && !uploading 
                  ? theme.primary 
                  : theme.border,
              }
            ]}
            onPress={handleSend}
            disabled={(!message.trim() && !selectedImage) || disabled || uploading}
            activeOpacity={0.7}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons 
                name="send" 
                size={moderateScale(20)} 
                color="#FFFFFF" 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Attachments Menu Modal */}
        <Modal
          visible={showAttachmentsMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAttachmentsMenu(false)}>
          <Pressable 
            style={styles.attachmentsOverlay}
            onPress={() => setShowAttachmentsMenu(false)}>
            <View style={[
              styles.attachmentsMenu,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
            ]}>
              <Text style={[styles.attachmentsTitle, { color: theme.text, fontSize: fontSize(16) }]}>
                {t('chats.attachments') || 'Attachments'}
              </Text>
              
              <View style={styles.attachmentsGrid}>
                {/* Camera */}
                <TouchableOpacity 
                  style={styles.attachmentItem}
                  onPress={handleTakePicture}
                  activeOpacity={0.7}>
                  <View style={[styles.attachmentIconContainer, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="camera" size={moderateScale(24)} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.attachmentLabel, { color: theme.text, fontSize: fontSize(12) }]}>
                    {t('chats.camera') || 'Camera'}
                  </Text>
                </TouchableOpacity>
                
                {/* Gallery */}
                <TouchableOpacity 
                  style={styles.attachmentItem}
                  onPress={handlePickImage}
                  activeOpacity={0.7}>
                  <View style={[styles.attachmentIconContainer, { backgroundColor: '#8B5CF6' }]}>
                    <Ionicons name="images" size={moderateScale(24)} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.attachmentLabel, { color: theme.text, fontSize: fontSize(12) }]}>
                    {t('chats.gallery') || 'Gallery'}
                  </Text>
                </TouchableOpacity>
                
                {/* Location */}
                <TouchableOpacity 
                  style={styles.attachmentItem}
                  onPress={handleSendLocation}
                  disabled={locationLoading}
                  activeOpacity={0.7}>
                  <View style={[styles.attachmentIconContainer, { backgroundColor: '#F59E0B' }]}>
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="location" size={moderateScale(24)} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.attachmentLabel, { color: theme.text, fontSize: fontSize(12) }]}>
                    {t('chats.location') || 'Location'}
                  </Text>
                </TouchableOpacity>
                
                {/* Files (Coming Soon) */}
                <TouchableOpacity 
                  style={styles.attachmentItem}
                  onPress={handleSendFile}
                  activeOpacity={0.7}>
                  <View style={[styles.attachmentIconContainer, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="document" size={moderateScale(24)} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.attachmentLabel, { color: theme.text, fontSize: fontSize(12) }]}>
                    {t('chats.file') || 'File'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Location Preview Modal */}
        <Modal
          visible={showLocationPreview}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelLocation}>
          <Pressable 
            style={styles.locationModalOverlay}
            onPress={handleCancelLocation}>
            <View style={[
              styles.locationModalContent,
              { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
            ]}>
              <Text style={[styles.locationModalTitle, { color: theme.text, fontSize: fontSize(18) }]}>
                {t('chats.locationPreview') || 'Send Location'}
              </Text>
              
              {pendingLocation && (
                <>
                  <View style={styles.locationMapContainer}>
                    <Image
                      source={{ uri: `https://maps.googleapis.com/maps/api/staticmap?center=${pendingLocation.lat},${pendingLocation.long}&zoom=15&size=600x300&markers=color:red%7C${pendingLocation.lat},${pendingLocation.long}&key=` }}
                      style={styles.locationMapImage}
                      resizeMode="cover"
                    />
                    <View style={styles.locationMapPin}>
                      <Ionicons name="location" size={moderateScale(32)} color="#EF4444" />
                    </View>
                  </View>
                  
                  <View style={styles.locationCoords}>
                    <Ionicons name="location-outline" size={moderateScale(16)} color={theme.primary} />
                    <Text style={[styles.locationCoordsText, { color: theme.textSecondary, fontSize: fontSize(13) }]}>
                      {`${pendingLocation.lat.toFixed(6)}, ${pendingLocation.long.toFixed(6)}`}
                    </Text>
                  </View>
                  
                  <Text style={[styles.locationConfirmText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                    {t('chats.sendLocationConfirm') || 'Send this location to the chat?'}
                  </Text>
                </>
              )}
              
              <View style={styles.locationButtons}>
                <TouchableOpacity
                  style={[styles.locationCancelBtn, { borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]}
                  onPress={handleCancelLocation}
                  activeOpacity={0.7}>
                  <Text style={[styles.locationCancelText, { color: theme.textSecondary, fontSize: fontSize(15) }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.locationSendBtn, { backgroundColor: theme.primary }]}
                  onPress={handleConfirmLocation}
                  activeOpacity={0.7}>
                  <Ionicons name="send" size={moderateScale(16)} color="#FFFFFF" />
                  <Text style={[styles.locationSendText, { fontSize: fontSize(15) }]}>
                    {t('chats.sendLocationButton') || 'Send'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontWeight: '400',
  },
  cancelReplyButton: {
    padding: spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  imagePreview: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  iconButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  imageIconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: moderateScale(100),
  },
  input: {
    maxHeight: moderateScale(80),
    minHeight: moderateScale(20),
  },
  sendButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionSuggestions: {
    position: 'absolute',
    bottom: moderateScale(60),
    left: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
    maxHeight: moderateScale(180),
  },
  mentionSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  mentionSuggestionText: {
    fontWeight: '500',
    flex: 1,
  },
  mentionAvatar: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
  },
  mentionIcon: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Attachments Menu Styles
  attachmentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachmentsMenu: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  attachmentsTitle: {
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  attachmentItem: {
    alignItems: 'center',
    width: moderateScale(70),
  },
  attachmentIconContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  attachmentLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  // Location Preview Modal Styles
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  locationModalContent: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  locationModalTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  locationMapContainer: {
    width: '100%',
    height: moderateScale(180),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationMapImage: {
    width: '100%',
    height: '100%',
  },
  locationMapPin: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationCoordsText: {
    fontWeight: '500',
  },
  locationConfirmText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  locationCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCancelText: {
    fontWeight: '600',
  },
  locationSendBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  locationSendText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MessageInput;
