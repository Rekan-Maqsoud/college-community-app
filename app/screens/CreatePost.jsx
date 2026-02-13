import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
} from 'react-native';
import safeStorage from '../utils/safeStorage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import { useUser } from '../context/UserContext';
import ImagePickerComponent from '../components/ImagePicker';
import SearchableDropdownNew from '../components/SearchableDropdownNew';
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  DEPARTMENTS,
  getStageOptionsForDepartment,
  isExtendedStageDepartment,
  VALIDATION_RULES,
  MAX_IMAGES_PER_POST,
} from '../constants/postConstants';
import { uploadImage } from '../../services/imgbbService';
import { createPost } from '../../database/posts';

const DRAFT_STORAGE_KEY = 'post_draft';

const CreatePost = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { user } = useUser();

  const [postType, setPostType] = useState(POST_TYPES.DISCUSSION);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [department, setDepartment] = useState('');
  const [stage, setStage] = useState('');
  const [visibility, setVisibility] = useState('department');
  const [canOthersRepost, setCanOthersRepost] = useState(true);
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  const autoSaveTimerRef = useRef(null);

  const convertUserStageToStageValue = (userStage) => {
    const stageMap = {
      'firstYear': 'stage_1',
      'secondYear': 'stage_2',
      'thirdYear': 'stage_3',
      'fourthYear': 'stage_4',
      'fifthYear': 'stage_5',
      'sixthYear': 'stage_6',
      'graduate': 'graduate',
      '1': 'stage_1',
      '2': 'stage_2',
      '3': 'stage_3',
      '4': 'stage_4',
      '5': 'stage_5',
      '6': 'stage_6',
    };
    return stageMap[userStage] || userStage;
  };

  useEffect(() => {
    if (user) {
      if (user.stage) {
        const mappedStage = convertUserStageToStageValue(user.stage);
        setStage(mappedStage);
      }
      if (user.department) {
        setDepartment(user.department);
      }
    }
  }, [user]);

  useEffect(() => {
    const allowExtendedStages = isExtendedStageDepartment(department);
    if (!allowExtendedStages && (stage === 'stage_5' || stage === 'stage_6')) {
      setStage('');
    }
  }, [department, stage]);

  const stageOptions = getStageOptionsForDepartment(department);

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

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const savedDraft = await safeStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft.topic) setTopic(draft.topic);
          if (draft.text) setText(draft.text);
          if (draft.postType) setPostType(draft.postType);
          if (draft.tags) setTags(draft.tags);
          if (draft.links) setLinks(draft.links);
          if (draft.visibility) setVisibility(draft.visibility);
          if (typeof draft.canOthersRepost === 'boolean') setCanOthersRepost(draft.canOthersRepost);
        }
      } catch (error) {
        // Failed to load draft
      } finally {
        setDraftLoaded(true);
      }
    };
    loadDraft();
  }, []);

  // Auto-save draft when content changes
  useEffect(() => {
    if (!draftLoaded) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      const hasContent = topic.trim() || text.trim() || tags.length > 0 || links.length > 0;
      
      if (hasContent) {
        try {
          const draft = { topic, text, postType, tags, links, visibility, savedAt: Date.now() };
          draft.canOthersRepost = canOthersRepost;
          await safeStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (error) {
          // Failed to save draft
        }
      } else {
        // Clear draft if no content
        try {
          await safeStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (error) {
          // Failed to clear draft
        }
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [topic, text, postType, tags, links, visibility, canOthersRepost, draftLoaded]);

  // Clear draft after successful post
  const clearDraft = async () => {
    try {
      await safeStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      // Failed to clear draft
    }
  };

  // Check if there's any unsaved content
  const hasUnsavedContent = useCallback(() => {
    return topic.trim().length > 0 || text.trim().length > 0 || images.length > 0 || tags.length > 0 || links.length > 0;
  }, [topic, text, images, tags, links]);

  // Confirm before discarding post
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedContent() || loading) {
        return;
      }

      e.preventDefault();

      showAlert({
        type: 'warning',
        title: t('post.discardPost') || 'Discard Post?',
        message: t('post.discardPostMessage') || 'You have unsaved changes. Are you sure you want to discard this post?',
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('post.discard') || 'Discard',
            style: 'destructive',
            onPress: async () => {
              await clearDraft();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      });
    });

    return unsubscribe;
  }, [navigation, hasUnsavedContent, loading, t]);

  const validateForm = () => {
    if (!topic.trim()) {
      showAlert(t('common.error'), t('post.topicRequired'));
      return false;
    }

    if (topic.length < VALIDATION_RULES.POST.topic.min) {
      showAlert(
        t('common.error'),
        t('post.topicTooShort', { min: VALIDATION_RULES.POST.topic.min })
      );
      return false;
    }

    if (topic.length > VALIDATION_RULES.POST.topic.max) {
      showAlert(
        t('common.error'),
        t('post.topicTooLong', { max: VALIDATION_RULES.POST.topic.max })
      );
      return false;
    }

    if (!text.trim()) {
      showAlert(t('common.error'), t('post.textRequired'));
      return false;
    }

    if (text.length < VALIDATION_RULES.POST.text.min) {
      showAlert(
        t('common.error'),
        t('post.textTooShort', { min: VALIDATION_RULES.POST.text.min })
      );
      return false;
    }

    if (text.length > VALIDATION_RULES.POST.text.max) {
      showAlert(
        t('common.error'),
        t('post.textTooLong', { max: VALIDATION_RULES.POST.text.max })
      );
      return false;
    }

    if (!department) {
      showAlert(t('common.error'), t('post.departmentRequired'));
      return false;
    }

    if (!stage) {
      showAlert(t('common.error'), t('post.stageRequired'));
      return false;
    }

    return true;
  };

  const handleCreatePost = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      let uploadedImages = [];
      let imageDeleteUrls = [];

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

      const postData = {
        userId: user.$id,
        userName: user.fullName,
        userProfilePicture: user.profilePicture || null,
        postType,
        topic: topic.trim(),
        text: text.trim(),
        department,
        stage,
        images: uploadedImages,
        imageDeleteUrls,
        isResolved: false,
        viewCount: 0,
        likeCount: 0,
        replyCount: 0,
        isEdited: false,
        canOthersRepost,
      };

      if (tagArray.length > 0) {
        postData.tags = tagArray;
      }

      if (linkArray.length > 0) {
        postData.links = linkArray;
      }

      const createdPost = await createPost(postData);

      // Clear the draft after successful post
      await clearDraft();

      showAlert(
        t('common.success'),
        t('post.postCreated'),
        'success'
      );

      navigation.goBack();
    } catch (error) {
      showAlert(
        t('common.error'),
        error.message || t('post.createError')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          disabled={loading}
        >
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('post.createPost')}</Text>
        <TouchableOpacity
          onPress={handleCreatePost}
          style={[styles.headerButton, loading && styles.headerButtonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Text style={styles.postButtonText}>{t('post.post')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('post.postType')}</Text>
            <SearchableDropdownNew
              items={POST_TYPE_OPTIONS}
              value={postType}
              onSelect={setPostType}
              placeholder={t('post.postType')}
              icon="list-outline"
              disabled={loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.topic')}
            </Text>
            <TextInput
              style={styles.topicInput}
              value={topic}
              onChangeText={setTopic}
              placeholder={t('post.topicPlaceholder')}
              placeholderTextColor="#9CA3AF"
              maxLength={VALIDATION_RULES.POST.topic.max}
              editable={!loading}
            />
            <Text style={styles.charCount}>
              {topic.length}/{VALIDATION_RULES.POST.topic.max}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.description')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder={t('post.descriptionPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              maxLength={VALIDATION_RULES.POST.text.max}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={styles.charCount}>
              {text.length}/{VALIDATION_RULES.POST.text.max}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.department')} *
            </Text>
            <SearchableDropdownNew
              items={DEPARTMENTS}
              value={department}
              onSelect={setDepartment}
              placeholder={t('post.selectDepartment')}
              disabled={loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.stage')} *
            </Text>
            <SearchableDropdownNew
              items={stageOptions}
              value={stage}
              onSelect={setStage}
              placeholder={t('post.selectStage')}
              disabled={loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('post.visibility')}</Text>
            <TouchableOpacity
              style={styles.visibilityToggle}
              onPress={cycleVisibility}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={18} color="#2563eb" />
              <Text style={styles.visibilityToggleText}>{getVisibilityLabel()}</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>{getVisibilityHelper()}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.repostPermissionRow}>
              <View style={styles.repostPermissionTextWrap}>
                <Text style={styles.sectionLabel}>{t('post.allowReposts')}</Text>
                <Text style={styles.helperText}>{t('post.allowRepostsHelper')}</Text>
              </View>
              <Switch
                value={canOthersRepost}
                onValueChange={setCanOthersRepost}
                disabled={loading}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={canOthersRepost ? '#2563EB' : '#F3F4F6'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.tags')} {t('common.optional')}
            </Text>
            <View style={styles.hashtagsSection}>
              <View style={styles.hashtagsChipsWrapper}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.hashtagChip}>
                    <Ionicons name="pricetag-outline" size={12} color="#8B5CF6" />
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
                      <Ionicons name="close" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.hashtagInputRow}>
                <TextInput
                  style={styles.hashtagInput}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder={t('post.tagsPlaceholder')}
                  placeholderTextColor="#9CA3AF"
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
                  <Ionicons name="add-circle" size={28} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.helperText}>
              {t('post.tagsInputHelper')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.links')} {t('common.optional')}
            </Text>
            <View style={styles.linksSection}>
              {links.map((link, index) => (
                <View key={index} style={styles.linkChip}>
                  <Ionicons name="link-outline" size={14} color="#3B82F6" />
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
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.linkInputRow}>
                <TextInput
                  style={styles.linkInput}
                  value={linkInput}
                  onChangeText={setLinkInput}
                  placeholder={t('post.linksPlaceholder')}
                  placeholderTextColor="#9CA3AF"
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
                  <Ionicons name="add-circle" size={28} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.helperText}>
              {t('post.linksHelper')}
            </Text>
          </View>

          <ImagePickerComponent
            images={images}
            onImagesChange={setImages}
            maxImages={MAX_IMAGES_PER_POST}
            disabled={loading}
          />

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  postTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  postTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  postTypeText: {
    fontSize: 14,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  visibilityButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  visibilityText: {
    fontSize: 13,
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
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  visibilityToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  repostPermissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  repostPermissionTextWrap: {
    flex: 1,
  },
  chipsInputContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    minHeight: 48,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  chipDelete: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 78, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInput: {
    flex: 1,
    minWidth: 80,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  // Links section styles (matching Reply page)
  linksSection: {
    gap: 8,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
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
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  addLinkButton: {
    padding: 4,
  },
  // Hashtags section styles
  hashtagsSection: {
    gap: 8,
  },
  hashtagsChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  hashtagChipText: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  hashtagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hashtagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  bottomSpace: {
    height: 40,
  },
});

export default CreatePost;
