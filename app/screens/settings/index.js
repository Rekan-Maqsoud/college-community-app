import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { borderRadius } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Settings = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const insets = useSafeAreaInsets();

  const settingsSections = [
    {
      id: 'profile',
      title: t('settings.profileSettings'),
      description: t('settings.profileDesc') || 'Manage your profile information',
      icon: 'person-outline',
      color: theme.primary,
      screen: 'ProfileSettings',
    },
    {
      id: 'personalization',
      title: t('settings.personalization') || 'Personalization',
      description: t('settings.personalizationDesc') || 'Customize theme, language, and display',
      icon: 'color-palette-outline',
      color: '#FF9500',
      screen: 'PersonalizationSettings',
    },
    {
      id: 'chat',
      title: t('settings.chatCustomization') || 'Chat Customization',
      description: t('settings.chatCustomizationDesc') || 'Bubble style, colors, and backgrounds',
      icon: 'chatbubbles-outline',
      color: '#AF52DE',
      screen: 'ChatSettings',
    },
    {
      id: 'notifications',
      title: t('settings.notifications'),
      description: t('settings.notificationDesc'),
      icon: 'notifications-outline',
      color: '#34C759',
      screen: 'NotificationSettings',
    },
    {
      id: 'blocklist',
      title: t('settings.blockedUsers') || 'Blocked Users',
      description: t('settings.blockedUsersDesc') || 'Manage your blocked users list',
      icon: 'person-remove-outline',
      color: '#8E8E93',
      screen: 'BlockList',
    },
    {
      id: 'saved',
      title: t('settings.savedPosts'),
      description: t('settings.savedPostsDesc'),
      icon: 'bookmark-outline',
      color: '#5856D6',
      screen: 'SavedPosts',
    },
    {
      id: 'account',
      title: t('settings.accountSettings'),
      description: t('settings.accountDesc') || 'Password, security, and account actions',
      icon: 'shield-checkmark-outline',
      color: '#FF3B30',
      screen: 'AccountSettings',
    },
  ];

  const SettingCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.6)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
        },
      ]}>
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? `${item.color}15` : `${item.color}15` }]}>
          <Ionicons name={item.icon} size={moderateScale(22)} color={item.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={moderateScale(18)} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(10, 132, 255, 0.15)', 'transparent']
          : ['rgba(0, 122, 255, 0.1)', 'transparent']
        }
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={moderateScale(22)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('settings.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        <View style={styles.cardsContainer}>
          {settingsSections.map((section) => (
            <SettingCard key={section.id} item={section} />
          ))}
        </View>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            {t('settings.version')} 1.0.0
          </Text>
        </View>
      </ScrollView>
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
    height: hp(25),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
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
  headerTitle: {
    flex: 1,
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: moderateScale(40),
  },
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: responsiveFontSize(17),
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  cardDescription: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(18),
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
  },
  versionText: {
    fontSize: responsiveFontSize(13),
  },
});

export default Settings;
