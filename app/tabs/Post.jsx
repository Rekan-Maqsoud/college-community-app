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
  StatusBar,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import AnimatedBackground from '../components/AnimatedBackground';
import SearchableDropdownNew from '../components/SearchableDropdownNew';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { uploadImage } from '../../services/imgbbService';
import { createPost } from '../../database/posts';
import { notifyFriendPost } from '../../database/notifications';
import { compressImage } from '../utils/imageCompression';
import { createPollPayload } from '../utils/pollUtils';
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  POST_ICONS,
  getStageOptionsForDepartment,
  isExtendedStageDepartment,
  MAX_IMAGES_PER_POST,
} from '../constants/postConstants';
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

const Post = () => {
  const appSettings = useAppSettings();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  
  if (!appSettings) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  const { theme, isDarkMode, t } = appSettings;
  const { user } = useUser();
  const { contentStyle } = useLayout();

  const [postType, setPostType] = useState(POST_TYPES.DISCUSSION);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [department, setDepartment] = useState(user?.department || '');
  const [stage, setStage] = useState(normalizeStageValue(user?.stage));
  const [topicInputHeight, setTopicInputHeight] = useState(48);
  const [textInputHeight, setTextInputHeight] = useState(96);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showTags, setShowTags] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [visibility, setVisibility] = useState('department');
  const [canOthersRepost, setCanOthersRepost] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [pollChoices, setPollChoices] = useState(['', '']);
  const [isQuizPoll, setIsQuizPoll] = useState(false);
  const [correctPollOptionId, setCorrectPollOptionId] = useState('');

  const postTypeOptions = [
    ...POST_TYPE_OPTIONS,
    { value: POST_TYPES.POLL, labelKey: 'post.types.poll' },
  ];
  const visibilityOptions = ['department', 'major', 'public'];

  useEffect(() => {
    if (user?.stage && !stage) {
      setStage(normalizeStageValue(user.stage));
    }
  }, [user]);

  useEffect(() => {
    const departmentKey = department || user?.department || '';
    const allowExtendedStages = isExtendedStageDepartment(departmentKey);
    if (!allowExtendedStages && (stage === 'stage_5' || stage === 'stage_6')) {
      setStage('');
    }
  }, [department, user, stage]);

  const stageOptions = getStageOptionsForDepartment(department || user?.department || '');

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

  const handlePickImages = async () => {
    try {
      if (images.length >= MAX_IMAGES_PER_POST) {
        showAlert({ type: 'warning', title: t('post.imageLimit'), message: t('post.maxImagesReached', { max: MAX_IMAGES_PER_POST }) });
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ type: 'error', title: t('common.error'), message: t('settings.cameraPermissionRequired') });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_IMAGES_PER_POST - images.length,
      });

      if (!result.canceled && result.assets) {
        const compressedImages = await Promise.all(
          result.assets.map(async (asset) => {
            try {
              const compressed = await compressImage(asset.uri, { quality: 0.7 });
              return compressed?.uri || asset.uri;
            } catch (error) {
              return asset.uri;
            }
          })
        );
        setImages([...images, ...compressedImages]);
      }
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('post.imagePickError') });
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    // Post must have at least one of: topic, text, or images
    const hasTopic = topic.trim().length > 0;
    const hasText = text.trim().length > 0;
    const hasImages = images.length > 0;
    
    if (!hasTopic && !hasText && !hasImages) {
      showAlert({ type: 'error', title: t('common.error'), message: t('post.contentRequired') });
      return false;
    }
    if (!stage) {
      showAlert({ type: 'error', title: t('common.error'), message: t('post.stageRequired') });
      return false;
    }

    if (postType === POST_TYPES.POLL) {
      const validChoices = pollChoices.map(choice => choice.trim()).filter(Boolean);
      if (validChoices.length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('post.poll.minChoicesError') });
        return false;
      }

      if (isQuizPoll && !correctPollOptionId) {
        showAlert({ type: 'error', title: t('common.error'), message: t('post.poll.correctAnswerRequired') });
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
      showAlert({ type: 'warning', title: t('common.warning'), message: t('post.poll.maxChoicesError') });
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

  const handleCreatePost = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let imageUrls = [];
      let imageDeleteUrls = [];

      if (images.length > 0) {
        const uploadPromises = images.map(uri => uploadImage(uri));
        const results = await Promise.all(uploadPromises);
        
        results.forEach(result => {
          if (result.success) {
            imageUrls.push(result.url);
            imageDeleteUrls.push(result.deleteUrl);
          }
        });
      }

      const tagsArray = tags.filter(tag => tag.length > 0);
      const linksArray = links.filter(link => link.length > 0);
      const isPollPost = postType === POST_TYPES.POLL;
      const pollData = isPollPost
        ? createPollPayload({
            question: topic.trim() || text.trim() || t('post.poll.defaultQuestion'),
            options: pollChoices,
            allowMultiple: false,
            maxSelections: 1,
            isQuiz: isQuizPoll,
            correctOptionId: correctPollOptionId,
          })
        : null;
      
      const postDepartment = visibility === 'public' ? 'public' : (user?.department || '');

      const newPost = await createPost({
        userId: user.$id,
        userName: user.fullName || user.name,
        profilePicture: user.profilePicture || null,
        text,
        topic,
        department: postDepartment,
        stage,
        postType,
        images: imageUrls,
        imageDeleteUrls,
        tags: tagsArray,
        links: linksArray,
        canOthersRepost,
        pollData,
      });

      // Notify followers about the new post (non-blocking)
      if (user.followers && user.followers.length > 0 && newPost?.$id) {
        const preview = topic || text || '';
        Promise.all(
          user.followers.map(followerId =>
            notifyFriendPost(
              followerId,
              user.$id,
              user.fullName || user.name,
              user.profilePicture,
              newPost.$id,
              preview,
            ).catch(() => {})
          )
        ).catch(() => {});
      }

      showAlert({ type: 'success', title: t('common.success'), message: t('post.postCreated') });
      
      setTopic('');
      setText('');
      setTags([]);
      setTagInput('');
      setLinks([]);
      setLinkInput('');
      setImages([]);
      setPostType(POST_TYPES.DISCUSSION);
      setVisibility('department');
      setCanOthersRepost(true);
      setPollChoices(['', '']);
      setIsQuizPoll(false);
      setCorrectPollOptionId('');
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('post.createError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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
        
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('post.createPost')}</Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            style={[styles.postButton, { backgroundColor: theme.primary }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>{t('post.post')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
          
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
                    { backgroundColor: theme.inputBackground || theme.input?.background, borderColor: theme.border }
                  ]}
                  onPress={cycleVisibility}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye-outline" size={14} color={theme.primary} />
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
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {t('post.topic')}
            </Text>
            <TextInput
              style={[styles.input, styles.growingInput, {
                minHeight: topicInputHeight,
                height: topicInputHeight,
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text 
              }]}
              value={topic}
              onChangeText={setTopic}
              placeholder={t('post.topicPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              maxLength={200}
              multiline
              numberOfLines={1}
              textAlignVertical="top"
              editable={!loading}
              onContentSizeChange={(event) => {
                const nextHeight = Math.max(48, Math.min(120, event.nativeEvent.contentSize.height + 16));
                setTopicInputHeight(nextHeight);
              }}
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {topic.length}/200
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {t('post.description')}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.growingInput, {
                minHeight: textInputHeight,
                height: textInputHeight,
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
                color: theme.text
              }]}
              value={text}
              onChangeText={setText}
              placeholder={t('post.descriptionPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
              onContentSizeChange={(event) => {
                const nextHeight = Math.max(96, Math.min(280, event.nativeEvent.contentSize.height + 16));
                setTextInputHeight(nextHeight);
              }}
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {text.length}/5000
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
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={choice}
                    onChangeText={(value) => handlePollChoiceChange(index, value)}
                    placeholder={t('post.poll.choicePlaceholder').replace('{number}', String(index + 1))}
                    placeholderTextColor={theme.textSecondary}
                    editable={!loading}
                    maxLength={120}
                  />
                  <TouchableOpacity
                    style={[styles.pollChoiceRemoveButton, { borderColor: theme.border }]}
                    onPress={() => handleRemovePollChoice(index)}
                    disabled={loading || pollChoices.length <= 2}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.pollAddChoiceButton, { borderColor: theme.border, backgroundColor: theme.card }]}
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
                  <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>{t('post.poll.correctAnswerLabel')}</Text>
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

          <View style={styles.section}>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setShowTags(!showTags)}
                activeOpacity={0.7}
              >
                <Ionicons name="pricetag-outline" size={18} color={showTags ? theme.primary : theme.textSecondary} />
                <Text style={[styles.actionButtonText, { color: showTags ? theme.primary : theme.textSecondary }]}>
                  {t('post.tags')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setShowLinks(!showLinks)}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={18} color={showLinks ? theme.primary : theme.textSecondary} />
                <Text style={[styles.actionButtonText, { color: showLinks ? theme.primary : theme.textSecondary }]}>
                  {t('post.links')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handlePickImages}
                disabled={loading || images.length >= MAX_IMAGES_PER_POST}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>
                  {t('post.images')} {images.length > 0 && `(${images.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showTags && (
            <View style={styles.section}>
              <View style={styles.chipsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={[styles.tagChip, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)' }]}>
                    <Ionicons name="pricetag-outline" size={12} color="#8B5CF6" />
                    <Text style={styles.tagChipText}>{tag}</Text>
                    <TouchableOpacity
                      onPress={() => setTags(tags.filter((_, i) => i !== index))}
                      disabled={loading}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.chipInput, {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={tagInput}
                  onChangeText={(text) => {
                    if (text.endsWith(' ')) {
                      const cleanTag = text.trim().replace(/^#/, '');
                      if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
                        setTags([...tags, cleanTag]);
                      }
                      setTagInput('');
                    } else {
                      setTagInput(text);
                    }
                  }}
                  placeholder={t('post.tagsPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  editable={!loading && tags.length < 10}
                  blurOnSubmit={false}
                  autoCapitalize="none"
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
                  style={[styles.addChipButton, { opacity: tagInput.trim() ? 1 : 0.5 }]}
                  onPress={() => {
                    const cleanTag = tagInput.trim().replace(/^#/, '');
                    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
                      setTags([...tags, cleanTag]);
                    }
                    setTagInput('');
                  }}
                  disabled={loading || !tagInput.trim() || tags.length >= 10}
                >
                  <Ionicons name="add-circle" size={28} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                {t('post.tagsInputHelper')}
              </Text>
            </View>
          )}

          {showLinks && (
            <View style={styles.section}>
              <View style={styles.linksChipsContainer}>
                {links.map((link, index) => (
                  <View key={index} style={[styles.linkChip, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }]}>
                    <Ionicons name="link-outline" size={14} color="#3B82F6" />
                    <Text style={styles.linkChipText} numberOfLines={1}>{link}</Text>
                    <TouchableOpacity
                      onPress={() => setLinks(links.filter((_, i) => i !== index))}
                      disabled={loading}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.chipInput, {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={linkInput}
                  onChangeText={(text) => {
                    if (text.endsWith(' ')) {
                      const newLink = text.trim();
                      if (newLink && !links.includes(newLink)) {
                        setLinks([...links, newLink]);
                      }
                      setLinkInput('');
                    } else {
                      setLinkInput(text);
                    }
                  }}
                  placeholder={t('post.linksPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="url"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    const newLink = linkInput.trim();
                    if (newLink && !links.includes(newLink)) {
                      setLinks([...links, newLink]);
                    }
                    setLinkInput('');
                  }}
                />
                <TouchableOpacity
                  style={[styles.addChipButton, { opacity: linkInput.trim() ? 1 : 0.5 }]}
                  onPress={() => {
                    const newLink = linkInput.trim();
                    if (newLink && !links.includes(newLink)) {
                      setLinks([...links, newLink]);
                    }
                    setLinkInput('');
                  }}
                  disabled={loading || !linkInput.trim()}
                >
                  <Ionicons name="add-circle" size={28} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                {t('post.linksHelper')}
              </Text>
            </View>
          )}

          {images.length > 0 && (
            <View style={styles.section}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
                {images.map((uri, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.imageWrapper}
                    onPress={() => setSelectedImageIndex(index)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={[styles.removeImageButton, { backgroundColor: theme.danger }]}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.repostPermissionRow}>
              <View style={styles.repostPermissionTextWrap}>
                <Text style={[styles.optionLabel, { color: theme.textSecondary }]}> 
                  {t('post.allowReposts')}
                </Text>
                <Text style={[styles.repostPermissionHelper, { color: theme.textSecondary }]}> 
                  {t('post.allowRepostsHelper')}
                </Text>
              </View>
              <Switch
                value={canOthersRepost}
                onValueChange={setCanOthersRepost}
                disabled={loading}
                trackColor={{ false: theme.border, true: `${theme.primary}88` }}
                thumbColor={canOthersRepost ? theme.primary : '#f4f3f4'}
              />
            </View>
          </View>

            <View style={styles.bottomSpace} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setSelectedImageIndex(null)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.closeModalButton, { backgroundColor: theme.danger }]}
                onPress={() => setSelectedImageIndex(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              {selectedImageIndex !== null && (
                <Image 
                  source={{ uri: images[selectedImageIndex] }} 
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
  },
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    marginLeft: 12,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  topControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  compactField: {
    flex: 1,
    minWidth: 90,
  },
  postTypeField: {
    flexBasis: '100%',
  },
  compactFieldHalf: {
    minWidth: 140,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  compactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
  },
  compactToggleText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  compactHelper: {
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  optional: {
    fontSize: 14,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  growingInput: {
    overflow: 'hidden',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  tagChipText: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  linksChipsContainer: {
    gap: 8,
    marginBottom: 8,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  linkChipText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
  },
  chipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addChipButton: {
    padding: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  repostPermissionRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  repostPermissionTextWrap: {
    flex: 1,
  },
  repostPermissionHelper: {
    fontSize: 11,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pollChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  pollChoiceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  pollChoiceRemoveButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollAddChoiceButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pollAddChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pollModeRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 18,
  },
  pollModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pollCorrectAnswerWrap: {
    marginTop: 12,
  },
  pollCorrectAnswerItem: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollCorrectAnswerText: {
    flex: 1,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSpace: {
    height: 40,
  },
});

export default Post;
