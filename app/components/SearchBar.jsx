import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  Modal,
  Keyboard,
  ActivityIndicator,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { GlassContainer } from './GlassComponents';
import { wp, hp, fontSize, spacing, moderateScale } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import UserCard from './UserCard';
import PostCard from './PostCard';
import { searchUsers } from '../../database/users';
import { searchPosts, enrichPostsWithUserData } from '../../database/posts';

const SEARCH_FILTERS = {
  ALL: 'all',
  PEOPLE: 'people',
  POSTS: 'posts',
  HASHTAGS: 'hashtags',
};

const SearchBar = forwardRef(({ onUserPress, onPostPress, iconOnly = false }, ref) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user: currentUser } = useUser();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState(SEARCH_FILTERS.ALL);
  const [results, setResults] = useState({
    users: [],
    posts: [],
  });
  const searchTimeout = useRef(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openWithQuery: (query) => {
      setSearchQuery(query);
      setIsModalVisible(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
        performSearch(query);
      }, 100);
    },
  }));
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      setIsSearching(true);
      
      searchTimeout.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 1000);
    } else {
      setResults({ users: [], posts: [] });
      setIsSearching(false);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query, filter = activeFilter) => {
    if (!query || query.trim().length === 0) {
      setIsSearching(false);
      return;
    }

    try {
      let cleanQuery = query.trim();
      
      // For hashtag filter, strip # if present for searching
      const isHashtagSearch = filter === SEARCH_FILTERS.HASHTAGS || cleanQuery.startsWith('#');
      if (isHashtagSearch) {
        cleanQuery = cleanQuery.replace(/^#/, '');
      }

      let usersResults = [];
      let postsResults = [];

      // Search based on active filter
      if (filter === SEARCH_FILTERS.PEOPLE || filter === SEARCH_FILTERS.ALL) {
        usersResults = await searchUsers(cleanQuery, 10);
      }
      
      if (filter === SEARCH_FILTERS.POSTS || filter === SEARCH_FILTERS.ALL) {
        postsResults = await searchPosts(cleanQuery, currentUser?.department, currentUser?.major, 15, currentUser?.$id);
      }
      
      if (filter === SEARCH_FILTERS.HASHTAGS) {
        // Search specifically for hashtags/tags
        postsResults = await searchPosts(`#${cleanQuery}`, currentUser?.department, currentUser?.major, 15, currentUser?.$id);
      }

      // Enrich posts with user data (name, profile picture)
      if (postsResults && postsResults.length > 0) {
        postsResults = await enrichPostsWithUserData(postsResults);
      }

      setResults({
        users: usersResults || [],
        posts: postsResults || [],
      });
    } catch (error) {
      setResults({ users: [], posts: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      performSearch(searchQuery, filter);
    }
  };

  const handleSearchSubmit = () => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      performSearch(searchQuery);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults({ users: [], posts: [] });
  };

  const handleOpenModal = () => {
    setIsModalVisible(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSearchQuery('');
    setResults({ users: [], posts: [] });
    setActiveFilter(SEARCH_FILTERS.ALL);
    Keyboard.dismiss();
  };

  const handleUserSelect = (user) => {
    handleCloseModal();
    if (onUserPress) {
      onUserPress(user);
    }
  };

  const handlePostSelect = (post) => {
    handleCloseModal();
    if (onPostPress) {
      onPostPress(post);
    }
  };

  const renderSearchResults = () => {
    // Filter results based on active filter
    const showUsers = activeFilter === SEARCH_FILTERS.ALL || activeFilter === SEARCH_FILTERS.PEOPLE;
    const showPosts = activeFilter === SEARCH_FILTERS.ALL || activeFilter === SEARCH_FILTERS.POSTS || activeFilter === SEARCH_FILTERS.HASHTAGS;
    
    const filteredUsers = showUsers ? results.users : [];
    const filteredPosts = showPosts ? results.posts : [];
    
    const hasResults = filteredUsers.length > 0 || filteredPosts.length > 0;
    const hasQuery = searchQuery.trim().length > 0;

    if (isSearching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {t('search.searching')}
          </Text>
        </View>
      );
    }

    if (!hasQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={moderateScale(64)}
            color={theme.subText}
          />
          <Text style={[styles.emptyText, { color: theme.subText }]}>
            {t('search.placeholder')}
          </Text>
        </View>
      );
    }

    if (!hasResults) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={moderateScale(48)}
            color={theme.subText}
          />
          <Text style={[styles.emptyText, { color: theme.subText }]}>
            {t('search.noResults')}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={[
          ...(filteredUsers.length > 0 ? [{ type: 'header', title: t('search.users') || 'Users', icon: 'people' }] : []),
          ...filteredUsers.map(searchedUser => ({ type: 'user', data: searchedUser })),
          ...(filteredPosts.length > 0 ? [{ type: 'header', title: activeFilter === SEARCH_FILTERS.HASHTAGS ? (t('search.taggedPosts') || 'Tagged Posts') : (t('search.posts') || 'Posts'), icon: activeFilter === SEARCH_FILTERS.HASHTAGS ? 'pricetag' : 'document-text' }] : []),
          ...filteredPosts.map(post => ({ type: 'post', data: post })),
        ]}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeaderContainer}>
                <Ionicons
                  name={item.icon}
                  size={moderateScale(16)}
                  color={theme.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={[styles.sectionHeader, { color: theme.text }]}>
                  {item.title}
                </Text>
              </View>
            );
          } else if (item.type === 'user') {
            return (
              <TouchableOpacity
                onPress={() => handleUserSelect(item.data)}
                style={styles.resultItem}
                activeOpacity={0.7}
              >
                <UserCard user={item.data} compact />
              </TouchableOpacity>
            );
          } else if (item.type === 'post') {
            return (
              <View style={styles.resultItem}>
                <PostCard
                  post={item.data}
                  onPress={() => handlePostSelect(item.data)}
                  onUserPress={() => {
                    const userId = item.data.userId;
                    handleCloseModal();
                    if (onUserPress && userId) {
                      onUserPress({ $id: userId });
                    }
                  }}
                />
              </View>
            );
          }
        }}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.resultsListContent}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <>
      <TouchableOpacity 
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        {iconOnly ? (
          <View 
            style={[
              styles.iconOnlyButton,
              {
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.04)',
                borderWidth: 0.5,
                borderColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(0, 0, 0, 0.08)',
                borderRadius: borderRadius.md,
              }
            ]}
          >
            <Ionicons
              name="search-outline"
              size={moderateScale(22)}
              color={theme.text}
            />
          </View>
        ) : (
          <GlassContainer borderRadius={borderRadius.lg} style={styles.searchButton}>
            <Ionicons
              name="search-outline"
              size={moderateScale(20)}
              color={theme.subText}
              style={styles.searchIcon}
            />
            <Text style={[styles.searchButtonText, { color: theme.subText, fontSize: fontSize(14) }]}>
              {t('search.placeholder')}
            </Text>
          </GlassContainer>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={handleCloseModal}
        statusBarTranslucent
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
          <View style={[styles.searchHeader, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.backButton}>
              <Ionicons name="arrow-back" size={moderateScale(24)} color={theme.text} />
            </TouchableOpacity>
            
            <View style={[
              styles.searchInputContainer,
              {
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.06)',
              }
            ]}>
              <Ionicons
                name="search-outline"
                size={moderateScale(20)}
                color={isDarkMode ? theme.text : theme.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  {
                    color: theme.text,
                    fontSize: fontSize(16),
                  },
                ]}
                placeholder={t('search.placeholder')}
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                  <Ionicons
                    name="close-circle"
                    size={moderateScale(20)}
                    color={isDarkMode ? theme.text : theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={[styles.filterTabsContainer, { borderBottomColor: theme.border }]}
            contentContainerStyle={styles.filterTabsContent}
          >
            {[
              { key: SEARCH_FILTERS.ALL, label: t('search.all') || 'All', icon: 'apps-outline' },
              { key: SEARCH_FILTERS.PEOPLE, label: t('search.people') || 'People', icon: 'people-outline' },
              { key: SEARCH_FILTERS.POSTS, label: t('search.posts') || 'Posts', icon: 'document-text-outline' },
              { key: SEARCH_FILTERS.HASHTAGS, label: t('search.hashtags') || 'Tags', icon: 'pricetag-outline' },
            ].map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterTab,
                    {
                      backgroundColor: isActive
                        ? (isDarkMode ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)')
                        : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                      borderColor: isActive
                        ? theme.primary + '50'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => handleFilterChange(filter.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? filter.icon.replace('-outline', '') : filter.icon}
                    size={moderateScale(16)}
                    color={isActive ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.6)' : theme.textSecondary)}
                  />
                  <Text
                    style={[
                      styles.filterTabText,
                      {
                        color: isActive ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.6)' : theme.textSecondary),
                        fontWeight: isActive ? '600' : '500',
                      },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

          <View style={styles.resultsContainer}>
            {renderSearchResults()}
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  iconOnlyButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchButtonText: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  filterTabsContainer: {
    borderBottomWidth: 0,
    maxHeight: moderateScale(52),
  },
  filterTabsContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: fontSize(11),
  },
  divider: {
    height: 1,
    width: '100%',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize(14),
    textAlign: 'center',
  },
  resultsListContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderIcon: {
    marginRight: spacing.xs,
  },
  sectionHeader: {
    fontWeight: '600',
    fontSize: fontSize(16),
  },
  resultItem: {
    marginBottom: spacing.sm,
  },
  postPreview: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  postTitle: {
    fontWeight: '600',
    fontSize: fontSize(15),
    marginBottom: spacing.xs,
  },
  postContent: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
  },
});

export default SearchBar;
