import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassContainer } from './GlassComponents';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { POST_TYPES } from '../constants/postConstants';

export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  POPULAR: 'popular',
};

export const FILTER_TYPES = {
  UNANSWERED_QUESTIONS: 'unanswered_questions',
};

const STAGES = [
  { key: 'all', label: 'filter.allStages', icon: 'school-outline' },
  { key: 'stage_1', label: 'filter.stage1', icon: 'school-outline' },
  { key: 'stage_2', label: 'filter.stage2', icon: 'school-outline' },
  { key: 'stage_3', label: 'filter.stage3', icon: 'school-outline' },
  { key: 'stage_4', label: 'filter.stage4', icon: 'school-outline' },
  { key: 'stage_5', label: 'filter.stage5', icon: 'school-outline' },
  { key: 'stage_6', label: 'filter.stage6', icon: 'school-outline' },
  { key: 'graduate', label: 'filter.graduate', icon: 'ribbon-outline' },
];

const FilterSortModal = ({
  visible = false,
  onClose,
  sortBy,
  onSortChange,
  filterType,
  onFilterTypeChange,
  answerStatus = 'all',
  onAnswerStatusChange,
  selectedStage,
  onStageChange,
}) => {
  const { t, theme, isDarkMode } = useAppSettings();

  const sortOptions = [
    { key: SORT_OPTIONS.NEWEST, label: t('sort.newest'), icon: 'time-outline' },
    { key: SORT_OPTIONS.OLDEST, label: t('sort.oldest'), icon: 'hourglass-outline' },
    { key: SORT_OPTIONS.POPULAR, label: t('sort.popular'), icon: 'flame-outline' },
  ];

  const typeOptions = [
    { key: 'all', label: t('filter.all'), icon: 'apps-outline' },
    { key: POST_TYPES.QUESTION, label: t('post.types.question'), icon: 'help-circle-outline' },
    { key: FILTER_TYPES.UNANSWERED_QUESTIONS, label: t('filter.unansweredQuestions'), icon: 'help-circle' },
    { key: POST_TYPES.DISCUSSION, label: t('post.types.discussion'), icon: 'chatbubbles-outline' },
    { key: POST_TYPES.NOTE, label: t('post.types.note'), icon: 'document-text-outline' },
    { key: POST_TYPES.ANNOUNCEMENT, label: t('post.types.announcement'), icon: 'megaphone-outline' },
    { key: POST_TYPES.POLL, label: t('post.types.poll'), icon: 'bar-chart-outline' },
  ];

  const answerOptions = [
    { key: 'all', label: t('filter.all'), icon: 'apps-outline' },
    { key: 'answered', label: t('filter.answered'), icon: 'checkmark-circle-outline' },
    { key: 'unanswered', label: t('filter.unanswered'), icon: 'help-circle-outline' },
  ];

  const stageOptions = STAGES.map(stage => ({
    key: stage.key,
    label: t(stage.label),
    icon: stage.icon,
  }));

  const handleSortSelect = (key) => {
    onSortChange(key);
  };

  const handleTypeSelect = (key) => {
    onFilterTypeChange(key);
  };

  const handleStageSelect = (key) => {
    if (onStageChange) {
      onStageChange(key);
    }
  };

  const handleAnswerSelect = (key) => {
    if (onAnswerStatusChange) {
      onAnswerStatusChange(key);
    }
  };

  const renderOption = (option, isSelected, onSelect) => (
    <TouchableOpacity
      key={option.key}
      style={[
        styles.optionItem,
        isSelected && {
          backgroundColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 122, 255, 0.15)',
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.18)'
            : theme.primary + '40',
        },
      ]}
      onPress={() => onSelect(option.key)}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name={option.icon}
          size={moderateScale(20)}
          color={isSelected ? theme.primary : theme.text}
          style={styles.optionIcon}
        />
        <Text
          style={[
            styles.optionLabel,
            {
              color: isSelected ? theme.primary : theme.text,
              fontSize: fontSize(15),
              fontWeight: isSelected ? '600' : '400',
            },
          ]}
        >
          {option.label}
        </Text>
      </View>
      {isSelected && (
        <Ionicons
          name="checkmark-circle"
          size={moderateScale(22)}
          color={theme.primary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <GlassContainer
            borderRadius={borderRadius.lg}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: theme.text,
                    fontSize: fontSize(18),
                  },
                ]}
              >
                {t('sort.sortAndFilter')}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close-outline"
                  size={moderateScale(24)}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.optionsListContent}
              nestedScrollEnabled={true}
            >
              {/* Stage Section */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textSecondary, fontSize: fontSize(13) },
                ]}
              >
                {t('filter.selectStage')}
              </Text>
              {stageOptions.map((option) =>
                renderOption(option, selectedStage === option.key, handleStageSelect)
              )}

              {/* Sort Section */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textSecondary, fontSize: fontSize(13), marginTop: spacing.lg },
                ]}
              >
                {t('sort.sortBy')}
              </Text>
              {sortOptions.map((option) =>
                renderOption(option, sortBy === option.key, handleSortSelect)
              )}

              {/* Filter by Type Section */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textSecondary, fontSize: fontSize(13), marginTop: spacing.lg },
                ]}
              >
                {t('sort.filterByType')}
              </Text>
              {typeOptions.map((option) =>
                renderOption(option, filterType === option.key, handleTypeSelect)
              )}

              {/* Answer Status Section */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textSecondary, fontSize: fontSize(13), marginTop: spacing.lg },
                ]}
              >
                {t('filter.answerStatus')}
              </Text>
              {answerOptions.map((option) =>
                renderOption(option, answerStatus === option.key, handleAnswerSelect)
              )}
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </GlassContainer>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(4),
  },
  modalContent: {
    width: '100%',
    maxHeight: hp(84),
  },
  modalCard: {
    overflow: 'hidden',
    maxHeight: hp(80),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.xs,
  },
  optionsList: {
    paddingHorizontal: spacing.lg,
    flexGrow: 0,
  },
  optionsListContent: {
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: spacing.sm,
  },
  optionLabel: {
    fontWeight: '400',
  },
  applyButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(16),
    fontWeight: '600',
  },
});

export default FilterSortModal;
