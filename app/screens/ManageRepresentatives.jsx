import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { GlassContainer } from '../components/GlassComponents';
import AnimatedBackground from '../components/AnimatedBackground';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { 
  getUserGroupChats, 
  addRepresentative, 
  removeRepresentative,
  getChat 
} from '../../database/chats';
import { searchUsers } from '../../database/users';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const ManageRepresentatives = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const stageToValue = (stage) => {
    if (!stage) return null;
    const stageMap = {
      'firstYear': '1',
      'secondYear': '2',
      'thirdYear': '3',
      'fourthYear': '4',
      'fifthYear': '5',
      'sixthYear': '6',
    };
    return stageMap[stage] || stage;
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadChats = async () => {
    if (!user?.department) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const stageValue = stageToValue(user.stage);
      const fetchedChats = await getUserGroupChats(user.department, stageValue, user.$id);
      setChats(fetchedChats);
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.errorLoadingChats') });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddRepresentative = async (userId) => {
    if (!selectedChat) return;

    try {
      await addRepresentative(selectedChat.$id, userId);
      
      const updatedChat = await getChat(selectedChat.$id);
      setSelectedChat(updatedChat);
      
      const updatedChats = chats.map(chat => 
        chat.$id === updatedChat.$id ? updatedChat : chat
      );
      setChats(updatedChats);
      
      setSearchQuery('');
      setSearchResults([]);
      showAlert({ type: 'success', title: t('common.success'), message: t('chats.representativeAdded') });
    } catch (error) {
      showAlert({ type: 'error', title: t('common.error'), message: t('chats.representativeAddError') });
    }
  };

  const handleRemoveRepresentative = async (userId) => {
    if (!selectedChat) return;

    showAlert({
      type: 'warning',
      title: t('chats.removeRepresentative'),
      message: t('chats.removeRepresentativeConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRepresentative(selectedChat.$id, userId);
              
              const updatedChat = await getChat(selectedChat.$id);
              setSelectedChat(updatedChat);
              
              const updatedChats = chats.map(chat => 
                chat.$id === updatedChat.$id ? updatedChat : chat
              );
              setChats(updatedChats);
              
              showAlert({ type: 'success', title: t('common.success'), message: t('chats.representativeRemoved') });
            } catch (error) {
              showAlert({ type: 'error', title: t('common.error'), message: t('chats.representativeRemoveError') });
            }
          },
        },
      ],
    });
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedChat(item)}
      activeOpacity={0.7}>
      <GlassContainer 
        borderRadius={borderRadius.lg}
        style={[
          styles.chatItem,
          selectedChat?.$id === item.$id && {
            borderWidth: 2,
            borderColor: theme.primary,
          }
        ]}>
        <View style={styles.chatItemContent}>
          <Ionicons 
            name={item.type === 'stage_group' ? 'people' : 'business'} 
            size={moderateScale(24)} 
            color={theme.primary} 
          />
          <View style={styles.chatInfo}>
            <Text style={[styles.chatName, { fontSize: fontSize(14), color: theme.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.chatMeta, { fontSize: fontSize(11), color: theme.textSecondary }]}>
              {item.representatives?.length || 0} {t('chats.representatives').toLowerCase()}
            </Text>
          </View>
        </View>
      </GlassContainer>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => {
    const isRepresentative = selectedChat?.representatives?.includes(item.$id);
    
    return (
      <TouchableOpacity
        onPress={() => !isRepresentative && handleAddRepresentative(item.$id)}
        disabled={isRepresentative}
        activeOpacity={0.7}>
        <GlassContainer 
          borderRadius={borderRadius.lg}
          style={styles.searchResultItem}>
          <View style={styles.searchResultContent}>
            <View style={[
              styles.avatar, 
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
            ]}>
              <Text style={[styles.avatarText, { fontSize: fontSize(14), color: theme.text }]}>
                {item.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { fontSize: fontSize(14), color: theme.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.userEmail, { fontSize: fontSize(11), color: theme.textSecondary }]}>
                {item.email}
              </Text>
            </View>
            {isRepresentative && (
              <Ionicons name="checkmark-circle" size={moderateScale(24)} color="#10B981" />
            )}
          </View>
        </GlassContainer>
      </TouchableOpacity>
    );
  };

  const renderRepresentative = ({ item: repId }) => (
    <GlassContainer 
      borderRadius={borderRadius.lg}
      style={styles.representativeItem}>
      <View style={styles.representativeContent}>
        <View style={[
          styles.avatar, 
          { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
        ]}>
          <Ionicons name="person" size={moderateScale(20)} color={theme.text} />
        </View>
        <Text style={[styles.repId, { fontSize: fontSize(12), color: theme.text }]}>
          {repId.substring(0, 8)}...
        </Text>
        <TouchableOpacity
          onPress={() => handleRemoveRepresentative(repId)}
          style={styles.removeButton}>
          <Ionicons name="close-circle" size={moderateScale(24)} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </GlassContainer>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1a1a2e' : '#f0f4ff' }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

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
        style={styles.gradient}>
        
        <AnimatedBackground particleCount={15} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={moderateScale(24)} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: fontSize(20), color: theme.text }]}>
            {t('chats.manageRepresentatives')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: fontSize(16), color: theme.text }]}>
              {t('chats.selectChat')}
            </Text>
            <FlatList
              data={chats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.$id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chatsList}
            />
          </View>

          {selectedChat && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontSize: fontSize(16), color: theme.text }]}>
                  {t('chats.currentRepresentatives')} ({selectedChat.representatives?.length || 0})
                </Text>
                {selectedChat.representatives && selectedChat.representatives.length > 0 ? (
                  <FlatList
                    data={selectedChat.representatives}
                    renderItem={renderRepresentative}
                    keyExtractor={(item) => item}
                    style={styles.representativesList}
                  />
                ) : (
                  <Text style={[styles.emptyText, { fontSize: fontSize(13), color: theme.textSecondary }]}>
                    {t('chats.noRepresentativesYet')}
                  </Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontSize: fontSize(16), color: theme.text }]}>
                  {t('chats.addRepresentative')}
                </Text>
                <GlassContainer borderRadius={borderRadius.lg} style={styles.searchContainer}>
                  <Ionicons name="search" size={moderateScale(20)} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { fontSize: fontSize(14), color: theme.text }]}
                    placeholder={t('chats.searchUsersPlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searching && <ActivityIndicator size="small" color={theme.primary} />}
                </GlassContainer>
                
                {searchResults.length > 0 && (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={(item) => item.$id}
                    style={styles.searchResults}
                  />
                )}
              </View>
            </>
          )}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(5),
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerSpacer: {
    width: moderateScale(40),
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(5),
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  chatsList: {
    gap: spacing.sm,
  },
  chatItem: {
    padding: spacing.md,
    marginRight: spacing.sm,
    minWidth: moderateScale(200),
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  chatMeta: {
    fontStyle: 'italic',
  },
  representativesList: {
    maxHeight: moderateScale(200),
  },
  representativeItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  representativeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  repId: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  removeButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
  searchResults: {
    maxHeight: moderateScale(300),
    marginTop: spacing.sm,
  },
  searchResultItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  userEmail: {},
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});

export default ManageRepresentatives;
