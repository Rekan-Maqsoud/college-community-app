import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { getBlockedUsers, getChatBlockedUsers, unblockUser, unblockUserChatOnly } from '../../../database/users';
import { borderRadius, shadows } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useLayout from '../../hooks/useLayout';

const BlockList = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [chatBlockedUsers, setChatBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);
  const [unblockingChat, setUnblockingChat] = useState(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user?.$id) return;
    
    try {
      setLoading(true);
      const [users, chatUsers] = await Promise.all([
        getBlockedUsers(user.$id),
        getChatBlockedUsers(user.$id),
      ]);
      setBlockedUsers(users);
      setChatBlockedUsers(chatUsers);
    } catch (error) {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = async (blockedUserId, blockedUserName) => {
    showAlert({
      type: 'warning',
      title: t('settings.unblockUser'),
      message: t('settings.unblockConfirm').replace('{name}', blockedUserName),
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.unblock'),
          onPress: async () => {
            try {
              setUnblocking(blockedUserId);
              await unblockUser(user.$id, blockedUserId);
              setBlockedUsers(prev => prev.filter(u => u.$id !== blockedUserId));
              // Refresh user context so blockedUsers is updated for filtering
              if (refreshUser) await refreshUser();
            } catch (error) {
              showAlert({
                type: 'error',
                title: t('common.error'),
                message: t('settings.unblockError'),
              });
            } finally {
              setUnblocking(null);
            }
          },
        },
      ],
    });
  };

  const handleUnblockChatOnly = async (blockedUserId, blockedUserName) => {
    showAlert({
      type: 'warning',
      title: t('settings.unblockUser') || 'Unblock User',
      message: (t('settings.unblockConfirm') || 'Are you sure you want to unblock {name}?').replace('{name}', blockedUserName),
      buttons: [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('common.unblock') || 'Unblock',
          onPress: async () => {
            try {
              setUnblockingChat(blockedUserId);
              await unblockUserChatOnly(user.$id, blockedUserId);
              setChatBlockedUsers(prev => prev.filter(u => u.$id !== blockedUserId));
              if (refreshUser) await refreshUser();
            } catch (error) {
              showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: t('settings.unblockError') || 'Failed to unblock user. Please try again.',
              });
            } finally {
              setUnblockingChat(null);
            }
          },
        },
      ],
    });
  };

  const GlassCard = ({ children, style }) => (
    <BlurView
      intensity={isDarkMode ? 30 : 0}
      tint={isDarkMode ? 'dark' : 'light'}
      style={[
        styles.glassCard,
        {
          backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.6)' : '#FFFFFF',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}>
      {children}
    </BlurView>
  );

  const renderBlockedUser = (blockedUser, onUnblock, isChatOnly = false) => (
    <View key={blockedUser.$id} style={styles.userItem}>
      <View style={styles.userInfo}>
        {blockedUser.profilePicture ? (
          <Image 
            source={{ uri: blockedUser.profilePicture }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {blockedUser.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: theme.text }]}>
            {blockedUser.name || t('common.unknownUser') || 'Unknown User'}
          </Text>
          {blockedUser.university && (
            <Text style={[styles.userUniversity, { color: theme.textSecondary }]}>
              {blockedUser.university}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, { backgroundColor: theme.primary + '15' }]}
        onPress={() => onUnblock(blockedUser.$id, blockedUser.name)}
        disabled={isChatOnly ? unblockingChat === blockedUser.$id : unblocking === blockedUser.$id}>
        {(isChatOnly ? unblockingChat === blockedUser.$id : unblocking === blockedUser.$id) ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Text style={[styles.unblockText, { color: theme.primary }]}>
            {t('common.unblock') || 'Unblock'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(102, 126, 234, 0.15)', 'transparent']
          : ['rgba(102, 126, 234, 0.1)', 'transparent']
        }
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={moderateScale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('settings.blockedUsers') || 'Blocked Users'}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentStyle]}>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('settings.blockedUsers')}
            </Text>
            {blockedUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="person-remove-outline" size={moderateScale(48)} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {t('settings.noBlockedUsers')}
                </Text>
                <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                  {t('settings.noBlockedUsersDesc')}
                </Text>
              </View>
            ) : (
              <GlassCard>
                {blockedUsers.map((userItem) => renderBlockedUser(userItem, handleUnblock))}
              </GlassCard>
            )}

            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={moderateScale(20)} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                {t('settings.blockInfo')}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('settings.chatBlockedUsers')}
            </Text>
            {chatBlockedUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={moderateScale(48)} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {t('settings.noChatBlockedUsers')}
                </Text>
                <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                  {t('settings.noChatBlockedUsersDesc')}
                </Text>
              </View>
            ) : (
              <GlassCard>
                {chatBlockedUsers.map((userItem) => renderBlockedUser(userItem, handleUnblockChatOnly, true))}
              </GlassCard>
            )}

            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={moderateScale(20)} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                {t('settings.chatBlockInfo')}
              </Text>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
  },
  placeholder: {
    width: moderateScale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  glassCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.small,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(20),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: hp(15),
    paddingHorizontal: wp(10),
  },
  emptyIcon: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: responsiveFontSize(14),
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
  },
  avatarPlaceholder: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  userDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  userName: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
  },
  userUniversity: {
    fontSize: responsiveFontSize(12),
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: moderateScale(80),
    alignItems: 'center',
  },
  unblockText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(18),
    flex: 1,
  },
  bottomPadding: {
    height: hp(5),
  },
});

export default BlockList;
