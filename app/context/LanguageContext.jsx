import React, { createContext, useContext, useState, useEffect } from 'react';
import safeStorage from '../utils/safeStorage';
import * as Localization from 'expo-localization';
import i18n from '../../locales/i18n';
import { I18nManager } from 'react-native';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference on app start
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await safeStorage.getItem('appLanguage');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.locale = savedLanguage;
        
        // Enable RTL for Arabic
        if (savedLanguage === 'ar') {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
        } else {
          I18nManager.allowRTL(false);
          I18nManager.forceRTL(false);
        }
      } else {
        // Use device language if no preference saved
        const deviceLocale = Localization.locale.split('-')[0];
        const supportedLanguages = ['en', 'ar', 'ku'];
        const defaultLang = supportedLanguages.includes(deviceLocale) ? deviceLocale : 'en';
        
        setCurrentLanguage(defaultLang);
        i18n.locale = defaultLang;
      }
    } catch (error) {
      // Failed to load language preference, using default
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
      
      // Note: For RTL to fully take effect, app needs to reload
      // You might want to add a restart prompt here
    } catch (error) {
      // Failed to save language preference
    }
  };

  const t = (key, config) => {
    return i18n.t(key, config);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
    isRTL: currentLanguage === 'ar',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
