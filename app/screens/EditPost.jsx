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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useUser } from '../context/UserContext';
import ImagePickerComponent from '../components/ImagePicker';
import SearchableDropdownNew from '../components/SearchableDropdownNew';
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  DEPARTMENTS,
  STAGES,
  VALIDATION_RULES,
  MAX_IMAGES_PER_POST,
  POST_COLORS,
  POST_ICONS,
} from '../constants/postConstants';
import { uploadImage } from '../../services/imgbbService';
import { updatePost } from '../../database/posts';

const EditPost = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { showAlert } = useCustomAlert();
  const { user } = useUser();
  const { post } = route?.params || {};

  const [postType, setPostType] = useState(post?.postType || POST_TYPES.DISCUSSION);
  const [topic, setTopic] = useState(post?.topic || '');
  const [text, setText] = useState(post?.text || '');
  const [department, setDepartment] = useState(post?.department || '');
  const [stage, setStage] = useState(post?.stage || '');
  const [visibility, setVisibility] = useState(post?.visibility || 'department');
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState(post?.images || []);
  const [tags, setTags] = useState('');
  const [links, setLinks] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!post) {
      navigation.goBack();
      return;
    }

    if (post.userId !== user?.$id) {
      navigation.goBack();
      return;
    }

    if (post.tags && Array.isArray(post.tags)) {
      setTags(post.tags.join(', '));
    }

    if (post.links && Array.isArray(post.links)) {
      setLinks(post.links.join('\n'));
    }
  }, []);

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

      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const linkArray = links
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);

      const updateData = {
        postType,
        topic: topic.trim(),
        text: text.trim(),
        department,
        stage,
        images: uploadedImages,
        imageDeleteUrls,
      };

      if (tagArray.length > 0) {
        updateData.tags = tagArray;
      }

      if (linkArray.length > 0) {
        updateData.links = linkArray;
      }

      const updatedPost = await updatePost(post.$id, updateData);

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

  const renderPostTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t('post.postType')}</Text>
      <View style={styles.postTypeGrid}>
        {POST_TYPE_OPTIONS.map((option) => {
          const isSelected = postType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.postTypeButton,
                isSelected && {
                  backgroundColor: POST_COLORS[option.value],
                  borderColor: POST_COLORS[option.value],
                },
              ]}
              onPress={() => setPostType(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={POST_ICONS[option.value]}
                size={24}
                color={isSelected ? '#fff' : '#6B7280'}
              />
              <Text
                style={[
                  styles.postTypeText,
                  isSelected && styles.postTypeTextSelected,
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#111827" />
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('post.editPost')}</Text>
        
        <TouchableOpacity
          style={[styles.headerButton, loading && styles.headerButtonDisabled]}
          onPress={handleUpdatePost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Text style={styles.postButtonText}>{t('common.save')}</Text>
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderPostTypeSelector()}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.topic')} *
            </Text>
            <TextInput
              style={styles.topicInput}
              value={topic}
              onChangeText={setTopic}
              placeholder={t('post.topicPlaceholder')}
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              maxLength={VALIDATION_RULES.POST.topic.max}
            />
            <Text style={styles.charCount}>
              {topic.length}/{VALIDATION_RULES.POST.topic.max}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.description')} *
            </Text>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder={t('post.descriptionPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!loading}
              maxLength={VALIDATION_RULES.POST.text.max}
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
              items={STAGES}
              value={stage}
              onSelect={setStage}
              placeholder={t('post.selectStage')}
              disabled={loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('post.visibility')}</Text>
            <View style={styles.visibilityContainer}>
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  visibility === 'department' && styles.visibilityButtonSelected,
                ]}
                onPress={() => setVisibility('department')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="people"
                  size={20}
                  color={visibility === 'department' ? '#fff' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.visibilityText,
                    visibility === 'department' && styles.visibilityTextSelected,
                  ]}
                >
                  {t('post.departmentOnly')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  visibility === 'major' && styles.visibilityButtonSelected,
                ]}
                onPress={() => setVisibility('major')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="school"
                  size={20}
                  color={visibility === 'major' ? '#fff' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.visibilityText,
                    visibility === 'major' && styles.visibilityTextSelected,
                  ]}
                >
                  {t('post.majorOnly')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  visibility === 'public' && styles.visibilityButtonSelected,
                ]}
                onPress={() => setVisibility('public')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="globe"
                  size={20}
                  color={visibility === 'public' ? '#fff' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.visibilityText,
                    visibility === 'public' && styles.visibilityTextSelected,
                  ]}
                >
                  {t('post.publicPost')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {visibility === 'department' && t('post.departmentOnlyHelper')}
              {visibility === 'major' && t('post.majorOnlyHelper')}
              {visibility === 'public' && t('post.publicPostHelper')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.tags')} {t('common.optional')}
            </Text>
            <TextInput
              style={styles.topicInput}
              value={tags}
              onChangeText={setTags}
              placeholder={t('post.tagsPlaceholder')}
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
            <Text style={styles.helperText}>
              {t('post.tagsHelper')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('post.links')} {t('common.optional')}
            </Text>
            <TextInput
              style={[styles.textInput, { minHeight: 100 }]}
              value={links}
              onChangeText={setLinks}
              placeholder={t('post.linksPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.helperText}>
              {t('post.linksHelper')}
            </Text>
          </View>

          {existingImages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
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
                      style={styles.removeExistingImageButton}
                      onPress={() => handleRemoveExistingImage(index)}
                      disabled={loading}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
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

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  existingImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  existingImageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  existingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removeExistingImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  bottomSpace: {
    height: 40,
  },
});

export default EditPost;
