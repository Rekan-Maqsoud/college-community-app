import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { borderRadius, shadows } from '../../theme/designTokens';
import { wp, hp, fontSize as responsiveFontSize, spacing } from '../../utils/responsive';
import { uploadProfilePicture } from '../../../services/imgbbService';
import { syncUserNameInChats } from '../../../database/users';
import SearchableDropdownNew from '../../components/SearchableDropdownNew';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { getUniversityKeys, getCollegesForUniversity, getDepartmentsForCollege } from '../../data/universitiesData';

const COOLDOWN_DAYS = 30;

const GlassCard = memo(({ children, style, isDarkMode }) => (
  <BlurView
    intensity={isDarkMode ? 30 : 0}
    tint={isDarkMode ? 'dark' : 'light'}
    style={[
      styles.glassCard,
      {
        backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.6)' : '#FFFFFF',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      },
      style,
    ]}>
    {children}
  </BlurView>
));

const ProfileSettings = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user, updateUser, updateProfilePicture, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const bioInputRef = useRef(null);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [canEditAcademic, setCanEditAcademic] = useState(true);
  const [cooldownInfo, setCooldownInfo] = useState(null);
  
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    university: '',
    college: '',
    department: '',
    stage: '',
    bio: '',
    gender: '',
    profilePicture: '',
    lastAcademicUpdate: null,
    socialLinks: {
      instagram: '',
      twitter: '',
      linkedin: '',
      github: '',
      website: '',
    },
    socialLinksVisibility: 'everyone',
  });

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const checkAcademicCooldown = () => {
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
  };

  useEffect(() => {
    if (!initialLoadDone) {
      loadUserProfile();
      setInitialLoadDone(true);
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone) {
      checkAcademicCooldown();
    }
  }, [profileData.lastAcademicUpdate]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      if (user) {
        setProfileData({
          fullName: user.fullName || '',
          email: user.email || '',
          university: user.university || '',
          college: user.college || '',
          department: user.department || '',
          stage: user.stage || '',
          bio: user.bio || '',
          gender: user.gender || '',
          profilePicture: user.profilePicture || '',
          lastAcademicUpdate: user.lastAcademicUpdate || null,
          socialLinks: user.socialLinks || { instagram: '', twitter: '', linkedin: '', github: '', website: '' },
          socialLinksVisibility: user.socialLinksVisibility || 'everyone',
        });
      } else {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setProfileData({
            fullName: parsedData.fullName || '',
            email: parsedData.email || '',
            university: parsedData.university || '',
            college: parsedData.college || '',
            department: parsedData.department || '',
            stage: parsedData.stage || '',
            bio: parsedData.bio || '',
            gender: parsedData.gender || '',
            profilePicture: parsedData.profilePicture || '',
            lastAcademicUpdate: parsedData.lastAcademicUpdate || null,
            socialLinks: parsedData.socialLinks || { instagram: '', twitter: '', linkedin: '', github: '', website: '' },
            socialLinksVisibility: parsedData.socialLinksVisibility || 'everyone',
          });
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfileChanges = async () => {
    setIsSaving(true);
    try {
      const hasAcademicChanges = 
        profileData.university !== user.university ||
        profileData.college !== user.college ||
        profileData.department !== user.department ||
        profileData.stage !== user.stage;

      if (hasAcademicChanges && !canEditAcademic) {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('settings.academicUpdateRestriction'),
        });
        setIsSaving(false);
        return;
      }

      const updatedData = { ...profileData };
      if (hasAcademicChanges) {
        updatedData.lastAcademicUpdate = new Date().toISOString();
      }

      const success = await updateUser(updatedData);
      
      if (success) {
        await refreshUser();

        // If the display name changed, sync it across chat messages
        if (updatedData.name && updatedData.name !== user.name) {
          syncUserNameInChats(user.$id, updatedData.name).catch(() => {});
        }

        setProfileData({
          ...updatedData,
          lastAcademicUpdate: hasAcademicChanges ? updatedData.lastAcademicUpdate : profileData.lastAcademicUpdate
        });
        showAlert({
          type: 'success',
          title: t('common.success'),
          message: hasAcademicChanges ? t('settings.academicInfoUpdated') : t('settings.profileUpdated'),
        });
        setHasChanges(false);
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

  const handleUploadProfilePicture = async () => {
    try {
      setIsUploadingImage(true);
      const result = await uploadProfilePicture();
      
      if (result) {
        const success = await updateProfilePicture(result.displayUrl, result.deleteUrl);
        
        if (success) {
          setProfileData({ ...profileData, profilePicture: result.displayUrl });
          await refreshUser();
          showAlert({
            type: 'success',
            title: t('common.success'),
            message: t('settings.profilePictureUploaded'),
          });
        }
      }
    } catch (error) {
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
    setHasChanges(true);
    setProfileData(prev => ({
      ...prev,
      university: value,
      college: '',
      department: '',
      stage: '',
    }));
  };

  const handleCollegeChange = (value) => {
    setHasChanges(true);
    setProfileData(prev => ({
      ...prev,
      college: value,
      department: '',
    }));
  };

  const handleDepartmentChange = (value) => {
    setHasChanges(true);
    setProfileData(prev => ({
      ...prev,
      department: value,
    }));
  };

  const handleStageChange = (value) => {
    setHasChanges(true);
    setProfileData(prev => ({
      ...prev,
      stage: value,
    }));
  };

  const handleBioChange = (text) => {
    setHasChanges(true);
    setProfileData(prev => ({ ...prev, bio: text }));
  };

  const handleGenderChange = (value) => {
    setHasChanges(true);
    setProfileData(prev => ({ ...prev, gender: value }));
  };

  const handleSocialLinksVisibilityChange = (value) => {
    setHasChanges(true);
    setProfileData(prev => ({ ...prev, socialLinksVisibility: value }));
  };

  const handleSocialLinkChange = (platform, text) => {
    setHasChanges(true);
    setProfileData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: text,
      },
    }));
  };

  const handleFullNameChange = (text) => {
    setHasChanges(true);
    setProfileData(prev => ({ ...prev, fullName: text }));
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
    return [
      { key: 'firstYear', label: t('stages.firstYear') },
      { key: 'secondYear', label: t('stages.secondYear') },
      { key: 'thirdYear', label: t('stages.thirdYear') },
      { key: 'fourthYear', label: t('stages.fourthYear') },
      { key: 'fifthYear', label: t('stages.fifthYear') },
      { key: 'sixthYear', label: t('stages.sixthYear') },
    ];
  }, [t]);

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
        colors={isDarkMode
          ? ['rgba(10, 132, 255, 0.15)', 'transparent']
          : ['rgba(0, 122, 255, 0.1)', 'transparent']
        }
        style={styles.headerGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
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
          contentContainerStyle={styles.scrollContent}
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
                  <Ionicons name="person" size={60} color={theme.primary} />
                </View>
              )}
              
              <TouchableOpacity
                onPress={handleUploadProfilePicture}
                disabled={isUploadingImage}
                style={[styles.uploadButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.7}>
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.uploadHint, { color: theme.textSecondary }]}>
              {t('settings.tapToUpload') || 'Tap to upload profile picture'}
            </Text>
          </View>

          <GlassCard isDarkMode={isDarkMode}>
            <View style={styles.profileCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {t('auth.fullName')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
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
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {t('auth.collegeEmail')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.textSecondary,
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                  value={profileData.email}
                  editable={false}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {t('settings.bio')}
                </Text>
                <TextInput
                  ref={bioInputRef}
                  style={[
                    styles.input,
                    styles.bioInput,
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
                <Text style={[styles.charCounter, { color: theme.textSecondary }]}>
                  {profileData.bio?.length || 0}/200
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                {t('settings.socialLinks') || 'Social Links'}
              </Text>

              {[
                { key: 'instagram', icon: 'logo-instagram', placeholder: '@username', color: '#E4405F' },
                { key: 'twitter', icon: 'logo-twitter', placeholder: '@username', color: '#1DA1F2' },
                { key: 'linkedin', icon: 'logo-linkedin', placeholder: 'linkedin.com/in/username', color: '#0A66C2' },
                { key: 'github', icon: 'logo-github', placeholder: 'github.com/username', color: isDarkMode ? '#FFFFFF' : '#333333' },
                { key: 'website', icon: 'globe-outline', placeholder: 'https://yourwebsite.com', color: theme.primary },
              ].map(({ key, icon, placeholder, color }) => (
                <View key={key} style={styles.socialLinkRow}>
                  <View style={[styles.socialIconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <TextInput
                    style={[
                      styles.socialInput,
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
              ))}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                {t('settings.academicInfo')}
              </Text>

              {!canEditAcademic && cooldownInfo && (
                <View style={[styles.cooldownBanner, { 
                  backgroundColor: isDarkMode ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                  borderColor: isDarkMode ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)',
                }]}>
                  <Ionicons name="time-outline" size={20} color="#FF9500" />
                  <View style={styles.cooldownTextContainer}>
                    <Text style={[styles.cooldownTitle, { color: theme.text }]}>
                      {t('settings.academicCooldown')} {cooldownInfo.remainingDays} {cooldownInfo.remainingDays === 1 ? t('settings.dayRemaining') : t('settings.daysRemaining')}
                    </Text>
                    <Text style={[styles.cooldownSubtitle, { color: theme.textSecondary }]}>
                      {t('settings.lastUpdated')}: {cooldownInfo.lastUpdate}
                    </Text>
                  </View>
                </View>
              )}

              {canEditAcademic && (
                <View style={[styles.cooldownBanner, { 
                  backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
                  borderColor: isDarkMode ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)',
                }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
                  <View style={styles.cooldownTextContainer}>
                    <Text style={[styles.cooldownTitle, { color: theme.text }]}>
                      {t('settings.canUpdateNow')}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
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

          <View style={[styles.bottomPadding, hasChanges && { height: hp(12) }]} />
        </ScrollView>

        {hasChanges && (
          <View style={[styles.fixedButtonContainer, { backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderTopColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                setHasChanges(false);
                loadUserProfile();
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
    paddingTop: Platform.OS === 'ios' ? hp(7) : hp(3.5),
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 40,
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
    width: 120,
    height: 120,
    position: 'relative',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  uploadButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderRadius: 20,
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
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  charCounter: {
    fontSize: responsiveFontSize(12),
    textAlign: 'right',
    marginTop: spacing.xs,
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
  socialIconContainer: {
    width: 44,
    height: 44,
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
    height: 44,
  },
  bottomPadding: {
    height: hp(5),
  },
});

export default ProfileSettings;
