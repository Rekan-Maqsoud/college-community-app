import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../components/icons/CompatIonicon';
import { useAppSettings } from '../../context/AppSettingsContext';
import { GlassCard } from '../../components/GlassComponents';
import { borderRadius } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSettingsAccentColor, getSettingsHeaderGradient } from './settingsTheme';

const Settings = ({ navigation }) => {
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const insets = useSafeAreaInsets();
  const backIconName = isRTL ? 'arrow-forward' : 'arrow-back';
  const chevronIconName = isRTL ? 'chevron-back' : 'chevron-forward';

  const settingsSections = [
    {
      id: 'profile',
      title: t('settings.profileSettings'),
      description: t('settings.profileDesc') || 'Manage your profile information',
      icon: 'person-outline',
      screen: 'ProfileSettings',
    },
    {
      id: 'personalization',
      title: t('settings.personalization') || 'Personalization',
      description: t('settings.personalizationDesc') || 'Customize theme, language, and display',
      icon: 'color-palette-outline',
      screen: 'PersonalizationSettings',
    },
    {
      id: 'chat',
      title: t('settings.chatCustomization') || 'Chat Customization',
      description: t('settings.chatCustomizationDesc') || 'Bubble style, colors, and backgrounds',
      icon: 'chatbubbles-outline',
      screen: 'ChatSettings',
    },
    {
      id: 'notifications',
      title: t('settings.notifications'),
      description: t('settings.notificationDesc'),
      icon: 'notifications-outline',
      screen: 'NotificationSettings',
    },
    {
      id: 'suggestions',
      title: t('settings.suggestions'),
      description: t('settings.suggestionsDesc'),
      icon: 'bulb-outline',
      screen: 'SuggestionSettings',
    },
    {
      id: 'blocklist',
      title: t('settings.blockedUsers') || 'Blocked Users',
      description: t('settings.blockedUsersDesc') || 'Manage your blocked users list',
      icon: 'person-remove-outline',
      screen: 'BlockList',
    },
    {
      id: 'saved',
      title: t('settings.savedPosts'),
      description: t('settings.savedPostsDesc'),
      icon: 'bookmark-outline',
      screen: 'SavedPosts',
    },
    {
      id: 'representatives',
      title: t('settings.classRepresentative'),
      description: t('settings.classRepresentativeDesc'),
      icon: 'people-outline',
      screen: 'RepVoting',
    },
    {
      id: 'account',
      title: t('settings.accountSettings'),
      description: t('settings.accountDesc') || 'Password, security, and account actions',
      icon: 'shield-checkmark-outline',
      screen: 'AccountSettings',
    },
  ];

  const SettingCard = ({ item }) => {
    const accentColor = getSettingsAccentColor(item.screen, theme);

    return (
    <TouchableOpacity
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}>
      <GlassCard
        style={[styles.card]}
        padding={0}
      >
        <View style={[styles.cardContent, isRTL && styles.rowReverse]}>
          <View style={[styles.iconContainer, isRTL ? styles.iconContainerRtl : styles.iconContainerLtr, { backgroundColor: `${accentColor}15` }]}>
            <Ionicons name={item.icon} size={moderateScale(22)} color={accentColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, isRTL && styles.directionalText, { color: theme.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.cardDescription, isRTL && styles.directionalText, { color: theme.textSecondary }]}>
              {item.description}
            </Text>
          </View>
          <Ionicons name={chevronIconName} size={moderateScale(18)} color={theme.textSecondary} />
        </View>
      </GlassCard>
    </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={getSettingsHeaderGradient('ProfileSettings', { theme, isDarkMode })}
        style={styles.headerGradient}
      />

      <View style={[styles.header, isRTL && styles.rowReverse, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}>
          <Ionicons name={backIconName} size={moderateScale(22)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.directionalText, { color: theme.text }]}>
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
          <Text style={[styles.versionText, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
            {t('settings.version')} 1.1.0
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
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerLtr: {
    marginRight: spacing.md,
  },
  iconContainerRtl: {
    marginLeft: spacing.md,
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
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default Settings;
