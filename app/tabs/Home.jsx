import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
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
import FilterSortModal, { SORT_OPTIONS } from '../components/FilterSortModal';
import PostCard from '../components/PostCard';
import CustomAlert from '../components/CustomAlert';
import GreetingBanner from '../components/GreetingBanner';
import { PostCardSkeleton } from '../components/SkeletonLoader';
import {
  wp,
  hp,
  fontSize,
  spacing,
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { FEED_TYPES, getDepartmentsInSameMajor } from '../constants/feedCategories';
import { getPosts, getPostsByDepartments, getAllPublicPosts, togglePostLike, deletePost, enrichPostsWithUserData, reportPost, incrementPostViewCount, markQuestionAsResolved, getPost } from '../../database/posts';
import { notifyPostLike, getUnreadNotificationCount } from '../../database/notifications';
import { handleNetworkError } from '../utils/networkErrorHandler';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePosts, useNotifications } from '../hooks/useRealtimeSubscription';
import { postsCacheManager } from '../utils/cacheManager';
import { scheduleLocalNotification } from '../../services/pushNotificationService';

const POSTS_PER_PAGE = 15;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const Home = ({ navigation, route }) => {
  const { t, theme, isDarkMode, compactMode } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [selectedFeed, setSelectedFeed] = useState(FEED_TYPES.DEPARTMENT);
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.NEWEST);
  const [filterType, setFilterType] = useState('all');
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userInteractions, setUserInteractions] = useState({});
  const [showFilterSortModal, setShowFilterSortModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const flatListRef = useRef(null);
  const searchBarRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const lastTapTime = useRef(0);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;

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
  }, [selectedFeed, selectedStage, sortBy, filterType, user]);

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
    
    // Set up periodic refresh every 5 minutes as fallback for realtime
    // This is battery-efficient as it only runs when app is in foreground
    const intervalId = setInterval(() => {
      loadUnreadCount();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Refresh count and check for post updates when screen is focused
    const unsubscribe = navigation.addListener('focus', async () => {
      loadUnreadCount();
      
      // Check if there's a post that needs to be refreshed
      const updatedPostId = route?.params?.updatedPostId;
      const updatedReplyCount = route?.params?.updatedReplyCount;
      
      if (updatedPostId !== undefined && updatedReplyCount !== undefined) {
        // Update the specific post in the list
        setPosts(prevPosts => 
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
    
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [user?.$id, navigation, route?.params?.updatedPostId, route?.params?.updatedReplyCount]);

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

        if (diff > 5 && currentScrollY > 50) {
          Animated.timing(headerTranslateY, {
            toValue: -120,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else if (diff < -5 || currentScrollY < 50) {
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
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

  const loadPosts = async (reset = false) => {
    if (!user || !user.department) {
      return;
    }

    const currentPage = reset ? 0 : page;
    const loadingState = reset ? setIsLoadingPosts : setIsLoadingMore;

    loadingState(true);

    try {
      let fetchedPosts = [];
      const offset = currentPage * POSTS_PER_PAGE;

      if (selectedFeed === FEED_TYPES.DEPARTMENT) {
        const filters = {
          department: user.department,
          postType: filterType,
        };
        if (selectedStage !== 'all') {
          filters.stage = selectedStage;
        }
        fetchedPosts = await getPosts(filters, POSTS_PER_PAGE, offset, true, sortBy);
      } else if (selectedFeed === FEED_TYPES.MAJOR) {
        const relatedDepartments = getDepartmentsInSameMajor(user.department);
        fetchedPosts = await getPostsByDepartments(
          relatedDepartments,
          selectedStage,
          POSTS_PER_PAGE,
          offset,
          true,
          sortBy,
          filterType
        );
      } else if (selectedFeed === FEED_TYPES.PUBLIC) {
        fetchedPosts = await getAllPublicPosts(selectedStage, POSTS_PER_PAGE, offset, true, sortBy, filterType);
      }

      // Enrich posts with user data for those missing userName
      const enrichedPosts = await enrichPostsWithUserData(fetchedPosts);

      if (reset) {
        setPosts(enrichedPosts);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...enrichedPosts]);
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
    loadPosts(true);
  }, [selectedFeed, selectedStage, sortBy, filterType, user]);

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
      const result = await togglePostLike(postId, user.$id);

      setPosts(prevPosts =>
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

  const handleMarkResolved = async (postId) => {
    try {
      await markQuestionAsResolved(postId);
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.$id === postId 
            ? { ...post, isResolved: true }
            : post
        )
      );
      
      showAlert(t('common.success'), t('post.markedAsResolved'), 'success');
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
      const reasons = [
        { key: 'spam', label: t('report.spam') || 'Spam' },
        { key: 'harassment', label: t('report.harassment') || 'Harassment or bullying' },
        { key: 'inappropriate', label: t('report.inappropriate') || 'Inappropriate content' },
        { key: 'misinformation', label: t('report.misinformation') || 'Misinformation' },
        { key: 'other', label: t('report.other') || 'Other' },
      ];

      showAlert({
        type: 'info',
        title: t('post.reportPost'),
        message: t('report.selectReason') || 'Why are you reporting this post?',
        buttons: [
          ...reasons.map(r => ({
            text: r.label,
            onPress: () => handleReportPost(post, r.key),
          })),
          { text: t('common.cancel'), style: 'cancel' },
        ],
      });
      return;
    }

    // Submit the report with reason
    try {
      const result = await reportPost(post.$id, user.$id, reason);
      if (result.alreadyReported) {
        showAlert(t('common.info'), t('post.alreadyReported') || 'You have already reported this post', 'info');
      } else {
        showAlert(t('common.success'), t('post.reportSuccess'), 'success');
      }
    } catch (error) {
      const errorInfo = handleNetworkError(error);
      showAlert(
        errorInfo.isNetworkError ? t('error.noInternet') : t('error.title'),
        t('post.reportError'),
        [{ text: t('common.ok') }]
      );
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
        <View style={[styles.feedContent, { paddingTop: 56 + 80 }]}>
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
      const cardBackground = isDarkMode 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(255, 255, 255, 0.6)';

      return (
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: cardBackground,
                borderRadius: borderRadius.xl,
                borderWidth: isDarkMode ? 0 : 1,
                borderColor: 'rgba(0, 0, 0, 0.04)',
              }
            ]}>
            <View style={[
              styles.emptyIconContainer,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(0, 0, 0, 0.05)'
              }
            ]}>
              <Ionicons
                name={
                  selectedFeed === FEED_TYPES.DEPARTMENT
                    ? 'people-outline'
                    : selectedFeed === FEED_TYPES.MAJOR
                      ? 'school-outline'
                      : 'globe-outline'
                }
                size={moderateScale(64)}
                color={isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0, 0, 0, 0.4)'}
              />
            </View>
            <Text style={[
              styles.emptyTitle,
              {
                fontSize: fontSize(20),
                color: theme.text
              }
            ]}>
              {t('feed.noPosts')}
            </Text>
            <Text style={[
              styles.emptyMessage,
              {
                fontSize: fontSize(14),
                color: theme.subText
              }
            ]}>
              {selectedFeed === FEED_TYPES.DEPARTMENT && t('home.departmentFeedEmpty')}
              {selectedFeed === FEED_TYPES.MAJOR && t('home.majorFeedEmpty')}
              {selectedFeed === FEED_TYPES.PUBLIC && t('home.publicFeedEmpty')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <AnimatedFlatList
        ref={flatListRef}
        data={posts}
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
              onMarkResolved={() => handleMarkResolved(item.$id)}
              onTagPress={(tag) => searchBarRef.current?.openWithQuery(`#${tag}`)}
              isLiked={item.likedBy?.includes(user?.$id)}
              isOwner={item.userId === user?.$id}
              compact={compactMode}
            />
            </View>
          </ReanimatedAnimated.View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.postsListContent}
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

        <View style={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
          <Animated.View
            style={[
              styles.headerRow,
              {
                top: insets.top + spacing.sm,
                transform: [{ translateY: headerTranslateY }],
              }
            ]}
          >
            <View style={styles.searchIconButton}>
              <SearchBar
                ref={searchBarRef}
                iconOnly={true}
                onUserPress={handleUserPress}
                onPostPress={handlePostPress}
              />
            </View>

            <View style={styles.feedSelectorWrapper}>
              <FeedSelector
                selectedFeed={selectedFeed}
                onFeedChange={handleFeedChange}
              />
            </View>

            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowFilterSortModal(true)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.sortContainer,
                  {
                    backgroundColor: (sortBy !== SORT_OPTIONS.NEWEST || filterType !== 'all' || selectedStage !== 'all')
                      ? (isDarkMode ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)')
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'),
                    borderWidth: 0.5,
                    borderColor: (sortBy !== SORT_OPTIONS.NEWEST || filterType !== 'all' || selectedStage !== 'all')
                      ? theme.primary + '40'
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'),
                  }
                ]}
              >
                <Ionicons 
                  name="options-outline" 
                  size={moderateScale(18)} 
                  color={(sortBy !== SORT_OPTIONS.NEWEST || filterType !== 'all' || selectedStage !== 'all') ? theme.primary : theme.text} 
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.notificationContainer,
                  {
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
                <Ionicons name="notifications-outline" size={moderateScale(18)} color={theme.text} />
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
        selectedStage={selectedStage}
        onStageChange={handleStageChange}
      />

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
    paddingHorizontal: wp(3),
    marginBottom: spacing.sm,
    gap: spacing.xs,
    height: 44,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchIconButton: {
    width: 44,
    height: 44,
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedSelectorWrapper: {
    flex: 1,
    height: 44,
  },
  sortButton: {
    height: 40,
    width: 40,
  },
  sortContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  notificationButton: {
    height: 40,
    width: 40,
  },
  notificationContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
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
    paddingTop: 56,
    paddingBottom: spacing.xl,
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
});

export default Home;