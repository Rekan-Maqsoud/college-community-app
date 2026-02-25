import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { borderRadius, shadows } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useLayout from '../../hooks/useLayout';
const NotificationSettings = ({ navigation }) => {
  const { contentStyle } = useLayout();
  const {
    t,
    theme,
    isDarkMode,
    notificationsEnabled,
    toggleNotifications,
    notificationSettings,
    updateNotificationSetting,
    quietHours,
    updateQuietHours,
  } = useAppSettings();
  const insets = useSafeAreaInsets();

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState('start');
  const [tempTime, setTempTime] = useState('');

  const openTimePicker = (type) => {
    setTimePickerType(type);
    setTempTime(type === 'start' ? quietHours.startTime : quietHours.endTime);
    setTimePickerVisible(true);
  };

  const saveTime = () => {
    if (tempTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(tempTime)) {
      if (timePickerType === 'start') {
        updateQuietHours({ startTime: tempTime, enabled: true });
      } else {
        updateQuietHours({ endTime: tempTime, enabled: true });
      }
    }
    setTimePickerVisible(false);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(52, 199, 89, 0.15)', 'transparent']
          : ['rgba(52, 199, 89, 0.1)', 'transparent']
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
            {t('settings.notifications')}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentStyle]}>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.generalNotifications') || 'General'}
          </Text>
          <GlassCard>
            <View style={styles.settingItem}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' },
              ]}>
                <Ionicons name="notifications-outline" size={moderateScale(18)} color="#34C759" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {t('settings.enableNotifications')}
                </Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  {t('settings.notificationDesc')}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: theme.border, true: '#34C759' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={theme.border}
              />
            </View>
          </GlassCard>
        </View>

        {notificationsEnabled && (
          <>
            {/* Quiet Hours Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {t('settings.quietHours') || 'Quiet Hours'}
              </Text>
              <GlassCard>
                <View style={styles.settingItem}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: isDarkMode ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.1)' },
                  ]}>
                    <Ionicons name="moon-outline" size={moderateScale(18)} color="#AF52DE" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                      {t('settings.enableQuietHours') || 'Enable Quiet Hours'}
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                      {t('settings.quietHoursDesc') || 'Disable notifications during set hours'}
                    </Text>
                  </View>
                  <Switch
                    value={quietHours.enabled}
                    onValueChange={(value) => updateQuietHours({ enabled: value })}
                    trackColor={{ false: theme.border, true: '#AF52DE' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={theme.border}
                  />
                </View>
                
                {quietHours.enabled && (
                  <>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.scheduleRow}>
                      <View style={styles.scheduleItem}>
                        <Text style={[styles.scheduleLabel, { color: theme.textSecondary }]}>
                          {t('settings.quietStart') || 'Start'}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                          onPress={() => openTimePicker('start')}>
                          <Ionicons name="time-outline" size={moderateScale(16)} color="#AF52DE" />
                          <Text style={[styles.timeText, { color: theme.text }]}>
                            {quietHours.startTime}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.scheduleItem}>
                        <Text style={[styles.scheduleLabel, { color: theme.textSecondary }]}>
                          {t('settings.quietEnd') || 'End'}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                          onPress={() => openTimePicker('end')}>
                          <Ionicons name="time-outline" size={moderateScale(16)} color="#AF52DE" />
                          <Text style={[styles.timeText, { color: theme.text }]}>
                            {quietHours.endTime}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {t('settings.notificationCategories') || 'Categories'}
              </Text>
              <GlassCard>
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isDarkMode ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.1)' },
                ]}>
                  <Ionicons name="chatbubble-outline" size={moderateScale(18)} color="#0A84FF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {t('settings.directChatNotifications') || 'Direct Chats'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {t('settings.directChatNotificationsDesc') || 'Notifications for private messages'}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings?.directChats !== false}
                  onValueChange={(value) => updateNotificationSetting('directChats', value)}
                  trackColor={{ false: theme.border, true: '#0A84FF' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isDarkMode ? 'rgba(255, 159, 10, 0.15)' : 'rgba(255, 159, 10, 0.1)' },
                ]}>
                  <Ionicons name="people-outline" size={moderateScale(18)} color="#FF9F0A" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {t('settings.groupChatNotifications') || 'Group Chats'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {t('settings.groupChatNotificationsDesc') || 'Notifications for group messages'}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings?.groupChats !== false}
                  onValueChange={(value) => updateNotificationSetting('groupChats', value)}
                  trackColor={{ false: theme.border, true: '#FF9F0A' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isDarkMode ? 'rgba(191, 90, 242, 0.15)' : 'rgba(191, 90, 242, 0.1)' },
                ]}>
                  <Ionicons name="heart-outline" size={moderateScale(18)} color="#BF5AF2" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {t('settings.friendPostNotifications') || 'Friend Posts'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {t('settings.friendPostNotificationsDesc') || 'Notifications when friends post'}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings?.friendPosts !== false}
                  onValueChange={(value) => updateNotificationSetting('friendPosts', value)}
                  trackColor={{ false: theme.border, true: '#BF5AF2' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isDarkMode ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)' },
                ]}>
                  <Ionicons name="heart" size={moderateScale(18)} color="#FF3B30" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {t('settings.postLikeNotifications') || 'Post Likes'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {t('settings.postLikeNotificationsDesc') || 'When someone likes your post'}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings?.postLikes !== false}
                  onValueChange={(value) => updateNotificationSetting('postLikes', value)}
                  trackColor={{ false: theme.border, true: '#FF3B30' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isDarkMode ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' },
                ]}>
                  <Ionicons name="chatbubbles-outline" size={moderateScale(18)} color="#007AFF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {t('settings.postReplyNotifications') || 'Post Replies'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {t('settings.postReplyNotificationsDesc') || 'When someone replies to your post'}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings?.postReplies !== false}
                  onValueChange={(value) => updateNotificationSetting('postReplies', value)}
                  trackColor={{ false: theme.border, true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isDarkMode ? 'rgba(88, 86, 214, 0.15)' : 'rgba(88, 86, 214, 0.1)' },
                ]}>
                  <Ionicons name="at" size={moderateScale(18)} color="#5856D6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {t('settings.mentionNotifications') || 'Mentions'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    {t('settings.mentionNotificationsDesc') || 'When someone mentions you'}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings?.mentions !== false}
                  onValueChange={(value) => updateNotificationSetting('mentions', value)}
                  trackColor={{ false: theme.border, true: '#5856D6' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
            </GlassCard>
          </View>
          </>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={moderateScale(18)} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {t('settings.notificationInfo') || 'More notification preferences will be available in future updates'}
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Time Picker Modal for Quiet Hours */}
      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}>
          <View style={[styles.timePickerModal, { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }]}>
            <Text style={[styles.timePickerTitle, { color: theme.text }]}>
              {t('settings.setTime') || 'Set Time'}
            </Text>
            <Text style={[styles.timePickerSubtitle, { color: theme.textSecondary }]}>
              {t('settings.enterTime') || 'Enter time (HH:MM)'}
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: theme.text,
                  borderColor: theme.border,
                }
              ]}
              value={tempTime}
              onChangeText={setTempTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              autoFocus
            />
            <View style={styles.timePickerButtons}>
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: 'transparent' }]}
                onPress={() => setTimePickerVisible(false)}>
                <Text style={[styles.timePickerButtonText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: '#AF52DE' }]}
                onPress={saveTime}>
                <Text style={[styles.timePickerButtonText, { color: '#FFFFFF' }]}>
                  {t('common.ok')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  glassCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: responsiveFontSize(13),
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
    opacity: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(18),
  },
  bottomPadding: {
    height: hp(5),
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  scheduleItem: {
    flex: 1,
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: responsiveFontSize(12),
    marginBottom: spacing.sm,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  timeText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  timePickerModal: {
    width: '80%',
    maxWidth: wp(80),
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  timePickerTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  timePickerSubtitle: {
    fontSize: responsiveFontSize(14),
    marginBottom: spacing.md,
  },
  timeInput: {
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: responsiveFontSize(18),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    width: '100%',
  },
  timePickerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: moderateScale(80),
    alignItems: 'center',
  },
  timePickerButtonText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
});

export default NotificationSettings;
