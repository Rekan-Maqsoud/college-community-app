import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/GlassComponents';
import { Ionicons } from '../../components/icons/CompatIonicon';
import safeStorage from '../../utils/safeStorage';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { borderRadius, shadows } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing, moderateScale } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useLayout from '../../hooks/useLayout';
import { uploadProfilePicture } from '../../../services/imgbbService';
import { syncUserNameInChats, syncUserProfilePicture } from '../../../database/users';
import SearchableDropdownNew from '../../components/SearchableDropdownNew';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { getUniversityKeys, getCollegesForUniversity, getDepartmentsForCollege, getStagesForDepartment } from '../../data/universitiesData';
import { getSettingsHeaderGradient } from './settingsTheme';
import { Image } from 'expo-image';

const COOLDOWN_DAYS = 30;
const FREE_ACADEMIC_CHANGES = 2;
const NON_ACADEMIC_AUTOSAVE_DELAY_MS = 1800;

const STAGE_ALIASES = {
  firstYear: 'firstYear',
  secondYear: 'secondYear',
  thirdYear: 'thirdYear',
  fourthYear: 'fourthYear',
  fifthYear: 'fifthYear',
  sixthYear: 'sixthYear',
  'First Year': 'firstYear',
  'Second Year': 'secondYear',
  'Third Year': 'thirdYear',
  'Fourth Year': 'fourthYear',
  'Fifth Year': 'fifthYear',
  'Sixth Year': 'sixthYear',
  stage_1: 'firstYear',
  stage_2: 'secondYear',
  stage_3: 'thirdYear',
  stage_4: 'fourthYear',
  stage_5: 'fifthYear',
  stage_6: 'sixthYear',
  '1': 'firstYear',
  '2': 'secondYear',
  '3': 'thirdYear',
  '4': 'fourthYear',
  '5': 'fifthYear',
  '6': 'sixthYear',
};

const normalizeStageKey = (value) => {
  if (value === null || value === undefined) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return STAGE_ALIASES[trimmed] || '';
};

const normalizeAcademicSnapshot = (data = {}) => ({
  university: data.university || '',
  college: data.college || '',
  department: data.department || '',
  stage: normalizeStageKey(data.stage),
});

const normalizeSocialLinks = (links = {}) => ({
  instagram: links?.instagram || '',
  twitter: links?.twitter || '',
  facebook: links?.facebook || '',
  linkedin: links?.linkedin || '',
  github: links?.github || '',
  website: links?.website || '',
});

const buildProfileData = (source = {}) => ({
  fullName: source.fullName || '',
  email: source.email || '',
  university: source.university || '',
  college: source.college || '',
  department: source.department || '',
  stage: normalizeStageKey(source.stage),
  bio: source.bio || '',
  gender: source.gender || '',
  profilePicture: source.profilePicture || '',
  lastAcademicUpdate: source.lastAcademicUpdate || null,
  academicChangesCount: Number(source.academicChangesCount) || 0,
  socialLinks: normalizeSocialLinks(source.socialLinks),
  socialLinksVisibility: source.socialLinksVisibility || 'everyone',
});




