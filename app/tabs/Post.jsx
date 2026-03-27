import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Animated, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Modal, Switch } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import IoniconSvg from '../components/icons/IoniconSvg';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import SearchableDropdownNew from '../components/SearchableDropdownNew';
import { GlassContainer } from '../components/GlassComponents';
import TutorialHighlight from '../components/tutorial/TutorialHighlight';
import ScreenTutorialCard from '../components/tutorial/ScreenTutorialCard';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import useScreenTutorial from '../hooks/useScreenTutorial';
import { uploadImage } from '../../services/imgbbService';
import { createPost } from '../../database/posts';
import { notifyFriendPost } from '../../database/notifications';
import { compressImage } from '../utils/imageCompression';
import { enforceNsfwImagePolicy } from '../utils/nsfwImageFilter';
import { requestInAppStoreReview } from '../utils/inAppReview';
import { createPollPayload } from '../utils/pollUtils';
import {
  POST_TYPES,
  POST_TYPE_OPTIONS,
  POST_ICONS,
  getStageOptionsForDepartment,
  MAX_IMAGES_PER_POST,
} from '../constants/postConstants';
import { fontSize as fontSizeUtil, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import { ACADEMIC_OTHER_KEY, hasAcademicOtherSelection } from '../utils/academicSelection';
import { isGuest } from '../utils/guestUtils';
import { getAllDepartments } from '../data/universitiesData';
import ModalBackdrop from '../components/ModalBackdrop';
import { Image } from 'expo-image';

const STAGE_VALUE_MAP = {
  firstYear: 'stage_1',
  secondYear: 'stage_2',
  thirdYear: 'stage_3',
  fourthYear: 'stage_4',
  fifthYear: 'stage_5',
  sixthYear: 'stage_6',
  'First Year': 'stage_1',
  'Second Year': 'stage_2',
  'Third Year': 'stage_3',
  'Fourth Year': 'stage_4',
  'Fifth Year': 'stage_5',
  'Sixth Year': 'stage_6',
  graduate: 'graduate',
  stage_1: 'stage_1',
  stage_2: 'stage_2',
  stage_3: 'stage_3',
  stage_4: 'stage_4',
  stage_5: 'stage_5',
  stage_6: 'stage_6',
  '1': 'stage_1',
  '2': 'stage_2',
  '3': 'stage_3',
  '4': 'stage_4',
  '5': 'stage_5',
  '6': 'stage_6',
};

const normalizeStageValue = (userStage) => {
  if (userStage === null || userStage === undefined) {
    return '';
  }

  const trimmedValue = String(userStage).trim();
  if (!trimmedValue) {
    return '';
  }

  return STAGE_VALUE_MAP[trimmedValue] || trimmedValue;
};

const resolveStageSelection = (stageValue, availableOptions = []) => {
  const normalizedValue = normalizeStageValue(stageValue);
  if (normalizedValue && availableOptions.some((option) => option.value === normalizedValue)) {
    return normalizedValue;
  }

  return '';
};

const Post = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const appSettings = useAppSettings();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { user } = useUser();
  const { contentStyle } = useLayout();
  const successNavigationTimeoutRef = useRef(null);
  const visibilityScaleAnim = useRef(new Animated.Value(1)).current;

  const theme = appSettings?.theme;
  const isDarkMode = appSettings?.isDarkMode;
  const t = appSettings?.t;
  const isRTL = appSettings?.isRTL;

  const [postType, setPostType] = useState(POST_TYPES.DISCUSSION);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [department] = useState(user?.department || '');
  const [stage, setStage] = useState(normalizeStageValue(user?.stage));
  const [topicInputHeight, setTopicInputHeight] = useState(44);
  const [textInputHeight, setTextInputHeight] = useState(128);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [images, setImages] = useState([]);
  const [imageCompressionWarning, setImageCompressionWarning] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showTags, setShowTags] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [visibility, setVisibility] = useState('department');
  const [canOthersRepost, setCanOthersRepost] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [pollChoices, setPollChoices] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollShowVoters, setPollShowVoters] = useState(false);
  const [isQuizPoll, setIsQuizPoll] = useState(false);
  const [correctPollOptionId, setCorrectPollOptionId] = useState('');
  const [pollExplanation, setPollExplanation] = useState('');
  const [validationState, setValidationState] = useState({
    stage: false,
    pollChoices: false,
  });
  const [verificationState, setVerificationState] = useState({
    active: false,
    current: 0,
    total: 0,
  });
  const isAcademicOtherUser = hasAcademicOtherSelection({
    university: user?.university,
    college: user?.college,
    department: user?.department,
  });

  const isGuestUser = isGuest(user);
  const [hasReachedGuestLimit, setHasReachedGuestLimit] = useState(false);
  const [targetDepartments, setTargetDepartments] = useState([]);
  const allDepartments = useMemo(() => isGuestUser ? getAllDepartments().map(d => ({ key: d, label: d })) : [], [isGuestUser]);

  useEffect(() => {
    if (isGuestUser && user?.profileViews) {
      try {
        const viewsData = typeof user.profileViews === 'string' ? JSON.parse(user.profileViews) : user.profileViews;
        const today = new Date().toISOString().split('T')[0];
        if (viewsData?.guestLastPostDate === today && (viewsData?.guestPostCountToday || 0) >= 1) {
          setHasReachedGuestLimit(true);
        }
      } catch (e) {}
    }
  }, [isGuestUser, user?.profileViews]);

  useEffect(() => {
    if (isGuestUser) {
      setVisibility('public');
    }
  }, [isGuestUser]);

  const postTypeOptions = useMemo(() => {
    if (isGuestUser) {
      return POST_TYPE_OPTIONS.filter(opt => opt.value === POST_TYPES.DISCUSSION || opt.value === POST_TYPES.QUESTION);
    }
    return [
      ...POST_TYPE_OPTIONS,
      { value: POST_TYPES.POLL, labelKey: 'post.types.poll' },
    ];
  }, [isGuestUser]);
  const visibilityOptions = isGuestUser ? ['public'] : ['department', 'major', 'public'];
  const MAX_LINKS_PER_POST = 5;
  const isBusy = loading || verificationState.active || hasReachedGuestLimit;

  const tutorialSteps = useMemo(() => ([
    {
      target: 'publish',
      title: t('tutorial.post.publishTitle'),
      description: t('tutorial.post.publishDescription'),
    },
    {
      target: 'postType',
      title: t('tutorial.post.typeTitle'),
      description: t('tutorial.post.typeDescription'),
    },
    {
      target: 'topic',
      title: t('tutorial.post.topicTitle'),
      description: t('tutorial.post.topicDescription'),
    },
    {
      target: 'description',
      title: t('tutorial.post.descriptionTitle'),
      description: t('tutorial.post.descriptionDescription'),
    },
    {
      target: 'media',
      title: t('tutorial.post.mediaTitle'),
      description: t('tutorial.post.mediaDescription'),
    },
  ]), [t]);

  const tutorial = useScreenTutorial('post', tutorialSteps);

  useEffect(() => {
    if (user?.stage && !stage) {
      setStage(normalizeStageValue(user.stage));
    }
  }, [user, stage]);

  useEffect(() => () => {
    if (successNavigationTimeoutRef.current) {
      clearTimeout(successNavigationTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(visibilityScaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 28,
        bounciness: 6,
      }),
      Animated.spring(visibilityScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 8,
      }),
    ]).start();
  }, [visibility, visibilityScaleAnim]);

  const stageOptions = getStageOptionsForDepartment(department || user?.department || '');
  const defaultStageValue = resolveStageSelection(user?.stage, stageOptions);

  useEffect(() => {
    if (!stage) {
      if (defaultStageValue && stage !== defaultStageValue) {
        setStage(defaultStageValue);
      }
      return;
    }

    if (!stageOptions.some((option) => option.value === stage)) {
      const nextStageValue = resolveStageSelection(stage, stageOptions) || defaultStageValue;
      if (nextStageValue !== stage) {
        setStage(nextStageValue);
      }
    }
  }, [defaultStageValue, stage, stageOptions]);

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
      if (verificationState.active) {
        return;
      }

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
        const acceptedAssets = [];
        let blockedCount = 0;
        let unavailableCount = 0;

        setVerificationState({
          active: true,
          current: 0,
          total: result.assets.length,
        });

        console.log('[Post][NSFW] Selected assets for verification', {
          count: result.assets.length,
          uris: result.assets.map((asset) => String(asset?.uri || '').slice(0, 120)),
        });

        for (const [assetIndex, asset] of result.assets.entries()) {
          setVerificationState((previousState) => ({
            ...previousState,
            current: assetIndex + 1,
          }));

          console.log('[Post][NSFW] Verifying selected image', {
            imageUriPreview: String(asset?.uri || '').slice(0, 120),
            mimeType: asset?.mimeType || null,
            fileName: asset?.fileName || null,
            width: asset?.width || null,
            height: asset?.height || null,
          });

          try {
            await enforceNsfwImagePolicy({
              imageUri: asset.uri,
              t,
            });

            acceptedAssets.push(asset);
            console.log('[Post][NSFW] Image verification succeeded', {
              imageUriPreview: String(asset?.uri || '').slice(0, 120),
            });
          } catch (verificationError) {
            const errorCode = verificationError?.code || 'UNKNOWN';

            if (errorCode === 'NSFW_IMAGE_BLOCKED') {
              blockedCount += 1;
            } else if (errorCode === 'NSFW_SCAN_FAILED') {
              unavailableCount += 1;
            } else {
              unavailableCount += 1;
            }

            console.warn('[Post][NSFW] Image rejected during verification', {
              code: errorCode,
              message: verificationError?.message || 'unknown',
              imageUriPreview: String(asset?.uri || '').slice(0, 120),
            });
          }
        }

        if (acceptedAssets.length === 0) {
          if (blockedCount > 0 || unavailableCount > 0) {
            showAlert({
              type: 'warning',
              title: t('moderation.nsfwRejectedSelectionTitle'),
              message: t('moderation.nsfwRejectedSelectionMessage')
                .replace('{blocked}', String(blockedCount))
                .replace('{unavailable}', String(unavailableCount)),
            });
          }
          return;
        }

        const compressionResults = await Promise.all(
          acceptedAssets.map(async (asset) => {
            try {
              const compressed = await compressImage(asset.uri, { quality: 0.7 });
              if (compressed?.uri) {
                return { uri: compressed.uri, failedCompression: false };
              }

              return { uri: asset.uri, failedCompression: true };
            } catch (_error) {
              return { uri: asset.uri, failedCompression: true };
            }
          })
        );

        const failedCompressionCount = compressionResults.filter((resultItem) => resultItem.failedCompression).length;
        setImages((prevImages) => [...prevImages, ...compressionResults.map((resultItem) => resultItem.uri)]);
        setImageCompressionWarning(
          failedCompressionCount > 0
            ? t('post.imageCompressionWarning', { count: failedCompressionCount })
            : ''
        );

        if (blockedCount > 0 || unavailableCount > 0) {
          showAlert({
            type: 'warning',
            title: t('moderation.nsfwPartialSelectionTitle'),
            message: t('moderation.nsfwPartialSelectionMessage')
              .replace('{accepted}', String(acceptedAssets.length))
              .replace('{blocked}', String(blockedCount))
              .replace('{unavailable}', String(unavailableCount)),
          });
        }
      }
    } catch (_error) {
      console.error('[Post][NSFW] Image selection or verification failed', {
        code: _error?.code || 'UNKNOWN',
        message: _error?.message || 'unknown',
        details: _error?.details || null,
      });

      if (_error?.code === 'NSFW_IMAGE_BLOCKED' || _error?.code === 'NSFW_SCAN_FAILED') {
        if (__DEV__ && _error?.code === 'NSFW_SCAN_FAILED') {
          showAlert({
            type: 'error',
            title: t('moderation.nsfwScanUnavailableTitle'),
            message: `${t('moderation.nsfwScanUnavailableMessage')}\n\nDebug: ${_error?.details?.originalError || _error?.message || 'unknown'}`,
          });
        }
        return;
      }

      setImageCompressionWarning('');
      showAlert({ type: 'error', title: t('common.error'), message: t('post.imagePickError') });
    } finally {
      setVerificationState({
        active: false,
        current: 0,
        total: 0,
      });
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    setValidationState({ stage: false, pollChoices: false });

    // Post must have at least one of: topic, text, or images
    const hasTopic = topic.trim().length > 0;
    const hasText = text.trim().length > 0;
    const hasImages = images.length > 0;
    
    if (!hasTopic && !hasText && !hasImages) {
      showAlert({ type: 'error', title: t('common.error'), message: t('post.contentRequired') });
      return false;
    }
    if (!stage) {
      setValidationState((prev) => ({ ...prev, stage: true }));
      showAlert({ type: 'error', title: t('common.error'), message: t('post.stageRequired') });
      return false;
    }

    if (postType === POST_TYPES.POLL) {
      const validChoices = pollChoices.map(choice => choice.trim()).filter(Boolean);
      if (validChoices.length < 2) {
        setValidationState((prev) => ({ ...prev, pollChoices: true }));
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

    if (validationState.pollChoices) {
      const nextChoices = [...pollChoices];
      nextChoices[index] = value;
      const validChoicesCount = nextChoices.map(choice => choice.trim()).filter(Boolean).length;
      if (validChoicesCount >= 2) {
        setValidationState((prev) => ({ ...prev, pollChoices: false }));
      }
    }
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
          if (!result?.success || !result?.url) {
            throw new Error(result?.error || t('post.createError'));
          }

          imageUrls.push(result.url);
          if (result.deleteUrl) {
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
            allowMultiple: pollAllowMultiple && !isQuizPoll,
            maxSelections: pollAllowMultiple && !isQuizPoll
              ? Math.max(1, pollChoices.filter((choice) => choice.trim()).length)
              : 1,
            isQuiz: isQuizPoll,
            correctOptionId: correctPollOptionId,
            showVoters: pollShowVoters,
            explanation: isQuizPoll ? pollExplanation : '',
          })
        : null;
      
      const postDepartment = visibility === 'public' || isGuestUser
        ? 'public'
        : (isAcademicOtherUser ? ACADEMIC_OTHER_KEY : (user?.department || ''));

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
        isGuestPost: isGuestUser,
        targetDepartments: isGuestUser && postType === POST_TYPES.QUESTION ? targetDepartments : [],
        ...(pollData ? { pollData } : {}),
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

      await requestInAppStoreReview();

      if (successNavigationTimeoutRef.current) {
        clearTimeout(successNavigationTimeoutRef.current);
      }
      successNavigationTimeoutRef.current = setTimeout(() => {
        navigation.navigate('Home', { newPostCreated: true });
      }, 2200);
      
      setTopic('');
      setText('');
      setTags([]);
      setTagInput('');
      setLinks([]);
      setLinkInput('');
      setImages([]);
      setImageCompressionWarning('');
      setPostType(POST_TYPES.DISCUSSION);
      setVisibility('department');
      setCanOthersRepost(true);
      setStage(defaultStageValue);
      setPollChoices(['', '']);
      setPollAllowMultiple(false);
      setPollShowVoters(false);
      setIsQuizPoll(false);
      setCorrectPollOptionId('');
      setPollExplanation('');
    } catch (error) {
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: error?.message || t('post.createError'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!appSettings) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme?.primary || '#007AFF'} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={theme.gradientBackground || (isDarkMode
          ? ['#1a1a2e', '#16213e', '#0f3460']
          : ['#e3f2fd', '#bbdefb', '#90caf9'])
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        
      <GlassContainer style={styles.headerGlass} borderRadius={0} disableBackgroundOverlay>
        <View style={[styles.header, isRTL && styles.rowReverse, { borderBottomColor: theme.border }]}> 
            <Text style={[styles.headerTitle, isRTL && styles.directionalText, { color: theme.text }]}>{t('post.createPost')}</Text>
            <TutorialHighlight
              active={tutorial.activeTarget === 'publish' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={styles.postButtonHighlight}
            >
              <TouchableOpacity
                onPress={handleCreatePost}
                style={[styles.postButton, isRTL ? styles.postButtonRtl : styles.postButtonLtr, { backgroundColor: theme.primary }]}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={t('post.post')}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={theme.buttonText || '#fff'} />
                ) : (
                  <Text style={[styles.postButtonText, { color: theme.buttonText || '#fff' }]}>{t('post.post')}</Text>
                )}
              </TouchableOpacity>
            </TutorialHighlight>
          </View>
      </GlassContainer>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.formShell}>
            <GlassContainer style={styles.formGlass} borderRadius={24} disableBackgroundOverlay>
              <ScrollView style={styles.scrollView} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
          
          <View style={styles.section}>
            <TutorialHighlight
              active={tutorial.activeTarget === 'postType' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={[styles.topControlsRow, isRTL && styles.rowReverse]}
            >
              <View style={[styles.compactField, styles.postTypeField]}>
                <Text style={[styles.compactLabel, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
                  {t('post.postType')}
                </Text>
                <SearchableDropdownNew
                  items={postTypeOptions}
                  value={postType}
                  onSelect={setPostType}
                  placeholder={t('post.postType')}
                  icon={POST_ICONS[postType] || 'list-outline'}
                  disabled={isBusy}
                  useGlass={false}
                  selectorStyle={{ backgroundColor: theme.input.background, borderColor: theme.input.border }}
                />
              </View>

              <View style={[styles.compactField, styles.compactFieldHalf]}>
                <Text style={[styles.compactLabel, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
                  {t('post.stage')}
                </Text>
                <SearchableDropdownNew
                  items={stageOptions}
                  value={stage}
                  onSelect={setStage}
                  placeholder={t('post.selectStage')}
                  icon="stats-chart-outline"
                  disabled={isBusy}
                  compact
                  useGlass={false}
                  selectorStyle={{
                    backgroundColor: theme.input.background,
                    borderColor: validationState.stage ? (theme.error || theme.danger) : theme.input.border,
                  }}
                />
              </View>

              {!isGuestUser && (
                <View style={[styles.compactField, styles.compactFieldHalf]}>
                  <Text style={[styles.compactLabel, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
                    {t('post.visibility')}
                  </Text>
                  <Animated.View style={{ transform: [{ scale: visibilityScaleAnim }] }}>
                    <TouchableOpacity
                      style={[
                        styles.compactToggle,
                        isRTL && styles.rowReverse,
                        { backgroundColor: theme.input.background, borderColor: theme.input.border }
                      ]}
                      onPress={cycleVisibility}
                      disabled={isBusy}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('post.visibility')}
                      accessibilityHint={getVisibilityLabel()}
                    >
                      <IoniconSvg name="eye-outline" size={14} color={theme.primary} />
                      <Text
                        style={[styles.compactToggleText, isRTL && styles.directionalText, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {getVisibilityLabel()}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={[styles.helperText, styles.compactHelper, isRTL && styles.directionalText, { color: theme.textSecondary, marginTop: spacing.xs }]}> 
                    {getVisibilityHelper()}
                  </Text>
                </View>
              )}

              {isGuestUser && postType === POST_TYPES.QUESTION && (
                <View style={[styles.compactField, { width: '100%', marginTop: spacing.sm }]}>
                  <Text style={[styles.compactLabel, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
                    {t('post.targetDepartments', 'Want to ask a specific department? (optional)')}
                  </Text>
                  <SearchableDropdownNew
                    items={allDepartments}
                    value={targetDepartments}
                    onSelect={setTargetDepartments}
                    placeholder={t('post.selectDepartments', 'Select Departments (Up to 3)')}
                    icon="business-outline"
                    disabled={isBusy}
                    compact
                    useGlass={false}
                    multiSelect={true}
                    maxSelections={3}
                    selectorStyle={{
                      backgroundColor: theme.input.background,
                      borderColor: theme.input.border,
                    }}
                  />
                </View>
              )}
            </TutorialHighlight>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, isRTL && styles.directionalText, { color: theme.text }]}> 
              {t('post.topic')}
            </Text>
            <TutorialHighlight
              active={tutorial.activeTarget === 'topic' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={styles.inputShell}
              borderRadius={borderRadius.md}
            >
              <TextInput
                style={[
                  styles.input,
                  styles.topicInput,
                  styles.growingInput,
                  isRTL && styles.directionalInput,
                  {
                    minHeight: topicInputHeight,
                    height: topicInputHeight,
                    backgroundColor: theme.input.background,
                    borderColor: theme.input.border,
                    color: theme.text,
                  },
                ]}
                value={topic}
                onChangeText={setTopic}
                placeholder={t('post.topicPlaceholder')}
                placeholderTextColor={theme.input.placeholder}
                maxLength={200}
                multiline
                numberOfLines={1}
                textAlignVertical="top"
                editable={!isBusy}
                onContentSizeChange={(event) => {
                  const nextHeight = Math.max(44, Math.min(96, event.nativeEvent.contentSize.height + 14));
                  setTopicInputHeight(nextHeight);
                }}
              />
              <Text style={[styles.inlineCharCount, isRTL && styles.inlineCharCountRtl, { color: theme.textSecondary }]}> 
                {topic.length}/200
              </Text>
            </TutorialHighlight>
          </View>

          <View style={[styles.section, styles.compactNextSection]}>
            <Text style={[styles.sectionLabel, isRTL && styles.directionalText, { color: theme.text }]}> 
              {t('post.description')}
            </Text>
            <TutorialHighlight
              active={tutorial.activeTarget === 'description' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={styles.inputShell}
              borderRadius={borderRadius.md}
            >
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  styles.growingInput,
                  isRTL && styles.directionalInput,
                  {
                    minHeight: textInputHeight,
                    height: textInputHeight,
                    backgroundColor: theme.input.background,
                    borderColor: theme.input.border,
                    color: theme.text,
                  },
                ]}
                value={text}
                onChangeText={setText}
                placeholder={t('post.descriptionPlaceholder')}
                placeholderTextColor={theme.input.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isBusy}
                onContentSizeChange={(event) => {
                  const nextHeight = Math.max(128, Math.min(260, event.nativeEvent.contentSize.height + 14));
                  setTextInputHeight(nextHeight);
                }}
              />
              <Text style={[styles.inlineCharCount, isRTL && styles.inlineCharCountRtl, { color: theme.textSecondary }]}> 
                {text.length}/5000
              </Text>
            </TutorialHighlight>
          </View>

          {postType === POST_TYPES.POLL && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isRTL && styles.directionalText, { color: theme.text }]}>{t('post.poll.choicesLabel')}</Text>
              <Text style={[styles.helperText, isRTL && styles.directionalText, { color: theme.textSecondary }]}>{t('post.poll.choicesHelper')}</Text>

              {pollChoices.map((choice, index) => (
                <View key={`poll-choice-${index}`} style={styles.pollChoiceRow}>
                  <TextInput
                    style={[
                      styles.pollChoiceInput,
                      isRTL && styles.directionalInput,
                      {
                        backgroundColor: theme.input.background,
                        borderColor: validationState.pollChoices && !choice.trim()
                          ? (theme.error || theme.danger)
                          : theme.input.border,
                        color: theme.text,
                      },
                    ]}
                    value={choice}
                    onChangeText={(value) => handlePollChoiceChange(index, value)}
                    placeholder={t('post.poll.choicePlaceholder').replace('{number}', String(index + 1))}
                    placeholderTextColor={theme.input.placeholder}
                    editable={!isBusy}
                    maxLength={120}
                  />
                  <TouchableOpacity
                    style={[
                      styles.pollChoiceRemoveButton,
                      {
                        borderColor: isBusy || pollChoices.length <= 2
                          ? `${theme.input.border}AA`
                          : `${theme.input.border}`,
                      },
                    ]}
                    onPress={() => handleRemovePollChoice(index)}
                    disabled={isBusy || pollChoices.length <= 2}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IoniconSvg
                      name="trash-outline"
                      size={18}
                      color={isBusy || pollChoices.length <= 2 ? `${theme.textSecondary}AA` : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.pollAddChoiceButton, { borderColor: theme.input.border, backgroundColor: theme.input.background }]}
                onPress={handleAddPollChoice}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={t('post.poll.addChoice')}
              >
                <IoniconSvg name="add-circle-outline" size={18} color={theme.primary} />
                <Text style={[styles.pollAddChoiceText, { color: theme.primary }]}>{t('post.poll.addChoice')}</Text>
              </TouchableOpacity>

              <View style={styles.pollModeRow}>
                <TouchableOpacity
                  style={styles.pollModeItem}
                  onPress={() => {
                    setIsQuizPoll(false);
                    setCorrectPollOptionId('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('post.poll.modePoll')}
                  accessibilityState={{ selected: !isQuizPoll }}
                >
                  <IoniconSvg
                    name={!isQuizPoll ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={!isQuizPoll ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.pollModeText, isRTL && styles.directionalText, { color: theme.text }]}>{t('post.poll.modePoll')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pollModeItem}
                  onPress={() => {
                    setIsQuizPoll(true);
                    setPollAllowMultiple(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('post.poll.modeQuestion')}
                  accessibilityState={{ selected: isQuizPoll }}
                >
                  <IoniconSvg
                    name={isQuizPoll ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isQuizPoll ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.pollModeText, isRTL && styles.directionalText, { color: theme.text }]}>{t('post.poll.modeQuestion')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pollToggleRow}>
                <View style={[styles.pollToggleItem, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}>
                  <View style={[styles.pollToggleLabelWrap, isRTL && styles.rowReverse]}>
                    <IoniconSvg name="checkbox-outline" size={14} color={theme.primary} />
                    <Text style={[styles.pollToggleLabel, isRTL && styles.directionalText, { color: theme.text }]}>{t('post.poll.multiAnswer')}</Text>
                  </View>
                  <Switch
                    value={pollAllowMultiple && !isQuizPoll}
                    onValueChange={setPollAllowMultiple}
                    disabled={isBusy || isQuizPoll}
                    trackColor={{ false: theme.border, true: `${theme.primary}88` }}
                    thumbColor={pollAllowMultiple && !isQuizPoll ? theme.primary : '#f4f3f4'}
                    accessibilityLabel={t('post.poll.multiAnswer')}
                  />
                </View>

                <View style={[styles.pollToggleItem, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}>
                  <View style={[styles.pollToggleLabelWrap, isRTL && styles.rowReverse]}>
                    <IoniconSvg name="people-outline" size={14} color={theme.primary} />
                    <Text style={[styles.pollToggleLabel, isRTL && styles.directionalText, { color: theme.text }]}>{t('post.poll.showVoters')}</Text>
                  </View>
                  <Switch
                    value={pollShowVoters}
                    onValueChange={setPollShowVoters}
                    disabled={isBusy}
                    trackColor={{ false: theme.border, true: `${theme.primary}88` }}
                    thumbColor={pollShowVoters ? theme.primary : '#f4f3f4'}
                    accessibilityLabel={t('post.poll.showVoters')}
                  />
                </View>
              </View>

              {isQuizPoll && (
                <View style={styles.pollCorrectAnswerWrap}>
                  <Text style={[styles.optionLabel, isRTL && styles.directionalText, { color: theme.textSecondary }]}>{t('post.poll.correctAnswerLabel')}</Text>
                  {pollChoices.some((choice) => !choice.trim()) && (
                    <Text style={[styles.helperText, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
                      {t('post.poll.fillChoicesFirst')}
                    </Text>
                  )}
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
                        style={[styles.pollCorrectAnswerItem, isRTL && styles.rowReverse]}
                        onPress={() => setCorrectPollOptionId(optionId)}
                      >
                        <IoniconSvg
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? theme.primary : theme.textSecondary}
                        />
                        <Text style={[styles.pollCorrectAnswerText, isRTL && styles.directionalText, { color: theme.text }]} numberOfLines={1}>
                          {choiceLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <TextInput
                    style={[
                      styles.pollExplanationInput,
                      isRTL && styles.directionalInput,
                      {
                        backgroundColor: theme.input.background,
                        borderColor: theme.input.border,
                        color: theme.text,
                      },
                    ]}
                    value={pollExplanation}
                    onChangeText={setPollExplanation}
                    placeholder={t('post.poll.explanationPlaceholder')}
                    placeholderTextColor={theme.input.placeholder}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={300}
                    editable={!isBusy}
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <TutorialHighlight
              active={tutorial.activeTarget === 'media' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={[styles.actionButtonsRow, isRTL && styles.rowReverse]}
              borderRadius={borderRadius.md}
            >
              <TouchableOpacity
                style={[styles.actionButton, isRTL && styles.rowReverse, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}
                onPress={() => setShowTags(!showTags)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('post.tags')}
                accessibilityState={{ expanded: showTags }}
              >
                <IoniconSvg name="pricetag-outline" size={18} color={showTags ? theme.primary : theme.textSecondary} />
                <Text style={[styles.actionButtonText, isRTL && styles.directionalText, { color: showTags ? theme.primary : theme.textSecondary }]}>
                  {t('post.tags')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, isRTL && styles.rowReverse, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}
                onPress={() => setShowLinks(!showLinks)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('post.links')}
                accessibilityState={{ expanded: showLinks }}
              >
                <IoniconSvg name="link-outline" size={18} color={showLinks ? theme.primary : theme.textSecondary} />
                <Text style={[styles.actionButtonText, isRTL && styles.directionalText, { color: showLinks ? theme.primary : theme.textSecondary }]}>
                  {t('post.links')} {links.length > 0 && `(${links.length}/${MAX_LINKS_PER_POST})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, isRTL && styles.rowReverse, { backgroundColor: theme.input.background, borderColor: theme.input.border }]}
                onPress={handlePickImages}
                disabled={isBusy || images.length >= MAX_IMAGES_PER_POST}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('post.images')}
              >
                <IoniconSvg name="images-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.actionButtonText, isRTL && styles.directionalText, { color: theme.textSecondary }]}>
                  {t('post.images')} {images.length > 0 && `(${images.length})`}
                </Text>
              </TouchableOpacity>
            </TutorialHighlight>
            {!!imageCompressionWarning && (
              <View
                style={[
                  styles.inlineWarningBanner,
                  {
                    backgroundColor: `${theme.warning}15`,
                    borderColor: `${theme.warning}40`,
                  },
                ]}
              >
                <IoniconSvg name="alert-circle-outline" size={16} color={theme.warning} />
                <Text style={[styles.inlineWarningText, { color: theme.warning }]}>
                  {imageCompressionWarning}
                </Text>
              </View>
            )}
          </View>

          {showTags && (
            <View style={styles.section}>
              {tags.length > 0 && (
                <View style={styles.chipsContainer}>
                  {tags.map((tag, index) => (
                    <View key={index} style={[styles.tagChip, { backgroundColor: isDarkMode ? `${theme.tag || '#8B5CF6'}33` : `${theme.tag || '#8B5CF6'}1A` }]}>
                      <IoniconSvg name="pricetag-outline" size={12} color={theme.tag || '#8B5CF6'} />
                      <Text style={[styles.tagChipText, { color: theme.tag || '#8B5CF6' }]}>{tag}</Text>
                      <TouchableOpacity
                        onPress={() => setTags(tags.filter((_, i) => i !== index))}
                        disabled={isBusy}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <IoniconSvg name="close" size={14} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.chipInput, {
                    backgroundColor: theme.input.background,
                    borderColor: theme.input.border,
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
                  placeholderTextColor={theme.input.placeholder}
                  editable={!isBusy && tags.length < 10}
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
                  disabled={isBusy || !tagInput.trim() || tags.length >= 10}
                >
                  <IoniconSvg name="add-circle" size={28} color={theme.tag || '#8B5CF6'} />
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
                  <View key={index} style={[styles.linkChip, { backgroundColor: isDarkMode ? `${theme.link || '#3B82F6'}33` : `${theme.link || '#3B82F6'}1A` }]}>
                    <IoniconSvg name="link-outline" size={14} color={theme.link || '#3B82F6'} />
                    <Text style={[styles.linkChipText, { color: theme.link || '#3B82F6' }]} numberOfLines={1}>{link}</Text>
                    <TouchableOpacity
                      onPress={() => setLinks(links.filter((_, i) => i !== index))}
                      disabled={isBusy}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <IoniconSvg name="close" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.chipInput, {
                    backgroundColor: theme.input.background,
                    borderColor: theme.input.border,
                    color: theme.text
                  }]}
                  value={linkInput}
                  onChangeText={(text) => {
                    if (text.endsWith(' ')) {
                      const newLink = text.trim();
                      if (newLink && !links.includes(newLink) && links.length < MAX_LINKS_PER_POST) {
                        setLinks([...links, newLink]);
                      }
                      setLinkInput('');
                    } else {
                      setLinkInput(text);
                    }
                  }}
                  placeholder={t('post.linksPlaceholder')}
                  placeholderTextColor={theme.input.placeholder}
                  editable={!isBusy && links.length < MAX_LINKS_PER_POST}
                  autoCapitalize="none"
                  keyboardType="url"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    const newLink = linkInput.trim();
                    if (newLink && !links.includes(newLink) && links.length < MAX_LINKS_PER_POST) {
                      setLinks([...links, newLink]);
                    }
                    setLinkInput('');
                  }}
                />
                <TouchableOpacity
                  style={[styles.addChipButton, { opacity: linkInput.trim() ? 1 : 0.5 }]}
                  onPress={() => {
                    const newLink = linkInput.trim();
                    if (newLink && !links.includes(newLink) && links.length < MAX_LINKS_PER_POST) {
                      setLinks([...links, newLink]);
                    }
                    setLinkInput('');
                  }}
                  disabled={isBusy || !linkInput.trim() || links.length >= MAX_LINKS_PER_POST}
                >
                  <IoniconSvg name="add-circle" size={28} color={theme.link || '#3B82F6'} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                {`${t('post.linksHelper')} (${links.length}/${MAX_LINKS_PER_POST})`}
              </Text>
            </View>
          )}

          {images.length > 0 && (
            <View style={styles.section}>
              <FlashList
                horizontal
                estimatedItemSize={152}
                showsHorizontalScrollIndicator={false}
                style={styles.imagesContainer}
                data={images}
                keyExtractor={(_, index) => `post-image-${index}`}
                renderItem={({ item: uri, index }) => (
                  <TouchableOpacity 
                    style={styles.imageWrapper}
                    onPress={() => setSelectedImageIndex(index)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.imagePreview}
                      accessible
                      accessibilityLabel={t('post.imageAlt', { index: index + 1 })}
                    />
                    <TouchableOpacity
                      style={[
                        styles.removeImageButton,
                        isRTL ? styles.removeImageButtonRtl : styles.removeImageButtonLtr,
                        { backgroundColor: theme.danger },
                      ]}
                      onPress={() => handleRemoveImage(index)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.remove')}
                    >
                      <IoniconSvg name="close" size={18} color={theme.buttonText || '#fff'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
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
                disabled={isBusy}
                trackColor={{ false: theme.border, true: `${theme.primary}88` }}
                thumbColor={canOthersRepost ? theme.primary : '#f4f3f4'}
                accessibilityLabel={t('post.allowReposts')}
              />
            </View>
          </View>

            <View style={styles.bottomSpace} />
              </ScrollView>
            </GlassContainer>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>

      {verificationState.active && (
        <View style={styles.verificationOverlay} pointerEvents="none">
          <GlassContainer style={styles.verificationCard} borderRadius={borderRadius.lg}>
            <View style={styles.verificationHeaderRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.verificationTitle, isRTL && styles.directionalText, { color: theme.text }]}> 
                {t('moderation.nsfwVerifyingTitle')}
              </Text>
            </View>
            <Text style={[styles.verificationMessage, isRTL && styles.directionalText, { color: theme.textSecondary }]}> 
              {t('moderation.nsfwVerifyingMessage')
                .replace('{current}', String(verificationState.current || 0))
                .replace('{total}', String(verificationState.total || 0))}
            </Text>
          </GlassContainer>
        </View>
      )}

      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.modalContainer}>
          <ModalBackdrop
            style={styles.modalBackground}
            overlayColor="transparent"
            scrimColor={theme.scrim || theme.overlay}
            onPress={() => setSelectedImageIndex(null)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={[
                  styles.closeModalButton,
                  isRTL ? styles.closeModalButtonRtl : styles.closeModalButtonLtr,
                  { backgroundColor: theme.danger, top: insets.top + spacing.md },
                ]}
                onPress={() => setSelectedImageIndex(null)}
              >
                <IoniconSvg name="close" size={24} color={theme.buttonText || '#fff'} />
              </TouchableOpacity>
              {selectedImageIndex !== null && (
                <Image 
                  source={{ uri: images[selectedImageIndex] }} 
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </ModalBackdrop>
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

      <ScreenTutorialCard
        visible={tutorial.isVisible}
        theme={theme}
        isRTL={isRTL}
        t={t}
        step={tutorial.currentStep}
        stepIndex={tutorial.currentIndex}
        totalSteps={tutorial.totalSteps}
        onPrev={tutorial.prevStep}
        onNext={tutorial.nextStep}
        onSkip={tutorial.skipTutorial}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerGlass: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizeUtil(22),
    fontWeight: '700',
  },
  postButtonHighlight: {
    borderRadius: borderRadius.md,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  postButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: moderateScale(70),
    alignItems: 'center',
  },
  postButtonLtr: {
    marginLeft: spacing.sm,
  },
  postButtonRtl: {
    marginRight: spacing.sm,
  },
  postButtonText: {
    fontSize: fontSizeUtil(16),
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  formShell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  formGlass: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  compactNextSection: {
    paddingTop: 4,
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
    fontSize: fontSizeUtil(11),
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  compactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    minHeight: moderateScale(40),
  },
  compactToggleText: {
    fontSize: fontSizeUtil(12),
    fontWeight: '600',
    flexShrink: 1,
  },
  compactHelper: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSizeUtil(13),
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  optional: {
    fontSize: fontSizeUtil(14),
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 26,
    fontSize: fontSizeUtil(15),
  },
  topicInput: {
    minHeight: 44,
    maxHeight: 96,
  },
  growingInput: {
    overflow: 'hidden',
  },
  inputShell: {
    position: 'relative',
  },
  inlineCharCount: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    fontSize: fontSizeUtil(10),
    fontWeight: '600',
  },
  inlineCharCountRtl: {
    right: 'auto',
    left: 10,
  },
  textArea: {
    minHeight: 128,
    borderRadius: borderRadius.md,
    paddingBottom: 28,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSizeUtil(12),
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  helperText: {
    fontSize: fontSizeUtil(13),
    marginTop: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  tagChipText: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  linksChipsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  linkChipText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
  },
  chipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSizeUtil(14),
  },
  addChipButton: {
    padding: spacing.xs,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  imageWrapper: {
    position: 'relative',
    marginEnd: spacing.md,
  },
  imagePreview: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  removeImageButtonLtr: {
    right: spacing.xs,
  },
  removeImageButtonRtl: {
    left: spacing.xs,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineWarningBanner: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inlineWarningText: {
    flex: 1,
    fontSize: fontSizeUtil(12),
    lineHeight: fontSizeUtil(16),
    fontWeight: '500',
  },
  repostPermissionRow: {
    marginBottom: spacing.md,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSizeUtil(13),
    fontWeight: '500',
  },
  pollChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pollChoiceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSizeUtil(14),
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
    gap: spacing.xs,
  },
  pollAddChoiceText: {
    fontSize: fontSizeUtil(13),
    fontWeight: '600',
  },
  pollModeRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pollModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pollModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pollToggleRow: {
    marginTop: 12,
    gap: spacing.sm,
  },
  pollToggleItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollToggleLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pollToggleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  pollCorrectAnswerWrap: {
    marginTop: spacing.md,
  },
  pollCorrectAnswerItem: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pollCorrectAnswerText: {
    flex: 1,
    fontSize: 14,
  },
  pollExplanationInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 80,
    fontSize: fontSizeUtil(14),
  },
  modalContainer: {
    flex: 1,
  },
  verificationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  verificationCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  verificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verificationTitle: {
    fontSize: fontSizeUtil(14),
    fontWeight: '700',
  },
  verificationMessage: {
    marginTop: spacing.xs,
    fontSize: fontSizeUtil(12),
    fontWeight: '500',
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
  closeModalButtonLtr: {
    right: 20,
  },
  closeModalButtonRtl: {
    left: 20,
  },
  bottomSpace: {
    height: 40,
  },
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  directionalInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default Post;
