import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedAnimated, { FadeInDown } from 'react-native-reanimated';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import AnimatedBackground from '../components/AnimatedBackground';
import SearchBar from '../components/SearchBar';
import FeedSelector from '../components/FeedSelector';
import FilterSortModal, { SORT_OPTIONS, FILTER_TYPES } from '../components/FilterSortModal';
import PostCard from '../components/PostCard';
import CustomAlert from '../components/CustomAlert';
import GreetingBanner from '../components/GreetingBanner';
import { PostCardSkeleton } from '../components/SkeletonLoader';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import RepDetectionPopup from '../components/RepDetectionPopup';
import useRepDetection from '../hooks/useRepDetection';
import {
  wp,
  hp,
  fontSize,
  spacing,
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { FEED_TYPES, getDepartmentsInSameMajor } from '../constants/feedCategories';
import { POST_TYPES } from '../constants/postConstants';
import { getPosts, getPostsByDepartments, getAllPublicPosts, togglePostLike, deletePost, enrichPostsWithUserData, reportPost, incrementPostViewCount, setQuestionResolvedStatus, createRepost } from '../../database/posts';
import { notifyPostLike, getUnreadNotificationCount } from '../../database/notifications';
import { handleNetworkError } from '../utils/networkErrorHandler';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePosts, useNotifications } from '../hooks/useRealtimeSubscription';
import { postsCacheManager } from '../utils/cacheManager';
import { scheduleLocalNotification } from '../../services/pushNotificationService';
import useLayout from '../hooks/useLayout';

