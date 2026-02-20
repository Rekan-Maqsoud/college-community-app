import React, { createContext, useContext, useState, useEffect } from 'react';
import safeStorage from '../utils/safeStorage';
import { getLocales } from 'expo-localization';
import * as Haptics from 'expo-haptics';
import i18n from '../../locales/i18n';
import { I18nManager, Appearance, View, ActivityIndicator, StyleSheet } from 'react-native';
import { setGlobalFontScale } from '../utils/responsive';

const AppSettingsContext = createContext();

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};

export const useAppSettingsSafe = () => {
  const context = useContext(AppSettingsContext);
  return context;
};

// Color themes
export const lightTheme = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  textTertiary: '#98989D',
  primary: '#007AFF',
  primaryDark: '#0051D5',
  secondary: '#5856D6',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  border: '#E5E5EA',
  borderSecondary: '#F0F0F0',
  inputBackground: '#F5F5F5',
  shadow: 'rgba(0, 0, 0, 0.1)',
  gradient: ['#007AFF', '#5856D6'],
  gradientLight: ['rgba(0, 122, 255, 0.1)', 'rgba(88, 86, 214, 0.1)'],
  glass: {
    background: 'rgba(248, 250, 255, 0.85)',
    border: 'rgba(200, 210, 225, 0.4)',
    tint: 'light',
    intensity: 20,
  },
  input: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(0, 0, 0, 0.08)',
    placeholder: '#8E8E93',
  },
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkTheme = {
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  primary: '#0A84FF',
  primaryDark: '#0066CC',
  secondary: '#5E5CE6',
  success: '#32D74B',
  danger: '#FF453A',
  warning: '#FF9F0A',
  border: '#38383A',
  borderSecondary: '#2C2C2E',
  inputBackground: '#2C2C2E',
  shadow: 'rgba(255, 255, 255, 0.1)',
  gradient: ['#0A84FF', '#5E5CE6'],
  gradientLight: ['rgba(10, 132, 255, 0.15)', 'rgba(94, 92, 230, 0.15)'],
  glass: {
    background: 'rgba(28, 28, 30, 0.7)',
    border: 'rgba(255, 255, 255, 0.12)',
    tint: 'dark',
    intensity: 20,
  },
  input: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.12)',
    placeholder: '#8E8E93',
  },
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// Helper function to adjust color brightness
const adjustColor = (hex, amount) => {
  if (!hex || typeof hex !== 'string') return hex;
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

// Helper function to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getBubbleRadiusFromStyle = (bubbleStyle) => {
  switch (bubbleStyle) {
    case 'minimal':
      return 8;
    case 'sharp':
      return 4;
    case 'bubble':
      return 24;
    case 'classic':
      return 12;
    default:
      return 16;
  }
};

const sanitizeBubbleRadius = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 16;
  return Math.max(4, Math.min(28, parsed));
};

const normalizeChatSettings = (settings = {}) => {
  const radiusFromStyle = getBubbleRadiusFromStyle(settings.bubbleStyle);
  const resolvedBubbleRadius = settings.bubbleRadius !== undefined
    ? sanitizeBubbleRadius(settings.bubbleRadius)
    : radiusFromStyle;

  return {
    bubbleStyle: settings.bubbleStyle || 'modern',
    bubbleRadius: resolvedBubbleRadius,
    bubbleColor: settings.bubbleColor || '#667eea',
    backgroundImage: settings.backgroundImage || null,
  };
};

