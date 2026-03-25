import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Keyboard, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '../../components/icons/CompatIonicon';
import IoniconSvg, { hasIoniconSvg } from '../../components/icons/IoniconSvg';
import { postDetailsStyles as styles } from './styles';
import { getFriends, searchUsers } from '../../../database/users';
import { moderateScale, fontSize, spacing, isSmallDevice } from '../../utils/responsive';
import { GlassInput } from '../../components/GlassComponents';
import ProfilePicture from '../../components/ProfilePicture';
import { useAppSettings } from '../../context/AppSettingsContext';
import { Image } from 'expo-image';

const ReplyInputSection = ({
  editingReply,
  replyingTo,
  replyText,
  setReplyText,
  replyImages,
  replyLinks,
  linkInput,
  showLinksSection,
  isSubmitting,
  theme,
  isDarkMode,
  t,
  onResetForm,
  onCancelReply,
  onRemoveImage,
  onRemoveLink,
  onLinkInputChange,
  onAddLink,
  onPickImages,
  onPickFromGallery,
  onTakePhoto,
  onToggleLinksSection,
  onSubmit,
  currentUserId,
  inputRef,
}) => {
  const insets = useSafeAreaInsets();
  const { isRTL } = useAppSettings();
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const actionSheetAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.spring(actionSheetAnim, {
      toValue: showActionSheet ? 1 : 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [actionSheetAnim, showActionSheet]);

  const loadFriends = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const userFriends = await getFriends(currentUserId);
      setFriends(userFriends || []);
    } catch (error) {
      setFriends([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleTextChange = async (text) => {
    setReplyText(text);
    
    // Check for @ mention trigger
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(true);
        
        // Get suggestions
        await updateMentionSuggestions(textAfterAt);
        return;
      }
    }
    
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const updateMentionSuggestions = async (query) => {
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // First show friends that match
    const matchingFriends = friends.filter(friend => {
      const name = (friend.name || friend.fullName || '').toLowerCase();
      return name.includes(queryLower);
    }).slice(0, 3);
    
    matchingFriends.forEach(friend => {
      suggestions.push({
        id: friend.$id,
        name: friend.name || friend.fullName,
        displayName: friend.name || friend.fullName,
        profilePicture: friend.profilePicture,
        isFriend: true,
      });
    });
    
    // If query is 2+ chars and we have less than 3 suggestions, search for more users
    if (query.length >= 2 && suggestions.length < 3) {
      setIsSearchingUsers(true);
      try {
        const searchResults = await searchUsers(query, 5);
        const friendIds = friends.map(f => f.$id);
        
        searchResults
          .filter(u => u.$id !== currentUserId && !friendIds.includes(u.$id))
          .slice(0, 3 - suggestions.length)
          .forEach(user => {
            suggestions.push({
              id: user.$id,
              name: user.name || user.fullName,
              displayName: user.name || user.fullName,
              profilePicture: user.profilePicture,
              isFriend: false,
            });
          });
      } catch (error) {
        // Silent fail
      } finally {
        setIsSearchingUsers(false);
      }
    }
    
    setMentionSuggestions(suggestions.slice(0, 3));
  };

  const handleSelectMention = (suggestion) => {
    const beforeMention = replyText.slice(0, mentionStartIndex);
    const afterMention = replyText.slice(mentionStartIndex + mentionQuery.length + 1);
    const mentionText = `@${suggestion.name}`;
    
    setReplyText(beforeMention + mentionText + ' ' + afterMention);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    setMentionSuggestions([]);
  };

  const replyingToName = replyingTo?.userData?.fullName || replyingTo?.userData?.name || t('common.user');
  const attachmentCount = replyImages.length + replyLinks.length;
  const canSend = replyText.trim().length > 0 && !isSubmitting;
  const compactComposer = isSmallDevice();
  const bottomPadding = Platform.OS === 'android'
    ? Math.max(insets.bottom + spacing.md, spacing.lg)
    : Math.max(insets.bottom, spacing.xs);
  const sendIconName = editingReply ? 'checkmark' : (isRTL ? 'arrow-back' : 'send');
  const composerButtonSize = moderateScale(compactComposer ? 36 : 40);
  const composerButtonRadius = moderateScale(compactComposer ? 13 : 15);
  const idleButtonBackground = isDarkMode ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.12)';
  const activeButtonBackground = isDarkMode ? 'rgba(59,130,246,0.86)' : theme.primary;
  const inputSurfaceBackground = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.76)';
  const inputSurfaceBorderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.58)';

  const openLinksSection = () => {
    if (!showLinksSection) {
      onToggleLinksSection();
    }
    setShowActionSheet(false);
  };

  const actionItems = [
    {
      key: 'gallery',
      icon: 'images',
      color: '#8B5CF6',
      label: t('post.gallery'),
      onPress: () => {
        setShowActionSheet(false);
        if (onPickFromGallery) {
          onPickFromGallery();
          return;
        }
        onPickImages();
      },
    },
    {
      key: 'camera',
      icon: 'camera',
      color: '#10B981',
      label: t('post.camera'),
      onPress: () => {
        setShowActionSheet(false);
        if (onTakePhoto) {
          onTakePhoto();
          return;
        }
        onPickImages();
      },
    },
    {
      key: 'link',
      icon: 'link',
      color: '#3B82F6',
      label: t('post.links'),
      onPress: openLinksSection,
    },
    {
      key: 'mention',
      icon: 'at',
      color: '#6366F1',
      label: t('chats.tagUser'),
      onPress: () => {
        setShowActionSheet(false);
        setReplyText((prev) => `${prev}@`);
        setTimeout(() => inputRef?.current?.focus?.(), 80);
      },
    },
  ];

  const renderIcon = (name, size, color, style) => {
    if (hasIoniconSvg(name)) {
      return <IoniconSvg name={name} size={size} color={color} style={style} />;
    }
    return <Ionicons name={name} size={size} color={color} style={style} />;
  };

  return (
    <View
      style={[
        styles.inputSection,
        {
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderTopColor: theme.border,
          paddingBottom: bottomPadding,
        },
      ]}>
      {editingReply && (
        <View style={styles.editingBanner}>
          <Text style={styles.editingBannerText}>{t('post.editingReply')}</Text>
          <TouchableOpacity onPress={onResetForm}>
            <IoniconSvg name="close-circle" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {!editingReply && replyingTo && (
        <View style={styles.replyingBanner}>
          <Text style={styles.replyingBannerText}>
            {t('post.replyingTo').replace('{name}', replyingToName)}
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <IoniconSvg name="close-circle" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {showMentionSuggestions && mentionSuggestions.length > 0 && (
        <View style={[mentionStyles.suggestionsContainer, { backgroundColor: isDarkMode ? '#2D3748' : '#FFFFFF', borderColor: theme.border }]}>
          {isSearchingUsers && (
            <View style={mentionStyles.searchingIndicator}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}
          {mentionSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[mentionStyles.suggestionItem, { borderBottomColor: theme.border }]}
              onPress={() => handleSelectMention(suggestion)}
            >
              <ProfilePicture
                uri={suggestion.profilePicture}
                name={suggestion.displayName}
                size={32}
              />
              <View style={[mentionStyles.suggestionInfo, isRTL && mentionStyles.suggestionInfoRtl]}>
                <Text style={[mentionStyles.suggestionName, { color: theme.text }]}>
                  {suggestion.displayName}
                </Text>
                {suggestion.isFriend && (
                  <Text style={[mentionStyles.friendBadge, { color: theme.primary }]}>
                    {t('chats.friend') || 'Friend'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {replyImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
          {replyImages.map((uri, index) => (
            <View key={index} style={styles.imagePreviewItem}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => onRemoveImage(index)}>
                <IoniconSvg name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {showLinksSection && (
        <View style={styles.linksSection}>
          {replyLinks.map((link, index) => (
            <View key={index} style={[styles.linkChip, isRTL && localStyles.linkChipRtl, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }]}>
              <IoniconSvg name="link-outline" size={14} color="#3B82F6" />
              <Text style={styles.linkChipText} numberOfLines={1}>{link}</Text>
              <TouchableOpacity onPress={() => onRemoveLink(index)}>
                <IoniconSvg name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.linkInputRow}>
            <GlassInput style={{ flex: 1, marginRight: spacing.sm, height: moderateScale(40) }} focused={false}>
              <TextInput
                style={[styles.linkInput, { flex: 1, backgroundColor: 'transparent', color: theme.text, margin: 0 }]}
                placeholder={t('post.linksPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={linkInput}
                onChangeText={onLinkInputChange}
                onSubmitEditing={onAddLink}
                autoCapitalize="none"
                keyboardType="url"
              />
            </GlassInput>
            <TouchableOpacity 
              style={[styles.addLinkBtn, { opacity: linkInput.trim() ? 1 : 0.5 }]} 
              onPress={onAddLink}
              disabled={!linkInput.trim()}
            >
              <IoniconSvg name="add-circle" size={28} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={localStyles.composerShell}>
        <View style={[localStyles.composerRow, isRTL && localStyles.composerRowRtl]}>
          <TouchableOpacity
            style={[
              localStyles.composerIconButton,
              {
                width: composerButtonSize,
                height: composerButtonSize,
                minWidth: composerButtonSize,
                minHeight: composerButtonSize,
                borderRadius: composerButtonRadius,
                backgroundColor: showActionSheet ? activeButtonBackground : idleButtonBackground,
              },
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setShowActionSheet((prev) => !prev);
            }}
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
              <IoniconSvg
                name="add"
                size={moderateScale(compactComposer ? 19 : 20)}
                color={showActionSheet ? '#FFFFFF' : theme.primary}
              />
            </Animated.View>
            {attachmentCount > 0 && (
              <View style={localStyles.inlineBadge}>
                <Text style={localStyles.inlineBadgeText}>{attachmentCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View
            style={[
              localStyles.textInputColumn,
              {
                backgroundColor: inputSurfaceBackground,
                borderColor: inputSurfaceBorderColor,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.replyTextInput,
                localStyles.replyTextInput,
                {
                  backgroundColor: 'transparent',
                  color: theme.text,
                  borderColor: 'transparent',
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
              placeholder={t('post.writeReply')}
              placeholderTextColor={theme.textSecondary}
              value={replyText}
              onChangeText={handleTextChange}
              onFocus={() => setShowActionSheet(false)}
              multiline
              maxLength={2000}
            />
            <View style={[localStyles.composerMetaRow, isRTL && localStyles.composerMetaRowRtl]}>
              <Text style={[localStyles.composerMetaText, { color: theme.textSecondary }]}>
                {attachmentCount > 0
                  ? t('post.images') + ` ${attachmentCount}`
                  : t('post.reply')}
              </Text>
              <Text style={[localStyles.composerMetaText, { color: theme.textSecondary }]}>
                {replyText.length}/2000
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              localStyles.sendButton,
              {
                width: composerButtonSize,
                height: composerButtonSize,
                minWidth: composerButtonSize,
                minHeight: composerButtonSize,
                borderRadius: composerButtonRadius,
                backgroundColor: canSend ? activeButtonBackground : idleButtonBackground,
              },
            ]}
            onPress={onSubmit}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              renderIcon(sendIconName, moderateScale(18), canSend ? '#FFFFFF' : theme.textSecondary)
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showActionSheet && (
        <Animated.View
          style={[
            localStyles.actionSheet,
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
          <View style={localStyles.actionGrid}>
            {actionItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={localStyles.actionItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[localStyles.actionIconCircle, { backgroundColor: `${item.color}18` }]}>
                  {renderIcon(item.icon, moderateScale(22), item.color)}
                </View>
                <Text style={[localStyles.actionLabel, { color: theme.text }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const mentionStyles = StyleSheet.create({
  suggestionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 4,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  searchingIndicator: {
    padding: 8,
    alignItems: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.5,
  },
  suggestionInfo: {
    marginLeft: 10,
    flex: 1,
  },
  suggestionInfoRtl: {
    marginLeft: 0,
    marginRight: 10,
    alignItems: 'flex-end',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  friendBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

const localStyles = StyleSheet.create({
  composerShell: {
    marginTop: spacing.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  composerRowRtl: {
    flexDirection: 'row-reverse',
  },
  composerIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  textInputColumn: {
    flex: 1,
    minHeight: moderateScale(56),
    borderRadius: moderateScale(18),
    borderWidth: 1,
    paddingHorizontal: moderateScale(14),
    paddingTop: moderateScale(8),
    paddingBottom: moderateScale(6),
  },
  replyTextInput: {
    borderWidth: 0,
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: moderateScale(4),
    minHeight: moderateScale(34),
    maxHeight: moderateScale(110),
  },
  composerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: moderateScale(16),
  },
  composerMetaRowRtl: {
    flexDirection: 'row-reverse',
  },
  composerMetaText: {
    fontSize: fontSize(11),
    fontWeight: '500',
  },
  linkChipRtl: {
    flexDirection: 'row-reverse',
  },
  inlineBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#3B82F6',
    borderRadius: moderateScale(8),
    minWidth: moderateScale(16),
    height: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  inlineBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(9),
    fontWeight: '700',
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  actionSheet: {
    marginTop: spacing.sm,
    borderRadius: moderateScale(16),
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '24%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIconCircle: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(21),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: fontSize(11),
    fontWeight: '500',
  },
});

export default ReplyInputSection;
