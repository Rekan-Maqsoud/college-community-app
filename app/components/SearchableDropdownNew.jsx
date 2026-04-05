import React, { useState, useRef } from 'react';
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
import { 
  SchoolIcon, BookIcon, BusinessIcon, LibraryIcon, TimeIcon,
  CheckmarkCircleIcon, CloseCircleIcon, SearchIcon, ListIcon,
  ChevronUpIcon, ChevronDownIcon,
} from './icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassInput, GlassModalCard } from './GlassComponents';
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
  useGlass = true,
  selectorStyle,
  multiSelect = false,
  maxSelections = 3,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Map string icon props to new custom SVG components
  const iconMap = {
    'school-outline': SchoolIcon,
    'book-outline': BookIcon,
    'business-outline': BusinessIcon,
    'library-outline': LibraryIcon,
    'time-outline': TimeIcon,
    'search-outline': SearchIcon,
    'list-outline': ListIcon,
  };

  const normalizedItems = items.map(item => ({
    key: item.key || item.value,
    label: item.label || (item.labelKey ? t(item.labelKey) : item.value),
    originalItem: item
  }));

  const filteredItems = searchText.trim() === '' 
    ? normalizedItems 
    : normalizedItems.filter(item => item.label.toLowerCase().includes(searchText.toLowerCase()));

  const selectedItem = !multiSelect ? normalizedItems.find(item => item.key === value) : null;
  const multiSelectedItems = multiSelect && Array.isArray(value) 
    ? value.map(v => normalizedItems.find(i => i.key === v)).filter(Boolean) 
    : [];

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
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(item.key)) {
        onSelect(currentValues.filter(v => v !== item.key));
      } else if (currentValues.length < maxSelections) {
        onSelect([...currentValues, item.key]);
      }
    } else {
      onSelect(item.key);
      closeModal();
    }
  };

  const selectorNode = (
    <View
      style={[
        styles.selector,
        compact && styles.selectorCompact,
        isRTL && styles.selectorRtl,
        !useGlass && styles.selectorPlain,
        selectorStyle,
      ]}
    >
      {iconMap[icon] ? (
        React.createElement(iconMap[icon], {
          size: compact ? moderateScale(16) : moderateScale(20),
          color: disabled ? theme.textSecondary : (selectedItem ? theme.primary : theme.textSecondary),
          style: [styles.icon, isRTL && styles.iconRtl]
        })
      ) : (
        <ListIcon
          size={compact ? moderateScale(16) : moderateScale(20)}
          color={disabled ? theme.textSecondary : ((selectedItem || multiSelectedItems.length > 0) ? theme.primary : theme.textSecondary)}
          style={[styles.icon, isRTL && styles.iconRtl]}
        />
      )}
      <Text
        style={[
          styles.selectedText,
          {
            color: selectedItem ? theme.text : theme.input.placeholder,
            fontSize: compact ? fontSize(12) : fontSize(14),
            opacity: disabled ? 0.5 : 1,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }
        ]}
        numberOfLines={1}
      >
        {multiSelect 
          ? (multiSelectedItems.length > 0 ? multiSelectedItems.map(i => i.label).join(', ') : placeholder)
          : (selectedItem ? selectedItem.label : placeholder)}
      </Text>
      {isOpen ? (
        <ChevronUpIcon
          size={compact ? moderateScale(16) : moderateScale(20)}
          color={theme.textSecondary}
        />
      ) : (
        <ChevronDownIcon
          size={compact ? moderateScale(16) : moderateScale(20)}
          color={theme.textSecondary}
        />
      )}
    </View>
  );

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={openModal}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {useGlass ? <GlassInput focused={isOpen}>{selectorNode}</GlassInput> : selectorNode}
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
            <GlassModalCard
              borderRadiusValue={borderRadius.xl}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(18, 22, 30, 0.72)'
                    : 'rgba(255, 255, 255, 0.84)',
                },
              ]}
            >
              
              <View style={[styles.modalHeader, isRTL && styles.modalHeaderRtl]}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: theme.text,
                      fontSize: fontSize(18),
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                > 
                  {placeholder}
                </Text>
                <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                  <CloseCircleIcon size={moderateScale(28)} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.searchBox,
                  isRTL && styles.searchBoxRtl,
                  { backgroundColor: isDarkMode ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)' },
                ]}
              >
                <SearchIcon size={moderateScale(20)} color={theme.textSecondary} style={[styles.searchIcon, isRTL && styles.searchIconRtl]} />
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      color: theme.text,
                      fontSize: fontSize(15),
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                  placeholder={t('common.search')}
                  placeholderTextColor={theme.input.placeholder}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
                    <CloseCircleIcon size={moderateScale(20)} color={theme.textSecondary} />
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
                    const isSelected = multiSelect 
                      ? (Array.isArray(value) && value.includes(item.key))
                      : item.key === value;
                    const isDisabledSelection = multiSelect && !isSelected && Array.isArray(value) && value.length >= maxSelections;

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.item,
                          isRTL && styles.itemRtl,
                          {
                            backgroundColor: isSelected
                              ? `${theme.primary}26`
                              : isDarkMode
                              ? 'rgba(255, 255, 255, 0.06)'
                              : 'rgba(0, 0, 0, 0.035)',
                          }
                        ]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.6}
                        disabled={isDisabledSelection}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            {
                              color: isSelected ? theme.primary : theme.text,
                              fontSize: fontSize(15),
                              fontWeight: isSelected ? '600' : '400',
                              textAlign: isRTL ? 'right' : 'left',
                              writingDirection: isRTL ? 'rtl' : 'ltr',
                              opacity: isDisabledSelection ? 0.4 : 1,
                            }
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <CheckmarkCircleIcon size={moderateScale(20)} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <SearchIcon size={moderateScale(48)} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                      {t('common.noResults')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </GlassModalCard>
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
  selectorRtl: {
    flexDirection: 'row-reverse',
  },
  selectorCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    minHeight: moderateScale(40),
  },
  selectorPlain: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  icon: {
    marginRight: spacing.sm,
  },
  iconRtl: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  selectedText: {
    flex: 1,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
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
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.34)',
    borderLeftColor: 'rgba(255, 255, 255, 0.34)',
    borderBottomColor: 'rgba(255, 255, 255, 0.14)',
    borderRightColor: 'rgba(255, 255, 255, 0.14)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderRtl: {
    flexDirection: 'row-reverse',
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
  searchBoxRtl: {
    flexDirection: 'row-reverse',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchIconRtl: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: moderateScale(24),
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  itemRtl: {
    flexDirection: 'row-reverse',
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
