import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  fontSize, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import { MUTE_DURATIONS, MUTE_TYPES } from '../../../database/userChatSettings';
import { chatRoomStyles as styles } from './styles';

export const MuteModal = ({ 
  visible, 
  onClose, 
  muteStatus, 
  onMute, 
  onUnmute,
  theme,
  isDarkMode,
  t 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
        ]}>
          <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18) }]}>
            {t('chats.muteOptions')}
          </Text>
          
          {muteStatus.isMuted ? (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onUnmute}>
              <Ionicons name="notifications-outline" size={moderateScale(22)} color="#10B981" />
              <Text style={[styles.muteOptionText, { color: '#10B981', fontSize: fontSize(15) }]}>
                {t('chats.unmute')}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.ONE_HOUR)}>
                <Ionicons name="time-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor1Hour')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.EIGHT_HOURS)}>
                <Ionicons name="time-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor8Hours')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.ONE_DAY)}>
                <Ionicons name="today-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor1Day')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.ONE_WEEK)}>
                <Ionicons name="calendar-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor1Week')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.FOREVER)}>
                <Ionicons name="notifications-off-outline" size={moderateScale(22)} color="#F59E0B" />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteForever')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.FOREVER, MUTE_TYPES.MENTIONS_ONLY)}>
                <Ionicons name="at-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteMentionsOnly')}
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: theme.textSecondary, fontSize: fontSize(15) }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const PinnedMessagesModal = ({ 
  visible, 
  onClose, 
  pinnedMessages, 
  canPin,
  onUnpinMessage,
  onPinnedMessagePress,
  theme,
  isDarkMode,
  t 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[
          styles.pinnedModalContent,
          { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
        ]}>
          <View style={styles.pinnedModalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18), marginBottom: 0 }]}>
              {t('chats.pinnedMessages')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={moderateScale(24)} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.pinnedList}>
            {pinnedMessages.length === 0 ? (
              <View style={styles.emptyPinned}>
                <Ionicons name="pin-outline" size={moderateScale(40)} color={theme.textSecondary} />
                <Text style={[styles.emptyPinnedText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                  {t('chats.noPinnedMessages')}
                </Text>
              </View>
            ) : (
              pinnedMessages.map((msg) => (
                <TouchableOpacity
                  key={msg.$id}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (onPinnedMessagePress) {
                      onPinnedMessagePress(msg.$id);
                    }
                  }}
                  style={[
                    styles.pinnedMessageItem,
                    { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                  ]}>
                  <View style={styles.pinnedMessageContent}>
                    <Text style={[styles.pinnedSenderName, { color: theme.primary, fontSize: fontSize(12) }]}>
                      {msg.senderName}
                    </Text>
                    <Text style={[styles.pinnedMessageText, { color: theme.text, fontSize: fontSize(14) }]} numberOfLines={2}>
                      {msg.content || t('chats.image')}
                    </Text>
                  </View>
                  {canPin && (
                    <TouchableOpacity
                      onPress={() => {
                        onUnpinMessage(msg);
                        onClose();
                      }}>
                      <Ionicons name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const ChatOptionsModal = ({ 
  visible, 
  onClose, 
  chat,
  chatDisplayName,
  muteStatus,
  onVisitProfile,
  onOpenMuteModal,
  onViewPinnedMessages,
  onBlockUser,
  onOpenGroupSettings,
  onClearChat,
  showAlert,
  theme,
  isDarkMode,
  t 
}) => {

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }
        ]}>
          <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18) }]}>
            {chatDisplayName}
          </Text>
          
          {chat.type === 'private' && chat.otherUser && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onVisitProfile}>
              <Ionicons name="person-outline" size={moderateScale(22)} color={theme.primary} />
              <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                {t('chats.visitProfile')}
              </Text>
            </TouchableOpacity>
          )}
          
          {chat.type === 'custom_group' && onOpenGroupSettings && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onOpenGroupSettings}>
              <Ionicons name="settings-outline" size={moderateScale(22)} color={theme.primary} />
              <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                {t('chats.groupSettings')}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={onOpenMuteModal}>
            <Ionicons 
              name={muteStatus.isMuted ? 'notifications-outline' : 'notifications-off-outline'} 
              size={moderateScale(22)} 
              color={theme.primary} 
            />
            <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
              {muteStatus.isMuted ? t('chats.unmute') : t('chats.mute')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={onViewPinnedMessages}>
            <Ionicons name="pin-outline" size={moderateScale(22)} color={theme.primary} />
            <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
              {t('chats.pinnedMessages')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => {
              onClose();
              showAlert({ type: 'info', title: t('common.info'), message: t('chats.searchComingSoon') });
            }}>
            <Ionicons name="search-outline" size={moderateScale(22)} color={theme.primary} />
            <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
              {t('chats.searchInChat')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => {
              onClose();
              if (onClearChat) {
                // Call handleClearChat directly — it already shows its own confirmation alert
                onClearChat();
              }
            }}>
            <Ionicons name="trash-outline" size={moderateScale(22)} color="#EF4444" />
            <Text style={[styles.muteOptionText, { color: '#EF4444', fontSize: fontSize(15) }]}>
              {t('chats.clearChat')}
            </Text>
          </TouchableOpacity>
          
          {chat.type === 'private' && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onBlockUser}>
              <Ionicons name="ban-outline" size={moderateScale(22)} color="#EF4444" />
              <Text style={[styles.muteOptionText, { color: '#EF4444', fontSize: fontSize(15) }]}>
                {t('chats.blockUser')}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: theme.textSecondary, fontSize: fontSize(15) }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
