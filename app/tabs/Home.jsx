import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedAnimated, { FadeInDown } from 'react-native-reanimated';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import SearchBar from '../components/SearchBar';
import FeedSelector from '../components/FeedSelector';
import FilterSortModal, { SORT_OPTIONS, FILTER_TYPES } from '../components/FilterSortModal';
import PostCard from '../components/PostCard';
import CustomAlert from '../components/CustomAlert';
import { GlassIconButton, GlassModalCard } from '../components/GlassComponents';
import GreetingBanner from '../components/GreetingBanner';
import SuggestedFriendsCard from '../components/home/SuggestedFriendsCard';
import { PostCardSkeleton } from '../components/SkeletonLoader';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import RepDetectionPopup from '../components/RepDetectionPopup';
import TutorialHighlight from '../components/tutorial/TutorialHighlight';
import ScreenTutorialCard from '../components/tutorial/ScreenTutorialCard';
import useRepDetection from '../hooks/useRepDetection';
import useScreenTutorial from '../hooks/useScreenTutorial';
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
import { ACADEMIC_OTHER_KEY, hasAcademicOtherSelection } from '../utils/academicSelection';
import { isGuest } from '../utils/guestUtils';
import { sortPostsByScore } from '../utils/postRanking';
import { REFRESH_TOPICS, subscribeToRefreshTopic } from '../utils/dataRefreshBus';
import telemetry from '../utils/telemetry';
import { hasActiveHomeFilters, shouldScheduleRealtimeNotification } from '../utils/uiStateHelpers';
import { formatNotificationBadgeCount } from '../utils/notificationUiHelpers';
import {
  OptionsIcon,
  NotificationsIcon,
  CloseIcon,
  ArrowUpIcon,
  PeopleIcon,
  SchoolHomeIcon,
  GlobeIcon,
  RefreshIcon,
  MedkitIcon,
  WarningIcon,
  BanIcon,
  HandLeftIcon,
  AlertCircleHomeIcon,
  DocumentTextIcon,
  EyeOffHomeIcon,
  MailUnreadIcon,
  EllipsisHorizontalCircleIcon,
  ChatbubbleEllipsesIcon,
} from '../components/icons/home';

const POSTS_PER_PAGE = 15;
const AnimatedFlatList = Animated.createAnimatedComponent(FlashList);
const homeFeedViewportCache = new Map();

const reportReasonIconMap = {
  'medkit-outline': MedkitIcon,
  'warning-outline': WarningIcon,
  'ban-outline': BanIcon,
  'hand-left-outline': HandLeftIcon,
  'alert-circle-outline': AlertCircleHomeIcon,
  'document-text-outline': DocumentTextIcon,
  'eye-off-outline': EyeOffHomeIcon,
  'mail-unread-outline': MailUnreadIcon,
  'ellipsis-horizontal-circle-outline': EllipsisHorizontalCircleIcon,
  'chatbubble-ellipses-outline': ChatbubbleEllipsesIcon,
};

const emptyStateIconMap = {
  'people-outline': PeopleIcon,
  'school-outline': SchoolHomeIcon,
  'globe-outline': GlobeIcon,
};

