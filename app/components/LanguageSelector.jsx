import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from './CustomAlert';

const LanguageSelector = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ku', name: 'Kurdish', nativeName: 'کوردی' },
  ];

  const handleLanguageChange = (languageCode) => {
    if (languageCode === 'ar') {
      showAlert({
        type: 'info',
        title: t('settings.rtlSupportTitle'),
        message: t('settings.rtlSupportMessage'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => changeLanguage(languageCode),
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ],
      });
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
