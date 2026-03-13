import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSelector = () => {
  const { currentLanguage, changeLanguage } = useAppSettings();
  const { t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ku', name: 'Kurdish', nativeName: 'کوردی' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.selectLanguage')}</Text>
      <View style={styles.languageContainer}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageButton,
              currentLanguage === lang.code && styles.activeLanguageButton,
            ]}
            onPress={() => changeLanguage(lang.code)}>
            <Text
              style={[
                styles.languageText,
                currentLanguage === lang.code && styles.activeLanguageText,
              ]}>
              {lang.nativeName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },
  activeLanguageButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeLanguageText: {
    color: '#fff',
  },
});

export default LanguageSelector;