const Home = ({ navigation, route }) => {
  const {
    t,
    theme,
    isDarkMode,
    isRTL,
    compactMode,
    reduceMotion,
    motionProfile,
    densityProfile,
    triggerHaptic,
  } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { needsRep, hasActiveElection, dismiss: dismissRepPopup } = useRepDetection(user);
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const isGuestUser = isGuest(user);
  const [selectedFeed, setSelectedFeed] = useState(isGuestUser ? FEED_TYPES.PUBLIC : FEED_TYPES.DEPARTMENT);
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
  const [showFilterSortModal, setShowFilterSortModal] = useState(false);
  const [showReportReasonModal, setShowReportReasonModal] = useState(false);
  const [selectedReportPost, setSelectedReportPost] = useState(null);
  const [submittingReportReason, setSubmittingReportReason] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const flatListRef = useRef(null);
  const searchBarRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const hasAppliedViewportRef = useRef(false);
  const lastLoadedFeedSignatureRef = useRef('');
  const loadGenerationRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);
  const lastTapTime = useRef(0);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isVerySmallScreen = width < 340;
  const headerScale = densityProfile?.headerScale || 1;
  const iconScale = densityProfile?.iconScale || 1;
  const listGapScale = densityProfile?.listGapScale || 1;
  const headerHeight = (isVerySmallScreen ? moderateScale(36) : isSmallScreen ? moderateScale(38) : moderateScale(44)) * headerScale;
  const actionButtonSize = (isVerySmallScreen ? moderateScale(30) : isSmallScreen ? moderateScale(34) : moderateScale(40)) * headerScale;
  const headerIconSize = (isVerySmallScreen ? moderateScale(14) : isSmallScreen ? moderateScale(16) : moderateScale(18)) * iconScale;
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
  const headerTop = insets.top + (isSmallScreen ? spacing.xs : spacing.sm) * (compactMode ? 0.8 : 1);
  const listTopPadding = headerHeight + spacing.md * listGapScale;
  const loadingTopPadding = listTopPadding + spacing.xl * listGapScale;
  const isAcademicOtherUser = hasAcademicOtherSelection({
    university: user?.university,
    college: user?.college,
    department: user?.department,
  });
  const scopedDepartment = isAcademicOtherUser ? ACADEMIC_OTHER_KEY : user?.department;
  const hasActiveFilters = hasActiveHomeFilters({
    sortBy,
    defaultSortBy: SORT_OPTIONS.NEWEST,
    filterType,
    defaultFilterType: 'all',
    selectedStage,
    defaultStage: 'all',
    answerStatus,
    defaultAnswerStatus: 'all',
  });
  const notificationBadgeText = formatNotificationBadgeCount(unreadNotifications);
  const requiresDepartmentContext = selectedFeed !== FEED_TYPES.PUBLIC;
  const feedLoadSignature = JSON.stringify({
    userId: user?.$id || '',
    scopedDepartment: scopedDepartment || '',
    selectedFeed,
    selectedStage,
    sortBy,
    filterType,
    answerStatus,
    blockedUsers: [...(user?.blockedUsers || [])].sort(),
  });

  const guestTutorialSteps = useMemo(() => ([
    {
      target: 'search',
      title: t('tutorial.home.searchTitle', 'Search'),
      description: t('tutorial.guest.searchDescription', 'Find public posts and groups easily.'),
    },
    {
      target: 'notifications',
      title: t('tutorial.home.notificationsTitle', 'Notifications'),
      description: t('tutorial.guest.notificationsDescription', 'Check notifications for related posts.'),
    },
    {
      target: 'posts',
      title: t('tutorial.home.postsTitle', 'Read Posts'),
      description: t('tutorial.guest.postsDescription', 'See what students and other guests are sharing.'),
    },
  ]), [t]);

  const studentTutorialSteps = useMemo(() => ([
    {
      target: 'search',
      title: t('tutorial.home.searchTitle'),
      description: t('tutorial.home.searchDescription'),
    },
    {
      target: 'feedSelector',
      title: t('tutorial.home.feedTitle'),
      description: t('tutorial.home.feedDescription'),
    },
    {
      target: 'filter',
      title: t('tutorial.home.filterTitle'),
      description: t('tutorial.home.filterDescription'),
    },
    {
      target: 'notifications',
      title: t('tutorial.home.notificationsTitle'),
      description: t('tutorial.home.notificationsDescription'),
    },
    {
      target: 'posts',
      title: t('tutorial.home.postsTitle'),
      description: t('tutorial.home.postsDescription'),
    },
  ]), [t]);

  const tutorial = useScreenTutorial(isGuestUser ? 'home_guest' : 'home', isGuestUser ? guestTutorialSteps : studentTutorialSteps);

  // Real-time subscription for new/updated posts
  const handleRealtimePostUpdate = useCallback(async (payload) => {
    // Invalidate posts cache since data changed
    await postsCacheManager.invalidateSinglePost(payload.$id);
    
    // Check if this post matches current filters
    const matchesFeed = 
      selectedFeed === FEED_TYPES.PUBLIC ||
      (selectedFeed === FEED_TYPES.DEPARTMENT && payload.department === scopedDepartment) ||
      (selectedFeed === FEED_TYPES.MAJOR && (
        isAcademicOtherUser
          ? payload.department === ACADEMIC_OTHER_KEY
          : getDepartmentsInSameMajor(scopedDepartment).includes(payload.department)
      ));
    
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
  }, [selectedFeed, selectedStage, scopedDepartment, isAcademicOtherUser]);

  const handleRealtimePostDelete = useCallback(async (payload) => {
    // Invalidate posts cache since data changed
    await postsCacheManager.invalidateSinglePost(payload.$id);
    setPosts(prev => prev.filter(p => p.$id !== payload.$id));
  }, []);

  // Subscribe to real-time post updates
  usePosts(
    scopedDepartment,
    handleRealtimePostUpdate,
    handleRealtimePostDelete,
    !!scopedDepartment
  );

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (user?.$id) {
        try {
          const count = await getUnreadNotificationCount(user.$id);
          setUnreadNotifications(count);
        } catch (_error) {
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

    if (shouldScheduleRealtimeNotification({ appState: AppState.currentState })) {
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
    }
  }, [t]);

  // Subscribe to real-time notification updates
  useNotifications(user?.$id, handleNewNotification, null, !!user?.$id);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        scrollOffsetRef.current = currentScrollY;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY <= 50 && !headerVisible.current) {
          // Near top - always show header
          headerVisible.current = true;
          headerTranslateY.stopAnimation();
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: reduceMotion ? 90 : 170,
            useNativeDriver: true,
          }).start();
        } else if (diff > 8 && currentScrollY > 50 && headerVisible.current) {
          // Scrolling down fast enough - hide header
          headerVisible.current = false;
          headerTranslateY.stopAnimation();
          Animated.timing(headerTranslateY, {
            toValue: -120,
            duration: reduceMotion ? 110 : 200,
            useNativeDriver: true,
          }).start();
        } else if (diff < -3 && currentScrollY > 50 && !headerVisible.current) {
          // Scrolling up even slightly - show header immediately
          headerVisible.current = true;
          headerTranslateY.stopAnimation();
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: reduceMotion ? 95 : 170,
            useNativeDriver: true,
          }).start();
        }

        // Show/hide scroll to top button
        const shouldShow = currentScrollY > 300;
        if (shouldShow !== showScrollToTop) {
          setShowScrollToTop(shouldShow);
          Animated.timing(scrollToTopOpacity, {
            toValue: shouldShow ? 1 : 0,
            duration: reduceMotion ? 90 : 200,
            useNativeDriver: true,
          }).start();
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  useEffect(() => {
    hasAppliedViewportRef.current = false;
  }, [feedLoadSignature]);

  useEffect(() => {
    if (!posts.length || isLoadingPosts || hasAppliedViewportRef.current) {
      return;
    }

    const cachedViewport = homeFeedViewportCache.get(feedLoadSignature);
    if (!cachedViewport || !Number.isFinite(cachedViewport.scrollOffset) || cachedViewport.scrollOffset <= 0) {
      hasAppliedViewportRef.current = true;
      return;
    }

    hasAppliedViewportRef.current = true;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: cachedViewport.scrollOffset,
        animated: false,
      });
    });
  }, [feedLoadSignature, isLoadingPosts, posts.length]);

  useEffect(() => {
    const unsubscribe = subscribeToRefreshTopic(REFRESH_TOPICS.FEED, (payload = {}) => {
      const updatedPost = payload?.post;
      if (!updatedPost?.$id) {
        return;
      }

      setPosts(prevPosts => prevPosts.map(post => (
        post.$id === updatedPost.$id
          ? { ...post, ...updatedPost }
          : post
      )));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const persistViewport = () => {
      if (!posts.length) {
        return;
      }

      homeFeedViewportCache.set(feedLoadSignature, {
        scrollOffset: Math.max(0, Number(scrollOffsetRef.current || 0)),
        savedAt: Date.now(),
      });
    };

    const unsubscribeBlur = navigation.addListener('blur', persistViewport);

    return () => {
      unsubscribeBlur();
      persistViewport();
    };
  }, [feedLoadSignature, navigation, posts.length]);

  const loadPosts = useCallback(async (reset = false, options = {}) => {
    if (!user?.$id) {
      if (reset) {
        setPosts([]);
        setHasMore(false);
        setIsLoadingPosts(false);
        setIsRefreshing(false);
      } else {
        setIsLoadingMore(false);
      }
      return;
    }

    const requiresDepartmentContext = selectedFeed !== FEED_TYPES.PUBLIC;
    if (requiresDepartmentContext && !scopedDepartment) {
      if (reset) {
        setPosts([]);
        setHasMore(false);
        setIsLoadingPosts(false);
        setIsRefreshing(false);
      } else {
        setIsLoadingMore(false);
      }
      return;
    }

    const { forceNetwork = false } = options;
    const useCache = !forceNetwork;

    const currentPage = reset ? 0 : page;
    const loadingState = reset ? setIsLoadingPosts : setIsLoadingMore;

    loadingState(true);

    const generation = ++loadGenerationRef.current;

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
          department: scopedDepartment,
          postType: shouldForceQuestion ? POST_TYPES.QUESTION : resolvedFilterType,
          answerStatus: resolvedAnswerStatus,
        };
        if (selectedStage !== 'all') {
          filters.stage = selectedStage;
        }
        fetchedPosts = await getPosts(filters, POSTS_PER_PAGE, offset, useCache, sortBy, blockedUsers, user?.$id);
      } else if (selectedFeed === FEED_TYPES.MAJOR) {
        if (isAcademicOtherUser) {
          fetchedPosts = await getPosts(
            {
              department: ACADEMIC_OTHER_KEY,
              postType: resolvedFilterType,
              answerStatus: resolvedAnswerStatus,
              ...(selectedStage !== 'all' ? { stage: selectedStage } : {}),
            },
            POSTS_PER_PAGE,
            offset,
            useCache,
            sortBy,
            blockedUsers,
            user?.$id
          );
        } else {
          const relatedDepartments = getDepartmentsInSameMajor(scopedDepartment);
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
        }
      } else if (selectedFeed === FEED_TYPES.PUBLIC || isGuestUser) {
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

      // Filter out posts from blocked users
      const filteredPosts = Array.isArray(blockedUsers) && blockedUsers.length > 0
        ? fetchedPosts.filter(p => {
            const isBlocked = blockedUsers.includes(p.userId);
            return !isBlocked;
          })
        : fetchedPosts;

      const rankedPosts = sortPostsByScore(filteredPosts, {
        friendIds: user?.following || [],
        userDepartment: user?.department || '',
        userCollege: user?.college || '',
        userUniversity: user?.university || '',
        targetDepartments: user?.targetDepartments || [],
      });

      if (reset) {
        setPosts(rankedPosts);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...rankedPosts]);
        setPage(prev => prev + 1);
      }

      // Enrich in background so first paint is faster on slower networks/devices.
      // Guard with a generation counter so a stale enrichment from a previous load
      // does not overwrite the results of a newer reset load.
      enrichPostsWithUserData(filteredPosts)
        .then((enrichedPosts) => {
          if (loadGenerationRef.current !== generation) return;

          if (!Array.isArray(enrichedPosts) || enrichedPosts.length === 0) {
            return;
          }

          if (reset) {
            setPosts(enrichedPosts);
            return;
          }

          setPosts((prev) => {
            const enrichedMap = new Map(enrichedPosts.map((post) => [post.$id, post]));
            return prev.map((post) => enrichedMap.get(post.$id) || post);
          });
        })
        .catch(() => {});

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
  }, [answerStatus, filterType, isAcademicOtherUser, page, scopedDepartment, selectedFeed, selectedStage, showAlert, sortBy, t, user]);

  useEffect(() => {
    if (!user?.$id || (requiresDepartmentContext && !scopedDepartment)) {
      setIsLoadingPosts(false);
      setIsRefreshing(false);
      return;
    }

    const shouldReload = lastLoadedFeedSignatureRef.current !== feedLoadSignature || posts.length === 0;
    if (!shouldReload) {
      return;
    }

    lastLoadedFeedSignatureRef.current = feedLoadSignature;
    hasAppliedViewportRef.current = false;
    loadPosts(true);
  }, [feedLoadSignature, loadPosts, posts.length, requiresDepartmentContext, scopedDepartment, user?.$id]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPosts(true, { forceNetwork: true });
  }, [loadPosts]);

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
  }, [handleRefresh, navigation]);

  const handleScrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoadingPosts) {
      loadPosts(false);
    }
  };

  const handleUserPress = (userData) => {
    const targetUserId = String(userData?.$id || '').trim();
    if (!targetUserId) {
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: t('profile.userNotFound'),
      });
      return;
    }

    navigation.navigate('UserProfile', { userId: targetUserId });
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', {
      post,
    });
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

  const handleOpenPublicPosts = useCallback(() => {
    if (selectedFeed === FEED_TYPES.PUBLIC) {
      handleRefresh();
      return;
    }

    setSelectedFeed(FEED_TYPES.PUBLIC);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    setIsLoadingPosts(true);
  }, [handleRefresh, selectedFeed]);

  const handleCreatePost = useCallback(() => {
    navigation.navigate('Post');
  }, [navigation]);

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

  useEffect(() => {
    if (!user?.$id || scopedDepartment || selectedFeed === FEED_TYPES.PUBLIC) {
      return;
    }

    setSelectedFeed(FEED_TYPES.PUBLIC);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    setIsLoadingPosts(true);
  }, [scopedDepartment, selectedFeed, user?.$id]);

  const markPostAsViewed = useCallback(async (postId) => {
    if (!user?.$id || !postId || viewedPostsRef.current.has(postId)) return;
    
    viewedPostsRef.current.add(postId);
    
    try {
      await incrementPostViewCount(postId, user.$id);
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.$id === postId
            ? { ...post, viewCount: (post.viewCount || 0) + 1 }
            : post
        )
      );
    } catch (_error) {
    }
  }, [user?.$id]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    viewableItems.forEach(({ item }) => {
      if (item?.$id && item.userId !== user?.$id) {
        markPostAsViewed(item.$id);
      }
    });
  }, [markPostAsViewed, user?.$id]);

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
          } catch (_notifyError) {
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
        telemetry.recordEvent('home_report_moderation_not_persisted', {
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
      telemetry.recordEvent('home_report_submission_failed', {
        postId: post?.$id,
        reason,
        userId: user?.$id,
        message: error?.message || '',
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
        estimatedItemSize={250}
        renderItem={({ item, index }) => (
          <ReanimatedAnimated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(index * motionProfile.listItemEnterDelayMs).duration(motionProfile.listItemEnterDurationMs).springify()}
          >
            <View style={[styles.postContainer, compactMode && styles.postContainerCompact]}>
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
        contentContainerStyle={[
          styles.postsListContent,
          compactMode && styles.postsListContentCompact,
          { paddingTop: listTopPadding },
          contentStyle,
        ]}
        ListHeaderComponent={(
          <View>
            <GreetingBanner />
            <SuggestedFriendsCard
              user={user}
              onUserPress={handleUserPress}
              forceVisible={visiblePosts.length === 0}
            />
          </View>
        )}
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
        scrollEventThrottle={motionProfile.scrollEventThrottle}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={11}
        maxToRenderPerBatch={reduceMotion ? 8 : 10}
        initialNumToRender={compactMode ? 10 : 8}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <UnifiedEmptyState
            iconComponent={({ size, color, accessible }) => {
              const IconComponent = emptyStateIconMap[
                selectedFeed === FEED_TYPES.DEPARTMENT
                  ? 'people-outline'
                  : selectedFeed === FEED_TYPES.MAJOR
                    ? 'school-outline'
                    : 'globe-outline'
              ];

              return IconComponent ? <IconComponent accessible={accessible} size={size} color={color} /> : null;
            }}
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
            actionLabel={
              selectedFeed === FEED_TYPES.PUBLIC
                ? t('common.retry')
                : t('home.seePublicPosts')
            }
            actionIconName={selectedFeed === FEED_TYPES.PUBLIC ? 'refresh-outline' : null}
            actionIconComponent={selectedFeed === FEED_TYPES.PUBLIC
              ? ({ size, color }) => <RefreshIcon size={size} color={color} />
              : undefined}
            onAction={selectedFeed === FEED_TYPES.PUBLIC ? handleRefresh : handleOpenPublicPosts}
            secondaryActionLabel={selectedFeed === FEED_TYPES.DEPARTMENT ? t('home.beFirstToPost') : null}
            onSecondaryAction={selectedFeed === FEED_TYPES.DEPARTMENT ? handleCreatePost : null}
          />
        }
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
          : ['#e3f2fd', '#bbdefb', '#90caf9']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>

        <View style={[styles.content, { paddingTop: headerTop }]}>
          <Animated.View
            style={[
              styles.headerRow,
              isRTL && styles.headerRowRtl,
              {
                top: headerTop,
                height: headerHeight,
                paddingHorizontal: wp(isVerySmallScreen ? 1 : isSmallScreen ? 2 : 3),
                gap: isVerySmallScreen ? 2 : isSmallScreen ? spacing.xs * 0.5 : spacing.xs,
                transform: [{ translateY: headerTranslateY }],
              }
            ]}
          >
            <TutorialHighlight
              active={tutorial.activeTarget === 'search' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={[styles.searchIconButton, { width: headerHeight, height: headerHeight }]}
            >
              <SearchBar
                ref={searchBarRef}
                iconOnly={true}
                onUserPress={handleUserPress}
                onPostPress={handlePostPress}
              />
            </TutorialHighlight>

            {!isGuestUser && (
              <TutorialHighlight
                active={tutorial.activeTarget === 'feedSelector' && tutorial.isVisible}
                theme={theme}
                isDarkMode={isDarkMode}
                style={[styles.feedSelectorWrapper, { height: headerHeight }]}
              >
                <FeedSelector
                  selectedFeed={selectedFeed}
                  onFeedChange={handleFeedChange}
                  height={headerHeight}
                />
              </TutorialHighlight>
            )}

            <TutorialHighlight
              active={tutorial.activeTarget === 'filter' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={[styles.sortButton, { height: actionButtonSize, width: actionButtonSize }]}
            >
              <TouchableOpacity
                style={{ height: actionButtonSize, width: actionButtonSize }}
                onPress={() => setShowFilterSortModal(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('home.filterSort')}
                accessibilityState={{ selected: hasActiveFilters }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <GlassIconButton
                  size={actionButtonSize}
                  borderRadiusValue={borderRadius.md}
                  active={Platform.OS === 'android' ? false : hasActiveFilters}
                >
                  <OptionsIcon
                    size={headerIconSize}
                    color={hasActiveFilters ? theme.primary : theme.text}
                  />
                  {hasActiveFilters && <View style={[styles.filterActiveDot, { backgroundColor: theme.primary }]} />}
                </GlassIconButton>
              </TouchableOpacity>
            </TutorialHighlight>

            <TutorialHighlight
              active={tutorial.activeTarget === 'notifications' && tutorial.isVisible}
              theme={theme}
              isDarkMode={isDarkMode}
              style={[styles.notificationButton, { height: actionButtonSize, width: actionButtonSize }]}
            >
              <TouchableOpacity
                style={{ height: actionButtonSize, width: actionButtonSize }}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('notifications.title')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <GlassIconButton
                  size={actionButtonSize}
                  borderRadiusValue={borderRadius.md}
                >
                  <NotificationsIcon size={headerIconSize} color={theme.text} />
                  {notificationBadgeText ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {notificationBadgeText}
                      </Text>
                    </View>
                  ) : null}
                </GlassIconButton>
              </TouchableOpacity>
            </TutorialHighlight>
          </Animated.View>

          <TutorialHighlight
            active={tutorial.activeTarget === 'posts' && tutorial.isVisible}
            theme={theme}
            isDarkMode={isDarkMode}
            style={styles.feedContent}
            borderRadius={borderRadius.md}
          >
            {renderFeedContent()}
          </TutorialHighlight>
        </View>
      </LinearGradient>

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
          <GlassModalCard style={[styles.reportModalCard]}>
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
                <CloseIcon size={moderateScale(18)} color={theme.textSecondary} />
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
                    {reportReasonIconMap[reason.icon]
                      ? React.createElement(reportReasonIconMap[reason.icon], {
                          size: moderateScale(16),
                          color: reason.color,
                        })
                      : <AlertCircleHomeIcon size={moderateScale(16)} color={reason.color} />}
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
          </GlassModalCard>
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
          style={styles.scrollToTopTouchable}
          accessibilityRole="button"
          accessibilityLabel={t('home.scrollToTop') || t('common.goBack')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <GlassIconButton size={moderateScale(48)} tint="dark">
            <ArrowUpIcon size={moderateScale(22)} color="#FFFFFF" />
          </GlassIconButton>
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
  headerRowRtl: {
    flexDirection: 'row-reverse',
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
  filterActiveDot: {
    position: 'absolute',
    top: moderateScale(6),
    right: moderateScale(6),
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
  postContainerCompact: {
    paddingHorizontal: wp(3),
    marginBottom: spacing.sm,
  },
  postsListContent: {
    paddingBottom: hp(6),
  },
  postsListContentCompact: {
    paddingBottom: hp(4),
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