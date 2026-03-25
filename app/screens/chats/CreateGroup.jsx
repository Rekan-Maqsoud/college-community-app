import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, KeyboardAvoidingView, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassInput, GlassContainer } from '../../components/GlassComponents';
import { Ionicons } from '../../components/icons/CompatIonicon';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import AnimatedBackground from '../../components/AnimatedBackground';
import ProfilePicture from '../../components/ProfilePicture';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { getUsersByDepartment, getFriends, searchUsers } from '../../../database/users';
import { createCustomGroup } from '../../../database/chatHelpers';
import { 
  wp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import useLayout from '../../hooks/useLayout';
import { pickAndCompressImages } from '../../utils/imageCompression';
import { uploadToImgbb } from '../../../services/imgbbService';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';

const CreateGroup = ({ navigation }) => {
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const { user: currentUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { contentStyle } = useLayout();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [settings, setSettings] = useState({
    allowMemberInvites: false,
    onlyAdminsCanPost: false,
    allowEveryoneMention: true,
    onlyAdminsCanMention: false,
    onlyAdminsCanPin: false,
  });

  const loadUsers = useCallback(async () => {
    if (!currentUser?.$id) {
      setLoading(false);
      return;
    }

    try {
      // Load friends first (priority)
      const userFriends = await getFriends(currentUser.$id);
      const filteredFriends = userFriends.filter(u => u.$id !== currentUser.$id);
      setFriends(filteredFriends);
      
      // Also load department users
      if (currentUser.department) {
        const deptUsers = await getUsersByDepartment(currentUser.department, 50);
        // Filter out current user and friends (to avoid duplicates)
        const friendIds = filteredFriends.map(f => f.$id);
        const nonFriendDeptUsers = deptUsers.filter(
          u => u.$id !== currentUser.$id && !friendIds.includes(u.$id)
        );
        setDepartmentUsers(nonFriendDeptUsers);
      }
    } catch (error) {
      setFriends([]);
      setDepartmentUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.$id, currentUser?.department]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const debounceTimeout = React.useRef(null);

  const handleSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query, 20);
      const filteredResults = results.filter(u => u.$id !== currentUser?.$id);
      setSearchResults(filteredResults);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [currentUser]);

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handlePickGroupPhoto = async () => {
    try {
      setUploadingPhoto(true);
      const result = await pickAndCompressImages({
        allowsMultipleSelection: false,
        maxImages: 1,
        quality: 'medium',
        t,
      });

      if (!result || result.length === 0) {
        setUploadingPhoto(false);
        return;
      }

      const imageData = result[0];
      if (!imageData || !imageData.base64) {
        throw new Error('Failed to get image data');
      }

      const uploadResult = await uploadToImgbb(imageData.base64);
      if (!uploadResult || !uploadResult.url) {
        throw new Error('Failed to upload image');
      }

      setGroupPhoto(uploadResult.url);
    } catch (error) {
      if (error?.code === 'NSFW_IMAGE_BLOCKED' || error?.code === 'NSFW_SCAN_FAILED') {
        return;
      }

      const errorMessage = error?.message || t('chats.groupPhotoError');
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveGroupPhoto = () => {
    setGroupPhoto(null);
  };

  const handleSettingToggle = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.groupName') });
      return;
    }

    if (selectedUsers.length === 0) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.selectMembers') });
      return;
    }

    setCreating(true);

    try {
      const chat = await createCustomGroup({
        name: groupName.trim(),
        description: description.trim(),
        members: selectedUsers,
        department: currentUser?.department,
        groupPhoto: groupPhoto,
        settings: JSON.stringify(settings),
        requiresRepresentative: settings.onlyAdminsCanPost,
      }, currentUser.$id);

      if (chat) {
        navigation.replace('ChatRoom', { chat });
      } else {
        showAlert({ type: 'error', title: t('common.error'), message: t('chats.groupCreateError') });
      }
    } catch (error) {
      let errorMessage = t('chats.groupCreateError');
      if (error?.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.includes(item.$id);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleUserSelection(item.$id)}
        style={[
          styles.userCard,
          isRTL && styles.rowReverse,
          { 
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(255, 255, 255, 0.7)',
          },
          isSelected && styles.userCardSelected,
          isSelected && { borderColor: theme.primary }
        ]}>
        <ProfilePicture 
          uri={item.profilePicture}
          name={item.name}
          size={moderateScale(44)}
        />
        <View style={[styles.userInfo, isRTL ? styles.userInfoRtl : styles.userInfoLtr]}>
          <Text style={[styles.userName, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.userDetails, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(11) }]} numberOfLines={1}>
            {item.department}
          </Text>
        </View>
        <View style={[
          styles.checkbox,
          { 
            backgroundColor: isSelected ? theme.primary : 'transparent',
            borderColor: isSelected ? theme.primary : theme.textSecondary,
          }
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={moderateScale(16)} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      <LinearGradient
        colors={isDarkMode 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#f0f4ff', '#d8e7ff', '#c0deff']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <AnimatedBackground particleCount={15} />
        
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
            <View style={[styles.header, isRTL && styles.rowReverse]}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}>
                <Ionicons 
                  name={isRTL ? 'arrow-forward' : 'arrow-back'} 
                  size={moderateScale(24)} 
                  color={theme.text} 
                />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(20) }]}>
                {t('chats.createGroup')}
              </Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={contentStyle}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
            
            {/* Group Photo Section */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                {t('chats.groupPhoto')}
              </Text>
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={[
                    styles.photoContainer,
                    { 
                      backgroundColor: isDarkMode 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(255, 255, 255, 0.7)',
                      borderColor: theme.primary,
                    }
                  ]}
                  onPress={handlePickGroupPhoto}
                  disabled={uploadingPhoto}>
                  {uploadingPhoto ? (
                    <ActivityIndicator size="large" color={theme.primary} />
                  ) : groupPhoto ? (
                    <Image source={{ uri: groupPhoto }} style={styles.groupPhotoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={moderateScale(32)} color={theme.primary} />
                      <Text style={[styles.photoText, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                        {t('chats.addGroupPhoto')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {groupPhoto && !uploadingPhoto && (
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={handleRemoveGroupPhoto}>
                    <Ionicons name="close-circle" size={moderateScale(24)} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                {t('chats.groupName')}
              </Text>
              <GlassInput style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRtl, { color: theme.text, fontSize: fontSize(15) }]}
                  placeholder={t('chats.groupNamePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                />
              </GlassInput>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                {t('chats.groupDescription')}
              </Text>
              <GlassInput style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea, isRTL && styles.inputRtl, { color: theme.text, fontSize: fontSize(15) }]}
                  placeholder={t('chats.groupDescriptionPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </GlassInput>
            </View>

            {/* Group Settings Section */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                {t('chats.groupSettings')}
              </Text>
              
              {/* Only Admins Can Post */}
              <GlassContainer style={[styles.settingItem, isRTL && styles.rowReverse]}
                borderRadius={borderRadius.lg}>
                <View style={[styles.settingInfo, isRTL && styles.settingInfoRtl]}>
                  <Text style={[styles.settingTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                    {t('chats.onlyAdminsCanPost')}
                  </Text>
                  <Text style={[styles.settingDescription, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
                    {t('chats.onlyAdminsCanPostDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.onlyAdminsCanPost}
                  onValueChange={(value) => handleSettingToggle('onlyAdminsCanPost', value)}
                  trackColor={{ false: theme.border, true: theme.primary + '50' }}
                  thumbColor={settings.onlyAdminsCanPost ? theme.primary : isDarkMode ? '#888' : '#f4f3f4'}
                />
              </GlassContainer>

              {/* Allow Member Invites */}
              <GlassContainer style={[styles.settingItem, isRTL && styles.rowReverse]}
                borderRadius={borderRadius.lg}>
                <View style={[styles.settingInfo, isRTL && styles.settingInfoRtl]}>
                  <Text style={[styles.settingTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                    {t('chats.allowMemberInvites')}
                  </Text>
                  <Text style={[styles.settingDescription, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
                    {t('chats.allowMemberInvitesDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.allowMemberInvites}
                  onValueChange={(value) => handleSettingToggle('allowMemberInvites', value)}
                  trackColor={{ false: theme.border, true: theme.primary + '50' }}
                  thumbColor={settings.allowMemberInvites ? theme.primary : isDarkMode ? '#888' : '#f4f3f4'}
                />
              </GlassContainer>

              {/* Only Admins Can @everyone */}
              <GlassContainer style={[styles.settingItem, isRTL && styles.rowReverse]}
                borderRadius={borderRadius.lg}>
                <View style={[styles.settingInfo, isRTL && styles.settingInfoRtl]}>
                  <Text style={[styles.settingTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                    {t('chats.onlyAdminsCanMention')}
                  </Text>
                  <Text style={[styles.settingDescription, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
                    {t('chats.onlyAdminsCanMentionDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.onlyAdminsCanMention}
                  onValueChange={(value) => handleSettingToggle('onlyAdminsCanMention', value)}
                  trackColor={{ false: theme.border, true: theme.primary + '50' }}
                  thumbColor={settings.onlyAdminsCanMention ? theme.primary : isDarkMode ? '#888' : '#f4f3f4'}
                />
              </GlassContainer>

              {/* Only Admins Can Pin */}
              <GlassContainer style={[styles.settingItem, isRTL && styles.rowReverse]}
                borderRadius={borderRadius.lg}>
                <View style={[styles.settingInfo, isRTL && styles.settingInfoRtl]}>
                  <Text style={[styles.settingTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                    {t('chats.onlyAdminsCanPin')}
                  </Text>
                  <Text style={[styles.settingDescription, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
                    {t('chats.onlyAdminsCanPinDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.onlyAdminsCanPin}
                  onValueChange={(value) => handleSettingToggle('onlyAdminsCanPin', value)}
                  trackColor={{ false: theme.border, true: theme.primary + '50' }}
                  thumbColor={settings.onlyAdminsCanPin ? theme.primary : isDarkMode ? '#888' : '#f4f3f4'}
                />
              </GlassContainer>
            </View>

            <View style={styles.formSection}>
              <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
                <Text style={[styles.sectionTitle, isRTL && styles.directionalText, { color: theme.text, fontSize: fontSize(14) }]}>
                  {t('chats.selectMembers')}
                </Text>
                {selectedUsers.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.badgeText, { fontSize: fontSize(12) }]}>
                      {selectedUsers.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Search Bar */}
              <GlassInput style={[styles.searchContainer, isRTL && styles.rowReverse]}>
                <Ionicons name="search" size={moderateScale(18)} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, isRTL && styles.inputRtl, { color: theme.text, fontSize: fontSize(14) }]}
                  placeholder={t('chats.searchUsers')}
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={handleQueryChange}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={moderateScale(18)} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </GlassInput>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : searchQuery.length > 0 ? (
                // Show search results
                searching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                      {t('chats.emptySearchMessage')}
                    </Text>
                  </View>
                ) : (
                  <FlashList
                    data={searchResults}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.$id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.usersList}
                  />
                )
              ) : (
                // Show friends first, then department users
                <>
                  {friends.length > 0 && (
                    <>
                      <Text style={[styles.subSectionTitle, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                        {t('chats.friends')}
                      </Text>
                      <FlashList
                        data={friends}
                        renderItem={renderUserItem}
                        keyExtractor={(item) => item.$id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.usersList}
                      />
                    </>
                  )}
                  
                  {departmentUsers.length > 0 && (
                    <>
                      <Text style={[styles.subSectionTitle, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(12), marginTop: spacing.md }]}>
                        {t('chats.departmentUsers')}
                      </Text>
                      <FlashList
                        data={departmentUsers}
                        renderItem={renderUserItem}
                        keyExtractor={(item) => item.$id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.usersList}
                      />
                    </>
                  )}

                  {friends.length === 0 && departmentUsers.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Text style={[styles.emptyText, isRTL && styles.directionalText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                        {t('chats.emptySearchMessage')}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  isRTL && styles.rowReverse,
                  { 
                    backgroundColor: theme.primary,
                    opacity: (!groupName.trim() || selectedUsers.length === 0 || creating) ? 0.5 : 1,
                  }
                ]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0 || creating}>
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add" size={moderateScale(22)} color="#FFFFFF" />
                    <Text style={[styles.createButtonText, isRTL && styles.directionalText, { fontSize: fontSize(16) }]}>
                      {t('chats.createGroupButton')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  placeholder: {
    width: moderateScale(40),
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  textAreaContainer: {
    paddingVertical: spacing.md,
  },
  input: {
    fontWeight: '400',
  },
  inputRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textArea: {
    height: moderateScale(80),
    textAlignVertical: 'top',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: moderateScale(10),
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  usersList: {
    gap: spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  userCardSelected: {
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
  },
  userInfoLtr: {
    marginLeft: spacing.md,
  },
  userInfoRtl: {
    marginRight: spacing.md,
  },
  userName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userDetails: {
    fontWeight: '400',
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontWeight: '400',
  },
  subSectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Group photo styles
  photoSection: {
    alignItems: 'center',
    position: 'relative',
  },
  photoContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  groupPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(50),
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 0,
    right: wp(30),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
  },
  // Settings styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingInfoRtl: {
    marginRight: 0,
    marginLeft: spacing.md,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  directionalText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  settingTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  settingDescription: {
    fontWeight: '400',
  },
});

export default CreateGroup;
