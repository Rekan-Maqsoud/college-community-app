import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useGlobalAlert } from '../../context/GlobalAlertContext';
import { borderRadius } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { createSuggestion, SUGGESTION_CATEGORIES } from '../../../database/suggestions';

const MIN_MESSAGE_LENGTH = 10;

const SuggestionSettings = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const globalAlert = useGlobalAlert();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('feature');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryLabels = useMemo(() => ({
    feature: t('settings.suggestionCategoryFeature'),
    bug: t('settings.suggestionCategoryBug'),
    ui: t('settings.suggestionCategoryUI'),
    performance: t('settings.suggestionCategoryPerformance'),
    other: t('settings.suggestionCategoryOther'),
  }), [t]);

  const showErrorAlert = (messageText) => {
    globalAlert?.showAlert({
      type: 'error',
      title: t('settings.suggestionErrorTitle'),
      message: messageText,
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const sanitizedTitle = String(title || '').trim();
    const sanitizedMessage = String(message || '').trim();

    if (!sanitizedTitle) {
      showErrorAlert(t('settings.suggestionValidationTitleRequired'));
      return;
    }

    if (!sanitizedMessage || sanitizedMessage.length < MIN_MESSAGE_LENGTH) {
      showErrorAlert(t('settings.suggestionValidationMessageRequired'));
      return;
    }

    if (!SUGGESTION_CATEGORIES.includes(category)) {
      showErrorAlert(t('settings.suggestionValidationCategoryRequired'));
      return;
    }

    try {
      setIsSubmitting(true);

      await createSuggestion({
        category,
        title: sanitizedTitle,
        message: sanitizedMessage,
        appVersion: Constants?.expoConfig?.version || 'unknown',
        platform: Constants?.platform?.ios ? 'ios' : Constants?.platform?.android ? 'android' : 'unknown',
      });

      setTitle('');
      setMessage('');
      setCategory('feature');

      globalAlert?.showAlert({
        type: 'success',
        title: t('settings.suggestionSuccessTitle'),
        message: t('settings.suggestionSuccessMessage'),
      });
    } catch (error) {
      const rateLimited = error?.code === 'RATE_LIMITED' || String(error?.message || '').includes('ACTION_RATE_LIMITED');
      showErrorAlert(rateLimited ? t('settings.suggestionRateLimitedMessage') : t('settings.suggestionGenericErrorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(10, 132, 255, 0.15)', 'transparent']
          : ['rgba(0, 122, 255, 0.1)', 'transparent']
        }
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={moderateScale(22)} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings.suggestions')}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('settings.suggestionTitleLabel')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
            placeholder={t('settings.suggestionTitlePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            maxLength={120}
            editable={!isSubmitting}
          />

          <Text style={[styles.label, styles.sectionGap, { color: theme.textSecondary }]}>
            {t('settings.suggestionCategoryLabel')}
          </Text>
          <View style={styles.categoryWrap}>
            {SUGGESTION_CATEGORIES.map((value) => {
              const isSelected = value === category;

              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setCategory(value)}
                  activeOpacity={0.8}
                  disabled={isSubmitting}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? theme.primary : theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: isSelected ? theme.background : theme.text,
                      },
                    ]}
                  >
                    {categoryLabels[value]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, styles.sectionGap, { color: theme.textSecondary }]}>
            {t('settings.suggestionMessageLabel')}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            style={[
              styles.input,
              styles.messageInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
            placeholder={t('settings.suggestionMessagePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            maxLength={1500}
            editable={!isSubmitting}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
            style={[
              styles.submitButton,
              {
                backgroundColor: theme.primary,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.background} />
            ) : (
              <Text style={[styles.submitText, { color: theme.background }]}>
                {t('settings.suggestionSubmit')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    height: hp(25),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
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
    textAlign: 'center',
  },
  placeholder: {
    width: moderateScale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: spacing.md,
    paddingBottom: hp(4),
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  label: {
    fontSize: responsiveFontSize(13),
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  sectionGap: {
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: responsiveFontSize(14),
  },
  messageInput: {
    minHeight: hp(20),
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  categoryText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.lg,
    minHeight: moderateScale(44),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
  },
});

export default SuggestionSettings;