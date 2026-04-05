import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text, 
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../components/icons/CompatIonicon';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import { getBookmarkedPostIds } from '../../utils/bookmarkService';
import PostCard from '../../components/PostCard';
import CustomAlert from '../../components/CustomAlert';
import UnifiedEmptyState from '../../components/UnifiedEmptyState';
import { SavedPostSkeleton } from '../../components/SkeletonLoader';
import useCustomAlertHook from '../../hooks/useCustomAlert';
import { getPost , togglePostLike } from '../../../database/posts';

import { wp, hp, fontSize, spacing, moderateScale } from '../../utils/responsive';
import useLayout from '../../hooks/useLayout';
import { FlashList } from '@shopify/flash-list';
import { getAsyncCollectionState } from '../../utils/uiStateHelpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSettingsHeaderGradient } from './settingsTheme';

const SavedPosts = ({ navigation }) => {
  const { t, theme, isDarkMode, isRTL, triggerHaptic } = useAppSettings();
  const { user } = useUser();
  const [loadError, setLoadError] = useState(null);
  const { alertConfig, hideAlert } = useCustomAlertHook();
  const { contentStyle } = useLayout();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const backIconName = Platform.OS === 'ios'
    ? (isRTL ? 'chevron-forward' : 'chevron-back')
    : (isRTL ? 'arrow-forward' : 'arrow-back');

  const loadSavedPosts = useCallback(async () => {
    setLoadError(null);

    try {
      const bookmarkIds = await getBookmarkedPostIds();
      if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
        setPosts([]);
        return;
      }

      const postPromises = bookmarkIds.map(async (id) => {
        try {
          return await getPost(id, user?.$id);
        } catch (error) {
          return { error: error?.message || t('errors.genericError') };
        }
      });

      const results = await Promise.all(postPromises);
      const validPosts = results.filter((item) => item && !item.error);
      const loadFailures = results.filter((item) => item?.error);

      if (!validPosts.length && loadFailures.length > 0) {
        setLoadError(loadFailures[0].error);
        return;
      }

      setPosts(validPosts.reverse());
    } catch (error) {
      setLoadError(error?.message || t('errors.genericError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.$id, t]);

  useEffect(() => {
    loadSavedPosts();
  }, [loadSavedPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSavedPosts();
  }, [loadSavedPosts]);

  const handleRetryLoad = useCallback(() => {
    setLoading(true);
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
    const targetUserId = String(userId || '').trim();
    if (!targetUserId) {
      return;
    }
    navigation.navigate('UserProfile', { userId: targetUserId });
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

  const savedPostsState = getAsyncCollectionState({
    isLoading: loading,
    error: loadError,
    itemCount: posts.length,
  });

  const renderEmpty = () => (
    <UnifiedEmptyState
      iconName="bookmark-outline"
      title={t('settings.noSavedPosts')}
      description={t('settings.savedPostsHint')}
      actionLabel={t('common.goBack')}
      actionIconName={isRTL ? 'arrow-forward' : 'arrow-back'}
      onAction={() => navigation.goBack()}
      compact
    />
  );

  const renderLoadError = () => (
    <UnifiedEmptyState
      iconName="alert-circle-outline"
      title={t('error.title')}
      description={loadError || t('errors.genericError')}
      actionLabel={t('common.retry')}
      actionIconName="refresh-outline"
      onAction={handleRetryLoad}
      compact
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={getSettingsHeaderGradient('SavedPosts', { theme, isDarkMode })}
        style={styles.headerGradient}
      />

      <View style={[styles.header, isRTL && styles.rowReverse, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}>
          <Ionicons
            name={backIconName}
            size={moderateScale(22)}
            color={theme.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(20) }]}>
            {t('settings.savedPosts')}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {savedPostsState === 'loading' ? (
        <View style={styles.loadingContainer}>
          <SavedPostSkeleton count={4} />
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={[styles.listContent, contentStyle]}
          ListEmptyComponent={savedPostsState === 'error' ? renderLoadError : renderEmpty}
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
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(25),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholder: {
    width: moderateScale(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingHorizontal: wp(2),
    paddingBottom: hp(4),
  },
});

export default SavedPosts;
