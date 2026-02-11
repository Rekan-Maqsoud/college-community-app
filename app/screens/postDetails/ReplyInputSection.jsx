import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { postDetailsStyles as styles } from './styles';
import ProfilePicture from '../../components/ProfilePicture';
import { getFriends, searchUsers } from '../../../database/users';

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
  onToggleLinksSection,
  onSubmit,
  currentUserId,
  inputRef,
}) => {
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    loadFriends();
  }, [currentUserId]);

  const loadFriends = async () => {
    if (!currentUserId) return;
    try {
      const userFriends = await getFriends(currentUserId);
      setFriends(userFriends || []);
    } catch (error) {
      setFriends([]);
    }
  };

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
  return (
    <View style={[styles.inputSection, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', borderTopColor: theme.border }]}>
      {editingReply && (
        <View style={styles.editingBanner}>
          <Text style={styles.editingBannerText}>{t('post.editingReply')}</Text>
          <TouchableOpacity onPress={onResetForm}>
            <Ionicons name="close-circle" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {!editingReply && replyingTo && (
        <View style={styles.replyingBanner}>
          <Text style={styles.replyingBannerText}>
            {t('post.replyingTo').replace('{name}', replyingToName)}
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close-circle" size={22} color="#EF4444" />
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
              <View style={mentionStyles.suggestionInfo}>
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

      <TextInput
        ref={inputRef}
        style={[styles.replyTextInput, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6', color: theme.text }]}
        placeholder={t('post.writeReply')}
        placeholderTextColor={theme.textSecondary}
        value={replyText}
        onChangeText={handleTextChange}
        multiline
        maxLength={2000}
      />

      {replyImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
          {replyImages.map((uri, index) => (
            <View key={index} style={styles.imagePreviewItem}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => onRemoveImage(index)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {showLinksSection && (
        <View style={styles.linksSection}>
          {replyLinks.map((link, index) => (
            <View key={index} style={[styles.linkChip, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }]}>
              <Ionicons name="link-outline" size={14} color="#3B82F6" />
              <Text style={styles.linkChipText} numberOfLines={1}>{link}</Text>
              <TouchableOpacity onPress={() => onRemoveLink(index)}>
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.linkInputRow}>
            <TextInput
              style={[styles.linkInput, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6', color: theme.text }]}
              placeholder={t('post.linksPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={linkInput}
              onChangeText={onLinkInputChange}
              onSubmitEditing={onAddLink}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity 
              style={[styles.addLinkBtn, { opacity: linkInput.trim() ? 1 : 0.5 }]} 
              onPress={onAddLink}
              disabled={!linkInput.trim()}
            >
              <Ionicons name="add-circle" size={28} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputActions}>
        <View style={styles.inputActionsLeft}>
          <TouchableOpacity 
            style={styles.actionIconBtn} 
            onPress={onPickImages}
            disabled={replyImages.length >= 3}
          >
            <Ionicons 
              name="image-outline" 
              size={24} 
              color={replyImages.length >= 3 ? theme.textSecondary : '#3B82F6'} 
            />
            {replyImages.length > 0 && (
              <View style={styles.imageBadge}>
                <Text style={styles.imageBadgeText}>{replyImages.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionIconBtn} 
            onPress={onToggleLinksSection}
          >
            <Ionicons 
              name={showLinksSection ? 'link' : 'link-outline'} 
              size={24} 
              color={showLinksSection ? '#3B82F6' : theme.textSecondary} 
            />
            {replyLinks.length > 0 && (
              <View style={styles.imageBadge}>
                <Text style={styles.imageBadgeText}>{replyLinks.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, { opacity: replyText.trim() ? 1 : 0.5 }]}
          onPress={onSubmit}
          disabled={!replyText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.sendButtonText}>
                {editingReply ? t('common.save') : t('post.send')}
              </Text>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
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

export default ReplyInputSection;
