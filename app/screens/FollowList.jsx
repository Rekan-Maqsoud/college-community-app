import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '../components/icons/CompatIonicon';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { getFollowers, getFollowing, followUser, unfollowUser, isFollowing as checkIsFollowing } from '../../database/users';
import { notifyFollow } from '../../database/notifications';
import UserCard from '../components/UserCard';
import UnifiedEmptyState from '../components/UnifiedEmptyState';
import { GlassContainer } from '../components/GlassComponents';
import AnimatedBackground from '../components/AnimatedBackground';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { resolveFollowTabCount } from '../utils/uiUxAuditHelpers';
import useLayout from '../hooks/useLayout';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FollowList = ({ route, navigation }) => {
  const {
    userId,
    initialTab = 'followers',
    userName,
    followersCount,
    followingCount,
  } = route.params || {};
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const { user: currentUser } = useUser();
  const { contentStyle } = useLayout();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [followingStatus, setFollowingStatus] = useState({});
  const [followLoading, setFollowLoading] = useState({});

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [followersList, followingList] = await Promise.all([
        getFollowers(userId),
        getFollowing(userId),
      ]);
      
      setFollowers(followersList || []);
      setFollowing(followingList || []);

      // Check follow status for each user if current user is logged in
      if (currentUser?.$id) {
        const allUsers = [...(followersList || []), ...(followingList || [])];
        const uniqueUsers = [...new Map(allUsers.map(u => [u.$id, u])).values()];
        
        const statusMap = {};
        await Promise.all(
          uniqueUsers.map(async (u) => {
            if (u.$id !== currentUser.$id) {
              try {
                const isFollowingUser = await checkIsFollowing(currentUser.$id, u.$id);
                statusMap[u.$id] = isFollowingUser;
              } catch {
                statusMap[u.$id] = false;
              }
            }
          })
        );
        setFollowingStatus(statusMap);
      }
    } catch (error) {
      setLoadError(error?.message || t('errors.genericError'));
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.$id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollowToggle = async (targetUserId) => {
    if (!currentUser?.$id || targetUserId === currentUser.$id) return;
    
    setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));
    const wasFollowing = followingStatus[targetUserId];
    
    try {
      // Optimistic update
      setFollowingStatus(prev => ({ ...prev, [targetUserId]: !wasFollowing }));
      
      if (wasFollowing) {
        await unfollowUser(currentUser.$id, targetUserId);
      } else {
        await followUser(currentUser.$id, targetUserId);
        // Send follow notification
        try {
          await notifyFollow(
            targetUserId,
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
      setFollowingStatus(prev => ({ ...prev, [targetUserId]: wasFollowing }));
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUserPress = (user) => {
    navigation.push('UserProfile', { userId: user.$id, userData: user });
  };

  const renderUser = ({ item: user }) => {
    const isCurrentUser = user.$id === currentUser?.$id;
    const isFollowingUser = followingStatus[user.$id];
    const isLoadingFollow = followLoading[user.$id];

    return (
      <GlassContainer borderRadius={borderRadius.lg} style={styles.userCard}>
        <TouchableOpacity
          style={[styles.userRow, isRTL && styles.userRowRtl]}
          onPress={() => handleUserPress(user)}
          activeOpacity={0.7}
        >
          <UserCard
            user={{
              ...user,
              fullName: user.name || user.fullName,
            }}
            size={50}
            showBio={false}
            style={styles.userCardInner}
          />
          
          {!isCurrentUser && currentUser?.$id && (
            <TouchableOpacity
              style={[
                styles.followButton,
                { 
                  backgroundColor: isFollowingUser 
                    ? (isDarkMode ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.15)')
                    : theme.primary 
                }
              ]}
              onPress={() => handleFollowToggle(user.$id)}
              disabled={isLoadingFollow}
            >
              {isLoadingFollow ? (
                <ActivityIndicator size="small" color={isFollowingUser ? theme.text : '#FFFFFF'} />
              ) : (
                <Text style={[
                  styles.followButtonText,
                  { color: isFollowingUser ? theme.text : '#FFFFFF' }
                ]}>
                  {isFollowingUser ? t('profile.following') : t('profile.follow')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </GlassContainer>
    );
  };

  const renderEmptyState = () => (
    <UnifiedEmptyState
      iconName={loadError ? 'alert-circle-outline' : (activeTab === 'followers' ? 'people-outline' : 'person-add-outline')}
      title={loadError ? t('error.title') : (activeTab === 'followers' ? t('profile.followers') : t('profile.following'))}
      description={loadError || (activeTab === 'followers' ? t('profile.noFollowers') : t('profile.noFollowing'))}
      actionLabel={loadError ? t('common.retry') : undefined}
      actionIconName={loadError ? 'refresh-outline' : undefined}
      onAction={loadError ? loadData : undefined}
      compact
      style={styles.emptyCard}
    />
  );

  const currentList = activeTab === 'followers' ? followers : following;
  const displayedFollowersCount = resolveFollowTabCount({
    routeCount: followersCount,
    loadedCount: followers.length,
    loading,
    loadError,
  });
  const displayedFollowingCount = resolveFollowTabCount({
    routeCount: followingCount,
    loadedCount: following.length,
    loading,
    loadError,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AnimatedBackground particleCount={25} />
      
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#e3f2fd', '#bbdefb', '#90caf9']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || hp(2)) + spacing.xs }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <GlassContainer borderRadius={borderRadius.round} style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={moderateScale(24)} color={isDarkMode ? '#FFFFFF' : '#1C1C1E'} />
            </GlassContainer>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#1C1C1E' }]}>
            {userName || t('profile.followers')}
          </Text>
          
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)' }]}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('followers')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { 
                color: activeTab === 'followers' ? theme.primary : theme.textSecondary,
                fontWeight: activeTab === 'followers' ? '700' : '500'
              }
            ]}>
              {t('profile.followers')} ({displayedFollowersCount})
            </Text>
            {activeTab === 'followers' && (
              <LinearGradient
                colors={theme.gradient}
                style={styles.tabIndicator}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('following')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { 
                color: activeTab === 'following' ? theme.primary : theme.textSecondary,
                fontWeight: activeTab === 'following' ? '700' : '500'
              }
            ]}>
              {t('profile.following')} ({displayedFollowingCount})
            </Text>
            {activeTab === 'following' && (
              <LinearGradient
                colors={theme.gradient}
                style={styles.tabIndicator}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlashList
            data={currentList}
            renderItem={renderUser}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={[styles.listContent, contentStyle]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </LinearGradient>
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
    paddingHorizontal: wp(5),
    paddingBottom: spacing.md,
  },
  backButton: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonInner: {
    width: moderateScale(44),
    height: moderateScale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize(18),
    fontWeight: '700',
  },
  headerPlaceholder: {
    width: moderateScale(44),
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: wp(5),
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  tabText: {
    fontSize: fontSize(13),
    marginBottom: 2,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    width: '80%',
    borderRadius: borderRadius.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(10),
  },
  userCard: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  userRowRtl: {
    flexDirection: 'row-reverse',
  },
  userCardInner: {
    flex: 1,
    padding: spacing.sm,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: moderateScale(80),
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
});

export default FollowList;
