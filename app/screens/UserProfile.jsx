import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, StatusBar, ActivityIndicator, Platform, Share, Modal, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from '../components/GlassComponents';
import AnimatedBackground from '../components/AnimatedBackground';
import PostCard from '../components/PostCard';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { getPostsByUser, togglePostLike } from '../../database/posts';
import { getUserById, followUser, unfollowUser, isFollowing as checkIsFollowing, blockUser, blockUserChatOnly } from '../../database/users';
import { notifyFollow } from '../../database/notifications';
import { createPrivateChat } from '../../database/chatHelpers';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { useUserProfile } from '../hooks/useRealtimeSubscription';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UserProfile = ({ route, navigation }) => {
  const { userId, userData: initialUserData } = route.params;
  const { t, theme, isDarkMode } = useAppSettings();
  const { user: currentUser, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userData, setUserData] = useState(initialUserData || null);
  const [loadingUser, setLoadingUser] = useState(!initialUserData);
  const [userError, setUserError] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const displayName = userData?.fullName || userData?.name || t('errors.unknownUser');

  // Generate profile link for sharing
  const getProfileLink = () => {
    // Deep link format for the app
    return `collegecommunity://profile/${userId}`;
  };

  const getQrImageUrl = () => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getProfileLink())}`;
  };

  const handleShareProfile = async () => {
    try {
      const profileLink = getProfileLink();
      await Share.share({
        message: t('profile.shareMessage').replace('{name}', displayName) + '\n' + profileLink,
        title: t('profile.shareProfile'),
      });
    } catch (error) {
      // Share cancelled or failed
    }
  };

  const handleShareQr = async () => {
    try {
      const qrUrl = getQrImageUrl();
      const fileUri = `${FileSystem.cacheDirectory}profile-qr-${userId}.png`;
      await FileSystem.downloadAsync(qrUrl, fileUri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: t('profile.shareProfile'),
        });
        return;
      }
    } catch (error) {
      // Fall through to link sharing
    }

    handleShareProfile();
  };

  // Smart realtime subscription for user profile updates (followers, etc.)
  const handleProfileUpdate = useCallback((payload) => {
    if (payload.$id === userId) {
      setUserData(prev => ({
        ...prev,
        followersCount: payload.followersCount ?? prev?.followersCount ?? 0,
        followingCount: payload.followingCount ?? prev?.followingCount ?? 0,
        postsCount: payload.postsCount ?? prev?.postsCount ?? 0,
        bio: payload.bio ?? prev?.bio ?? '',
        profilePicture: payload.profilePicture ?? prev?.profilePicture ?? '',
      }));
    }
  }, [userId]);

  useUserProfile(userId, handleProfileUpdate, !!userId);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser?.$id || !userId || currentUser.$id === userId) return;
      try {
        const following = await checkIsFollowing(currentUser.$id, userId);
        setIsFollowing(following);
      } catch (error) {
        // Silently fail
      }
    };
    checkFollowStatus();
  }, [currentUser?.$id, userId]);

  // Fetch user data if not provided
  useEffect(() => {
    const fetchUserData = async () => {
      if (initialUserData) {
        setUserData(initialUserData);
        setLoadingUser(false);
        return;
      }

      if (!userId) {
        setUserError('No user ID provided');
        setLoadingUser(false);
        return;
      }

      setLoadingUser(true);
      setUserError(null);

      try {
        const fetchedUser = await getUserById(userId);
        
        // Parse socialLinks from profileViews field (stored as JSON string)
        let socialLinksData = { links: null, visibility: 'everyone' };
        if (fetchedUser.profileViews) {
          try {
            socialLinksData = JSON.parse(fetchedUser.profileViews);
          } catch (e) {
            socialLinksData = { links: null, visibility: 'everyone' };
          }
        }
        
        // Map the database fields to expected format
        const mappedUser = {
          $id: fetchedUser.$id,
          fullName: fetchedUser.name || fetchedUser.fullName,
          email: fetchedUser.email,
          bio: fetchedUser.bio || '',
          gender: fetchedUser.gender || '',
          profilePicture: fetchedUser.profilePicture || '',
          university: fetchedUser.university || '',
          college: fetchedUser.major || fetchedUser.college || '',
          department: fetchedUser.department || '',
          stage: fetchedUser.year || fetchedUser.stage || '',
          postsCount: fetchedUser.postsCount || 0,
          followersCount: fetchedUser.followersCount || 0,
          followingCount: fetchedUser.followingCount || 0,
          socialLinks: socialLinksData.links || null,
          socialLinksVisibility: socialLinksData.visibility || 'everyone',
        };
        
        setUserData(mappedUser);
      } catch (error) {
        setUserError(error.message);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [userId, initialUserData]);

  const loadUserPosts = useCallback(async () => {
    if (!userId) return;
    
    setLoadingPosts(true);
    setPostsError(null);
    try {
      const posts = await getPostsByUser(userId, 20, 0);
      setUserPosts(posts);
      setPostsLoaded(true);
    } catch (error) {
      setPostsError(error.message);
    } finally {
      setLoadingPosts(false);
    }
  }, [userId]);


  useEffect(() => {
    if (userId && !postsLoaded) {
      loadUserPosts();
    }
  }, [userId, loadUserPosts, postsLoaded]);

  // Handle post updates when returning from PostDetails
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const updatedPostId = route?.params?.updatedPostId;
      const updatedReplyCount = route?.params?.updatedReplyCount;
      
      if (updatedPostId !== undefined && updatedReplyCount !== undefined) {
        // Update the specific post in the list
        setUserPosts(prevPosts => 
          prevPosts.map(p => 
            p.$id === updatedPostId 
              ? { ...p, replyCount: updatedReplyCount }
              : p
          )
        );
        // Clear the params
        navigation.setParams({ updatedPostId: undefined, updatedReplyCount: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.updatedPostId, route?.params?.updatedReplyCount]);

  const handleFollowToggle = async () => {
    if (followLoading || !currentUser?.$id || !userId || currentUser.$id === userId) return;
    
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    
    try {
      // Optimistic update
      setIsFollowing(!wasFollowing);
      setUserData(prev => ({
        ...prev,
        followersCount: wasFollowing 
          ? Math.max(0, (prev?.followersCount || 0) - 1)
          : (prev?.followersCount || 0) + 1
      }));
      
      if (wasFollowing) {
        await unfollowUser(currentUser.$id, userId);
      } else {
        await followUser(currentUser.$id, userId);
        // Send follow notification
        try {
          await notifyFollow(
            userId,
            currentUser.$id,
            currentUser.fullName || currentUser.name,
            currentUser.profilePicture
          );
        } catch (notifyError) {
          // Silent fail for notification
        }
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setUserData(prev => ({
        ...prev,
        followersCount: wasFollowing 
          ? (prev?.followersCount || 0) + 1
          : Math.max(0, (prev?.followersCount || 0) - 1)
      }));
      showAlert({ type: 'error', title: t('common.error'), message: t('profile.followError') || 'Failed to update follow status' });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (blockLoading || !currentUser?.$id || !userId || currentUser.$id === userId) return;
    
    showAlert({
      type: 'warning',
      title: t('common.blockOptionsTitle'),
      message: t('common.blockOptionsMessage').replace('{name}', displayName),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.blockMessagesOnly'),
          style: 'default',
          onPress: async () => {
            setBlockLoading(true);
            try {
              await blockUserChatOnly(currentUser.$id, userId);
              await refreshUser();
              showAlert({
                type: 'success',
                title: t('common.success'),
                message: t('chats.messagesOnlyBlocked'),
              });
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('chats.blockError') });
            } finally {
              setBlockLoading(false);
            }
          },
        },
        {
          text: t('common.blockEverything'),
          style: 'destructive',
          onPress: async () => {
            setBlockLoading(true);
            try {
              await blockUser(currentUser.$id, userId);
              setIsBlocked(true);
              setIsFollowing(false);
              // Refresh user context so blockedUsers list is updated for filtering
              await refreshUser();
              showAlert({
                type: 'success',
                title: t('common.success'),
                message: t('profile.userBlocked'),
              });
              navigation.goBack();
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('profile.blockError') });
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ],
    });
  };

  const handleDirectMessage = async () => {
    if (messageLoading || !currentUser?.$id || !userId || currentUser.$id === userId) return;
    
    setMessageLoading(true);
    try {
      const chat = await createPrivateChat(
        { $id: currentUser.$id, name: currentUser.fullName || currentUser.name },
        { $id: userId, name: userData?.fullName || userData?.name }
      );
      
      if (chat) {
        navigation.navigate('ChatRoom', {
          chat: {
            ...chat,
            otherUser: {
              $id: userId,
              name: userData?.fullName || userData?.name,
              profilePicture: userData?.profilePicture,
            },
          },
        });
      }
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.errorCreatingChat') || 'Failed to start conversation' });
    } finally {
      setMessageLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (!currentUser?.$id) return;
    
    try {
      const result = await togglePostLike(postId, currentUser.$id);
      
      setUserPosts(prevPosts => 
        prevPosts.map(post => 
          post.$id === postId 
            ? { 
                ...post, 
                likedBy: result.isLiked 
                  ? [...(post.likedBy || []), currentUser.$id]
                  : (post.likedBy || []).filter(id => id !== currentUser.$id),
                likeCount: result.likeCount 
              }
            : post
        )
      );
    } catch (error) {
    }
  };

  const getStageKey = (stageValue) => {
    if (!stageValue) return '';
    
    const stageMap = {
      1: 'firstYear',
      2: 'secondYear',
      3: 'thirdYear',
      4: 'fourthYear',
      5: 'fifthYear',
      6: 'sixthYear',
      'first year': 'firstYear',
      'second year': 'secondYear',
      'third year': 'thirdYear',
      'fourth year': 'fourthYear',
      'fifth year': 'fifthYear',
      'sixth year': 'sixthYear',
    };
    
    const normalized = typeof stageValue === 'string' ? stageValue.toLowerCase() : stageValue;
    return stageMap[normalized] || stageValue;
  };

  // Show loading state
  if (loadingUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary, marginTop: spacing.md }]}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (userError || !userData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(50)} color={theme.error || '#EF4444'} />
          <Text style={[styles.loadingText, { color: theme.textSecondary, marginTop: spacing.md }]}>
            {userError || t('profile.userNotFound')}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.retryButton, { marginTop: spacing.lg }]}
          >
            <Text style={[styles.retryButtonText, { color: theme.primary }]}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50)) + '&size=400&background=667eea&color=fff&bold=true';
  const avatarUri = userData.profilePicture ? userData.profilePicture : defaultAvatar;
  
  const stageKey = getStageKey(userData.stage);
  const stageTranslation = userData.stage ? t(`stages.${stageKey}`) : '';
  const departmentTranslation = userData.department ? t(`departments.${userData.department}`) : '';
  
  const userProfile = {
    name: displayName,
    email: userData.email || '',
    bio: userData.bio || t('profile.defaultBio'),
    gender: userData.gender || '',
    avatar: avatarUri,
    university: userData.university ? t(`universities.${userData.university}`) : '',
    college: userData.college ? t(`colleges.${userData.college}`) : '',
    stage: stageTranslation,
    department: departmentTranslation,
    stats: {
      posts: userPosts.length || userData.postsCount || 0,
      followers: userData.followersCount || 0,
      following: userData.followingCount || 0
    }
  };

  const renderAboutSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('profile.about')}</Text>
      <GlassContainer borderRadius={borderRadius.lg} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={moderateScale(20)} color={theme.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('profile.email')}</Text>
            <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>{userProfile.email}</Text>
          </View>
        </View>
        
        {userProfile.university && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)' }]} />
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={moderateScale(20)} color={theme.success} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('profile.university')}</Text>
                <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>{userProfile.university}</Text>
              </View>
            </View>
          </>
        )}
        
        {userProfile.college && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)' }]} />
            <View style={styles.infoRow}>
              <Ionicons name="library-outline" size={moderateScale(20)} color={theme.warning} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('profile.college')}</Text>
                <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>{userProfile.college}</Text>
              </View>
            </View>
          </>
        )}
        
        {userProfile.stage && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)' }]} />
            <View style={styles.infoRow}>
              <Ionicons name="stats-chart-outline" size={moderateScale(20)} color={theme.secondary} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('profile.stage')}</Text>
                <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>{userProfile.stage}</Text>
              </View>
            </View>
          </>
        )}
        
        {userProfile.department && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)' }]} />
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={moderateScale(20)} color={theme.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('auth.selectDepartment')}</Text>
                <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>{userProfile.department}</Text>
              </View>
            </View>
          </>
        )}
      </GlassContainer>

      {/* Social Links - respect visibility settings */}
      {userData?.socialLinks && 
       Object.values(userData.socialLinks).some(v => v) && 
       (userData.socialLinksVisibility === 'everyone' || 
        (userData.socialLinksVisibility === 'friends' && isFollowing)) && (
        <GlassContainer borderRadius={borderRadius.lg} style={[styles.infoCard, { marginTop: spacing.md }]}>
          <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary, marginBottom: spacing.sm }]}>
            {t('settings.socialLinks')}
          </Text>
          <View style={styles.socialLinksContainer}>
            {[
              { key: 'instagram', icon: 'logo-instagram', color: '#E4405F', prefix: 'https://instagram.com/' },
              { key: 'twitter', icon: 'logo-twitter', color: '#1DA1F2', prefix: 'https://twitter.com/' },
              { key: 'linkedin', icon: 'logo-linkedin', color: '#0A66C2', prefix: '' },
              { key: 'github', icon: 'logo-github', color: isDarkMode ? '#FFFFFF' : '#333333', prefix: '' },
              { key: 'website', icon: 'globe-outline', color: theme.primary, prefix: '' },
            ].map(({ key, icon, color, prefix }) => {
              const value = userData.socialLinks?.[key];
              if (!value) return null;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.socialLinkButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                  onPress={() => {
                    let url = value;
                    if (!url.startsWith('http') && prefix) {
                      url = prefix + url.replace('@', '');
                    } else if (!url.startsWith('http') && key === 'website') {
                      url = 'https://' + url;
                    }
                    Linking.openURL(url).catch(() => {});
                  }}>
                  <Ionicons name={icon} size={moderateScale(22)} color={color} />
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassContainer>
      )}
    </View>
  );

  const renderPostsSection = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('profile.posts')}</Text>
        {loadingPosts ? (
          <GlassContainer borderRadius={borderRadius.lg} style={styles.emptyCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.emptyText, { fontSize: fontSize(14), color: theme.textSecondary, marginTop: spacing.sm }]}>
              {t('common.loading')}
            </Text>
          </GlassContainer>
        ) : postsError ? (
          <GlassContainer borderRadius={borderRadius.lg} style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={moderateScale(40)} color={theme.error} />
            <Text style={[styles.emptyText, { fontSize: fontSize(14), color: theme.textSecondary, marginTop: spacing.sm }]}>
              {t('common.error')}
            </Text>
            <TouchableOpacity onPress={loadUserPosts} style={styles.retryButton}>
              <Text style={[styles.retryButtonText, { color: theme.primary }]}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </GlassContainer>
        ) : !userPosts || userPosts.length === 0 ? (
          <GlassContainer borderRadius={borderRadius.lg} style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={moderateScale(40)} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { fontSize: fontSize(14), color: theme.textSecondary, marginTop: spacing.sm }]}>
              {t('profile.noPosts')}
            </Text>
          </GlassContainer>
        ) : (
          <View>
            {userPosts.map((post, index) => (
              <PostCard
                key={post.$id || index}
                post={{
                  ...post,
                  userName: displayName,
                  userProfilePicture: userData.profilePicture,
                }}
                onReply={() => navigation.navigate('PostDetails', { post })}
                onLike={() => handleLike(post.$id)}
                onUserPress={() => {}}
                isOwner={false}
                isLiked={post.likedBy?.includes(currentUser?.$id)}
                showImages={true}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AnimatedBackground particleCount={35} />
      <LinearGradient colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#e3f2fd', '#bbdefb', '#90caf9']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <GlassContainer borderRadius={borderRadius.round} style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={moderateScale(24)} color={isDarkMode ? "#FFFFFF" : "#1C1C1E"} />
              </GlassContainer>
            </TouchableOpacity>
            
            {/* Header Right Actions - Share & QR */}
            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.headerActionButton} onPress={handleShareProfile} activeOpacity={0.7}>
                <GlassContainer borderRadius={borderRadius.round} style={styles.backButtonInner}>
                  <Ionicons name="share-outline" size={moderateScale(22)} color={isDarkMode ? "#FFFFFF" : "#1C1C1E"} />
                </GlassContainer>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowQRModal(true)} activeOpacity={0.7}>
                <GlassContainer borderRadius={borderRadius.round} style={styles.backButtonInner}>
                  <Ionicons name="qr-code-outline" size={moderateScale(22)} color={isDarkMode ? "#FFFFFF" : "#1C1C1E"} />
                </GlassContainer>
              </TouchableOpacity>
            </View>
            
            <View style={styles.avatarContainer}>
              <LinearGradient colors={theme.gradient} style={styles.avatarBorder} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={[styles.avatarInner, { backgroundColor: theme.background }]}>
                  <Image 
                    source={{ uri: userProfile.avatar, cache: 'reload' }} 
                    style={styles.avatar}
                  />
                </View>
              </LinearGradient>
            </View>
            
            <Text style={[styles.name, { fontSize: fontSize(22), color: isDarkMode ? '#FFFFFF' : '#1C1C1E' }]}>{userProfile.name}</Text>
            {userProfile.gender ? (
              <Text style={[styles.genderText, { fontSize: fontSize(12), color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(28, 28, 30, 0.6)' }]}>
                {t(`settings.${userProfile.gender}`)}
              </Text>
            ) : null}
            {userProfile.bio && <Text style={[styles.bio, { fontSize: fontSize(13), color: 'rgba(255,255,255,0.8)' }]} numberOfLines={2}>{userProfile.bio}</Text>}
            
            {/* Action Buttons Row - Compact layout */}
            {currentUser?.$id && userId && currentUser.$id !== userId && (
              <View style={styles.actionButtonsRow}>
                {/* Follow Button */}
                <TouchableOpacity 
                  onPress={handleFollowToggle} 
                  activeOpacity={0.8}
                  disabled={followLoading}
                  style={styles.actionButton}
                >
                  <LinearGradient
                    colors={isFollowing ? ['#64748b', '#475569'] : theme.gradient}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons 
                          name={isFollowing ? 'person-remove-outline' : 'person-add-outline'} 
                          size={moderateScale(16)} 
                          color="#FFFFFF" 
                        />
                        <Text style={[styles.actionButtonText, { fontSize: fontSize(12) }]}>
                          {isFollowing ? t('profile.unfollow') : t('profile.follow')}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Message Button */}
                <TouchableOpacity 
                  onPress={handleDirectMessage} 
                  activeOpacity={0.8}
                  disabled={messageLoading}
                  style={styles.actionButton}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {messageLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="chatbubble-outline" size={moderateScale(16)} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, { fontSize: fontSize(12) }]}>
                          {t('profile.message')}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Block Button */}
                <TouchableOpacity 
                  onPress={handleBlockUser} 
                  activeOpacity={0.8}
                  disabled={blockLoading}
                  style={styles.actionButtonSmall}
                >
                  <View style={[styles.blockButtonCompact, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
                    {blockLoading ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="ban-outline" size={moderateScale(18)} color="#EF4444" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={[styles.statsContainer, { backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>
              <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
                <Text style={[styles.statNumber, { fontSize: fontSize(18), color: theme.text }]}>{userProfile.stats.posts}</Text>
                <Text style={[styles.statLabel, { fontSize: fontSize(11), color: theme.textSecondary }]}>{t('profile.posts')}</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity 
                style={styles.statItem} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('FollowList', { 
                  userId, 
                  initialTab: 'followers',
                  userName: displayName
                })}
              >
                <Text style={[styles.statNumber, { fontSize: fontSize(18), color: theme.text }]}>{userProfile.stats.followers}</Text>
                <Text style={[styles.statLabel, { fontSize: fontSize(11), color: theme.textSecondary }]}>{t('profile.followers')}</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity 
                style={styles.statItem} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('FollowList', { 
                  userId, 
                  initialTab: 'following',
                  userName: displayName
                })}
              >
                <Text style={[styles.statNumber, { fontSize: fontSize(18), color: theme.text }]}>{userProfile.stats.following}</Text>
                <Text style={[styles.statLabel, { fontSize: fontSize(11), color: theme.textSecondary }]}>{t('profile.following')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.contentSection}>
            {renderAboutSection()}
            {renderPostsSection()}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}>
        <TouchableOpacity
          style={styles.qrModalOverlay}
          activeOpacity={1}
          onPress={() => setShowQRModal(false)}>
          <View style={[styles.qrModalContent, { backgroundColor: isDarkMode ? '#2a2a40' : '#FFFFFF' }]}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, { color: theme.text }]}>
                {t('profile.scanToConnect') || 'Scan to Connect'}
              </Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={moderateScale(24)} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.qrCodeContainer}>
              <Image
                source={{ uri: getQrImageUrl() }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.qrModalName, { color: theme.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.qrModalHint, { color: theme.textSecondary }]}>
              {t('profile.qrHint') || 'Scan this QR code to view this profile'}
            </Text>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.primary }]}
              onPress={handleShareQr}>
              <Ionicons name="share-outline" size={moderateScale(18)} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>{t('profile.shareProfile') || 'Share Profile'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  container: { flex: 1 }, 
  loadingContainer: { 
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  loadingText: {
    fontSize: fontSize(16),
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(16),
    fontWeight: '600',
  },
  gradient: { flex: 1 }, 
  scrollView: { flex: 1 }, 
  scrollContent: { paddingBottom: hp(6) }, 
  profileHeader: { alignItems: 'center', paddingHorizontal: wp(5), marginBottom: spacing.md, position: 'relative' }, 
  backButton: { position: 'absolute', top: spacing.md, left: wp(5), zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }, 
  backButtonInner: { width: moderateScale(44), height: moderateScale(44), justifyContent: 'center', alignItems: 'center' }, 
  headerRightActions: { position: 'absolute', top: spacing.md, right: wp(5), zIndex: 10, flexDirection: 'row', gap: spacing.sm },
  headerActionButton: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarContainer: { marginBottom: spacing.sm }, 
  avatarBorder: { width: moderateScale(110), height: moderateScale(110), borderRadius: moderateScale(55), padding: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }, 
  avatarInner: { width: moderateScale(104), height: moderateScale(104), borderRadius: moderateScale(52), padding: 3 }, 
  avatar: { width: moderateScale(98), height: moderateScale(98), borderRadius: moderateScale(49) }, 
  name: { fontWeight: '700', marginBottom: spacing.xs / 2, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }, 
  genderText: { textAlign: 'center', marginBottom: spacing.xs, fontStyle: 'italic' },
  bio: { textAlign: 'center', marginBottom: spacing.md, lineHeight: fontSize(18), paddingHorizontal: wp(5) }, 
  followButtonContainer: {
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl * 1.5,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minWidth: wp(35),
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // New compact action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionButton: {
    flex: 1,
    maxWidth: wp(35),
  },
  actionButtonSmall: {
    width: moderateScale(40),
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  blockButtonCompact: {
    width: moderateScale(40),
    height: moderateScale(36),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  blockButtonContainer: {
    marginBottom: spacing.sm,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: spacing.xs,
  },
  blockButtonText: {
    fontWeight: '600',
  },
  statsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    paddingVertical: spacing.md, 
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  }, 
  statItem: { alignItems: 'center', flex: 1 }, 
  statNumber: { fontWeight: '700', marginBottom: 2 }, 
  statLabel: { fontWeight: '500' }, 
  statDivider: { width: 1, height: moderateScale(30), opacity: 0.2 }, 
  contentSection: { paddingHorizontal: wp(5) }, 
  sectionContainer: { marginBottom: spacing.lg }, 
  sectionHeader: { 
    fontSize: fontSize(16), 
    fontWeight: '700', 
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  }, 
  infoCard: { 
    padding: spacing.md,
    overflow: 'hidden',
  }, 
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm }, 
  infoDivider: { height: 1, marginVertical: spacing.sm, width: '100%', alignSelf: 'stretch', marginHorizontal: -spacing.md },
  infoTextContainer: { flex: 1, flexShrink: 1 }, 
  infoLabel: { fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }, 
  infoValue: { fontWeight: '500', flexWrap: 'wrap' }, 
  emptyCard: { 
    padding: spacing.lg, 
    alignItems: 'center',
    overflow: 'hidden',
  }, 
  emptyText: { fontWeight: '500', textAlign: 'center' },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  // QR Modal styles
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  qrModalContent: {
    width: '85%',
    maxWidth: 320,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  qrModalTitle: {
    fontSize: fontSize(18),
    fontWeight: '700',
  },
  qrCodeContainer: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  qrCodeImage: {
    width: moderateScale(200),
    height: moderateScale(200),
  },
  qrModalName: {
    fontSize: fontSize(16),
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  qrModalHint: {
    fontSize: fontSize(12),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(14),
    fontWeight: '600',
  },
  socialLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  socialLinkButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserProfile;