const ProfileSettings = ({ navigation }) => {
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const { user, updateUser, updateProfilePicture, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();

  const backIconName = Platform.OS === 'ios'
    ? (isRTL ? 'chevron-forward' : 'chevron-back')
    : (isRTL ? 'arrow-forward' : 'arrow-back');
  const bioInputRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const hasHydratedProfileRef = useRef(false);
  const pendingAuthoritativeHydrationRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [canEditAcademic, setCanEditAcademic] = useState(true);
  const [cooldownInfo, setCooldownInfo] = useState(null);
  
  const [profileData, setProfileData] = useState(() => buildProfileData());

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const hasAcademicChanges = useMemo(() => {
    const currentAcademic = normalizeAcademicSnapshot({
      university: profileData.university,
      college: profileData.college,
      department: profileData.department,
      stage: profileData.stage,
    });
    const userAcademic = normalizeAcademicSnapshot(user || {});
    return currentAcademic.university !== userAcademic.university
      || currentAcademic.college !== userAcademic.college
      || currentAcademic.department !== userAcademic.department
      || currentAcademic.stage !== userAcademic.stage;
  }, [
    profileData.university,
    profileData.college,
    profileData.department,
    profileData.stage,
    user,
  ]);

  const hasNonAcademicChanges = useMemo(() => {
    if (!user?.$id) {
      return false;
    }

    const currentLinks = normalizeSocialLinks(profileData.socialLinks);
    const userLinks = normalizeSocialLinks(user?.socialLinks);

    return (profileData.fullName || '') !== (user?.fullName || '')
      || (profileData.bio || '') !== (user?.bio || '')
      || (profileData.gender || '') !== (user?.gender || '')
      || (profileData.socialLinksVisibility || 'everyone') !== (user?.socialLinksVisibility || 'everyone')
      || JSON.stringify(currentLinks) !== JSON.stringify(userLinks);
  }, [
    profileData.fullName,
    profileData.bio,
    profileData.gender,
    profileData.socialLinks,
    profileData.socialLinksVisibility,
    user,
  ]);

  const checkAcademicCooldown = useCallback(() => {
    const academicChangesCount = Number(profileData.academicChangesCount) || 0;

    if (academicChangesCount < FREE_ACADEMIC_CHANGES) {
      setCanEditAcademic(true);
      setCooldownInfo(null);
      return;
    }

    if (!profileData.lastAcademicUpdate) {
      setCanEditAcademic(true);
      setCooldownInfo(null);
      return;
    }

    const lastUpdate = new Date(profileData.lastAcademicUpdate);
    const now = new Date();
    const diffTime = now - lastUpdate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= COOLDOWN_DAYS) {
      setCanEditAcademic(true);
      setCooldownInfo(null);
    } else {
      setCanEditAcademic(false);
      const remainingDays = COOLDOWN_DAYS - diffDays;
      const remainingHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setCooldownInfo({
        remainingDays,
        remainingHours,
        lastUpdate: lastUpdate.toLocaleDateString(),
      });
    }
  }, [profileData.academicChangesCount, profileData.lastAcademicUpdate]);

  useEffect(() => {
    if (initialLoadDone) {
      checkAcademicCooldown();
    }
  }, [profileData.lastAcademicUpdate, initialLoadDone, checkAcademicCooldown]);

  const markProfileDraftChanged = useCallback(() => {
    pendingAuthoritativeHydrationRef.current = false;
  }, []);

  const updateProfileDraft = useCallback((updater) => {
    markProfileDraftChanged();
    setProfileData(updater);
  }, [markProfileDraftChanged]);

  const hydrateProfileData = useCallback((source, options = {}) => {
    if (!source) {
      return;
    }

    pendingAuthoritativeHydrationRef.current = options.awaitAuthoritativeUser === true;
    hasHydratedProfileRef.current = true;
    setProfileData(buildProfileData(source));
  }, []);

  const hasUnsavedProfileChanges = hasAcademicChanges || hasNonAcademicChanges;

  const loadUserProfile = useCallback(async () => {
    try {
      if (user) {
        const shouldHydrateFromUser = !hasHydratedProfileRef.current
          || pendingAuthoritativeHydrationRef.current
          || !hasUnsavedProfileChanges;

        if (shouldHydrateFromUser) {
          hydrateProfileData(user, { awaitAuthoritativeUser: false });
        }

        return;
      }

      if (hasHydratedProfileRef.current) {
        return;
      }

      setIsLoading(true);
      const userData = await safeStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        hydrateProfileData(parsedData, { awaitAuthoritativeUser: true });
      }
    } catch (error) {
    } finally {
      if (!user) {
        setIsLoading(false);
      }
    }
  }, [hasUnsavedProfileChanges, hydrateProfileData, user]);

  useEffect(() => {
    loadUserProfile();
    if (!initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [initialLoadDone, loadUserProfile]);

  const saveProfileChanges = async () => {
    setIsSaving(true);
    try {
      const normalizedCurrentStage = normalizeStageKey(profileData.stage);

      const currentAcademicChangesCount = Number(profileData.academicChangesCount) || 0;

      if (!hasAcademicChanges) {
        setIsSaving(false);
        return;
      }

      if (hasAcademicChanges && !canEditAcademic && currentAcademicChangesCount >= FREE_ACADEMIC_CHANGES) {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('settings.academicUpdateRestriction'),
        });
        setIsSaving(false);
        return;
      }

      const updatedAcademicData = {
        university: profileData.university,
        college: profileData.college,
        department: profileData.department,
        stage: normalizedCurrentStage,
      };

      if (hasAcademicChanges) {
        const nextAcademicChangesCount = currentAcademicChangesCount + 1;
        updatedAcademicData.academicChangesCount = nextAcademicChangesCount;

        if (nextAcademicChangesCount >= FREE_ACADEMIC_CHANGES) {
          updatedAcademicData.lastAcademicUpdate = new Date().toISOString();
        }
      }

      const success = await updateUser(updatedAcademicData);
      
      if (success) {
        await refreshUser();

        setProfileData({
          ...profileData,
          stage: normalizedCurrentStage,
          lastAcademicUpdate: hasAcademicChanges ? updatedAcademicData.lastAcademicUpdate : profileData.lastAcademicUpdate,
          academicChangesCount: hasAcademicChanges
            ? (Number(updatedAcademicData.academicChangesCount) || 0)
            : (Number(profileData.academicChangesCount) || 0),
        });
        showAlert({
          type: 'success',
          title: t('common.success'),
          message: hasAcademicChanges ? t('settings.academicInfoUpdated') : t('settings.profileUpdated'),
        });
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: t('settings.profileUpdateError'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const autoSaveNonAcademicChanges = useCallback(async () => {
    if (!user?.$id) {
      return;
    }

    if (!hasNonAcademicChanges || isSaving || isAutoSaving) {
      return;
    }

    const normalizedCurrentLinks = normalizeSocialLinks(profileData.socialLinks);
    const normalizedUserLinks = normalizeSocialLinks(user?.socialLinks);

    const updates = {};
    if ((profileData.fullName || '') !== (user?.fullName || '')) updates.fullName = profileData.fullName || '';
    if ((profileData.bio || '') !== (user?.bio || '')) updates.bio = profileData.bio || '';
    if ((profileData.gender || '') !== (user?.gender || '')) updates.gender = profileData.gender || '';
    if ((profileData.socialLinksVisibility || 'everyone') !== (user?.socialLinksVisibility || 'everyone')) {
      updates.socialLinksVisibility = profileData.socialLinksVisibility || 'everyone';
    }
    if (JSON.stringify(normalizedCurrentLinks) !== JSON.stringify(normalizedUserLinks)) {
      updates.socialLinks = normalizedCurrentLinks;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    try {
      setIsAutoSaving(true);
      const success = await updateUser(updates);
      if (success && updates.fullName && updates.fullName !== (user?.fullName || '')) {
        syncUserNameInChats(user?.$id, updates.fullName).catch(() => {});
      }
      if (!success) {
        throw new Error('autosave failed');
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: t('settings.profileUpdateError'),
      });
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    hasNonAcademicChanges,
    isSaving,
    isAutoSaving,
    profileData.fullName,
    profileData.bio,
    profileData.gender,
    profileData.socialLinks,
    profileData.socialLinksVisibility,
    updateUser,
    user,
    showAlert,
    t,
  ]);

  useEffect(() => {
    if (!initialLoadDone || isLoading || !hasHydratedProfileRef.current || !hasNonAcademicChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveNonAcademicChanges();
    }, NON_ACADEMIC_AUTOSAVE_DELAY_MS);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [initialLoadDone, isLoading, hasNonAcademicChanges, autoSaveNonAcademicChanges]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleUploadProfilePicture = async () => {
    try {
      setIsUploadingImage(true);
      const result = await uploadProfilePicture({ t });
      
      if (result) {
        const success = await updateProfilePicture(result.displayUrl, result.deleteUrl);
        
        if (success) {
          updateProfileDraft(prev => ({ ...prev, profilePicture: result.displayUrl }));
          await refreshUser();
          // Sync profile picture across notifications
          syncUserProfilePicture(user.$id, result.displayUrl).catch(() => {});
          showAlert({
            type: 'success',
            title: t('common.success'),
            message: t('settings.profilePictureUploaded'),
          });
        }
      }
    } catch (error) {
      if (error?.code === 'NSFW_IMAGE_BLOCKED' || error?.code === 'NSFW_SCAN_FAILED') {
        return;
      }

      showAlert({
        type: 'error',
        title: t('common.error'),
        message: error.message === 'Permission to access camera roll is required!' 
          ? t('settings.cameraPermissionRequired')
          : t('settings.profilePictureUploadError'),
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUniversityChange = (value) => {
    updateProfileDraft(prev => ({
      ...prev,
      university: value,
      college: '',
      department: '',
      stage: '',
    }));
  };

  const handleCollegeChange = (value) => {
    updateProfileDraft(prev => ({
      ...prev,
      college: value,
      department: '',
      stage: '',
    }));
  };

  const handleDepartmentChange = (value) => {
    updateProfileDraft(prev => ({
      ...prev,
      department: value,
      stage: '',
    }));
  };

  const handleStageChange = (value) => {
    updateProfileDraft(prev => ({
      ...prev,
      stage: value,
    }));
  };

  const handleBioChange = (text) => {
    updateProfileDraft(prev => ({ ...prev, bio: text }));
  };

  const handleGenderChange = (value) => {
    updateProfileDraft(prev => ({ ...prev, gender: value }));
  };

  const handleSocialLinksVisibilityChange = (value) => {
    updateProfileDraft(prev => ({ ...prev, socialLinksVisibility: value }));
  };

  const handleSocialLinkChange = (platform, text) => {
    updateProfileDraft(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: text,
      },
    }));
  };

  const handleFullNameChange = (text) => {
    updateProfileDraft(prev => ({ ...prev, fullName: text }));
  };

  const universityOptions = useMemo(() => {
    const keys = getUniversityKeys();
    return keys.map(key => ({
      key,
      label: t(`universities.${key}`)
    }));
  }, [t]);

  const collegeOptions = useMemo(() => {
    if (!profileData.university) return [];
    const keys = getCollegesForUniversity(profileData.university);
    return keys.map(key => ({
      key,
      label: t(`colleges.${key}`)
    }));
  }, [profileData.university, t]);

  const stageOptions = useMemo(() => {
    const stageKeys = getStagesForDepartment(
      profileData.university,
      profileData.college,
      profileData.department,
    );

    return stageKeys.map(key => ({
      key,
      label: t(`stages.${key}`),
    }));
  }, [profileData.university, profileData.college, profileData.department, t]);

  useEffect(() => {
    if (!profileData.stage) return;
    if (!profileData.university || !profileData.college || !profileData.department) return;
    const allowedStageKeys = stageOptions.map(option => option.key);
    if (!allowedStageKeys.includes(profileData.stage)) {
      setProfileData(prev => ({ ...prev, stage: '' }));
    }
  }, [profileData.stage, profileData.university, profileData.college, profileData.department, stageOptions]);

  const genderOptions = useMemo(() => {
    return [
      { key: 'male', label: t('settings.male') },
      { key: 'female', label: t('settings.female') },
    ];
  }, [t]);

  const socialLinksVisibilityOptions = useMemo(() => {
    return [
      { key: 'everyone', label: t('settings.visibilityEveryone') },
      { key: 'friends', label: t('settings.visibilityFriends') },
      { key: 'noone', label: t('settings.visibilityNoOne') },
    ];
  }, [t]);

  const socialLinksConfig = useMemo(() => {
    return [
      { key: 'instagram', icon: 'logo-instagram', placeholder: t('settings.socialPlaceholderInstagram'), color: '#E4405F' },
      { key: 'twitter', icon: 'logo-twitter', placeholder: t('settings.socialPlaceholderTwitter'), color: '#1DA1F2' },
      { key: 'facebook', icon: 'logo-facebook', placeholder: t('settings.socialPlaceholderFacebook'), color: '#1877F2' },
      { key: 'linkedin', icon: 'logo-linkedin', placeholder: t('settings.socialPlaceholderLinkedin'), color: '#0A66C2' },
      { key: 'github', icon: 'logo-github', placeholder: t('settings.socialPlaceholderGithub'), color: isDarkMode ? '#FFFFFF' : '#333333' },
      { key: 'website', icon: 'globe-outline', placeholder: t('settings.socialPlaceholderWebsite'), color: theme.primary },
    ];
  }, [isDarkMode, t, theme.primary]);

  const departmentOptions = useMemo(() => {
    if (!profileData.university || !profileData.college) return [];
    const keys = getDepartmentsForCollege(profileData.university, profileData.college);
    return keys.map(key => ({
      key,
      label: t(`departments.${key}`)
    }));
  }, [profileData.university, profileData.college, t]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />

      <LinearGradient
        colors={getSettingsHeaderGradient('ProfileSettings', { theme, isDarkMode })}
        style={styles.headerGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        
        <View style={[styles.header, isRTL && styles.rowReverse, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name={backIconName} size={moderateScale(22)} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {t('settings.profileSettings')}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          nestedScrollEnabled={true}>

          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePictureWrapper}>
              {profileData.profilePicture ? (
                <Image
                  source={{ uri: profileData.profilePicture }}
                  style={styles.profilePicture}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.profilePicturePlaceholder, { backgroundColor: isDarkMode ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.2)' }]}>
                  <Ionicons name="person" size={moderateScale(50)} color={theme.primary} />
                </View>
              )}
              
              <TouchableOpacity
                onPress={handleUploadProfilePicture}
                disabled={isUploadingImage}
                style={[
                  styles.uploadButton,
                  isRTL ? styles.uploadButtonRtl : styles.uploadButtonLtr,
                  { backgroundColor: theme.primary },
                ]}
                activeOpacity={0.7}>
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="add" size={moderateScale(22)} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.uploadHint, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
              {t('settings.tapToUpload') || 'Tap to upload profile picture'}
            </Text>
          </View>

          <GlassCard>
            <View style={styles.profileCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('auth.fullName')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isRTL && styles.directionalInput,
                    {
                      color: theme.text,
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
                    },
                  ]}
                  value={profileData.fullName}
                  onChangeText={handleFullNameChange}
                  editable={true}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('auth.collegeEmail')}
                </Text>
                <View
                  style={[
                    styles.input,
                    styles.emailValueContainer,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.emailValueText, { color: theme.textSecondary }, isRTL && styles.directionalText]}
                  >
                    {profileData.email}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.bio')}
                </Text>
                <TextInput
                  ref={bioInputRef}
                  style={[
                    styles.input,
                    styles.bioInput,
                    isRTL && styles.directionalInput,
                    {
                      color: theme.text,
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                  value={profileData.bio}
                  onChangeText={handleBioChange}
                  editable={true}
                  multiline={true}
                  numberOfLines={4}
                  maxLength={200}
                  placeholder={t('settings.bioPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  autoCorrect={false}
                  scrollEnabled={false}
                />
                <Text style={[styles.charCounter, { color: theme.textSecondary }, isRTL && styles.charCounterRtl]}>
                  {profileData.bio?.length || 0}/200
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.gender')}
                </Text>
                <SearchableDropdownNew
                  items={genderOptions}
                  value={profileData.gender}
                  onSelect={handleGenderChange}
                  placeholder={t('settings.selectGender')}
                  icon="person-outline"
                />
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                {t('settings.socialLinks') || 'Social Links'}
              </Text>

              {socialLinksConfig.map(({ key, icon, placeholder, color }, index) => (
                <React.Fragment key={key}>
                  <View style={[styles.socialLinkRow, isRTL && styles.rowReverse]}>
                    <View style={[styles.socialIconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                      <Ionicons name={icon} size={moderateScale(18)} color={color} />
                    </View>
                    <TextInput
                      style={[
                        styles.socialInput,
                        isRTL && styles.socialInputRtl,
                        {
                          color: theme.text,
                          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                      value={profileData.socialLinks?.[key] || ''}
                      onChangeText={(text) => handleSocialLinkChange(key, text)}
                      editable={true}
                      placeholder={placeholder}
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType={key === 'website' ? 'url' : 'default'}
                    />
                  </View>
                  {index < socialLinksConfig.length - 1 && (
                    <View
                      style={[
                        styles.socialLinkDivider,
                        isRTL ? styles.socialLinkDividerRtl : styles.socialLinkDividerLtr,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }
                      ]}
                    />
                  )}
                </React.Fragment>
              ))}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('settings.socialLinksVisibility')}
                </Text>
                <SearchableDropdownNew
                  items={socialLinksVisibilityOptions}
                  value={profileData.socialLinksVisibility}
                  onSelect={handleSocialLinksVisibilityChange}
                  placeholder={t('settings.selectVisibility')}
                  icon="eye-outline"
                />
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                {t('settings.academicInfo')}
              </Text>

              {!canEditAcademic && cooldownInfo && (
                <View style={[styles.cooldownBanner, isRTL && styles.rowReverse, { 
                  backgroundColor: isDarkMode ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                  borderColor: isDarkMode ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)',
                }]}>
                  <Ionicons name="time-outline" size={moderateScale(18)} color="#FF9500" />
                  <View style={[styles.cooldownTextContainer, isRTL && styles.cooldownTextContainerRtl]}>
                    <Text style={[styles.cooldownTitle, { color: theme.text }, isRTL && styles.directionalText]}>
                      {t('settings.academicCooldown')} {cooldownInfo.remainingDays} {cooldownInfo.remainingDays === 1 ? t('settings.dayRemaining') : t('settings.daysRemaining')}
                    </Text>
                    <Text style={[styles.cooldownSubtitle, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                      {t('settings.lastUpdated')}: {cooldownInfo.lastUpdate}
                    </Text>
                  </View>
                </View>
              )}

              {canEditAcademic && (
                <View style={[styles.cooldownBanner, isRTL && styles.rowReverse, { 
                  backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
                  borderColor: isDarkMode ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)',
                }]}>
                  <Ionicons name="checkmark-circle-outline" size={moderateScale(18)} color="#34C759" />
                  <View style={[styles.cooldownTextContainer, isRTL && styles.cooldownTextContainerRtl]}>
                    <Text style={[styles.cooldownTitle, { color: theme.text }, isRTL && styles.directionalText]}>
                      {t('settings.canUpdateNow')}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('auth.selectUniversity')}
                </Text>
                <SearchableDropdownNew
                  items={universityOptions}
                  value={profileData.university}
                  onSelect={handleUniversityChange}
                  placeholder={t('auth.selectUniversity')}
                  icon="school-outline"
                  disabled={!canEditAcademic}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('auth.selectCollege')}
                </Text>
                <SearchableDropdownNew
                  items={collegeOptions}
                  value={profileData.college}
                  onSelect={handleCollegeChange}
                  placeholder={t('auth.selectCollege')}
                  icon="library-outline"
                  disabled={!canEditAcademic || !profileData.university}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('auth.selectDepartment')}
                </Text>
                <SearchableDropdownNew
                  items={departmentOptions}
                  value={profileData.department}
                  onSelect={handleDepartmentChange}
                  placeholder={t('auth.selectDepartment')}
                  icon="briefcase-outline"
                  disabled={!canEditAcademic || !profileData.college}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }, isRTL && styles.directionalText]}>
                  {t('auth.selectStage')}
                </Text>
                <SearchableDropdownNew
                  items={stageOptions}
                  value={profileData.stage}
                  onSelect={handleStageChange}
                  placeholder={t('auth.selectStage')}
                  icon="stats-chart-outline"
                  disabled={!canEditAcademic}
                />
              </View>
            </View>
          </GlassCard>

          <View style={[styles.bottomPadding, hasAcademicChanges && { height: hp(12) }]} />
        </ScrollView>

        {hasAcademicChanges && (
          <View style={[styles.fixedButtonContainer, isRTL && styles.rowReverse, { backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderTopColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                updateProfileDraft(prev => ({
                  ...prev,
                  university: user?.university || '',
                  college: user?.college || '',
                  department: user?.department || '',
                  stage: normalizeStageKey(user?.stage),
                  lastAcademicUpdate: user?.lastAcademicUpdate || prev.lastAcademicUpdate,
                  academicChangesCount: Number(user?.academicChangesCount) || prev.academicChangesCount,
                }));
              }}
              style={[styles.cancelButton, { borderColor: theme.border }]}>
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={saveProfileChanges}
              disabled={isSaving}
              style={[styles.saveButton, { backgroundColor: theme.primary }]}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(20),
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
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
  },
  editButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  placeholder: {
    width: moderateScale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  profilePictureWrapper: {
    width: moderateScale(120),
    height: moderateScale(120),
    position: 'relative',
  },
  profilePicture: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePicturePlaceholder: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  uploadButton: {
    position: 'absolute',
    bottom: -2,
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  uploadButtonLtr: {
    right: -2,
  },
  uploadButtonRtl: {
    left: -2,
  },
  uploadHint: {
    fontSize: responsiveFontSize(12),
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  glassCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.small,
  },
  profileCard: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: responsiveFontSize(16),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  emailValueContainer: {
    justifyContent: 'center',
    minHeight: moderateScale(44),
  },
  emailValueText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '500',
  },
  bioInput: {
    minHeight: moderateScale(100),
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  directionalInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  charCounter: {
    fontSize: responsiveFontSize(12),
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  charCounterRtl: {
    textAlign: 'left',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: spacing.lg,
  },
  sectionLabel: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cooldownTextContainer: {
    flex: 1,
  },
  cooldownTextContainerRtl: {
    alignItems: 'flex-end',
  },
  cooldownTitle: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  cooldownSubtitle: {
    fontSize: responsiveFontSize(12),
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: wp(5),
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.medium,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  socialLinkDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    opacity: 0.3,
  },
  socialLinkDividerLtr: {
    marginLeft: moderateScale(44) + spacing.sm,
  },
  socialLinkDividerRtl: {
    marginRight: moderateScale(44) + spacing.sm,
  },
  socialIconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialInput: {
    flex: 1,
    fontSize: responsiveFontSize(15),
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    height: moderateScale(44),
  },
  socialInputRtl: {
    textAlign: 'right',
  },
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bottomPadding: {
    height: hp(5),
  },
});

export default ProfileSettings;