const POSTS_PER_PAGE = 15;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const Home = ({ navigation, route }) => {
  const { t, theme, isDarkMode, compactMode, triggerHaptic } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { needsRep, hasActiveElection, dismiss: dismissRepPopup } = useRepDetection(user);
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const [selectedFeed, setSelectedFeed] = useState(FEED_TYPES.DEPARTMENT);
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.NEWEST);
  const [filterType, setFilterType] = useState('all');
  const [answerStatus, setAnswerStatus] = useState('all');
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userInteractions, setUserInteractions] = useState({});
  const [showFilterSortModal, setShowFilterSortModal] = useState(false);
  const [showReportReasonModal, setShowReportReasonModal] = useState(false);
  const [selectedReportPost, setSelectedReportPost] = useState(null);
  const [submittingReportReason, setSubmittingReportReason] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const flatListRef = useRef(null);
  const searchBarRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);
  const lastTapTime = useRef(0);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isVerySmallScreen = width < 340;
  const headerHeight = isVerySmallScreen ? moderateScale(36) : isSmallScreen ? moderateScale(38) : moderateScale(44);
  const actionButtonSize = isVerySmallScreen ? moderateScale(30) : isSmallScreen ? moderateScale(34) : moderateScale(40);
  const headerIconSize = isVerySmallScreen ? moderateScale(14) : isSmallScreen ? moderateScale(16) : moderateScale(18);
  const reportReasonOptions = [
    { key: 'self_harm', labelKey: 'selfHarm', icon: 'medkit-outline', color: '#DC2626', severityKey: 'critical' },
    { key: 'violence', labelKey: 'violence', icon: 'warning-outline', color: '#EF4444', severityKey: 'high' },
    { key: 'hate_speech', labelKey: 'hateSpeech', icon: 'ban-outline', color: '#B91C1C', severityKey: 'high' },
    { key: 'harassment', labelKey: 'harassment', icon: 'hand-left-outline', color: '#F97316', severityKey: 'high' },
    { key: 'misinformation', labelKey: 'misinformation', icon: 'alert-circle-outline', color: '#F59E0B', severityKey: 'medium' },
    { key: 'copyright', labelKey: 'copyright', icon: 'document-text-outline', color: '#8B5CF6', severityKey: 'medium' },
    { key: 'inappropriate', labelKey: 'inappropriate', icon: 'eye-off-outline', color: '#3B82F6', severityKey: 'medium' },
    { key: 'spam', labelKey: 'spam', icon: 'mail-unread-outline', color: '#0EA5E9', severityKey: 'low' },
    { key: 'other', labelKey: 'other', icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280', severityKey: 'low' },
    { key: 'dont_like', labelKey: 'dontLike', icon: 'chatbubble-ellipses-outline', color: '#64748B', severityKey: 'feedback' },
  ];
  const headerTop = insets.top + (isSmallScreen ? spacing.xs : spacing.sm);
  const listTopPadding = headerHeight + spacing.md;
  const loadingTopPadding = listTopPadding + spacing.xl;

  // Real-time subscription for new/updated posts
  const handleRealtimePostUpdate = useCallback(async (payload) => {
    // Invalidate posts cache since data changed
    await postsCacheManager.invalidateSinglePost(payload.$id);
    
    // Check if this post matches current filters
    const matchesFeed = 
      selectedFeed === FEED_TYPES.PUBLIC ||
      (selectedFeed === FEED_TYPES.DEPARTMENT && payload.department === user?.department) ||
      (selectedFeed === FEED_TYPES.MAJOR && getDepartmentsInSameMajor(user?.department).includes(payload.department));
    
    const matchesStage = selectedStage === 'all' || payload.stage === selectedStage;

    if (matchesFeed && matchesStage) {
      setPosts(prev => {
        // Check if post already exists (update case)
        const existingIndex = prev.findIndex(p => p.$id === payload.$id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...prev[existingIndex], ...payload };
          return updated;
        }
        // New post - add to beginning
        return [payload, ...prev];
      });
    }
  }, [selectedFeed, selectedStage, user?.department]);

  const handleRealtimePostDelete = useCallback(async (payload) => {
    // Invalidate posts cache since data changed
    await postsCacheManager.invalidateSinglePost(payload.$id);
    setPosts(prev => prev.filter(p => p.$id !== payload.$id));
  }, []);

  // Subscribe to real-time post updates
  usePosts(
    user?.department,
    handleRealtimePostUpdate,
    handleRealtimePostDelete,
    !!user?.department
  );

  useEffect(() => {
    if (user && user.department) {
      loadPosts(true);
    }
  }, [selectedFeed, selectedStage, sortBy, filterType, answerStatus, user]);

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (user?.$id) {
        try {
          const count = await getUnreadNotificationCount(user.$id);
          setUnreadNotifications(count);
        } catch (error) {
          // Failed to load notification count
        }
      }
    };
    loadUnreadCount();

    // Refresh count and check for post updates when screen is focused
    const unsubscribe = navigation.addListener('focus', async () => {
      loadUnreadCount();
      
      // Check if there's a post that needs to be refreshed
      const updatedPostId = route?.params?.updatedPostId;
      const updatedReplyCount = route?.params?.updatedReplyCount;
      const updatedPost = route?.params?.updatedPost;
      const paramsToClear = {};

      if (updatedPost?.$id) {
        setPosts(prevPosts => 
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
        setPosts(prevPosts => 
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
    
    return () => {
      unsubscribe();
    };
  }, [user?.$id, navigation, route]);

  // Real-time notification subscription for badge updates
  const handleNewNotification = useCallback((notification) => {
    // Increment unread count
    setUnreadNotifications(prev => prev + 1);
    
    // Show local notification if app is in foreground
    const getNotificationTitle = (type, senderName) => {
      switch (type) {
        case 'post_like':
          return `${senderName} ${t('notifications.likedPost') || 'liked your post'}`;
        case 'post_reply':
          return `${senderName} ${t('notifications.repliedPost') || 'replied to your post'}`;
        case 'follow':
          return `${senderName} ${t('notifications.startedFollowing') || 'started following you'}`;
        case 'mention':
          return `${senderName} ${t('notifications.mentionedYou') || 'mentioned you'}`;
        case 'department_post':
          return `${senderName} ${t('notifications.departmentPost') || 'posted in your department'}`;
        default:
          return t('notifications.title') || 'New notification';
      }
    };

    // Schedule local notification
    scheduleLocalNotification({
      title: t('notifications.title') || 'New Notification',
      body: getNotificationTitle(notification.type, notification.senderName),
      data: {
        type: notification.type,
        postId: notification.postId,
        userId: notification.senderId,
      },
      channelId: notification.type === 'follow' ? 'social' : 'posts',
    });
  }, [t]);

  // Subscribe to real-time notification updates
  useNotifications(user?.$id, handleNewNotification, null, !!user?.$id);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
        e.preventDefault();
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setTimeout(() => {
          handleRefresh();
        }, 300);
      }
      lastTapTime.current = now;
    });

    return unsubscribe;
  }, [navigation]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY <= 50 && !headerVisible.current) {
          // Near top - always show header
          headerVisible.current = true;
          headerTranslateY.stopAnimation();
          Animated.spring(headerTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
          }).start();
        } else if (diff > 8 && currentScrollY > 50 && headerVisible.current) {
          // Scrolling down fast enough - hide header
          headerVisible.current = false;
          headerTranslateY.stopAnimation();
          Animated.timing(headerTranslateY, {
            toValue: -120,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else if (diff < -3 && currentScrollY > 50 && !headerVisible.current) {
          // Scrolling up even slightly - show header immediately
          headerVisible.current = true;
          headerTranslateY.stopAnimation();
          Animated.spring(headerTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start();
        }

        // Show/hide scroll to top button
        const shouldShow = currentScrollY > 300;
        if (shouldShow !== showScrollToTop) {
          setShowScrollToTop(shouldShow);
          Animated.timing(scrollToTopOpacity, {
            toValue: shouldShow ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  const loadPosts = async (reset = false, options = {}) => {
    if (!user || !user.department) {
      return;
    }

    const { forceNetwork = false } = options;
    const useCache = !forceNetwork;

    const currentPage = reset ? 0 : page;
    const loadingState = reset ? setIsLoadingPosts : setIsLoadingMore;

    loadingState(true);

    try {
      let fetchedPosts = [];
      const offset = currentPage * POSTS_PER_PAGE;

      const resolvedAnswerStatus = filterType === FILTER_TYPES.UNANSWERED_QUESTIONS
        ? 'unanswered'
        : answerStatus;
      const resolvedFilterType = filterType === FILTER_TYPES.UNANSWERED_QUESTIONS
        ? POST_TYPES.QUESTION
        : filterType;
      const blockedUsers = user?.blockedUsers || [];

      if (selectedFeed === FEED_TYPES.DEPARTMENT) {
        const shouldForceQuestion = resolvedAnswerStatus !== 'all' && resolvedFilterType !== POST_TYPES.QUESTION;
        const filters = {
          department: user.department,
          postType: shouldForceQuestion ? POST_TYPES.QUESTION : resolvedFilterType,
          answerStatus: resolvedAnswerStatus,
        };
        if (selectedStage !== 'all') {
          filters.stage = selectedStage;
        }
        fetchedPosts = await getPosts(filters, POSTS_PER_PAGE, offset, useCache, sortBy, blockedUsers, user?.$id);
      } else if (selectedFeed === FEED_TYPES.MAJOR) {
        const relatedDepartments = getDepartmentsInSameMajor(user.department);
        fetchedPosts = await getPostsByDepartments(
          relatedDepartments,
          selectedStage,
          POSTS_PER_PAGE,
          offset,
          useCache,
          sortBy,
          resolvedFilterType,
          resolvedAnswerStatus,
          blockedUsers,
          user?.$id
        );
      } else if (selectedFeed === FEED_TYPES.PUBLIC) {
        fetchedPosts = await getAllPublicPosts(
          selectedStage,
          POSTS_PER_PAGE,
          offset,
          useCache,
          sortBy,
          resolvedFilterType,
          resolvedAnswerStatus,
          blockedUsers,
          user?.$id
        );
      }

      // Enrich posts with user data for those missing userName
      const enrichedPosts = await enrichPostsWithUserData(fetchedPosts);

      // Filter out posts from blocked users
      const filteredPosts = Array.isArray(blockedUsers) && blockedUsers.length > 0
        ? enrichedPosts.filter(p => {
            const isBlocked = blockedUsers.includes(p.userId);
            return !isBlocked;
          })
        : enrichedPosts;

      if (reset) {
        setPosts(filteredPosts);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...filteredPosts]);
        setPage(prev => prev + 1);
      }

      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      const errorInfo = handleNetworkError(error);
      showAlert(
        errorInfo.isNetworkError ? t('error.noInternet') : t('error.title'),
        t(errorInfo.messageKey) || errorInfo.fallbackMessage,
        [{ text: t('common.ok') }]
      );
    } finally {
      loadingState(false);
      if (reset) setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPosts(true, { forceNetwork: true });
  }, [selectedFeed, selectedStage, sortBy, filterType, answerStatus, user]);

  const handleScrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoadingPosts) {
      loadPosts(false);
    }
  };

  const handleUserPress = (userData) => {
    navigation.navigate('UserProfile', { userId: userData.$id });
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const handleFeedChange = (feedType) => {
    if (feedType === selectedFeed) {
      return;
    }

    setSelectedFeed(feedType);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    setIsLoadingPosts(true);
  };

  const handleStageChange = (stage) => {
    setSelectedStage(stage);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    setIsLoadingPosts(true);
  };

  const handleSortChange = (sort) => {
    if (sort !== sortBy) {
      setSortBy(sort);
      setPosts([]);
      setPage(0);
      setHasMore(true);
      setIsLoadingPosts(true);
    }
  };

  const handleFilterTypeChange = (type) => {
    if (type !== filterType) {
      setFilterType(type);

      if (type === FILTER_TYPES.UNANSWERED_QUESTIONS) {
        setAnswerStatus('unanswered');
      } else if (type !== POST_TYPES.QUESTION && answerStatus !== 'all') {
        setAnswerStatus('all');
      }

      setPosts([]);
      setPage(0);
      setHasMore(true);
      setIsLoadingPosts(true);
    }
  };

  const handleAnswerStatusChange = (status) => {
    if (status !== answerStatus) {
      setAnswerStatus(status);

      if (status !== 'all' && filterType !== POST_TYPES.QUESTION && filterType !== FILTER_TYPES.UNANSWERED_QUESTIONS) {
        setFilterType(POST_TYPES.QUESTION);
      }

      if (filterType === FILTER_TYPES.UNANSWERED_QUESTIONS && status !== 'unanswered') {
        setFilterType(POST_TYPES.QUESTION);
      }

      setPosts([]);
      setPage(0);
      setHasMore(true);
      setIsLoadingPosts(true);
    }
  };

  const viewedPostsRef = useRef(new Set());

  const markPostAsViewed = async (postId) => {
    if (!user?.$id || !postId || viewedPostsRef.current.has(postId)) return;
    
    viewedPostsRef.current.add(postId);
    
    setUserInteractions(prev => ({
      ...prev,
      [postId]: { ...prev[postId], viewed: true }
    }));

    try {
      await incrementPostViewCount(postId, user.$id);
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.$id === postId
            ? { ...post, viewCount: (post.viewCount || 0) + 1 }
            : post
        )
      );
    } catch (error) {
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    viewableItems.forEach(({ item }) => {
      if (item?.$id && item.userId !== user?.$id) {
        markPostAsViewed(item.$id);
      }
    });
  }, [user?.$id]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  }).current;

  const handleLike = async (postId) => {
    if (!user?.$id) return;

    try {
      triggerHaptic('selection');
      const result = await togglePostLike(postId, user.$id);

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.$id === postId
            ? {
              ...post,
              likedBy: result.likedBy || (result.isLiked
                ? [...(post.likedBy || []), user.$id]
                : (post.likedBy || []).filter(id => id !== user.$id)),
              likeCount: result.likeCount
            }
            : post
        )
      );

      // Send notification if the post was liked (not unliked) and it's not the user's own post
      if (result.isLiked) {
        const likedPost = posts.find(p => p.$id === postId);
        if (likedPost && likedPost.userId !== user.$id) {
          try {
            await notifyPostLike(
              likedPost.userId,
              user.$id,
              user.fullName || user.name,
              user.profilePicture,
              postId,
              likedPost.topic || likedPost.text
            );
          } catch (notifyError) {
            // Silent fail for notification
          }
        }
      }
    } catch (error) {
      const errorInfo = handleNetworkError(error);
      showAlert(
        errorInfo.isNetworkError ? t('error.noInternet') : t('error.title'),
        t(errorInfo.messageKey) || errorInfo.fallbackMessage,
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleEditPost = (post) => {
    navigation.navigate('EditPost', { post });
  };

  const handleMarkResolved = async (postId, nextResolvedState) => {
    try {
      await setQuestionResolvedStatus(postId, nextResolvedState);
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.$id === postId 
            ? { ...post, isResolved: nextResolvedState }
            : post
        )
      );
      
      showAlert(
        t('common.success'),
        nextResolvedState ? t('post.markedAsResolved') : t('post.markedAsUnanswered'),
        'success'
      );
    } catch (error) {
      const errorInfo = handleNetworkError(error);
      showAlert(
        errorInfo.isNetworkError ? t('error.noInternet') : t('error.title'),
        t(errorInfo.messageKey) || errorInfo.fallbackMessage,
        [{ text: t('common.ok') }]
      );
    }
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
              triggerHaptic('warning');
              await deletePost(post.$id, post.imageDeleteUrls);
              setPosts(prevPosts => prevPosts.filter(p => p.$id !== post.$id));
              showAlert({ type: 'success', title: t('common.success'), message: t('post.postDeleted') });
            } catch (error) {
              const errorInfo = handleNetworkError(error);
              showAlert({
                type: 'error',
                title: errorInfo.isNetworkError ? t('error.noInternet') : t('error.title'),
                message: t(errorInfo.messageKey) || errorInfo.fallbackMessage,
              });
            }
          },
        },
      ],
    });
  };

  const handleReportPost = async (post, reason = null) => {
    if (!user?.$id) return;

    // If no reason provided, show reason selection first
    if (!reason) {
      setSelectedReportPost(post);
      setShowReportReasonModal(true);
      return;
    }

    // Submit the report with reason
    try {
      setSubmittingReportReason(true);
      const result = await reportPost(post.$id, user.$id, reason);
      if (result?.moderationStatePersisted === false) {
        console.warn('[Home] Report saved but moderation fields were not persisted on post document', {
          postId: post.$id,
          reason,
          userId: user.$id,
        });
      }
      if (result.alreadyReported) {
        showAlert(t('common.info'), t('post.alreadyReported'), 'info');
      } else if (result.treatedAsFeedback) {
        showAlert(t('common.info'), t('post.reportFeedbackSaved'), 'info');
      } else {
        showAlert(t('common.success'), t('post.reportSuccessPolicy'), 'success');
        if (result.isHidden) {
          setPosts(prevPosts => prevPosts.filter(p => p.$id !== post.$id));
        }
      }
    } catch (error) {
      const errorInfo = handleNetworkError(error);
      console.error('[Home] Report submission failed', {
        postId: post?.$id,
        reason,
        userId: user?.$id,
        message: error?.message,
      });
      const message = error?.message === 'Users cannot report their own posts'
        ? t('post.cannotReportOwnPost')
        : t('post.reportError');
      showAlert(
        errorInfo.isNetworkError ? t('error.noInternet') : t('error.title'),
        message,
        [{ text: t('common.ok') }]
      );
    } finally {
      setSubmittingReportReason(false);
      setShowReportReasonModal(false);
      setSelectedReportPost(null);
    }
  };

  const handleRepost = async (post) => {
    if (!user?.$id || !post?.$id) return;

    try {
      triggerHaptic('light');
      const result = await createRepost(post.$id, user.$id, {
        userName: user.fullName || user.name,
        profilePicture: user.profilePicture || null,
        department: user.department || post.department,
        stage: user.stage || post.stage,
        postType: post.postType,
        canOthersRepost: true,
      });

      if (result?.alreadyReposted) {
        showAlert(t('common.info'), t('post.alreadyReposted') || 'You already reposted this post', 'info');
        return;
      }

      if (result?.post) {
        setPosts(prevPosts => {
          const alreadyInFeed = prevPosts.some(existing => existing.$id === result.post.$id);
          return alreadyInFeed ? prevPosts : [result.post, ...prevPosts];
        });
      }

      showAlert(t('common.success'), t('post.repostSuccess') || 'Post reposted successfully', 'success');
    } catch (error) {
      const message = error?.message === 'Repost is not allowed for this post'
        ? (t('post.repostNotAllowed') || 'Reposting is not allowed for this post')
        : (t('post.repostError') || 'Failed to repost');

      showAlert(t('common.error'), message, 'error');
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const renderFeedContent = () => {
    if (isLoadingPosts) {
      return (
        <View style={[styles.feedContent, { paddingTop: loadingTopPadding }]}>
          <View style={styles.postContainer}>
            <PostCardSkeleton />
          </View>
          <View style={styles.postContainer}>
            <PostCardSkeleton />
          </View>
          <View style={styles.postContainer}>
            <PostCardSkeleton />
          </View>
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <UnifiedEmptyState
          iconName={
            selectedFeed === FEED_TYPES.DEPARTMENT
              ? 'people-outline'
              : selectedFeed === FEED_TYPES.MAJOR
                ? 'school-outline'
                : 'globe-outline'
          }
          title={t('feed.noPosts')}
          description={
            selectedFeed === FEED_TYPES.DEPARTMENT
              ? t('home.departmentFeedEmpty')
              : selectedFeed === FEED_TYPES.MAJOR
                ? t('home.majorFeedEmpty')
                : t('home.publicFeedEmpty')
          }
          actionLabel={t('common.retry')}
          actionIconName="refresh-outline"
          onAction={handleRefresh}
        />
      );
    }

    // Defensive: filter blocked users at render time too (catches stale state)
    const blockedSet = new Set(user?.blockedUsers || []);
    const visiblePosts = blockedSet.size > 0
      ? posts.filter(p => !blockedSet.has(p.userId))
      : posts;

    return (
      <AnimatedFlatList
        ref={flatListRef}
        data={visiblePosts}
        keyExtractor={(item) => item.$id}
        renderItem={({ item, index }) => (
          <ReanimatedAnimated.View
            entering={FadeInDown.delay(index * 60).duration(400).springify()}
          >
            <View style={styles.postContainer}>
              <PostCard
              post={item}
              onUserPress={() => handleUserPress({ $id: item.userId })}
              onLike={() => handleLike(item.$id)}
              onReply={() => handlePostPress(item)}
              onEdit={() => handleEditPost(item)}
              onDelete={() => handleDeletePost(item)}
              onReport={() => handleReportPost(item)}
              onRepost={() => handleRepost(item)}
              onMarkResolved={(nextResolvedState) => handleMarkResolved(item.$id, nextResolvedState)}
              onTagPress={(tag) => searchBarRef.current?.openWithQuery(`#${tag}`)}
              isLiked={item.likedBy?.includes(user?.$id)}
              isOwner={item.userId === user?.$id}
              compact={compactMode}
            />
            </View>
          </ReanimatedAnimated.View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.postsListContent, { paddingTop: listTopPadding }, contentStyle]}
        ListHeaderComponent={<GreetingBanner />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={11}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        removeClippedSubviews={Platform.OS === 'android'}
      />
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
          : ['#FFFEF7', '#FFF9E6', '#FFF4D6']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>

        <AnimatedBackground particleCount={18} />

        <View style={[styles.content, { paddingTop: headerTop }]}>
          <Animated.View
            style={[
              styles.headerRow,
              {
                top: headerTop,
                height: headerHeight,
                paddingHorizontal: wp(isVerySmallScreen ? 1 : isSmallScreen ? 2 : 3),
                gap: isVerySmallScreen ? 2 : isSmallScreen ? spacing.xs * 0.5 : spacing.xs,
                transform: [{ translateY: headerTranslateY }],
              }
            ]}
          >
            <View style={[styles.searchIconButton, { width: headerHeight, height: headerHeight }]}>
              <SearchBar
                ref={searchBarRef}
                iconOnly={true}
                onUserPress={handleUserPress}
                onPostPress={handlePostPress}
              />
            </View>

            <View style={[styles.feedSelectorWrapper, { height: headerHeight }]}>
              <FeedSelector
                selectedFeed={selectedFeed}
                onFeedChange={handleFeedChange}
                height={headerHeight}
              />
            </View>

            <TouchableOpacity
              style={[styles.sortButton, { height: actionButtonSize, width: actionButtonSize }]}
              onPress={() => setShowFilterSortModal(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('home.filterSort')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View
                style={[
                  styles.sortContainer,
                  {
                    width: actionButtonSize,
                    height: actionButtonSize,
                    backgroundColor: (sortBy !== SORT_OPTIONS.NEWEST || filterType !== 'all' || selectedStage !== 'all')
                      || answerStatus !== 'all'
                      ? (isDarkMode ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)')
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'),
                    borderWidth: 0.5,
                    borderColor: (sortBy !== SORT_OPTIONS.NEWEST || filterType !== 'all' || selectedStage !== 'all')
                      || answerStatus !== 'all'
                      ? theme.primary + '40'
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'),
                  }
                ]}
              >
                <Ionicons 
                  name="options-outline" 
                  size={headerIconSize} 
                  color={(sortBy !== SORT_OPTIONS.NEWEST || filterType !== 'all' || selectedStage !== 'all') || answerStatus !== 'all' ? theme.primary : theme.text} 
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notificationButton, { height: actionButtonSize, width: actionButtonSize }]}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View
                style={[
                  styles.notificationContainer,
                  {
                    width: actionButtonSize,
                    height: actionButtonSize,
                    backgroundColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.04)',
                    borderWidth: 0.5,
                    borderColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.08)',
                  }
                ]}
              >
                <Ionicons name="notifications-outline" size={headerIconSize} color={theme.text} />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.feedContent}>
            {renderFeedContent()}
          </View>
        </View>
      </LinearGradient>

      <FilterSortModal
        visible={showFilterSortModal}
        onClose={() => setShowFilterSortModal(false)}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        filterType={filterType}
        onFilterTypeChange={handleFilterTypeChange}
        answerStatus={answerStatus}
        onAnswerStatusChange={handleAnswerStatusChange}
        selectedStage={selectedStage}
        onStageChange={handleStageChange}
      />

      <Modal
        visible={showReportReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!submittingReportReason) {
            setShowReportReasonModal(false);
            setSelectedReportPost(null);
          }
        }}
      >
        <View style={styles.reportModalOverlay}>
          <View style={[styles.reportModalCard, { backgroundColor: theme.card || theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.reportModalHeader}>
              <View style={styles.reportModalHeaderTextWrap}>
                <Text style={[styles.reportModalTitle, { color: theme.text }]}>{t('post.reportPost')}</Text>
                <Text style={[styles.reportModalSubtitle, { color: theme.textSecondary }]}>{t('report.modalSubtitle')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!submittingReportReason) {
                    setShowReportReasonModal(false);
                    setSelectedReportPost(null);
                  }
                }}
                style={styles.reportModalCloseBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={moderateScale(18)} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reportReasonsScroll} showsVerticalScrollIndicator={false}>
              {reportReasonOptions.map((reason) => (
                <TouchableOpacity
                  key={reason.key}
                  style={[styles.reportReasonItem, { borderColor: theme.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                  activeOpacity={0.8}
                  disabled={submittingReportReason}
                  onPress={() => {
                    if (selectedReportPost) {
                      handleReportPost(selectedReportPost, reason.key);
                    }
                  }}
                >
                  <View style={[styles.reportReasonIconWrap, { backgroundColor: `${reason.color}20` }]}>
                    <Ionicons name={reason.icon} size={moderateScale(16)} color={reason.color} />
                  </View>
                  <View style={styles.reportReasonTextWrap}>
                    <Text style={[styles.reportReasonTitle, { color: theme.text }]}>{t(`report.${reason.labelKey}`)}</Text>
                    <Text style={[styles.reportReasonDescription, { color: theme.textSecondary }]} numberOfLines={2}>{t(`report.description.${reason.key}`)}</Text>
                  </View>
                  <View style={[styles.reportReasonPriorityBadge, { backgroundColor: isDarkMode ? `${reason.color}25` : `${reason.color}18` }]}>
                    <Text style={[styles.reportReasonPriorityText, { color: reason.color }]}>{t(`report.priority.${reason.severityKey}`)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {submittingReportReason ? (
              <View style={styles.reportSubmittingWrap}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.reportSubmittingText, { color: theme.textSecondary }]}>{t('report.submitting')}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Scroll to Top Button */}
      <Animated.View
        style={[
          styles.scrollToTopButton,
          {
            opacity: scrollToTopOpacity,
            transform: [{
              scale: scrollToTopOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            }],
          }
        ]}
        pointerEvents={showScrollToTop ? 'auto' : 'none'}
      >
        <TouchableOpacity
          onPress={handleScrollToTop}
          activeOpacity={0.8}
          style={[
            styles.scrollToTopTouchable,
            {
              backgroundColor: theme.primary,
            }
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('home.scrollToTop') || t('common.goBack')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-up" size={moderateScale(22)} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
      <RepDetectionPopup
        visible={needsRep}
        hasActiveElection={hasActiveElection}
        onVote={() => {
          dismissRepPopup();
          navigation.navigate('RepVoting', { department: user?.department, stage: user?.stage });
        }}
        onDismiss={dismissRepPopup}
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
  content: {
    flex: 1,
    paddingBottom: hp(2),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchIconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedSelectorWrapper: {
    flex: 1,
    minWidth: wp(42),
  },
  sortButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  notificationButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  notificationBadge: {
    position: 'absolute',
    top: moderateScale(2),
    right: moderateScale(2),
    backgroundColor: '#EF4444',
    borderRadius: moderateScale(10),
    minWidth: moderateScale(16),
    height: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(3),
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize(9),
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: wp(4),
    marginBottom: spacing.sm,
  },
  feedSelectorSection: {
    paddingHorizontal: wp(4),
    marginBottom: spacing.sm,
  },
  filterSection: {
    paddingHorizontal: wp(4),
  },
  feedContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontWeight: '500',
  },
  emptyStateCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    width: '100%',
    maxWidth: moderateScale(400),
  },
  emptyIconContainer: {
    width: moderateScale(130),
    height: moderateScale(130),
    borderRadius: moderateScale(65),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyMessage: {
    textAlign: 'center',
    lineHeight: fontSize(22),
    opacity: 0.9,
  },
  postContainer: {
    paddingHorizontal: wp(4),
    marginBottom: spacing.md,
  },
  postsListContent: {
    paddingBottom: hp(6),
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: hp(12),
    right: wp(5),
    zIndex: 100,
  },
  scrollToTopTouchable: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  reportModalCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    maxHeight: hp(75),
    padding: spacing.md,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reportModalHeaderTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  reportModalTitle: {
    fontSize: fontSize(18),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  reportModalSubtitle: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
  },
  reportModalCloseBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportReasonsScroll: {
    marginTop: spacing.xs,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  reportReasonIconWrap: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportReasonTextWrap: {
    flex: 1,
  },
  reportReasonTitle: {
    fontSize: fontSize(14),
    fontWeight: '700',
    marginBottom: spacing.xs * 0.4,
  },
  reportReasonDescription: {
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
  },
  reportReasonPriorityBadge: {
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs * 0.6,
  },
  reportReasonPriorityText: {
    fontSize: fontSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reportSubmittingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  reportSubmittingText: {
    fontSize: fontSize(12),
    fontWeight: '500',
  },
});

export default Home;