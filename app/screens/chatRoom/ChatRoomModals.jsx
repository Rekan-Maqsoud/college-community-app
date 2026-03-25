import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import IoniconSvg from '../../components/icons/IoniconSvg';
import { 
  fontSize, 
  moderateScale,
} from '../../utils/responsive';
import { MUTE_DURATIONS, MUTE_TYPES } from '../../../database/userChatSettings';
import { chatRoomStyles as styles } from './styles';
import { GlassModalCard } from '../../components/GlassComponents';

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
        <GlassModalCard style={[styles.modalContent, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18) }]}>
            {t('chats.muteOptions')}
          </Text>
          
          {muteStatus.isMuted ? (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onUnmute}>
              <IoniconSvg name="notifications-outline" size={moderateScale(22)} color="#10B981" />
              <Text style={[styles.muteOptionText, { color: '#10B981', fontSize: fontSize(15) }]}>
                {t('chats.unmute')}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.ONE_HOUR)}>
                <IoniconSvg name="time-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor1Hour')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.EIGHT_HOURS)}>
                <IoniconSvg name="time-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor8Hours')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.ONE_DAY)}>
                <IoniconSvg name="today-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor1Day')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.ONE_WEEK)}>
                <IoniconSvg name="calendar-outline" size={moderateScale(22)} color={theme.primary} />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteFor1Week')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.FOREVER)}>
                <IoniconSvg name="notifications-off-outline" size={moderateScale(22)} color="#F59E0B" />
                <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                  {t('chats.muteForever')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => onMute(MUTE_DURATIONS.FOREVER, MUTE_TYPES.MENTIONS_ONLY)}>
                <IoniconSvg name="at-outline" size={moderateScale(22)} color={theme.primary} />
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
        </GlassModalCard>
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
        <GlassModalCard style={[styles.pinnedModalContent, { backgroundColor: 'transparent' }]}>
          <View style={styles.pinnedModalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18), marginBottom: 0 }]}>
              {t('chats.pinnedMessages')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <IoniconSvg name="close" size={moderateScale(24)} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.pinnedList}>
            {pinnedMessages.length === 0 ? (
              <View style={styles.emptyPinned}>
                <IoniconSvg name="pin-outline" size={moderateScale(40)} color={theme.textSecondary} />
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
                      <IoniconSvg name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </GlassModalCard>
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
  onDeleteConversation,
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
        <GlassModalCard style={[styles.modalContent, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18) }]}>
            {chatDisplayName}
          </Text>
          
          {chat.type === 'private' && chat.otherUser && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onVisitProfile}>
              <IoniconSvg name="person-outline" size={moderateScale(22)} color={theme.primary} />
              <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                {t('chats.visitProfile')}
              </Text>
            </TouchableOpacity>
          )}
          
          {chat.type === 'custom_group' && onOpenGroupSettings && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onOpenGroupSettings}>
              <IoniconSvg name="settings-outline" size={moderateScale(22)} color={theme.primary} />
              <Text style={[styles.muteOptionText, { color: theme.text, fontSize: fontSize(15) }]}>
                {t('chats.groupSettings')}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={onOpenMuteModal}>
            <IoniconSvg 
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
            <IoniconSvg name="pin-outline" size={moderateScale(22)} color={theme.primary} />
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
            <IoniconSvg name="search-outline" size={moderateScale(22)} color={theme.primary} />
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
            <IoniconSvg name="trash-outline" size={moderateScale(22)} color="#EF4444" />
            <Text style={[styles.muteOptionText, { color: '#EF4444', fontSize: fontSize(15) }]}>
              {t('chats.clearChat')}
            </Text>
          </TouchableOpacity>
          
          {chat.type === 'private' && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={onBlockUser}>
              <IoniconSvg name="ban-outline" size={moderateScale(22)} color="#EF4444" />
              <Text style={[styles.muteOptionText, { color: '#EF4444', fontSize: fontSize(15) }]}>
                {t('chats.blockUser')}
              </Text>
            </TouchableOpacity>
          )}
          
          {chat.type === 'private' && onDeleteConversation && (
            <TouchableOpacity
              style={[styles.muteOption, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={() => {
                onClose();
                onDeleteConversation();
              }}>
              <IoniconSvg name="trash-bin-outline" size={moderateScale(22)} color="#EF4444" />
              <Text style={[styles.muteOptionText, { color: '#EF4444', fontSize: fontSize(15) }]}>
                {t('chats.deleteConversation') || 'Delete Conversation'}
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
        </GlassModalCard>
      </View>
    </Modal>
  );
};
