import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../hooks/useTranslation';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useUser } from '../context/UserContext';
import { useAppSettings } from '../context/AppSettingsContext';
import AnimatedBackground from '../components/AnimatedBackground';
import ImagePickerComponent from '../components/ImagePicker';
import SearchableDropdownNew from '../components/SearchableDropdownNew';
import CustomAlert from '../components/CustomAlert';
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  POST_ICONS,
  getStageOptionsForDepartment,
  VALIDATION_RULES,
  MAX_IMAGES_PER_POST,
} from '../constants/postConstants';
import { uploadImage } from '../../services/imgbbService';
import { updatePost } from '../../database/posts';
import { createPollPayload, parsePollPayload } from '../utils/pollUtils';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';

const normalizeStageValue = (userStage) => {
  const stageMap = {
    firstYear: 'stage_1',
    secondYear: 'stage_2',
    thirdYear: 'stage_3',
    fourthYear: 'stage_4',
    fifthYear: 'stage_5',
    sixthYear: 'stage_6',
    graduate: 'graduate',
    '1': 'stage_1',
    '2': 'stage_2',
    '3': 'stage_3',
    '4': 'stage_4',
    '5': 'stage_5',
    '6': 'stage_6',
  };
  return stageMap[userStage] || userStage || '';
};

const EditPost = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { user } = useUser();
  const { theme, isDarkMode } = useAppSettings();
  const { contentStyle } = useLayout();
  const { post } = route?.params || {};

  const [postType, setPostType] = useState(post?.postType || POST_TYPES.DISCUSSION);
  const [topic, setTopic] = useState(post?.topic || '');
  const [text, setText] = useState(post?.text || '');
  const [department, setDepartment] = useState(post?.department || user?.department || '');
  const [stage, setStage] = useState(post?.stage || normalizeStageValue(user?.stage));
  const [topicInputHeight, setTopicInputHeight] = useState(48);
  const [textInputHeight, setTextInputHeight] = useState(96);
  const [visibility, setVisibility] = useState(post?.visibility || 'department');
  const [canOthersRepost, setCanOthersRepost] = useState(post?.canOthersRepost !== false);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState(post?.images || []);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [showTags, setShowTags] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [pollChoices, setPollChoices] = useState(['', '']);
  const [isQuizPoll, setIsQuizPoll] = useState(false);
  const [correctPollOptionId, setCorrectPollOptionId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!post) {
      navigation.goBack();
      return;
    }

    if (post.userId !== user?.$id) {
      navigation.goBack();
      return;
    }

    if (user?.department && user?.department !== department) {
      setDepartment(user.department);
    }

    if (!post?.stage && user?.stage) {
      setStage(normalizeStageValue(user.stage));
    }

    if (Array.isArray(post.tags)) {
      setTags(post.tags);
    }

    if (Array.isArray(post.links)) {
      setLinks(post.links);
    }

    const parsedPoll = parsePollPayload(post.pollData);
    if (parsedPoll) {
      const pollOptionTexts = parsedPoll.options.map((option) => option.text);
      setPollChoices(pollOptionTexts.length >= 2 ? pollOptionTexts : ['', '']);
      setIsQuizPoll(Boolean(parsedPoll.isQuiz));
      setCorrectPollOptionId(parsedPoll.correctOptionId || '');
    }
  }, []);

  const stageOptions = getStageOptionsForDepartment(department);

  useEffect(() => {
    if (stage && !stageOptions.some((option) => option.value === stage)) {
      setStage('');
    }
  }, [stage, stageOptions]);

  const postTypeOptions = [
    ...POST_TYPE_OPTIONS,
    { value: POST_TYPES.POLL, labelKey: 'post.types.poll' },
  ];

  const inputColors = {
    backgroundColor: theme.input.background,
    borderColor: theme.input.border,
    color: theme.text,
  };

  const validateForm = () => {
    const trimmedTopic = topic.trim();
    const trimmedText = text.trim();
    const hasContent = trimmedTopic.length > 0 || trimmedText.length > 0 || existingImages.length > 0 || images.length > 0;

    if (!hasContent) {
      showAlert(t('common.error'), t('post.contentRequired'));
      return false;
    }

    if (trimmedTopic.length > VALIDATION_RULES.POST.topic.max) {
      showAlert(
        t('common.error'),
        t('post.topicTooLong', { max: VALIDATION_RULES.POST.topic.max })
      );
      return false;
    }

    if (trimmedText.length > VALIDATION_RULES.POST.text.max) {
      showAlert(
        t('common.error'),
        t('post.textTooLong', { max: VALIDATION_RULES.POST.text.max })
      );
      return false;
    }

    if (postType === POST_TYPES.POLL) {
      const validChoices = pollChoices.map(choice => choice.trim()).filter(Boolean);
      if (validChoices.length < 2) {
        showAlert(t('common.error'), t('post.poll.minChoicesError'));
        return false;
      }

      if (isQuizPoll && !correctPollOptionId) {
        showAlert(t('common.error'), t('post.poll.correctAnswerRequired'));
        return false;
      }
    }

    return true;
  };

  const handlePollChoiceChange = (index, value) => {
    setPollChoices((prevChoices) => {
      const nextChoices = [...prevChoices];
      nextChoices[index] = value;
      return nextChoices;
    });
  };

  const handleAddPollChoice = () => {
    if (pollChoices.length >= 8) {
      showAlert(t('common.warning'), t('post.poll.maxChoicesError'));
      return;
    }
    setPollChoices((prevChoices) => [...prevChoices, '']);
  };

  const handleRemovePollChoice = (index) => {
    if (pollChoices.length <= 2) {
      return;
    }

    const removedChoiceId = `opt_${index + 1}`;
    const nextChoices = pollChoices.filter((_, choiceIndex) => choiceIndex !== index);
    setPollChoices(nextChoices);

    if (correctPollOptionId === removedChoiceId) {
      setCorrectPollOptionId('');
    }
  };

  const handleUpdatePost = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      let uploadedImages = [...existingImages];
      let imageDeleteUrls = post.imageDeleteUrls || [];

      if (images.length > 0) {
        showAlert(t('post.uploadingImages'), t('post.pleaseWait'), 'info');

        for (const image of images) {
          try {
            const result = await uploadImage(image.uri);
            uploadedImages.push(result.url);
            imageDeleteUrls.push(result.deleteUrl);
          } catch (error) {
          }
        }
      }

      const tagArray = tags.filter(tag => tag.length > 0);

      const linkArray = links.filter(link => link.length > 0);

      const updateData = {
        postType,
        topic: topic.trim(),
        text: text.trim(),
        stage,
        images: uploadedImages,
        imageDeleteUrls,
        canOthersRepost,
      };

      if (postType === POST_TYPES.POLL) {
        updateData.pollData = createPollPayload({
          question: topic.trim() || text.trim() || t('post.poll.defaultQuestion'),
          options: pollChoices,
          allowMultiple: false,
          maxSelections: 1,
          isQuiz: isQuizPoll,
          correctOptionId: correctPollOptionId,
        });
      } else {
        updateData.pollData = null;
      }

      updateData.tags = tagArray;
      updateData.links = linkArray;

      const updatedPost = await updatePost(post.$id, updateData);

      const routes = navigation.getState()?.routes || [];
      const previousRoute = routes.length > 1 ? routes[routes.length - 2] : null;
      const tabState = previousRoute?.state;
      const activeTabRoute = tabState?.routes
        ? tabState.routes[tabState.index || 0]
        : null;

      if (previousRoute?.name === 'MainTabs' && activeTabRoute?.name) {
        navigation.navigate('MainTabs', {
          screen: activeTabRoute.name,
          params: { updatedPost },
          merge: true,
        });
      } else if (previousRoute?.name) {
        navigation.navigate(previousRoute.name, { updatedPost, merge: true });
      }

      showAlert(
        t('common.success'),
        t('post.postUpdated'),
        'success'
      );

      navigation.goBack();
    } catch (error) {
      showAlert(
        t('common.error'),
        error.message || t('post.updateError')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExistingImage = (index) => {
    const newImages = [...existingImages];
    newImages.splice(index, 1);
    setExistingImages(newImages);
  };

  const visibilityOptions = ['department', 'major', 'public'];

  const cycleVisibility = () => {
    const currentIndex = visibilityOptions.indexOf(visibility);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % visibilityOptions.length;
    setVisibility(visibilityOptions[nextIndex]);
  };

  const getVisibilityLabel = () => {
    if (visibility === 'major') return t('post.majorOnly');
    if (visibility === 'public') return t('post.publicPost');
    return t('post.departmentOnly');
  };

  const getVisibilityHelper = () => {
    if (visibility === 'major') return t('post.majorOnlyHelper');
    if (visibility === 'public') return t('post.publicPostHelper');
    return t('post.departmentOnlyHelper');
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={moderateScale(26)} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('common.error')}</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 10 }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <LinearGradient
        colors={isDarkMode
          ? ['#1a1a2e', '#16213e', '#0f3460']
          : ['#FFFEF7', '#FFF9E6', '#FFF4D6']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <AnimatedBackground particleCount={16} />
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="close" size={moderateScale(26)} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('post.editPost')}</Text>
          
          <TouchableOpacity
            style={[styles.headerButton, loading && styles.headerButtonDisabled]}
            onPress={handleUpdatePost}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text style={[styles.postButtonText, { color: theme.primary }]}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={contentStyle}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.section}>
            <View style={styles.topControlsRow}>
              <View style={[styles.compactField, styles.postTypeField]}>
                <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>
                  {t('post.postType')}
                </Text>
                <SearchableDropdownNew
                  items={postTypeOptions}
                  value={postType}
                  onSelect={setPostType}
                  placeholder={t('post.postType')}
                  icon={POST_ICONS[postType] || 'list-outline'}
                  disabled={loading}
                />
              </View>

              <View style={[styles.compactField, styles.compactFieldHalf]}>
                <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>
                  {t('post.stage')}
                </Text>
                <SearchableDropdownNew
                  items={stageOptions}
                  value={stage}
                  onSelect={setStage}
                  placeholder={t('post.selectStage')}
                  icon="stats-chart-outline"
                  disabled={loading}
                  compact
                />
              </View>

              <View style={[styles.compactField, styles.compactFieldHalf]}>
                <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>
                  {t('post.visibility')}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.compactToggle,
                    { backgroundColor: theme.input.background, borderColor: theme.input.border }
                  ]}
                  onPress={cycleVisibility}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye-outline" size={moderateScale(14)} color={theme.primary} />
                  <Text
                    style={[styles.compactToggleText, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {getVisibilityLabel()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.helperText, styles.compactHelper, { color: theme.textSecondary }]}>
              {getVisibilityHelper()}
            </Text>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}
                onPress={() => setShowTags(!showTags)}
                activeOpacity={0.7}
              >
                <Ionicons name="pricetag-outline" size={18} color={showTags ? theme.primary : theme.textSecondary} />
                <Text style={[styles.actionButtonText, { color: showTags ? theme.primary : theme.textSecondary }]}>
                  {t('post.tags')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}
                onPress={() => setShowLinks(!showLinks)}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={18} color={showLinks ? theme.primary : theme.textSecondary} />
                <Text style={[styles.actionButtonText, { color: showLinks ? theme.primary : theme.textSecondary }]}>
                  {t('post.links')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}
                onPress={() => {}}
                disabled
                activeOpacity={1}
              >
                <Ionicons name="images-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}> 
                  {t('post.images')} ({existingImages.length + images.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {t('post.topic')}
            </Text>
            <TextInput
              style={[styles.topicInput, styles.growingInput, inputColors, {
                minHeight: topicInputHeight,
                height: topicInputHeight,
              }]}
              value={topic}
              onChangeText={setTopic}
              placeholder={t('post.topicPlaceholder')}
              placeholderTextColor={theme.input.placeholder}
              editable={!loading}
              maxLength={VALIDATION_RULES.POST.topic.max}
              multiline
              numberOfLines={1}
              textAlignVertical="top"
              onContentSizeChange={(event) => {
                const nextHeight = Math.max(48, Math.min(120, event.nativeEvent.contentSize.height + 16));
                setTopicInputHeight(nextHeight);
              }}
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {topic.length}/{VALIDATION_RULES.POST.topic.max}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {t('post.description')}
            </Text>
            <TextInput
              style={[styles.textInput, styles.growingInput, inputColors, {
                minHeight: textInputHeight,
                height: textInputHeight,
              }]}
              value={text}
              onChangeText={setText}
              placeholder={t('post.descriptionPlaceholder')}
              placeholderTextColor={theme.input.placeholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
              maxLength={VALIDATION_RULES.POST.text.max}
              onContentSizeChange={(event) => {
                const nextHeight = Math.max(96, Math.min(280, event.nativeEvent.contentSize.height + 16));
                setTextInputHeight(nextHeight);
              }}
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {text.length}/{VALIDATION_RULES.POST.text.max}
            </Text>
          </View>

          {postType === POST_TYPES.POLL && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>{t('post.poll.choicesLabel')}</Text>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('post.poll.choicesHelper')}</Text>

              {pollChoices.map((choice, index) => (
                <View key={`poll-choice-${index}`} style={styles.pollChoiceRow}>
                  <TextInput
                    style={[
                      styles.pollChoiceInput,
                      {
                        backgroundColor: theme.input.background,
                        borderColor: theme.input.border,
                        color: theme.text,
                      },
                    ]}
                    value={choice}
                    onChangeText={(value) => handlePollChoiceChange(index, value)}
                    placeholder={t('post.poll.choicePlaceholder').replace('{number}', String(index + 1))}
                    placeholderTextColor={theme.input.placeholder}
                    editable={!loading}
                    maxLength={120}
                  />
                  <TouchableOpacity
                    style={[styles.pollChoiceRemoveButton, { borderColor: theme.input.border }]}
                    onPress={() => handleRemovePollChoice(index)}
                    disabled={loading || pollChoices.length <= 2}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.pollAddChoiceButton, { borderColor: theme.input.border, backgroundColor: theme.input.background }]}
                onPress={handleAddPollChoice}
                disabled={loading}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                <Text style={[styles.pollAddChoiceText, { color: theme.primary }]}>{t('post.poll.addChoice')}</Text>
              </TouchableOpacity>

              <View style={styles.pollModeRow}>
                <TouchableOpacity
                  style={styles.pollModeItem}
                  onPress={() => {
                    setIsQuizPoll(false);
                    setCorrectPollOptionId('');
                  }}
                >
                  <Ionicons
                    name={!isQuizPoll ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={!isQuizPoll ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.pollModeText, { color: theme.text }]}>{t('post.poll.modePoll')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pollModeItem}
                  onPress={() => setIsQuizPoll(true)}
                >
                  <Ionicons
                    name={isQuizPoll ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isQuizPoll ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.pollModeText, { color: theme.text }]}>{t('post.poll.modeQuestion')}</Text>
                </TouchableOpacity>
              </View>

              {isQuizPoll && (
                <View style={styles.pollCorrectAnswerWrap}>
                  <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>{t('post.poll.correctAnswerLabel')}</Text>
                  {pollChoices.map((choice, index) => {
                    const optionId = `opt_${index + 1}`;
                    const choiceLabel = choice.trim();
                    if (!choiceLabel) {
                      return null;
                    }

                    const isSelected = correctPollOptionId === optionId;
                    return (
                      <TouchableOpacity
                        key={`poll-correct-${optionId}`}
                        style={styles.pollCorrectAnswerItem}
                        onPress={() => setCorrectPollOptionId(optionId)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? theme.primary : theme.textSecondary}
                        />
                        <Text style={[styles.pollCorrectAnswerText, { color: theme.text }]} numberOfLines={1}>
                          {choiceLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {showTags && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {t('post.tags')} {t('common.optional')}
            </Text>
            <View style={styles.hashtagsSection}>
              <View style={styles.hashtagsChipsWrapper}>
                {tags.map((tag, index) => (
                  <View
                    key={`${tag}-${index}`}
                    style={[
                      styles.hashtagChip,
                      { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)' }
                    ]}
                  >
                    <Ionicons name="pricetag-outline" size={moderateScale(12)} color="#8B5CF6" />
                    <Text style={styles.hashtagChipText}>{tag}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newTags = [...tags];
                        newTags.splice(index, 1);
                        setTags(newTags);
                      }}
                      disabled={loading}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={moderateScale(14)} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.hashtagInputRow}>
                <TextInput
                  style={[
                    styles.hashtagInput,
                    {
                      backgroundColor: theme.input.background,
                      borderColor: theme.input.border,
                      color: theme.text,
                    }
                  ]}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder={t('post.tagsPlaceholder')}
                  placeholderTextColor={theme.input.placeholder}
                  editable={!loading && tags.length < 10}
                  blurOnSubmit={false}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const cleanTag = tagInput.trim().replace(/^#/, '');
                    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
                      setTags([...tags, cleanTag]);
                    }
                    setTagInput('');
                  }}
                />
                <TouchableOpacity
                  style={[styles.addLinkButton, { opacity: tagInput.trim() ? 1 : 0.5 }]}
                  onPress={() => {
                    const cleanTag = tagInput.trim().replace(/^#/, '');
                    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
                      setTags([...tags, cleanTag]);
                    }
                    setTagInput('');
                  }}
                  disabled={loading || !tagInput.trim() || tags.length >= 10}
                >
                  <Ionicons name="add-circle" size={moderateScale(26)} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              {t('post.tagsInputHelper')}
            </Text>
          </View>
          )}

          {showLinks && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {t('post.links')} {t('common.optional')}
            </Text>
            <View style={styles.linksSection}>
              {links.map((link, index) => (
                <View
                  key={`${link}-${index}`}
                  style={[
                    styles.linkChip,
                    { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }
                  ]}
                >
                  <Ionicons name="link-outline" size={moderateScale(14)} color="#3B82F6" />
                  <Text style={styles.linkChipText} numberOfLines={1}>{link}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newLinks = [...links];
                      newLinks.splice(index, 1);
                      setLinks(newLinks);
                    }}
                    disabled={loading}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={moderateScale(15)} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.linkInputRow}>
                <TextInput
                  style={[
                    styles.linkInput,
                    {
                      backgroundColor: theme.input.background,
                      borderColor: theme.input.border,
                      color: theme.text,
                    }
                  ]}
                  value={linkInput}
                  onChangeText={setLinkInput}
                  placeholder={t('post.linksPlaceholder')}
                  placeholderTextColor={theme.input.placeholder}
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="url"
                  blurOnSubmit={false}
                  autoCorrect={false}
                  spellCheck={false}
                  onSubmitEditing={() => {
                    const newLink = linkInput.trim();
                    if (newLink && !links.includes(newLink)) {
                      setLinks([...links, newLink]);
                    }
                    setLinkInput('');
                  }}
                />
                <TouchableOpacity
                  style={[styles.addLinkButton, { opacity: linkInput.trim() ? 1 : 0.5 }]}
                  onPress={() => {
                    const newLink = linkInput.trim();
                    if (newLink && !links.includes(newLink)) {
                      setLinks([...links, newLink]);
                    }
                    setLinkInput('');
                  }}
                  disabled={loading || !linkInput.trim()}
                >
                  <Ionicons name="add-circle" size={moderateScale(26)} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              {t('post.linksHelper')}
            </Text>
          </View>
          )}

          {existingImages.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                {t('post.existingImages')}
              </Text>
              <View style={styles.existingImagesContainer}>
                {existingImages.map((imageUrl, index) => (
                  <View key={index} style={styles.existingImageWrapper}>
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.existingImage}
                    />
                    <TouchableOpacity
                      style={[styles.removeExistingImageButton, { backgroundColor: theme.card }]}
                      onPress={() => handleRemoveExistingImage(index)}
                      disabled={loading}
                    >
                      <Ionicons name="close-circle" size={moderateScale(22)} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <ImagePickerComponent
            images={images}
            onImagesChange={setImages}
            maxImages={MAX_IMAGES_PER_POST - existingImages.length}
            disabled={loading}
          />

          <View style={styles.section}>
            <View style={styles.repostPermissionRow}>
              <View style={styles.repostPermissionTextWrap}>
                <Text style={[styles.compactLabel, { color: theme.textSecondary }]}> 
                  {t('post.allowReposts')}
                </Text>
                <Text style={[styles.helperText, { color: theme.textSecondary }]}> 
                  {t('post.allowRepostsHelper')}
                </Text>
              </View>
              <Switch
                value={canOthersRepost}
                onValueChange={setCanOthersRepost}
                disabled={loading}
                trackColor={{ false: theme.input.border, true: `${theme.primary}88` }}
                thumbColor={canOthersRepost ? theme.primary : '#F3F4F6'}
              />
            </View>
          </View>

            <View style={styles.bottomSpace} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: spacing.xs,
    minWidth: moderateScale(60),
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: fontSize(17),
    fontWeight: '600',
    color: '#111827',
  },
  postButtonText: {
    fontSize: fontSize(15),
    fontWeight: '600',
    color: '#3B82F6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  topControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  compactField: {
    flex: 1,
    minWidth: wp(24),
  },
  postTypeField: {
    flexBasis: '100%',
  },
  compactFieldHalf: {
    minWidth: wp(38),
  },
  compactLabel: {
    fontSize: fontSize(11),
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  compactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    minHeight: moderateScale(40),
  },
  compactToggleText: {
    fontSize: fontSize(12),
    fontWeight: '600',
    flexShrink: 1,
  },
  compactHelper: {
    marginTop: spacing.xs,
  },
  repostPermissionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  repostPermissionTextWrap: {
    flex: 1,
  },
  actionButtonsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.xs / 2,
  },
  actionButtonText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  postTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  postTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: spacing.xs,
  },
  postTypeText: {
    fontSize: fontSize(14),
    fontWeight: '500',
    color: '#6B7280',
  },
  postTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  topicInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize(15),
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  growingInput: {
    overflow: 'hidden',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize(15),
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: moderateScale(96),
  },
  charCount: {
    fontSize: fontSize(12),
    color: '#6B7280',
    textAlign: 'right',
    marginTop: spacing.xs / 2,
  },
  helperText: {
    fontSize: fontSize(12),
    color: '#6B7280',
    marginTop: spacing.xs / 2,
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  visibilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: moderateScale(6),
  },
  visibilityButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  visibilityText: {
    fontSize: fontSize(13),
    fontWeight: '500',
    color: '#6B7280',
  },
  visibilityTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  visibilityToggleText: {
    fontSize: fontSize(14),
    fontWeight: '600',
  },
  // Links section styles (matching CreatePost)
  linksSection: {
    gap: spacing.xs,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: moderateScale(6),
  },
  linkChipText: {
    flex: 1,
    fontSize: fontSize(13),
    color: '#3B82F6',
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize(14),
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  addLinkButton: {
    padding: spacing.xs / 2,
  },
  pollChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pollChoiceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize(14),
  },
  pollChoiceRemoveButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollAddChoiceButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  pollAddChoiceText: {
    fontSize: fontSize(13),
    fontWeight: '600',
  },
  pollModeRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.md,
  },
  pollModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pollModeText: {
    fontSize: fontSize(14),
    fontWeight: '500',
  },
  pollCorrectAnswerWrap: {
    marginTop: spacing.sm,
  },
  pollCorrectAnswerItem: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pollCorrectAnswerText: {
    flex: 1,
    fontSize: fontSize(14),
  },
  // Hashtags section styles
  hashtagsSection: {
    gap: spacing.xs,
  },
  hashtagsChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: moderateScale(6),
    borderRadius: borderRadius.sm,
    gap: spacing.xs / 2,
  },
  hashtagChipText: {
    fontSize: fontSize(13),
    color: '#8B5CF6',
  },
  hashtagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hashtagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize(14),
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  existingImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  existingImageWrapper: {
    position: 'relative',
    width: moderateScale(100),
    height: moderateScale(100),
  },
  existingImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
  },
  removeExistingImageButton: {
    position: 'absolute',
    top: moderateScale(-8),
    right: moderateScale(-8),
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
  },
  bottomSpace: {
    height: hp(5),
  },
});

export default EditPost;
