import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { getBookmarkedPostIds } from '../../utils/bookmarkService';
import PostCard from '../../components/PostCard';
import CustomAlert from '../../components/CustomAlert';
import UnifiedEmptyState from '../../components/UnifiedEmptyState';
import { SavedPostSkeleton } from '../../components/SkeletonLoader';
import useCustomAlert from '../../hooks/useCustomAlert';
import { getPost } from '../../../database/posts';
import { togglePostLike } from '../../../database/posts';
import { wp, hp, fontSize, spacing, moderateScale } from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import useLayout from '../../hooks/useLayout';



const SavedPosts = ({ navigation }) => {
  const { t, theme, isDarkMode, triggerHaptic } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { contentStyle } = useLayout();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedPosts = useCallback(async () => {
    try {
      const bookmarkIds = await getBookmarkedPostIds();
      if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
        setPosts([]);
        return;
      }

      const postPromises = bookmarkIds.map(async (id) => {
        try {
          return await getPost(id, user?.$id);
        } catch {
          return null;
        }
      });

      const results = await Promise.all(postPromises);
      const validPosts = results.filter(Boolean);
      // Show newest bookmarks first (reverse so last-added is first)
      setPosts(validPosts.reverse());
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSavedPosts();
  }, [loadSavedPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSavedPosts();
  }, [loadSavedPosts]);

  const handleLike = async (postId) => {
    if (!user?.$id) return;
    try {
      triggerHaptic('selection');
      await togglePostLike(postId, user.$id);
    } catch {
      // Silent fail
    }
  };

  const handlePostPress = useCallback((postId) => {
    navigation.push('PostDetails', { postId });
  }, [navigation]);

  const handleUserPress = useCallback((userId) => {
    navigation.navigate('UserProfile', { userId });
  }, [navigation]);

  const renderPost = ({ item }) => {
    const isLiked = item.likedBy?.includes(user?.$id);
    const isOwner = item.userId === user?.$id;

    return (
      <PostCard
        post={item}
        isLiked={isLiked}
        isOwner={isOwner}
        onLike={() => handleLike(item.$id)}
        onReply={() => handlePostPress(item.$id)}
        onUserPress={(userId) => handleUserPress(userId)}
        onTagPress={() => {}}
      />
    );
  };

  const renderEmpty = () => (
    <UnifiedEmptyState
      iconName="bookmark-outline"
      title={t('settings.noSavedPosts')}
      description={t('settings.savedPostsHint')}
      actionLabel={t('common.goBack')}
      actionIconName="arrow-back"
      onAction={() => navigation.goBack()}
      compact
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#f0f4ff', '#d8e7ff']}
        style={styles.gradient}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? hp(7) : hp(5) }]}>
          <Ionicons
            name="arrow-back"
            size={moderateScale(24)}
            color={theme.text}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
          />
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(20) }]}>
            {t('settings.savedPosts')}
          </Text>
          <View style={{ width: moderateScale(24) }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <SavedPostSkeleton count={4} />
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={[styles.listContent, contentStyle]}
            ListEmptyComponent={renderEmpty}
            windowSize={9}
            maxToRenderPerBatch={8}
            initialNumToRender={6}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: wp(2),
    paddingBottom: hp(4),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(15),
    paddingHorizontal: wp(8),
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    width: '100%',
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SavedPosts;