export const AppSettingsProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themePreference, setThemePreference] = useState('system');
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Granular notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    directChats: true,
    groupChats: true,
    friendPosts: true,
  });
  
  // Chat customization settings
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern', // 'modern', 'classic', 'minimal'
    bubbleRadius: 16, // 4-28, controls how rounded chat bubbles are
    bubbleColor: '#667eea', // Primary bubble color for sent messages
    backgroundImage: null, // URL or null for default
  });
  
  // Current user ID for per-account settings
  const [currentUserId, setCurrentUserId] = useState(null);

  // Font size scale (1.0 = normal, 0.85 = small, 1.15 = large, 1.3 = extra large)
  const [fontScale, setFontScale] = useState(1.0);
  
  // Reduce motion for accessibility
  const [reduceMotion, setReduceMotion] = useState(false);
  
  // Haptic feedback toggle
  const [hapticEnabled, setHapticEnabled] = useState(true);
  
  // Show activity status (online/last seen)
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  
  // Compact mode for posts (show more posts with smaller cards)
  const [compactMode, setCompactMode] = useState(false);
  
  // Custom accent color (null means use default theme color)
  const [accentColor, setAccentColor] = useState(null);
  
  // Data saver mode (reduce image quality, disable auto-load)
  const [dataSaverMode, setDataSaverMode] = useState(false);
  
  // Quiet hours for notifications
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    startTime: '22:00', // 10 PM - when quiet hours start
    endTime: '07:00',   // 7 AM - when quiet hours end
  });
  
  // Dark mode schedule
  const [darkModeSchedule, setDarkModeSchedule] = useState({
    enabled: false,
    startTime: '20:00', // 8 PM - when dark mode starts
    endTime: '06:00',   // 6 AM - when dark mode ends
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Apply custom accent color to theme
  const themedWithAccent = accentColor ? {
    ...theme,
    primary: accentColor,
    gradient: [accentColor, adjustColor(accentColor, -20)],
    gradientLight: [hexToRgba(accentColor, 0.1), hexToRgba(adjustColor(accentColor, -20), 0.1)],
  } : theme;

  // Check if current time is within dark mode schedule
  const isWithinDarkModeSchedule = () => {
    if (!darkModeSchedule.enabled) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = darkModeSchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = darkModeSchedule.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight schedules (e.g., 20:00 to 06:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    // Normal schedule (e.g., 08:00 to 18:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  // Apply dark mode schedule
  useEffect(() => {
    if (darkModeSchedule.enabled && themePreference === 'scheduled') {
      const shouldBeDark = isWithinDarkModeSchedule();
      if (shouldBeDark !== null && shouldBeDark !== isDarkMode) {
        setIsDarkMode(shouldBeDark);
      }
      
      // Check every minute
      const interval = setInterval(() => {
        const shouldBeDark = isWithinDarkModeSchedule();
        if (shouldBeDark !== null && shouldBeDark !== isDarkMode) {
          setIsDarkMode(shouldBeDark);
        }
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [darkModeSchedule, themePreference]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themePreference === 'system') {
        setIsDarkMode(colorScheme === 'dark');
      }
    });

    return () => subscription.remove();
  }, [themePreference]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedLanguage, savedThemePreference, savedNotifications, savedNotificationSettings, savedChatSettings, savedFontScale, savedReduceMotion, savedHapticEnabled, savedShowActivityStatus, savedCompactMode, savedQuietHours, savedDarkModeSchedule, savedAccentColor, savedDataSaverMode] = await Promise.all([
        safeStorage.getItem('appLanguage'),
        safeStorage.getItem('themePreference'),
        safeStorage.getItem('notificationsEnabled'),
        safeStorage.getItem('notificationSettings'),
        safeStorage.getItem('chatSettings'),
        safeStorage.getItem('fontScale'),
        safeStorage.getItem('reduceMotion'),
        safeStorage.getItem('hapticEnabled'),
        safeStorage.getItem('showActivityStatus'),
        safeStorage.getItem('compactMode'),
        safeStorage.getItem('quietHours'),
        safeStorage.getItem('darkModeSchedule'),
        safeStorage.getItem('accentColor'),
        safeStorage.getItem('dataSaverMode'),
      ]);

      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.locale = savedLanguage;
        if (savedLanguage === 'ar') {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
        }
      } else {
        try {
          const locales = getLocales();
          const deviceLocale = locales && locales[0] ? locales[0].languageCode : 'en';
          const supportedLanguages = ['en', 'ar', 'ku'];
          const defaultLang = supportedLanguages.includes(deviceLocale) ? deviceLocale : 'en';
          setCurrentLanguage(defaultLang);
          i18n.locale = defaultLang;
        } catch (error) {
          setCurrentLanguage('en');
          i18n.locale = 'en';
        }
      }

      const preference = savedThemePreference || 'system';
      setThemePreference(preference);
      
      if (preference === 'system') {
        const systemColorScheme = Appearance.getColorScheme();
        setIsDarkMode(systemColorScheme === 'dark');
      } else {
        setIsDarkMode(preference === 'dark');
      }

      if (savedNotifications !== null) {
        setNotificationsEnabled(savedNotifications === 'true');
      }
      
      if (savedNotificationSettings) {
        try {
          const parsed = JSON.parse(savedNotificationSettings);
          setNotificationSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          // Invalid JSON, use defaults
        }
      }
      
      if (savedChatSettings) {
        try {
          const parsed = JSON.parse(savedChatSettings);
          setChatSettings(normalizeChatSettings(parsed));
        } catch (e) {
          // Invalid JSON, use defaults
        }
      }
      
      if (savedFontScale) {
        const scale = parseFloat(savedFontScale);
        if (!isNaN(scale) && scale >= 0.85 && scale <= 1.3) {
          setFontScale(scale);
          setGlobalFontScale(scale);
        }
      }
      
      if (savedReduceMotion !== null) {
        setReduceMotion(savedReduceMotion === 'true');
      }
      
      if (savedHapticEnabled !== null) {
        setHapticEnabled(savedHapticEnabled === 'true');
      }
      
      if (savedShowActivityStatus !== null) {
        setShowActivityStatus(savedShowActivityStatus === 'true');
      }
      
      if (savedCompactMode !== null) {
        setCompactMode(savedCompactMode === 'true');
      }
      
      if (savedQuietHours) {
        try {
          const parsed = JSON.parse(savedQuietHours);
          setQuietHours(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          // Failed to parse quiet hours
        }
      }
      
      if (savedDarkModeSchedule) {
        try {
          const parsed = JSON.parse(savedDarkModeSchedule);
          setDarkModeSchedule(prev => ({ ...prev, ...parsed }));
          
          // If schedule is enabled and theme is scheduled, apply it immediately
          if (parsed.enabled && savedThemePreference === 'scheduled') {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [startHour, startMin] = (parsed.startTime || '20:00').split(':').map(Number);
            const [endHour, endMin] = (parsed.endTime || '06:00').split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            let shouldBeDark;
            if (startMinutes > endMinutes) {
              shouldBeDark = currentMinutes >= startMinutes || currentMinutes < endMinutes;
            } else {
              shouldBeDark = currentMinutes >= startMinutes && currentMinutes < endMinutes;
            }
            setIsDarkMode(shouldBeDark);
          }
        } catch (e) {
          // Invalid JSON, use defaults
        }
      }
      
      if (savedAccentColor) {
        setAccentColor(savedAccentColor);
      }
      
      if (savedDataSaverMode !== null) {
        setDataSaverMode(savedDataSaverMode === 'true');
      }
    } catch (error) {
      // Failed to load settings, using defaults
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      setCurrentLanguage(languageCode);
      i18n.locale = languageCode;
      await safeStorage.setItem('appLanguage', languageCode);

      // Enable RTL for Arabic
      if (languageCode === 'ar') {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      } else {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }
    } catch (error) {
      // Failed to save language preference
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      setThemePreference(newMode ? 'dark' : 'light');
      await safeStorage.setItem('themePreference', newMode ? 'dark' : 'light');
    } catch (error) {
      // Failed to save theme preference
    }
  };

  const setThemeMode = async (mode) => {
    try {
      setThemePreference(mode);
      await safeStorage.setItem('themePreference', mode);
      
      if (mode === 'system') {
        const systemColorScheme = Appearance.getColorScheme();
        setIsDarkMode(systemColorScheme === 'dark');
      } else if (mode === 'scheduled') {
        // Apply scheduled dark mode based on current time
        const shouldBeDark = isWithinDarkModeSchedule();
        setIsDarkMode(shouldBeDark ?? false);
      } else {
        setIsDarkMode(mode === 'dark');
      }
    } catch (error) {
      // Failed to save theme preference
    }
  };

  const updateDarkModeSchedule = async (schedule) => {
    try {
      const newSchedule = { ...darkModeSchedule, ...schedule };
      setDarkModeSchedule(newSchedule);
      await safeStorage.setItem('darkModeSchedule', JSON.stringify(newSchedule));
      
      // If we're in scheduled mode, apply the change immediately
      if (themePreference === 'scheduled' && newSchedule.enabled) {
        const shouldBeDark = isWithinDarkModeSchedule();
        setIsDarkMode(shouldBeDark ?? false);
      }
    } catch (error) {
      // Failed to save dark mode schedule
    }
  };

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      await safeStorage.setItem('notificationsEnabled', newValue.toString());
    } catch (error) {
      // Failed to save notification preference
    }
  };

  const updateNotificationSetting = async (key, value) => {
    try {
      const newSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(newSettings);
      await safeStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    } catch (error) {
      // Failed to save notification setting
    }
  };

  const updateChatSetting = async (key, value, userId = null) => {
    try {
      const mergedSettings = { ...chatSettings, [key]: value };
      const newSettings = normalizeChatSettings(mergedSettings);
      setChatSettings(newSettings);
      // Save with user-specific key if userId is provided
      const storageKey = userId ? `chatSettings_${userId}` : (currentUserId ? `chatSettings_${currentUserId}` : 'chatSettings');
      await safeStorage.setItem(storageKey, JSON.stringify(newSettings));
    } catch (error) {
      // Failed to save chat setting
    }
  };

  // Load chat settings for a specific user
  const loadUserChatSettings = async (userId) => {
    try {
      setCurrentUserId(userId);
      if (!userId) {
        setChatSettings(normalizeChatSettings());
        return;
      }
      
      const savedChatSettings = await safeStorage.getItem(`chatSettings_${userId}`);
      if (savedChatSettings) {
        const parsed = JSON.parse(savedChatSettings);
        setChatSettings(normalizeChatSettings(parsed));
      } else {
        // Reset to defaults for new user
        setChatSettings(normalizeChatSettings());
      }
    } catch (error) {
      // Failed to load user chat settings
    }
  };

  const updateFontScale = async (scale) => {
    try {
      setFontScale(scale);
      setGlobalFontScale(scale);
      await safeStorage.setItem('fontScale', scale.toString());
    } catch (error) {
      // Failed to update font scale
    }
  };

  const updateReduceMotion = async (value) => {
    try {
      setReduceMotion(value);
      await safeStorage.setItem('reduceMotion', value.toString());
    } catch (error) {
      // Failed to save reduce motion setting
    }
  };

  const updateHapticEnabled = async (value) => {
    try {
      setHapticEnabled(value);
      await safeStorage.setItem('hapticEnabled', value.toString());
    } catch (error) {
      // Failed to save haptic setting
    }
  };

  const triggerHaptic = (type = 'light') => {
    if (!hapticEnabled) return;

    try {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        return;
      }

      if (type === 'warning' || type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }

      if (type === 'selection') {
        Haptics.selectionAsync().catch(() => {});
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      // Silent fail: haptics should never block UI
    }
  };

  const updateShowActivityStatus = async (value) => {
    try {
      setShowActivityStatus(value);
      await safeStorage.setItem('showActivityStatus', value.toString());
    } catch (error) {
      // Failed to save activity status setting
    }
  };

  const updateCompactMode = async (value) => {
    try {
      setCompactMode(value);
      await safeStorage.setItem('compactMode', value.toString());
    } catch (error) {
      // Failed to save compact mode setting
    }
  };

  const updateAccentColor = async (color) => {
    try {
      setAccentColor(color);
      if (color) {
        await safeStorage.setItem('accentColor', color);
      } else {
        await safeStorage.removeItem('accentColor');
      }
    } catch (error) {
      // Failed to save accent color setting
    }
  };

  const updateDataSaverMode = async (value) => {
    try {
      setDataSaverMode(value);
      await safeStorage.setItem('dataSaverMode', value.toString());
    } catch (error) {
      // Failed to save data saver mode setting
    }
  };

  const updateQuietHours = async (updates) => {
    try {
      const newQuietHours = { ...quietHours, ...updates };
      setQuietHours(newQuietHours);
      await safeStorage.setItem('quietHours', JSON.stringify(newQuietHours));
    } catch (error) {
      // Failed to save quiet hours setting
    }
  };

  // Check if current time is within quiet hours
  const isWithinQuietHours = () => {
    if (!quietHours.enabled) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  const resetSettings = async () => {
    try {
      await safeStorage.multiRemove([
        'appLanguage',
        'themePreference',
        'notificationsEnabled',
        'notificationSettings',
        'chatSettings',
        'fontScale',
        'reduceMotion',
        'hapticEnabled',
        'showActivityStatus',
        'compactMode',
        'quietHours',
        'darkModeSchedule',
        'accentColor',
        'dataSaverMode',
      ]);
      setCurrentLanguage('en');
      i18n.locale = 'en';
      setThemePreference('system');
      const systemColorScheme = Appearance.getColorScheme();
      setIsDarkMode(systemColorScheme === 'dark');
      setNotificationsEnabled(true);
      setNotificationSettings({
        directChats: true,
        groupChats: true,
        friendPosts: true,
      });
      setChatSettings({
        bubbleStyle: 'modern',
        bubbleColor: '#667eea',
        backgroundImage: null,
      });
      setFontScale(1.0);
      setGlobalFontScale(1.0);
      setReduceMotion(false);
      setHapticEnabled(true);
      setShowActivityStatus(true);
      setCompactMode(false);
      setAccentColor(null);
      setDataSaverMode(false);
      setQuietHours({
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
      });
      setDarkModeSchedule({
        enabled: false,
        startTime: '20:00',
        endTime: '06:00',
      });
    } catch (error) {
      // Failed to reset settings
    }
  };

  const t = (key, config) => {
    return i18n.t(key, config);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    isRTL: currentLanguage === 'ar',
    t,

    isDarkMode,
    toggleDarkMode,
    themePreference,
    setThemeMode,
    theme: themedWithAccent,
    colors: themedWithAccent,

    notificationsEnabled,
    toggleNotifications,
    notificationSettings,
    updateNotificationSetting,
    
    chatSettings,
    updateChatSetting,
    loadUserChatSettings,

    fontScale,
    updateFontScale,
    
    reduceMotion,
    updateReduceMotion,
    
    hapticEnabled,
    updateHapticEnabled,
    triggerHaptic,
    
    showActivityStatus,
    updateShowActivityStatus,
    
    compactMode,
    updateCompactMode,
    
    accentColor,
    updateAccentColor,
    
    dataSaverMode,
    updateDataSaverMode,
    
    quietHours,
    updateQuietHours,
    isWithinQuietHours,
    
    darkModeSchedule,
    updateDarkModeSchedule,

    isLoading,
    resetSettings,
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
