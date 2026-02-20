import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, StatusBar, ActivityIndicator, Platform, FlatList, RefreshControl, Linking, Share, Modal } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBackground from '../components/AnimatedBackground';
import PostCard from '../components/PostCard';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { getPostsByUser, togglePostLike, setQuestionResolvedStatus, deletePost } from '../../database/posts';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const Profile = ({ navigation, route }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user, isLoading, refreshUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [imageKey, setImageKey] = useState(Date.now());
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const qrShareCardRef = useRef(null);

  const getProfileLink = () => {
    return `collegecommunity://profile/${user?.$id}`;
  };

  const getQrImageUrl = () => `https://quickchart.io/qr?size=440&margin=2&ecLevel=Q&dark=0F172A&light=FFFFFF&text=${encodeURIComponent(getProfileLink())}`;

  const shareProfileText = async (fallbackUrl = null) => {
    const profileLink = getProfileLink();
    const messageParts = [
      t('profile.shareMessage').replace('{name}', user?.fullName || t('common.user')),
      profileLink,
    ];

    if (fallbackUrl) {
      messageParts.push(fallbackUrl);
    }

    await Share.share({
      message: messageParts.join('\n'),
      url: fallbackUrl || profileLink,
      title: t('profile.shareProfile'),
    });
  };

  const handleShareProfile = async () => {
    await handleShareQr();
  };

  const handleShareQr = async () => {
    const qrUrl = getQrImageUrl();

    try {
      await Image.prefetch(qrUrl);

      if (!qrShareCardRef.current) {
        throw new Error('QR share card not ready');
      }

      const shareImageUri = await captureRef(qrShareCardRef, {
        format: 'png',
        quality: 1,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(shareImageUri, {
          mimeType: 'image/png',
          dialogTitle: t('profile.shareProfile'),
          UTI: 'public.png',
        });
        return;
      }
    } catch (error) {
      console.error('[Profile] QR share failed, falling back to text share', {
        userId: user?.$id,
        message: error?.message,
      });
    }

    await shareProfileText();
  };

  const qrBorderMarkers = [
    { key: 'tl', name: 'school-outline', position: styles.qrMarkerTopLeft },
    { key: 'tm', name: 'book-outline', position: styles.qrMarkerTopMid },
    { key: 'tr', name: 'library-outline', position: styles.qrMarkerTopRight },
    { key: 'rm', name: 'calculator-outline', position: styles.qrMarkerRightMid },
    { key: 'br', name: 'flask-outline', position: styles.qrMarkerBottomRight },
    { key: 'bm', name: 'document-text-outline', position: styles.qrMarkerBottomMid },
    { key: 'bl', name: 'chatbubbles-outline', position: styles.qrMarkerBottomLeft },
    { key: 'lm', name: 'bulb-outline', position: styles.qrMarkerLeftMid },
  ];

  const renderQrDecorativeFrame = ({ compact = false } = {}) => (
    <View style={[styles.qrDecorativeFrame, compact ? styles.qrDecorativeFrameCompact : styles.qrDecorativeFrameShare]}>
      <Text style={[styles.qrFrameTitle, compact && styles.qrFrameTitleCompact]}>
        {t('profile.scanToConnect')}
      </Text>

      <Text style={[styles.qrFrameSubtitle, compact && styles.qrFrameSubtitleCompact]}>
        {t('profile.qrShareCaption').replace('{name}', user?.fullName || t('common.user'))}
      </Text>

      <View style={[styles.qrFrameInnerCard, compact ? styles.qrFrameInnerCompact : styles.qrFrameInnerShare]}>
        {qrBorderMarkers.map((item, index) => (
          <View key={item.key} style={[styles.qrBorderIcon, item.position]}>
            <Ionicons
              name={item.name}
              size={compact ? moderateScale(12) : moderateScale(18)}
              color={index % 2 === 0 ? '#1E3A8A' : '#2563EB'}
            />
          </View>
        ))}

        <Image
          source={{ uri: getQrImageUrl() }}
          style={[styles.qrFrameImage, compact ? styles.qrFrameImageCompact : styles.qrFrameImageShare]}
          resizeMode="contain"
        />
        <View style={[styles.qrCenterLogoWrap, compact ? styles.qrCenterLogoWrapCompact : styles.qrCenterLogoWrapShare]}>
          <View style={[styles.qrCenterLogoViewport, compact ? styles.qrCenterLogoViewportCompact : styles.qrCenterLogoViewportShare]}>
            <Image
              source={require('../../assets/icon.png')}
              style={[styles.qrCenterLogo, compact && styles.qrCenterLogoCompact]}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );

  const loadUserPosts = useCallback(async (useCache = true) => {
    if (!user?.$id) return;
    
    setLoadingPosts(true);
    setPostsError(null);
    try {
      const posts = await getPostsByUser(user.$id, 20, 0, user?.$id, useCache);
      setUserPosts(posts);
      setPostsLoaded(true);
    } catch (error) {
      setPostsError(error.message);
    } finally {
      setLoadingPosts(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    if (user?.$id && !postsLoaded) {
      loadUserPosts();
    }
  }, [user?.$id, loadUserPosts, postsLoaded]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setImageKey(Date.now());
      
      // Check if there's a post that needs to be refreshed
      const updatedPostId = route?.params?.updatedPostId;
      const updatedReplyCount = route?.params?.updatedReplyCount;
      const updatedPost = route?.params?.updatedPost;
      const paramsToClear = {};
      
      if (updatedPost?.$id) {
        setUserPosts(prevPosts => 
          prevPosts.map(p => 
            p.$id === updatedPost.$id 
              ? { ...p, ...updatedPost }
              : p
          )
        );
        paramsToClear.updatedPost = undefined;
      }

      if (updatedPostId !== undefined && updatedReplyCount !== undefined) {
        // Update the specific post in the list
        setUserPosts(prevPosts => 
          prevPosts.map(p => 
            p.$id === updatedPostId 
              ? { ...p, replyCount: updatedReplyCount }
              : p
          )
        );
        paramsToClear.updatedPostId = undefined;
        paramsToClear.updatedReplyCount = undefined;
      }

      if (Object.keys(paramsToClear).length > 0) {
        navigation.setParams(paramsToClear);
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.updatedPostId, route?.params?.updatedReplyCount]);

  // Posts are always visible, so load them when user is available
  useEffect(() => {
    if (!postsLoaded && user?.$id) {
      loadUserPosts();
    }
  }, [postsLoaded, user?.$id, loadUserPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      setImageKey(Date.now());
      await loadUserPosts(false);
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, loadUserPosts]);

  const handleLike = async (postId) => {
    if (!user?.$id) return;
    
    try {
      const result = await togglePostLike(postId, user.$id);
      
      setUserPosts(prevPosts => 
        prevPosts.map(post => 
          post.$id === postId 
            ? { 
                ...post, 
                likedBy: result.isLiked 
                  ? [...(post.likedBy || []), user.$id]
                  : (post.likedBy || []).filter(id => id !== user.$id),
                likeCount: result.likeCount 
              }
            : post
        )
      );
    } catch (error) {
      // Failed to toggle like
    }
  };

  const handleMarkResolved = async (postId, nextResolvedState) => {
    try {
      await setQuestionResolvedStatus(postId, nextResolvedState);
      
      setUserPosts(prevPosts => 
        prevPosts.map(post => 
          post.$id === postId 
            ? { ...post, isResolved: nextResolvedState }
            : post
        )
      );
    } catch (error) {
      // Failed to mark as resolved
    }
  };

  const handleEditPost = (post) => {
    navigation.navigate('EditPost', { post });
  };

  const handleDeletePost = async (post) => {
    showAlert({
      type: 'warning',
      title: t('common.delete'),
      message: t('post.deleteConfirm'),
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(post.$id, post.imageDeleteUrls);
              setUserPosts(prevPosts => prevPosts.filter(p => p.$id !== post.$id));
              showAlert({ type: 'success', title: t('common.success'), message: t('post.postDeleted') });
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('post.deleteError') });
            }
          },
        },
      ],
    });
  };

  if (isLoading) {
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

  if (!user) {
    const cardBackground = isDarkMode 
      ? 'rgba(255, 255, 255, 0.08)' 
      : 'rgba(255, 255, 255, 0.85)';

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <LinearGradient 
          colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#e3f2fd', '#bbdefb', '#90caf9']} 
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <View 
              style={[
                styles.notSignedInCard, 
                { 
                  backgroundColor: cardBackground,
                  borderRadius: borderRadius.xl,
                  borderWidth: isDarkMode ? 0 : 1,
                  borderColor: 'rgba(0, 0, 0, 0.04)',
                }
              ]}>
              <Ionicons name="person-circle-outline" size={moderateScale(60)} color={theme.primary} />
              <Text style={[styles.notSignedInTitle, { color: theme.text, marginTop: spacing.md }]}>
                {t('profile.notSignedIn') || 'Not Signed In'}
              </Text>
              <Text style={[styles.notSignedInText, { color: theme.textSecondary, marginTop: spacing.xs }]}>
                {t('profile.pleaseSignIn') || 'Please sign in to view your profile'}
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignIn')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={theme.gradient}
                  style={styles.signInButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.signInButtonText}>{t('auth.signIn')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullName || 'User') + '&size=400&background=667eea&color=fff&bold=true';
  
  const avatarUri = user.profilePicture ? user.profilePicture : defaultAvatar;
  
  const stageKey = getStageKey(user.stage);
  const stageTranslation = user.stage ? t(`stages.${stageKey}`) : '';
  const departmentTranslation = user.department ? t(`departments.${user.department}`) : '';
  
  const userProfile = {
    name: user.fullName || 'User',
    email: user.email || '',
    bio: user.bio || t('profile.defaultBio'),
    avatar: avatarUri,
    university: user.university ? t(`universities.${user.university}`) : '',
    college: user.college ? t(`colleges.${user.college}`) : '',
    stage: stageTranslation,
    department: departmentTranslation,
    stats: {
      posts: userPosts.length || user.postsCount || 0,
      followers: user.followersCount || 0,
      following: user.followingCount || 0
    }
  };

  const cardBackground = isDarkMode 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(255, 255, 255, 0.85)';

  const renderAboutSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('profile.about')}</Text>
      <View 
        style={[
          styles.infoCard,
          {
            backgroundColor: cardBackground,
            borderRadius: borderRadius.lg,
            borderWidth: isDarkMode ? 0 : 1,
            borderColor: 'rgba(0, 0, 0, 0.04)',
          }
        ]}>
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
                <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('profile.department')}</Text>
                <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>{userProfile.department}</Text>
              </View>
            </View>
          </>
        )}
        
        {user.$createdAt && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)' }]} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={moderateScale(20)} color={theme.textSecondary} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { fontSize: fontSize(10), color: theme.textSecondary }]}>{t('profile.joinedDate')}</Text>
                <Text style={[styles.infoValue, { fontSize: fontSize(13), color: theme.text }]}>
                  {new Date(user.$createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Social Links - Own profile always visible */}
      {user?.socialLinks && Object.values(user.socialLinks).some(v => v) && (
        <View 
          style={[
            styles.infoCard,
            {
              backgroundColor: cardBackground,
              borderRadius: borderRadius.lg,
              borderWidth: isDarkMode ? 0 : 1,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              marginTop: spacing.md,
            }
          ]}>
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
              const value = user.socialLinks?.[key];
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
        </View>
      )}
    </View>
  );

  const renderPostsSection = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('profile.myPosts')}</Text>
        {loadingPosts ? (
          <View 
            style={[
              styles.emptyCard,
              {
                backgroundColor: cardBackground,
                borderRadius: borderRadius.lg,
                borderWidth: isDarkMode ? 0 : 1,
                borderColor: 'rgba(0, 0, 0, 0.04)',
              }
            ]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.emptyText, { fontSize: fontSize(14), color: theme.textSecondary, marginTop: spacing.sm }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : postsError ? (
          <View 
            style={[
              styles.emptyCard,
              {
                backgroundColor: cardBackground,
                borderRadius: borderRadius.lg,
                borderWidth: isDarkMode ? 0 : 1,
                borderColor: 'rgba(0, 0, 0, 0.04)',
              }
            ]}>
            <Ionicons name="alert-circle-outline" size={moderateScale(40)} color={theme.error} />
            <Text style={[styles.emptyText, { fontSize: fontSize(14), color: theme.textSecondary, marginTop: spacing.sm }]}>
              {t('common.error')}
            </Text>
            <TouchableOpacity onPress={loadUserPosts} style={styles.retryButton}>
              <Text style={[styles.retryButtonText, { color: theme.primary }]}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : !userPosts || userPosts.length === 0 ? (
          <View 
            style={[
              styles.emptyCard,
              {
                backgroundColor: cardBackground,
                borderRadius: borderRadius.lg,
                borderWidth: isDarkMode ? 0 : 1,
                borderColor: 'rgba(0, 0, 0, 0.04)',
              }
            ]}>
            <Ionicons name="document-text-outline" size={moderateScale(40)} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { fontSize: fontSize(14), color: theme.textSecondary, marginTop: spacing.sm }]}>
              {t('profile.noPosts')}
            </Text>
          </View>
        ) : (
          <View>
            {userPosts.map((post, index) => (
              <PostCard
                key={post.$id || index}
                post={{
                  ...post,
                  userName: user.fullName,
                  userProfilePicture: user.profilePicture,
                }}
                onReply={() => navigation.navigate('PostDetails', { post })}
                onLike={() => handleLike(post.$id)}
                onMarkResolved={(nextResolvedState) => handleMarkResolved(post.$id, nextResolvedState)}
                onEdit={() => handleEditPost(post)}
                onDelete={() => handleDeletePost(post)}
                onUserPress={() => {}}
                isOwner={true}
                isLiked={post.likedBy?.includes(user.$id)}
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
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <View style={styles.profileHeader}>
            <View style={styles.headerRightActions}>
              <TouchableOpacity 
                style={[
                  styles.headerActionButton,
                  {
                    backgroundColor: cardBackground,
                    borderRadius: borderRadius.round,
                  }
                ]} 
                onPress={handleShareProfile} 
                activeOpacity={0.7}>
                <Ionicons name="share-outline" size={moderateScale(22)} color={isDarkMode ? '#FFFFFF' : '#1C1C1E'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.headerActionButton,
                  {
                    backgroundColor: cardBackground,
                    borderRadius: borderRadius.round,
                  }
                ]} 
                onPress={() => setShowQRModal(true)} 
                activeOpacity={0.7}>
                <Ionicons name="qr-code-outline" size={moderateScale(22)} color={isDarkMode ? '#FFFFFF' : '#1C1C1E'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.headerActionButton,
                  {
                    backgroundColor: cardBackground,
                    borderRadius: borderRadius.round,
                  }
                ]} 
                onPress={() => navigation.navigate('Settings')} 
                activeOpacity={0.7}>
                <Ionicons name="settings-outline" size={moderateScale(22)} color={isDarkMode ? '#FFFFFF' : '#1C1C1E'} />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={theme.gradient} style={styles.avatarBorder} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={[styles.avatarInner, { backgroundColor: theme.background }]}>
                  <Image 
                    source={{ uri: userProfile.avatar, cache: 'reload' }} 
                    style={styles.avatar}
                    key={`${userProfile.avatar}-${imageKey}`}
                  />
                </View>
              </LinearGradient>
            </View>
            <Text style={[styles.name, { fontSize: fontSize(22), color: isDarkMode ? '#FFFFFF' : '#1C1C1E' }]}>{userProfile.name}</Text>
            {userProfile.bio && <Text style={[styles.bio, { fontSize: fontSize(13), color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(28, 28, 30, 0.8)' }]} numberOfLines={2}>{userProfile.bio}</Text>}
            <View style={[styles.statsContainer, { backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.9)' }]}>
              <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
                <Text style={[styles.statNumber, { fontSize: fontSize(18), color: theme.text }]}>{userProfile.stats.posts}</Text>
                <Text style={[styles.statLabel, { fontSize: fontSize(11), color: theme.textSecondary }]}>{t('profile.posts')}</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity 
                style={styles.statItem} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('FollowList', { 
                  userId: user?.$id, 
                  initialTab: 'followers',
                  userName: user?.name 
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
                  userId: user?.$id, 
                  initialTab: 'following',
                  userName: user?.name 
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
      <View style={styles.hiddenShareCardContainer} pointerEvents="none">
        <View ref={qrShareCardRef} collapsable={false} style={styles.shareCardCaptureRoot}>
          {renderQrDecorativeFrame({ compact: false })}
        </View>
      </View>
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
              <View style={styles.qrModalHeaderSpacer} />
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={moderateScale(24)} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.qrCodeContainer}>
              {renderQrDecorativeFrame({ compact: true })}
            </View>
            <Text style={[styles.qrModalHint, { color: theme.textSecondary }]}>
              {t('profile.qrHint')}
            </Text>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.primary }]}
              onPress={handleShareQr}>
              <Ionicons name="share-outline" size={moderateScale(18)} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>{t('profile.shareProfile')}</Text>
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
  errorText: { 
    fontSize: fontSize(18), 
    fontWeight: '600',
    textAlign: 'center',
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
  notSignedInCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginHorizontal: wp(8),
    maxWidth: wp(85),
  },
  notSignedInTitle: {
    fontSize: fontSize(18),
    fontWeight: '700',
    textAlign: 'center',
  },
  notSignedInText: {
    fontSize: fontSize(14),
    textAlign: 'center',
    lineHeight: fontSize(20),
  },
  signInButton: {
    paddingHorizontal: spacing.xl * 1.5,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(15),
    fontWeight: '700',
  },
  gradient: { flex: 1 }, 
  scrollView: { flex: 1 }, 
  scrollContent: { paddingBottom: hp(6) }, 
  profileHeader: { alignItems: 'center', paddingHorizontal: wp(5), marginBottom: spacing.md, position: 'relative' }, 
  headerRightActions: { position: 'absolute', top: spacing.md, right: wp(5), zIndex: 10, flexDirection: 'row', gap: spacing.xs },
  headerActionButton: { width: moderateScale(40), height: moderateScale(40), justifyContent: 'center', alignItems: 'center' }, 
  avatarContainer: { marginBottom: spacing.sm, marginTop: moderateScale(50) }, 
  avatarBorder: { width: moderateScale(110), height: moderateScale(110), borderRadius: moderateScale(55), padding: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }, 
  avatarInner: { width: moderateScale(104), height: moderateScale(104), borderRadius: moderateScale(52), padding: 3 }, 
  avatar: { width: moderateScale(98), height: moderateScale(98), borderRadius: moderateScale(49) }, 
  name: { fontWeight: '700', marginBottom: spacing.xs / 2, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }, 
  bio: { textAlign: 'center', marginBottom: spacing.md, lineHeight: fontSize(18), paddingHorizontal: wp(5) }, 
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
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  qrModalContent: {
    width: '88%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  qrModalHeaderSpacer: {
    flex: 1,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  qrModalHint: {
    fontSize: fontSize(12),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize(14),
    fontWeight: '600',
  },
  hiddenShareCardContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  shareCardCaptureRoot: {
    width: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    borderWidth: 0,
    paddingHorizontal: 42,
    paddingVertical: 36,
    alignItems: 'center',
  },
  qrDecorativeFrame: {
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  qrDecorativeFrameShare: {
    width: 560,
  },
  qrDecorativeFrameCompact: {
    width: moderateScale(252),
  },
  qrFrameTitle: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  qrFrameTitleCompact: {
    fontSize: fontSize(21),
  },
  qrFrameSubtitle: {
    color: '#475569',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  qrFrameSubtitleCompact: {
    fontSize: fontSize(11),
    marginBottom: spacing.sm,
  },
  qrFrameInnerCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    position: 'relative',
  },
  qrFrameInnerShare: {
    width: 492,
    height: 492,
  },
  qrFrameInnerCompact: {
    width: moderateScale(212),
    height: moderateScale(212),
    borderRadius: borderRadius.lg,
    padding: moderateScale(10),
  },
  qrFrameImage: {
    borderRadius: 18,
  },
  qrFrameImageShare: {
    width: 440,
    height: 440,
  },
  qrFrameImageCompact: {
    width: moderateScale(185),
    height: moderateScale(185),
    borderRadius: borderRadius.md,
  },
  qrCenterLogoWrap: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  qrCenterLogoWrapShare: {
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  qrCenterLogoWrapCompact: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: borderRadius.round,
    borderWidth: 2,
  },
  qrCenterLogoViewport: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCenterLogoViewportShare: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  qrCenterLogoViewportCompact: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: borderRadius.round,
  },
  qrCenterLogo: {
    width: 168,
    height: 168,
    transform: [{ scale: 1 }],
  },
  qrCenterLogoCompact: {
    width: moderateScale(66),
    height: moderateScale(66),
  },
  qrBorderIcon: {
    position: 'absolute',
    zIndex: 5,
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrMarkerTopLeft: {
    top: -12,
    left: -12,
  },
  qrMarkerTopMid: {
    top: -12,
    left: '50%',
    marginLeft: -12,
  },
  qrMarkerTopRight: {
    top: -12,
    right: -12,
  },
  qrMarkerRightMid: {
    top: '50%',
    right: -12,
    marginTop: -12,
  },
  qrMarkerBottomRight: {
    bottom: -12,
    right: -12,
  },
  qrMarkerBottomMid: {
    bottom: -12,
    left: '50%',
    marginLeft: -12,
  },
  qrMarkerBottomLeft: {
    bottom: -12,
    left: -12,
  },
  qrMarkerLeftMid: {
    top: '50%',
    left: -12,
    marginTop: -12,
  },
});

export default Profile;
