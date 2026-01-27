import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSelector = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ku', name: 'Kurdish', nativeName: 'کوردی' },
  ];

  const handleLanguageChange = (languageCode) => {
    if (languageCode === 'ar') {
      Alert.alert(
        t('settings.rtlSupportTitle'),
        t('settings.rtlSupportMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => changeLanguage(languageCode),
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    } else {
      changeLanguage(languageCode);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language / اختر اللغة / زمان هەڵبژێرە</Text>
      <View style={styles.languageContainer}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageButton,
              currentLanguage === lang.code && styles.activeLanguageButton,
            ]}
            onPress={() => handleLanguageChange(lang.code)}>
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
