import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useUser } from '../../context/UserContext';
import AnimatedBackground from '../../components/AnimatedBackground';
import ProfilePicture from '../../components/ProfilePicture';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { searchUsers, getFriends } from '../../../database/users';
import { createPrivateChat } from '../../../database/chatHelpers';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';

const UserSearch = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user: currentUser } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [searched, setSearched] = useState(false);
  const [startingChat, setStartingChat] = useState(null);

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  const loadFriends = async () => {
    if (!currentUser?.$id) {
      setLoadingFriends(false);
      return;
    }

    try {
      const userFriends = await getFriends(currentUser.$id);
      const filteredFriends = userFriends.filter(u => u.$id !== currentUser.$id);
      setFriends(filteredFriends);
    } catch (error) {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const debounceTimeout = React.useRef(null);

  const handleSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setUsers([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const results = await searchUsers(query, 20);
      const filteredResults = results.filter(u => u.$id !== currentUser?.$id);
      setUsers(filteredResults);
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  const handleUserPress = async (selectedUser) => {
    if (!currentUser || startingChat) return;

    setStartingChat(selectedUser.$id);

    try {
      const chat = await createPrivateChat(
        { $id: currentUser.$id, name: currentUser.fullName },
        { $id: selectedUser.$id, name: selectedUser.name }
      );

      if (chat) {
        navigation.replace('ChatRoom', { 
          chat: {
            ...chat,
            otherUser: selectedUser,
          }
        });
      } else {
        showAlert({ type: 'error', title: t('common.error'), message: t('chats.errorCreatingChat') });
        setStartingChat(null);
      }
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: error.message || t('chats.errorCreatingChat') });
      setStartingChat(null);
    }
  };

  const cardBackground = isDarkMode 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(255, 255, 255, 0.85)';

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleUserPress(item)}
      disabled={startingChat === item.$id}
      style={[
        styles.userCard,
        { 
          backgroundColor: cardBackground,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        }
      ]}>
      <ProfilePicture 
        uri={item.profilePicture}
        name={item.name}
        size={moderateScale(44)}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text, fontSize: fontSize(15) }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.userDetails, { color: theme.textSecondary, fontSize: fontSize(12) }]} numberOfLines={1}>
          {item.department ? `${item.department}` : item.email}
        </Text>
      </View>
      {startingChat === item.$id ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <View style={[styles.messageButton, { backgroundColor: `${theme.primary}15` }]}>
          <Ionicons name="chatbubble" size={moderateScale(16)} color={theme.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
            {t('chats.searchingUsers')}
          </Text>
        </View>
      );
    }

    if (!searched && friends.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,122,255,0.1)' }]}>
            <Ionicons name="search" size={moderateScale(48)} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text, fontSize: fontSize(18) }]}>
            {t('chats.searchUsers')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
            {t('chats.searchPlaceholder')}
          </Text>
        </View>
      );
    }

    if (searched && users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,122,255,0.1)' }]}>
            <Ionicons name="person-outline" size={moderateScale(48)} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text, fontSize: fontSize(18) }]}>
            {t('chats.emptySearchTitle')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
            {t('chats.emptySearchMessage')}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Determine what data to show
  const displayData = searched ? users : friends;
  const showFriendsLabel = !searched && friends.length > 0;

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
          : ['#f0f4ff', '#d8e7ff', '#c0deff']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <AnimatedBackground particleCount={15} />
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Ionicons 
                name="arrow-back" 
                size={moderateScale(24)} 
                color={theme.text} 
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(20) }]}>
              {t('chats.searchUsers')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.searchContainer}>
            <View style={[
              styles.searchInputContainer,
              { 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
              }
            ]}>
              <Ionicons 
                name="search" 
                size={moderateScale(20)} 
                color={theme.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.text, fontSize: fontSize(15) }]}
                placeholder={t('chats.searchPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={handleQueryChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setUsers([]);
                    setSearched(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons 
                    name="close-circle" 
                    size={moderateScale(20)} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loadingFriends && !searched ? (
            <View style={styles.loadingFriendsContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={displayData}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmpty}
              ListHeaderComponent={showFriendsLabel ? (
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                  {t('chats.friends')}
                </Text>
              ) : null}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  placeholder: {
    width: moderateScale(40),
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontWeight: '400',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userDetails: {
    fontWeight: '400',
  },
  messageButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: hp(10),
  },
  emptyIconContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: fontSize(20),
  },
  loadingFriendsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(10),
  },
  sectionLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});

export default UserSearch;
