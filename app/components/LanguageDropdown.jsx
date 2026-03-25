import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassContainer } from './GlassComponents';
import { spacing, moderateScale, fontSize } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { CheckmarkCircleIcon, LanguageOutlineIcon } from './icons';

const LanguageDropdown = () => {
  const { currentLanguage, changeLanguage, theme, isDarkMode } = useAppSettings();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ku', name: 'Kurdish', nativeName: 'کوردی' },
  ];

  const handleSelect = (code) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(!isOpen)}>
        <GlassContainer 
          borderRadius={borderRadius.round}
          style={styles.dropdownButton}
        >
          <LanguageOutlineIcon size={moderateScale(20)} color={isDarkMode ? '#FFFFFF' : '#1C1C1E'} />
        </GlassContainer>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}>
          <GlassContainer 
            borderRadius={borderRadius.xl}
            style={styles.dropdownMenu}
            intensity={30}
          >
            <Text style={[
              styles.menuTitle, 
              { 
                fontSize: fontSize(16),
                color: theme.text,
              }
            ]}>
              Select Language
            </Text>
            {languages.map((lang, index) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.dropdownItem,
                  index !== languages.length - 1 && { 
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.7}>
                <View style={styles.itemContent}>
                  <View>
                    <Text style={[
                      styles.itemText, 
                      { 
                        fontSize: fontSize(15),
                        color: theme.text,
                      }
                    ]}>
                      {lang.name}
                    </Text>
                    <Text style={[
                      styles.itemNativeText, 
                      { 
                        fontSize: fontSize(13),
                        color: theme.textSecondary,
                      }
                    ]}>
                      {lang.nativeName}
                    </Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <CheckmarkCircleIcon size={moderateScale(24)} color={theme.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </GlassContainer>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  dropdownButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: 300,
    padding: spacing.md,
  },
  menuTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: spacing.md,
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  itemNativeText: {
    fontWeight: '400',
  },
});

export default LanguageDropdown;
