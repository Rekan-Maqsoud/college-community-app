import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import PostCard from './PostCard';
import { getPost, togglePostLike, incrementPostViewCount } from '../../database/posts';
import { getUserById } from '../../database/users';
import {
  fontSize,
  spacing,
  moderateScale,
} from '../utils/responsive';

const PostViewModal = ({
  visible,
  onClose,
  postId,
  post: initialPost,
  navigation,
  onViewReplies,
  onPostUpdate,
}) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState(null);

  // Fetch post data
  useEffect(() => {
    if (!visible) return;

    const fetchPostData = async () => {
      const targetPostId = postId || initialPost?.$id;
      if (!targetPostId) {
        setError(t('post.postNotFound'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchedPost = initialPost || await getPost(targetPostId, user?.$id);
        if (!fetchedPost) {
          setError(t('post.postNotFound'));
          setLoading(false);
          return;
        }

        let enrichedPost = { ...fetchedPost };

        if (fetchedPost.userId === user?.$id) {
          enrichedPost = {
            ...enrichedPost,
            userName: user?.fullName || user?.name,
            userProfilePicture: user?.profilePicture,
          };
        } else {
          try {
            const author = await getUserById(fetchedPost.userId);
            enrichedPost = {
              ...enrichedPost,
              userName: author?.fullName || author?.name,
              userProfilePicture: author?.profilePicture,
            };
          } catch (e) {
            // Silent
          }
        }

        setPost(enrichedPost);

        // Track view for non-own posts
        if (fetchedPost.userId !== user?.$id) {
          try {
            await incrementPostViewCount(fetchedPost.$id, user?.$id);
          } catch (e) {
            // Silent
          }
        }
      } catch (err) {
        setError(t('post.postNotFound'));
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [visible, postId, initialPost?.$id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setPost(initialPost || null);
      setError(null);
    }
  }, [visible]);

  const handleLike = useCallback(async () => {
    if (!post?.$id || !user?.$id) return;

    try {
      const result = await togglePostLike(post.$id, user.$id);
      setPost(prev => ({
        ...prev,
        likeCount: result.likeCount,
        likedBy: result.likedBy,
      }));
      if (onPostUpdate) {
        onPostUpdate({ ...post, likeCount: result.likeCount, likedBy: result.likedBy });
      }
    } catch (err) {
      // Silent
    }
  }, [post, user, onPostUpdate]);

  const handleViewReplies = useCallback(() => {
    onClose();
    if (onViewReplies) {
      onViewReplies(post);
    } else if (navigation && post) {
      navigation.navigate('PostDetails', { post, postId: post.$id });
    }
  }, [post, navigation, onViewReplies, onClose]);

  const handleUserPress = useCallback(() => {
    if (!post?.userId) return;
    onClose();
    if (navigation) {
      if (post.userId === user?.$id) {
        navigation.navigate('MainTabs', { screen: 'Profile' });
      } else {
        navigation.navigate('UserProfile', { userId: post.userId });
      }
    }
  }, [post, navigation, user, onClose]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      );
    }

    if (error || !post) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            {error || t('post.postNotFound')}
          </Text>
          <TouchableOpacity
            style={[styles.closeErrorButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeErrorText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PostCard
          post={post}
          onUserPress={handleUserPress}
          onLike={handleLike}
          onReply={handleViewReplies}
          isLiked={(post.likedBy || []).includes(user?.$id)}
          isOwner={post.userId === user?.$id}
        />

        {/* View Replies CTA */}
        <TouchableOpacity
          style={[styles.viewRepliesButton, { backgroundColor: theme.primary }]}
          onPress={handleViewReplies}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubbles-outline" size={20} color="#FFFFFF" />
          <Text style={styles.viewRepliesText}>
            {t('post.viewReplies') || 'View Replies'} ({post.replyCount || 0})
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={moderateScale(24)} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('post.viewPost') || 'Post'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize(17),
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize(14),
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize(15),
    marginTop: spacing.md,
    textAlign: 'center',
  },
  closeErrorButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  closeErrorText: {
    color: '#FFFFFF',
    fontSize: fontSize(14),
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  viewRepliesText: {
    color: '#FFFFFF',
    fontSize: fontSize(15),
    fontWeight: '700',
  },
});

export default PostViewModal;
