import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/GlassComponents';
import { Ionicons } from '../../components/icons/CompatIonicon';
import IoniconSvg, { hasIoniconSvg } from '../../components/icons/IoniconSvg';
import { useAppSettings } from '../../context/AppSettingsContext';
import { borderRadius } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useLayout from '../../hooks/useLayout';
import { getSettingsHeaderGradient } from './settingsTheme';

const MIN_FONT_PERCENT = 85;
const MAX_FONT_PERCENT = 130;
const ACCENT_COLOR_OPTIONS = [
  { color: null, labelKey: 'settings.colorDefault' },
  { color: '#007AFF', labelKey: 'settings.colorBlue' },
  { color: '#34C759', labelKey: 'settings.colorGreen' },
  { color: '#FF9500', labelKey: 'settings.colorOrange' },
  { color: '#FF3B30', labelKey: 'settings.colorRed' },
  { color: '#AF52DE', labelKey: 'settings.colorPurple' },
  { color: '#FF2D55', labelKey: 'settings.colorPink' },
  { color: '#5AC8FA', labelKey: 'settings.colorCyan' },
];

const PersonalizationSettings = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const {
    t,
    theme,
    isDarkMode,
    isRTL,
    themePreference,
    setThemeMode,
    currentLanguage,
    changeLanguage,
    fontScale,
    updateFontScale,
    reduceMotion,
    updateReduceMotion,
    hapticEnabled,
    updateHapticEnabled,
    showActivityStatus,
    updateShowActivityStatus,
    compactMode,
    updateCompactMode,
    accentColor,
    updateAccentColor,
    dataSaverMode,
    updateDataSaverMode,
    darkModeSchedule,
    updateDarkModeSchedule,
  } = useAppSettings();

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState('start'); // 'start' or 'end'
  const [tempTime, setTempTime] = useState('');
  const backIconName = Platform.OS === 'ios'
    ? (isRTL ? 'chevron-forward' : 'chevron-back')
    : (isRTL ? 'arrow-forward' : 'arrow-back');
  const getToggleTranslateX = (enabled) => {
    if (!enabled) {
      return 0;
    }

    return isRTL ? -20 : 20;
  };

  useEffect(() => {
    setSliderFontPercent(Math.round(fontScale * 100));
  }, [fontScale]);

  const [sliderFontPercent, setSliderFontPercent] = useState(Math.round(fontScale * 100));

  const renderIcon = (name, size, color, style) => {
    if (hasIoniconSvg(name)) {
      return <IoniconSvg name={name} size={size} color={color} style={style} />;
    }
    return <Ionicons name={name} size={size} color={color} style={style} />;
  };

  const openTimePicker = (type) => {
    setTimePickerType(type);
    setTempTime(type === 'start' ? darkModeSchedule.startTime : darkModeSchedule.endTime);
    setTimePickerVisible(true);
  };

  const saveTime = () => {
    if (tempTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(tempTime)) {
      if (timePickerType === 'start') {
        updateDarkModeSchedule({ startTime: tempTime, enabled: true });
      } else {
        updateDarkModeSchedule({ endTime: tempTime, enabled: true });
      }
    }
    setTimePickerVisible(false);
  };

  const themeOptions = [
    { value: 'light', label: t('settings.lightMode'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.darkMode'), icon: 'moon-outline' },
    { value: 'system', label: t('settings.systemDefault'), icon: 'phone-portrait-outline' },
    { value: 'scheduled', label: t('settings.scheduled') || 'Scheduled', icon: 'time-outline' },
  ];

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ku', name: 'Kurdish', nativeName: 'کوردی' },
  ];



  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={getSettingsHeaderGradient('PersonalizationSettings', { theme, isDarkMode })}
        style={styles.headerGradient}
      />

      <View style={[styles.header, isRTL && styles.rowReverse, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <IoniconSvg name={backIconName} size={moderateScale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('settings.personalization') || 'Personalization'}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentStyle]}>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.appearance')}
          </Text>
          <GlassCard>
            {themeOptions.map((option, index) => (
              <View key={option.value}>
                <TouchableOpacity
                  style={[styles.optionItem, isRTL && styles.rowReverse]}
                  onPress={() => setThemeMode(option.value)}
                  activeOpacity={0.7}>
                  <View style={[
                    styles.iconContainer,
                    isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
                    {
                      backgroundColor: themePreference === option.value
                        ? isDarkMode ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)'
                        : isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    },
                  ]}>
                    {renderIcon(option.icon, moderateScale(18), themePreference === option.value ? theme.primary : theme.textSecondary)}
                  </View>
                  <Text style={[
                    styles.optionLabel,
                    isRTL && styles.directionalText,
                    { color: themePreference === option.value ? theme.text : theme.textSecondary },
                  ]}>
                    {option.label}
                  </Text>
                  {themePreference === option.value && (
                    <IoniconSvg name="checkmark-circle" size={moderateScale(20)} color={theme.primary} />
                  )}
                </TouchableOpacity>
                {index < themeOptions.length - 1 && (
                  <View style={[styles.divider, isRTL ? styles.dividerRtl : styles.dividerLtr, { backgroundColor: theme.border }]} />
                )}
              </View>
            ))}
          </GlassCard>
          
          {themePreference === 'scheduled' && (
            <View style={{ marginTop: spacing.sm }}>
              <GlassCard>
                <View style={[styles.scheduleRow, isRTL && styles.rowReverse]}>
                  <View style={styles.scheduleItem}>
                    <Text style={[styles.scheduleLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                      {t('settings.darkModeStart') || 'Dark mode starts'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, isRTL && styles.rowReverse, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      onPress={() => openTimePicker('start')}>
                      <Ionicons name="moon-outline" size={moderateScale(16)} color={theme.primary} />
                      <Text style={[styles.timeText, { color: theme.text }]}>{darkModeSchedule.startTime}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Text style={[styles.scheduleLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                      {t('settings.darkModeEnd') || 'Dark mode ends'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.timeButton, isRTL && styles.rowReverse, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      onPress={() => openTimePicker('end')}>
                      <Ionicons name="sunny-outline" size={moderateScale(16)} color={theme.primary} />
                      <Text style={[styles.timeText, { color: theme.text }]}>{darkModeSchedule.endTime}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
              <Text style={[styles.sectionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                {t('settings.scheduleNote') || 'Dark mode will automatically switch based on these times'}
              </Text>
            </View>
          )}
        </View>

        {/* Accent Color Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.accentColor') || 'Accent Color'}
          </Text>
          <GlassCard>
            <View style={styles.colorPickerContainer}>
              {ACCENT_COLOR_OPTIONS.map((item) => {
                const isSelected = accentColor === item.color || (!accentColor && !item.color);

                return (
                  <TouchableOpacity
                    key={item.color || 'default'}
                    style={styles.colorOptionCard}
                    onPress={() => updateAccentColor(item.color)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t(item.labelKey)}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.colorOption,
                        {
                          backgroundColor: item.color || (isDarkMode ? '#0A84FF' : '#007AFF'),
                          borderWidth: isSelected ? 3 : 0,
                          borderColor: '#FFFFFF',
                        },
                      ]}
                    >
                      {isSelected ? (
                        <IoniconSvg name="checkmark" size={moderateScale(18)} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.colorOptionLabel,
                        { color: isSelected ? theme.primary : theme.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>
          <Text style={[styles.sectionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.accentColorNote') || 'Customize the app primary color'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.language')}
          </Text>
          <GlassCard>
            {languages.map((lang, index) => (
              <View key={lang.code}>
                <TouchableOpacity
                  style={[styles.optionItem, isRTL && styles.rowReverse]}
                  onPress={() => changeLanguage(lang.code)}
                  activeOpacity={0.7}>
                  <View style={[styles.languageInfo, isRTL ? styles.languageInfoRtl : styles.languageInfoLtr]}>
                    <Text style={[styles.languageNative, { color: theme.text }, isRTL && styles.directionalText]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.languageName, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                      {lang.name}
                    </Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <IoniconSvg name="checkmark-circle" size={moderateScale(20)} color={theme.primary} />
                  )}
                </TouchableOpacity>
                {index < languages.length - 1 && (
                  <View style={[styles.divider, isRTL ? styles.dividerRtl : styles.dividerLtr, { backgroundColor: theme.border }]} />
                )}
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.fontSize') || 'Font Size'}
          </Text>
          <GlassCard>
            <View style={styles.fontSliderContainer}>
              <View style={[styles.stepperRow, isRTL && styles.rowReverse]}>
                <TouchableOpacity
                  style={[styles.stepperButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => {
                    const next = Math.max(MIN_FONT_PERCENT, sliderFontPercent - 5);
                    setSliderFontPercent(next);
                    updateFontScale(next / 100);
                  }}
                  disabled={sliderFontPercent <= MIN_FONT_PERCENT}
                  activeOpacity={0.6}
                >
                  <Ionicons name="remove" size={moderateScale(22)} color={sliderFontPercent <= MIN_FONT_PERCENT ? theme.textSecondary : theme.primary} />
                </TouchableOpacity>

                <View style={styles.stepperValueContainer}>
                  <Text style={[styles.stepperValue, { color: theme.primary }]}>
                    {sliderFontPercent}%
                  </Text>
                  <Text style={[styles.stepperLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                    {t('settings.fontSize') || 'Font Size'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.stepperButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => {
                    const next = Math.min(MAX_FONT_PERCENT, sliderFontPercent + 5);
                    setSliderFontPercent(next);
                    updateFontScale(next / 100);
                  }}
                  disabled={sliderFontPercent >= MAX_FONT_PERCENT}
                  activeOpacity={0.6}
                >
                  <IoniconSvg name="add" size={moderateScale(22)} color={sliderFontPercent >= MAX_FONT_PERCENT ? theme.textSecondary : theme.primary} />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.fontPreviewCard,
                  {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontPreviewText,
                    {
                      color: theme.text,
                      fontSize: responsiveFontSize(15) * (sliderFontPercent / 100),
                    },
                  ]}
                >
                  {t('settings.fontSizePreviewSample') || t('settings.previewText')}
                </Text>
              </View>
            </View>
          </GlassCard>
          <Text style={[styles.sectionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.fontSizeNote') || 'Adjusts text size throughout the app'}
          </Text>
          <Text style={[styles.sectionNote, { color: '#FF3B30', marginTop: spacing.xs }, isRTL && styles.directionalText]}>
            {t('settings.fontSizeRestartNote') || 'Note: Font size changes may require restarting the app to take full effect.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.accessibility') || 'Accessibility'}
          </Text>
          <GlassCard>
            <TouchableOpacity
              style={[styles.optionItem, isRTL && styles.rowReverse]}
              onPress={() => updateReduceMotion(!reduceMotion)}
              activeOpacity={0.7}>
              <View style={[
                styles.iconContainer,
                isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                },
              ]}>
                <Ionicons 
                  name="flash-off-outline" 
                  size={moderateScale(18)} 
                  color={reduceMotion ? theme.primary : theme.textSecondary} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  { color: theme.text },
                  isRTL && styles.directionalText,
                ]}>
                  {t('settings.reduceMotion') || 'Reduce Motion'}
                </Text>
                <Text style={[styles.optionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.reduceMotionNote') || 'Disable animations'}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { 
                  backgroundColor: reduceMotion ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  { 
                    transform: [{ translateX: getToggleTranslateX(reduceMotion) }],
                    backgroundColor: '#FFFFFF',
                  }
                ]} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, isRTL ? styles.dividerRtl : styles.dividerLtr, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={[styles.optionItem, isRTL && styles.rowReverse]}
              onPress={() => updateHapticEnabled(!hapticEnabled)}
              activeOpacity={0.7}>
              <View style={[
                styles.iconContainer,
                isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                },
              ]}>
                <Ionicons 
                  name="radio-button-on-outline" 
                  size={moderateScale(18)} 
                  color={hapticEnabled ? theme.primary : theme.textSecondary} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  { color: theme.text },
                  isRTL && styles.directionalText,
                ]}>
                  {t('settings.hapticFeedback') || 'Haptic Feedback'}
                </Text>
                <Text style={[styles.optionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.hapticFeedbackNote') || 'Vibration on interactions'}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { 
                  backgroundColor: hapticEnabled ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  { 
                    transform: [{ translateX: getToggleTranslateX(hapticEnabled) }],
                    backgroundColor: '#FFFFFF',
                  }
                ]} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, isRTL ? styles.dividerRtl : styles.dividerLtr, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={[styles.optionItem, isRTL && styles.rowReverse]}
              onPress={() => updateCompactMode(!compactMode)}
              activeOpacity={0.7}>
              <View style={[
                styles.iconContainer,
                isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                },
              ]}>
                <Ionicons 
                  name="grid-outline" 
                  size={moderateScale(18)} 
                  color={compactMode ? theme.primary : theme.textSecondary} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  { color: theme.text },
                  isRTL && styles.directionalText,
                ]}>
                  {t('settings.compactMode') || 'Compact Mode'}
                </Text>
                <Text style={[styles.optionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.compactModeNote') || 'Show more posts with smaller cards'}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { 
                  backgroundColor: compactMode ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  { 
                    transform: [{ translateX: getToggleTranslateX(compactMode) }],
                    backgroundColor: '#FFFFFF',
                  }
                ]} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, isRTL ? styles.dividerRtl : styles.dividerLtr, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={[styles.optionItem, isRTL && styles.rowReverse]}
              onPress={() => updateDataSaverMode(!dataSaverMode)}
              activeOpacity={0.7}>
              <View style={[
                styles.iconContainer,
                isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                },
              ]}>
                <Ionicons 
                  name="leaf-outline" 
                  size={moderateScale(18)} 
                  color={dataSaverMode ? theme.primary : theme.textSecondary} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  { color: theme.text },
                  isRTL && styles.directionalText,
                ]}>
                  {t('settings.dataSaverMode') || 'Data Saver Mode'}
                </Text>
                <Text style={[styles.optionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.dataSaverModeNote') || 'Reduce data usage by loading lower quality images'}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { 
                  backgroundColor: dataSaverMode ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  { 
                    transform: [{ translateX: getToggleTranslateX(dataSaverMode) }],
                    backgroundColor: '#FFFFFF',
                  }
                ]} />
              </View>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.privacy') || 'Privacy'}
          </Text>
          <GlassCard>
            <TouchableOpacity
              style={[styles.optionItem, isRTL && styles.rowReverse]}
              onPress={() => updateShowActivityStatus(!showActivityStatus)}
              activeOpacity={0.7}>
              <View style={[
                styles.iconContainer,
                isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                },
              ]}>
                <IoniconSvg
                  name="eye-outline" 
                  size={moderateScale(18)} 
                  color={showActivityStatus ? theme.primary : theme.textSecondary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  { color: theme.text },
                  isRTL && styles.directionalText,
                ]}>
                  {t('settings.showActivityStatus') || 'Show Activity Status'}
                </Text>
                <Text style={[styles.optionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.showActivityStatusNote') || 'Let others see when you\'re online'}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { 
                  backgroundColor: showActivityStatus ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  { 
                    transform: [{ translateX: getToggleTranslateX(showActivityStatus) }],
                    backgroundColor: '#FFFFFF',
                  }
                ]} />
              </View>
            </TouchableOpacity>
          </GlassCard>
          <Text style={[styles.sectionNote, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
            {t('settings.activityStatusDisclaimer') || 'If disabled, you won\'t see others\' activity status either'}
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Time Picker Modal */}
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
              placeholder={t('settings.timePlaceholder') || 'HH:MM'}
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              autoFocus
            />
            <View style={[styles.timePickerButtons, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: 'transparent' }]}
                onPress={() => setTimePickerVisible(false)}>
                <Text style={[styles.timePickerButtonText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: theme.primary }]}
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
  rowReverse: {
    flexDirection: 'row-reverse',
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
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: responsiveFontSize(13),
    marginBottom: spacing.md,
  },
  glassCard: {
    borderRadius: borderRadius.lg,
    marginBottom: 2,
  },
  optionItem: {
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
  },
  iconContainerLtr: {
    marginRight: spacing.md,
  },
  iconContainerRtl: {
    marginLeft: spacing.md,
  },
  optionLabel: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  languageInfo: {
    flex: 1,
  },
  languageInfoLtr: {
    marginLeft: spacing.md,
  },
  languageInfoRtl: {
    marginRight: spacing.md,
  },
  languageNative: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
    marginBottom: 2,
  },
  languageName: {
    fontSize: responsiveFontSize(13),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.3,
  },
  dividerLtr: {
    marginLeft: spacing.md + moderateScale(36) + spacing.md,
  },
  dividerRtl: {
    marginRight: spacing.md + moderateScale(36) + spacing.md,
  },
  sectionNote: {
    fontSize: responsiveFontSize(12),
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  optionContent: {
    flex: 1,
  },
  optionNote: {
    fontSize: responsiveFontSize(11),
    marginTop: 2,
  },
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  toggle: {
    width: moderateScale(50),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    padding: moderateScale(3),
    justifyContent: 'center',
  },
  toggleKnob: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
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
    minWidth: 80,
    alignItems: 'center',
  },
  timePickerButtonText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  colorOptionCard: {
    width: moderateScale(72),
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorOption: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  colorOptionLabel: {
    minHeight: moderateScale(28),
    textAlign: 'center',
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
  },
  fontSliderContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValueContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepperValue: {
    fontSize: responsiveFontSize(22),
    fontWeight: '700',
  },
  stepperLabel: {
    fontSize: responsiveFontSize(11),
    fontWeight: '500',
    marginTop: 2,
  },
  fontPreviewCard: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fontPreviewText: {
    fontWeight: '500',
  },
  bottomPadding: {
    height: hp(5),
  },
});

export default PersonalizationSettings;
