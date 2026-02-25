import React, { useState, useEffect, useCallback } from 'react';
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
import { useCustomAlert } from '../../hooks/useCustomAlert';
import CustomAlert from '../../components/CustomAlert';
import { searchUsers, getFriends } from '../../../database/users';
import { addGroupMember } from '../../../database/chatHelpers';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import useLayout from '../../hooks/useLayout';

const AddMembers = ({ navigation, route }) => {
  const { chat } = route.params || {};
  const { t, theme, isDarkMode } = useAppSettings();
  const { user: currentUser } = useUser();
  const { contentStyle } = useLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const existingParticipants = chat?.participants || [];

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  const loadFriends = async () => {
    if (!currentUser?.$id) {
      setLoading(false);
      return;
    }

    try {
      const userFriends = await getFriends(currentUser.$id);
      // Filter out existing participants
      const availableFriends = userFriends.filter(
        friend => !existingParticipants.includes(friend.$id)
      );
      setFriends(availableFriends);
    } catch (error) {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const debounceTimeout = React.useRef(null);

  const handleSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query, 20);
      // Filter out current user and existing participants
      const filteredResults = results.filter(
        u => u.$id !== currentUser?.$id && !existingParticipants.includes(u.$id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [currentUser, existingParticipants]);

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.selectMembers') });
      return;
    }

    setAdding(true);
    try {
      // Add each selected user to the group
      const addedUsers = [];
      for (const userId of selectedUsers) {
        const result = await addGroupMember(chat.$id, userId);
        if (result) {
          addedUsers.push(userId);
        }
      }
      
      if (addedUsers.length === 0) {
        throw new Error('Failed to add any members');
      }
      
      // Update the chat participants in navigation params
      const updatedChat = {
        ...chat,
        participants: [...(chat.participants || []), ...addedUsers],
      };
      
      showAlert({
        type: 'success',
        title: t('common.success'),
        message: t('chats.membersAdded') || 'Members added successfully',
        buttons: [{
          text: t('common.ok'),
          onPress: () => {
            hideAlert();
            navigation.navigate('GroupSettings', { chat: updatedChat });
          }
        }]
      });
    } catch (error) {
      const errorMessage = error?.message || t('chats.addMembersError') || 'Failed to add members';
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setAdding(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.includes(item.$id);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleUserSelection(item.$id)}
        style={[
          styles.userCard,
          { 
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(255, 255, 255, 0.7)',
          },
          isSelected && styles.userCardSelected,
          isSelected && { borderColor: theme.primary }
        ]}>
        <ProfilePicture 
          uri={item.profilePicture}
          name={item.name}
          size={moderateScale(44)}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text, fontSize: fontSize(14) }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.userDetails, { color: theme.textSecondary, fontSize: fontSize(11) }]} numberOfLines={1}>
            {item.department}
          </Text>
        </View>
        <View style={[
          styles.checkbox,
          { 
            backgroundColor: isSelected ? theme.primary : 'transparent',
            borderColor: isSelected ? theme.primary : theme.textSecondary,
          }
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={moderateScale(16)} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const displayUsers = searchQuery.length >= 2 ? searchResults : friends;

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
              {t('chats.addMembers')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search Bar */}
          <View style={[
            styles.searchContainer,
            { 
              backgroundColor: isDarkMode 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.05)',
            }
          ]}>
            <Ionicons name="search" size={moderateScale(20)} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, fontSize: fontSize(14) }]}
              placeholder={t('chats.searchPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={handleQueryChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={moderateScale(20)} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section Title */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
            {searchQuery.length >= 2 
              ? t('search.results') || 'Search Results'
              : t('chats.friends') || 'Friends'
            }
          </Text>

          {loading || searching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : displayUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={searchQuery.length >= 2 ? "search-outline" : "people-outline"} 
                size={moderateScale(48)} 
                color={theme.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fontSize(14) }]}>
                {searchQuery.length >= 2 
                  ? t('search.noResults')
                  : t('chats.noFriendsToAdd') || 'No friends available to add'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayUsers}
              keyExtractor={(item) => item.$id}
              renderItem={renderUserItem}
              contentContainerStyle={[styles.listContent, contentStyle]}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Add Button */}
          {selectedUsers.length > 0 && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={handleAddMembers}
              disabled={adding}>
              {adding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={moderateScale(20)} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>
                    {t('chats.addMembers')} ({selectedUsers.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: wp(4),
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontWeight: '700',
  },
  placeholder: {
    width: moderateScale(32),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(4),
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    paddingHorizontal: wp(4),
    marginBottom: spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
    gap: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(15),
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userCardSelected: {
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontWeight: '600',
  },
  userDetails: {
    marginTop: 2,
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: hp(4),
    left: wp(4),
    right: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: fontSize(16),
  },
});

export default AddMembers;
