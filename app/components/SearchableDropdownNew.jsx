import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassInput } from './GlassComponents';
import { fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const SearchableDropdownNew = ({ 
  items = [], 
  value, 
  onSelect, 
  placeholder,
  icon,
  disabled = false,
  style,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { t, theme, isDarkMode } = useAppSettings();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const normalizedItems = items.map(item => ({
    key: item.key || item.value,
    label: item.label || (item.labelKey ? t(item.labelKey) : item.value),
    originalItem: item
  }));

  const filteredItems = searchText.trim() === '' 
    ? normalizedItems 
    : normalizedItems.filter(item => item.label.toLowerCase().includes(searchText.toLowerCase()));

  const selectedItem = normalizedItems.find(item => item.key === value);

  const openModal = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchText('');
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
      setSearchText('');
    });
  };

  const handleSelect = (item) => {
    onSelect(item.key);
    closeModal();
  };

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={openModal}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <GlassInput focused={isOpen}>
          <View style={[styles.selector, compact && styles.selectorCompact]}>
            <Ionicons 
              name={icon || 'list-outline'} 
              size={compact ? moderateScale(16) : moderateScale(20)} 
              color={disabled ? theme.textSecondary : (selectedItem ? theme.primary : theme.textSecondary)} 
              style={styles.icon}
            />
            <Text
              style={[
                styles.selectedText,
                {
                  color: selectedItem ? theme.text : theme.input.placeholder,
                  fontSize: compact ? fontSize(12) : fontSize(14),
                  opacity: disabled ? 0.5 : 1,
                }
              ]}
              numberOfLines={1}
            >
              {selectedItem ? selectedItem.label : placeholder}
            </Text>
            <Ionicons 
              name={isOpen ? "chevron-up" : "chevron-down"} 
              size={compact ? moderateScale(16) : moderateScale(20)} 
              color={theme.textSecondary} 
            />
          </View>
        </GlassInput>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />
          <Animated.View style={[styles.modalBox, { opacity: fadeAnim }]}>
            <View style={[styles.modalContent, { backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text, fontSize: fontSize(18) }]}>
                  {placeholder}
                </Text>
                <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={moderateScale(28)} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.searchBox, { backgroundColor: isDarkMode ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)' }]}>
                <Ionicons name="search-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text, fontSize: fontSize(15) }]}
                  placeholder={t('common.search')}
                  placeholderTextColor={theme.input.placeholder}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isSelected = item.key === value;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.item,
                          {
                            backgroundColor: isSelected ? `${theme.primary}15` : 'transparent',
                          }
                        ]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            {
                              color: isSelected ? theme.primary : theme.text,
                              fontSize: fontSize(15),
                              fontWeight: isSelected ? '600' : '400',
                            }
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={moderateScale(20)} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={moderateScale(48)} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                      {t('common.noResults') || 'No results found'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md + spacing.xs : spacing.sm + spacing.xs,
    minHeight: moderateScale(52),
  },
  selectorCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    minHeight: moderateScale(40),
  },
  icon: {
    marginRight: spacing.sm,
  },
  selectedText: {
    flex: 1,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  itemText: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontWeight: '500',
    marginTop: spacing.md,
  },
});

export default SearchableDropdownNew;
