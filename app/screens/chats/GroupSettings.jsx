import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import AnimatedBackground from '../../components/AnimatedBackground';
import ProfilePicture from '../../components/ProfilePicture';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { getUserById } from '../../../database/users';
import { pickAndCompressImages } from '../../utils/imageCompression';
import { uploadToImgbb } from '../../../services/imgbbService';
import { 
  updateGroupSettings, 
  addGroupAdmin, 
  removeGroupAdmin,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  deleteGroup,
} from '../../../database/chatHelpers';
import { getChat } from '../../../database/chats';
import { getUserChatSettings, muteChat, unmuteChat } from '../../../database/userChatSettings';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const GroupSettings = ({ navigation, route }) => {
  const { chat } = route.params || {};
  const { t, theme, isDarkMode } = useAppSettings();
  const { user: currentUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  
  const [groupName, setGroupName] = useState(chat?.name || '');
  const [description, setDescription] = useState(chat?.description || '');
  const [groupPhoto, setGroupPhoto] = useState(chat?.groupPhoto || null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [settings, setSettings] = useState({
    allowMemberInvites: false,
    onlyAdminsCanPost: false,
    allowEveryoneMention: true,
    onlyAdminsCanMention: false,
    onlyAdminsCanPin: false,
  });
  
  // Per-user mute setting (separate from group settings)
  const [userMuted, setUserMuted] = useState(false);

  const isAdmin = chat?.admins?.includes(currentUser?.$id) || 
                  chat?.representatives?.includes(currentUser?.$id);
  const isCreator = chat?.admins?.[0] === currentUser?.$id;

  // Refs for debounced auto-save (text fields only)
  const saveTimeoutRef = useRef(null);
  const latestSettingsRef = useRef(settings);
  const latestNameRef = useRef(groupName);
  const latestDescriptionRef = useRef(description);

  // Keep refs up to date
  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    latestNameRef.current = groupName;
  }, [groupName]);

  useEffect(() => {
    latestDescriptionRef.current = description;
  }, [description]);

  // Debounced auto-save for text fields (name/description)
  const autoSaveText = useCallback(async () => {
    if (!isAdmin) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await updateGroupSettings(chat.$id, {
          name: latestNameRef.current.trim(),
          description: latestDescriptionRef.current.trim(),
        });

        navigation.setParams({
          chat: {
            ...chat,
            ...result,
          }
        });
      } catch (error) {
        // Silent fail for auto-save
      }
    }, 800);
  }, [isAdmin, chat, navigation]);

  // Immediate save for toggle changes (no debounce)
  const handleSettingToggle = useCallback(async (key, value) => {
    const newSettings = { ...latestSettingsRef.current, [key]: value };
    setSettings(newSettings);
    latestSettingsRef.current = newSettings;

    if (!isAdmin) return;

    try {
      const result = await updateGroupSettings(chat.$id, {
        settings: JSON.stringify(newSettings),
        requiresRepresentative: newSettings.onlyAdminsCanPost,
      });

      navigation.setParams({
        chat: {
          ...chat,
          ...result,
        }
      });
    } catch (error) {
      // Revert on error
      const revertedSettings = { ...newSettings, [key]: !value };
      setSettings(revertedSettings);
      latestSettingsRef.current = revertedSettings;
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.settingsSaveError') });
    }
  }, [isAdmin, chat, navigation, t, showAlert]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadMembers();
    loadFreshSettings();
    loadUserMuteSettings();
  }, []);

  const loadFreshSettings = async () => {
    try {
      // Always fetch fresh from database to avoid stale nav params
      const freshChat = await getChat(chat.$id, true);
      if (freshChat) {
        if (freshChat.name) setGroupName(freshChat.name);
        if (freshChat.description !== undefined) setDescription(freshChat.description || '');
        if (freshChat.groupPhoto !== undefined) setGroupPhoto(freshChat.groupPhoto || null);
        
        if (freshChat.settings) {
          const parsed = typeof freshChat.settings === 'string' 
            ? JSON.parse(freshChat.settings) 
            : freshChat.settings;
          setSettings(prev => ({ ...prev, ...parsed }));
        }

        // Update nav params with fresh data
        navigation.setParams({ chat: freshChat });
      }
    } catch (e) {
      // Fallback to chat param data
      loadSettingsFromParam();
    }
  };

  const loadSettingsFromParam = () => {
    try {
      if (chat?.settings) {
        const parsed = typeof chat.settings === 'string' 
          ? JSON.parse(chat.settings) 
          : chat.settings;
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // Keep default settings
    }
  };

  // Load per-user mute settings
  const loadUserMuteSettings = async () => {
    if (!currentUser?.$id || !chat?.$id) return;
    try {
      const userSettings = await getUserChatSettings(currentUser.$id, chat.$id);
      setUserMuted(userSettings?.isMuted || false);
    } catch (e) {
      // Keep default (not muted)
    }
  };

  // Toggle per-user mute (available to everyone)
  const handleToggleUserMute = async (value) => {
    if (!currentUser?.$id || !chat?.$id) return;
    
    setUserMuted(value);
    try {
      if (value) {
        await muteChat(currentUser.$id, chat.$id);
      } else {
        await unmuteChat(currentUser.$id, chat.$id);
      }
    } catch (error) {
      // Revert on error
      setUserMuted(!value);
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.muteError') || 'Failed to update mute settings' });
    }
  };

  const handleChangeGroupPhoto = async () => {
    if (!isAdmin) return;
    
    try {
      setUploadingPhoto(true);
      const result = await pickAndCompressImages({
        allowsMultipleSelection: false,
        maxImages: 1,
        quality: 'medium',
      });

      if (!result || result.length === 0) {
        setUploadingPhoto(false);
        return; // User cancelled
      }

      const imageData = result[0];
      if (!imageData || !imageData.base64) {
        throw new Error('Failed to get image data');
      }

      const uploadResult = await uploadToImgbb(imageData.base64);
      if (!uploadResult || !uploadResult.url) {
        throw new Error('Failed to upload image');
      }

      // Update local state
      setGroupPhoto(uploadResult.url);
      
      // Save to database immediately
      await updateGroupSettings(chat.$id, {
        groupPhoto: uploadResult.url,
      });
      
      // Update navigation params to reflect change
      navigation.setParams({
        chat: {
          ...chat,
          groupPhoto: uploadResult.url,
        }
      });
      
      showAlert({ type: 'success', title: t('common.success'), message: t('chats.groupPhotoUpdated') || 'Group photo updated' });
    } catch (error) {
      const errorMessage = error?.message || t('chats.groupPhotoError') || 'Failed to update group photo';
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadMembers = async () => {
    if (!chat?.participants) {
      setLoading(false);
      return;
    }

    try {
      const memberPromises = chat.participants.map(id => getUserById(id));
      const memberData = await Promise.all(memberPromises);
      const validMembers = memberData.filter(m => m);
      setMembers(validMembers);
    } catch (error) {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) return;

    setSaving(true);
    try {
      await updateGroupSettings(chat.$id, {
        name: groupName.trim(),
        description: description.trim(),
        groupPhoto: groupPhoto,
        settings: JSON.stringify(settings),
        requiresRepresentative: settings.onlyAdminsCanPost,
      });
      showAlert({ type: 'success', title: t('common.success'), message: t('chats.settingsSaved') });
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.settingsSaveError') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async (userId) => {
    if (!isCreator || userId === currentUser?.$id) return;

    const isUserAdmin = chat?.admins?.includes(userId);
    const member = members.find(m => m.$id === userId);
    const memberName = member?.name || member?.fullName || t('common.user');
    
    // Show confirmation dialog
    showAlert({
      type: 'warning',
      title: isUserAdmin 
        ? (t('chats.removeAdminTitle') || 'Remove Admin') 
        : (t('chats.makeAdminTitle') || 'Make Admin'),
      message: isUserAdmin
        ? (t('chats.removeAdminConfirm') || `Are you sure you want to remove ${memberName} as admin?`).replace('{name}', memberName)
        : (t('chats.makeAdminConfirm') || `Are you sure you want to make ${memberName} an admin?`).replace('{name}', memberName),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm') || 'Confirm',
          onPress: async () => {
            try {
              if (isUserAdmin) {
                await removeGroupAdmin(chat.$id, userId);
              } else {
                await addGroupAdmin(chat.$id, userId);
              }
              // Refresh data
              navigation.setParams({ 
                chat: { 
                  ...chat, 
                  admins: isUserAdmin 
                    ? chat.admins.filter(id => id !== userId)
                    : [...(chat.admins || []), userId]
                } 
              });
              
              showAlert({
                type: 'success',
                title: t('common.success'),
                message: isUserAdmin
                  ? (t('chats.adminRemoved') || `${memberName} is no longer an admin`).replace('{name}', memberName)
                  : (t('chats.adminAdded') || `${memberName} is now an admin`).replace('{name}', memberName),
              });
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('chats.adminUpdateError') });
            }
          },
        },
      ],
    });
  };

  const handleRemoveMember = async (userId) => {
    if (!isAdmin || userId === currentUser?.$id) return;

    showAlert({
      type: 'warning',
      title: t('chats.removeMember'),
      message: t('chats.removeMemberConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupMember(chat.$id, userId);
              setMembers(prev => prev.filter(m => m.$id !== userId));
              
              // Update navigation params to reflect the change
              const updatedParticipants = (chat.participants || []).filter(id => id !== userId);
              const updatedAdmins = (chat.admins || []).filter(id => id !== userId);
              navigation.setParams({
                chat: {
                  ...chat,
                  participants: updatedParticipants,
                  admins: updatedAdmins,
                }
              });
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('chats.removeMemberError') });
            }
          },
        },
      ],
    });
  };

  const handleLeaveGroup = () => {
    showAlert({
      type: 'warning',
      title: t('chats.leaveGroup'),
      message: t('chats.leaveGroupConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chats.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(chat.$id, currentUser.$id);
              navigation.popToTop();
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('chats.leaveGroupError') });
            }
          },
        },
      ],
    });
  };

  const handleDeleteGroup = () => {
    if (!isCreator) return;

    showAlert({
      type: 'error',
      title: t('chats.deleteGroup'),
      message: t('chats.deleteGroupConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(chat.$id);
              navigation.popToTop();
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('chats.deleteGroupError') });
            }
          },
        },
      ],
    });
  };

  const renderMemberItem = ({ item }) => {
    const isMemberAdmin = chat?.admins?.includes(item.$id);
    const isMemberCreator = chat?.admins?.[0] === item.$id;
    const isCurrentUser = item.$id === currentUser?.$id;

    return (
      <View style={styles.memberCard}>
        <ProfilePicture 
          uri={item.profilePicture}
          name={item.name}
          size={moderateScale(44)}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: theme.text, fontSize: fontSize(14) }]} numberOfLines={1}>
              {item.name} {isCurrentUser && `(${t('chats.you')})`}
            </Text>
            {isMemberCreator && (
              <View style={[styles.roleBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.roleBadgeText, { color: '#F59E0B', fontSize: fontSize(10) }]}>
                  {t('chats.creator')}
                </Text>
              </View>
            )}
            {isMemberAdmin && !isMemberCreator && (
              <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}20` }]}>
                <Text style={[styles.roleBadgeText, { color: theme.primary, fontSize: fontSize(10) }]}>
                  {t('chats.admin')}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberDetails, { color: theme.textSecondary, fontSize: fontSize(11) }]} numberOfLines={1}>
            {item.department || item.email}
          </Text>
        </View>
        
        {isAdmin && !isCurrentUser && !isMemberCreator && (
          <View style={styles.memberActions}>
            {isCreator && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${theme.primary}15` }]}
                onPress={() => handleToggleAdmin(item.$id)}>
                <Ionicons 
                  name={isMemberAdmin ? 'shield' : 'shield-outline'} 
                  size={moderateScale(18)} 
                  color={theme.primary} 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}
              onPress={() => handleRemoveMember(item.$id)}>
              <Ionicons name="remove-circle-outline" size={moderateScale(18)} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSettingItem = (icon, title, subtitle, value, onToggle, disabled = false) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
        <Ionicons name={icon} size={moderateScale(20)} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.text, fontSize: fontSize(14) }]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled || !isAdmin}
        trackColor={{ false: isDarkMode ? '#555' : '#D1D1D6', true: `${theme.primary}80` }}
        thumbColor={Platform.OS === 'android' ? (value ? theme.primary : isDarkMode ? '#888' : '#f4f3f4') : undefined}
        ios_backgroundColor={isDarkMode ? '#555' : '#D1D1D6'}
        style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : undefined}
      />
    </View>
  );

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
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={moderateScale(24)} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(20) }]}>
              {t('chats.groupSettings')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}>
            
            {/* Group Info Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                {t('chats.groupInfo')}
              </Text>
              <View style={[
              styles.sectionCard,
              { 
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(255, 255, 255, 0.7)',
                borderRadius: borderRadius.lg,
              }
            ]}>
                {/* Group Photo */}
                <View style={styles.groupPhotoSection}>
                  <TouchableOpacity
                    style={styles.groupPhotoContainer}
                    onPress={handleChangeGroupPhoto}
                    disabled={!isAdmin || uploadingPhoto}>
                    {uploadingPhoto ? (
                      <View style={[styles.groupPhotoPlaceholder, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                      </View>
                    ) : groupPhoto ? (
                      <Image 
                        source={{ uri: groupPhoto }} 
                        style={styles.groupPhoto}
                      />
                    ) : (
                      <View style={[styles.groupPhotoPlaceholder, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="people" size={moderateScale(40)} color={theme.textSecondary} />
                      </View>
                    )}
                    {isAdmin && !uploadingPhoto && (
                      <View style={[styles.photoEditBadge, { backgroundColor: theme.primary }]}>
                        <Ionicons name="camera" size={moderateScale(14)} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity 
                      onPress={handleChangeGroupPhoto}
                      disabled={uploadingPhoto}>
                      <Text style={[styles.changePhotoText, { color: theme.primary, fontSize: fontSize(13) }]}>
                        {t('chats.changeGroupPhoto')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text, fontSize: fontSize(12) }]}>
                    {t('chats.groupName')}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { 
                        color: theme.text, 
                        fontSize: fontSize(15),
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      }
                    ]}
                    value={groupName}
                    onChangeText={setGroupName}
                    onBlur={() => autoSaveText()}
                    editable={isAdmin}
                    placeholder={t('chats.groupNamePlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text, fontSize: fontSize(12) }]}>
                    {t('chats.groupDescription')}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textArea,
                      { 
                        color: theme.text, 
                        fontSize: fontSize(15),
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      }
                    ]}
                    value={description}
                    onChangeText={setDescription}
                    onBlur={() => autoSaveText()}
                    editable={isAdmin}
                    multiline
                    numberOfLines={3}
                    placeholder={t('chats.groupDescriptionPlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Permissions Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                {t('chats.permissions')}
              </Text>
              <View style={[
                styles.sectionCard,
                { 
                  backgroundColor: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 0.7)',
                  borderRadius: borderRadius.lg,
                }
              ]}>
                {renderSettingItem(
                  'chatbubble-ellipses',
                  t('chats.onlyAdminsCanPost'),
                  t('chats.onlyAdminsCanPostDesc'),
                  settings.onlyAdminsCanPost,
                  (val) => handleSettingToggle('onlyAdminsCanPost', val)
                )}
                <View style={[styles.settingsDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                {renderSettingItem(
                  'person-add',
                  t('chats.allowMemberInvites'),
                  t('chats.allowMemberInvitesDesc'),
                  settings.allowMemberInvites,
                  (val) => handleSettingToggle('allowMemberInvites', val)
                )}
                <View style={[styles.settingsDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                {renderSettingItem(
                  'at',
                  t('chats.allowEveryoneMention'),
                  t('chats.allowEveryoneMentionDesc'),
                  settings.allowEveryoneMention !== false,
                  (val) => handleSettingToggle('allowEveryoneMention', val)
                )}
                <View style={[styles.settingsDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                {renderSettingItem(
                  'megaphone',
                  t('chats.onlyAdminsCanMention'),
                  t('chats.onlyAdminsCanMentionDesc'),
                  settings.onlyAdminsCanMention,
                  (val) => handleSettingToggle('onlyAdminsCanMention', val)
                )}
                <View style={[styles.settingsDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                {renderSettingItem(
                  'pin',
                  t('chats.onlyAdminsCanPin'),
                  t('chats.onlyAdminsCanPinDesc'),
                  settings.onlyAdminsCanPin,
                  (val) => handleSettingToggle('onlyAdminsCanPin', val)
                )}
              </View>
            </View>

            {/* Personal Notification Settings - Available to everyone */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                {t('chats.yourSettings') || 'Your Settings'}
              </Text>
              <View style={[
                styles.sectionCard,
                { 
                  backgroundColor: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 0.7)',
                  borderRadius: borderRadius.lg,
                }
              ]}>
                <View style={styles.settingRow}>
                  <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                    <Ionicons name="notifications-off" size={moderateScale(20)} color={theme.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: theme.text, fontSize: fontSize(14) }]}>
                      {t('chats.muteNotifications')}
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: theme.textSecondary, fontSize: fontSize(11) }]}>
                      {t('chats.muteNotificationsDesc')}
                    </Text>
                  </View>
                  <Switch
                    value={userMuted}
                    onValueChange={handleToggleUserMute}
                    trackColor={{ false: isDarkMode ? '#555' : '#D1D1D6', true: `${theme.primary}80` }}
                    thumbColor={Platform.OS === 'android' ? (userMuted ? theme.primary : isDarkMode ? '#888' : '#f4f3f4') : undefined}
                    ios_backgroundColor={isDarkMode ? '#555' : '#D1D1D6'}
                    style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : undefined}
                  />
                </View>
              </View>
            </View>

            {/* Members Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                  {t('chats.members')} ({members.length})
                </Text>
                {(isAdmin || settings.allowMemberInvites) && (
                  <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: `${theme.primary}15` }]}
                    onPress={() => navigation.navigate('AddMembers', { chat })}>
                    <Ionicons name="add" size={moderateScale(18)} color={theme.primary} />
                    <Text style={[styles.addButtonText, { color: theme.primary, fontSize: fontSize(12) }]}>
                      {t('chats.addMembers')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : (
              <View style={[
                  styles.membersCard,
                  { 
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(255, 255, 255, 0.7)',
                    borderRadius: borderRadius.lg,
                  }
                ]}>
                  <FlatList
                    data={members}
                    renderItem={renderMemberItem}
                    keyExtractor={(item) => item.$id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => (
                      <View style={[styles.separator, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} />
                    )}
                  />
                </View>
              )}
            </View>

            {/* Danger Zone */}
            <View style={[styles.section, styles.dangerSection]}>
              <Text style={[styles.sectionTitle, { color: '#FF3B30', fontSize: fontSize(12) }]}>
                {t('chats.dangerZone')}
              </Text>
              <View style={[
                styles.sectionCard,
                { 
                  backgroundColor: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 0.7)',
                  borderRadius: borderRadius.lg,
                }
              ]}>
                <TouchableOpacity 
                  style={styles.dangerButton}
                  onPress={handleLeaveGroup}>
                  <Ionicons name="exit-outline" size={moderateScale(20)} color="#FF3B30" />
                  <Text style={[styles.dangerButtonText, { fontSize: fontSize(14) }]}>
                    {t('chats.leaveGroup')}
                  </Text>
                </TouchableOpacity>
                
                {isCreator && (
                  <>
                    <View style={[styles.separator, { backgroundColor: 'rgba(255,59,48,0.15)' }]} />
                    <TouchableOpacity 
                      style={styles.dangerButton}
                      onPress={handleDeleteGroup}>
                      <Ionicons name="trash-outline" size={moderateScale(20)} color="#FF3B30" />
                      <Text style={[styles.dangerButtonText, { fontSize: fontSize(14) }]}>
                        {t('chats.deleteGroup')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
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
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    minWidth: moderateScale(60),
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontWeight: '600',
  },
  placeholder: {
    width: moderateScale(60),
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    padding: spacing.md,
  },
  groupPhotoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  groupPhotoContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  groupPhoto: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
  },
  groupPhotoPlaceholder: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  textInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    fontWeight: '400',
  },
  textArea: {
    height: moderateScale(80),
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + moderateScale(36) + spacing.md,
    opacity: 0.6,
  },
  settingIcon: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '500',
  },
  settingSubtitle: {
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  membersCard: {
    paddingVertical: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  memberName: {
    fontWeight: '600',
  },
  memberDetails: {
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    marginVertical: spacing.xs,
  },
  dangerSection: {
    marginTop: spacing.md,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  bottomPadding: {
    height: hp(5),
  },
});

export default GroupSettings;
