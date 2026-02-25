import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ActivityIndicator, View, Animated, Image, StyleSheet, AppState, Modal, TouchableOpacity, Text } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { UserProvider, useUser } from './context/UserContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import CustomAlert from './components/CustomAlert';
import { GlobalAlertProvider, useGlobalAlert } from './context/GlobalAlertContext';
import { wp, normalize, spacing } from './utils/responsive';
import { borderRadius, shadows } from './theme/designTokens';
import realtimeDebugLogger from './utils/realtimeDebugLogger';
import { getCurrentUser, getUserDocument, signOut } from '../database/auth';
import { getAllUserChats } from '../database/chatHelpers';
import { getTotalUnreadCount } from '../database/chats';
import { updateUserPushToken, updateLastSeen } from '../database/users';
import appwriteClient from '../database/config';
import {
  registerForPushNotifications,
  registerAppwriteTarget,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  checkInitialNotification,
  setBadgeCount,
} from '../services/pushNotificationService';
import { ensureFirebaseAuth } from '../services/firebase';

import SignIn from './auth/SignIn';
import SignUp from './auth/SignUp';
import VerifyEmail from './auth/VerifyEmail';
import ForgotPassword from './auth/ForgotPassword';

import Home from './tabs/Home';
import Chats from './tabs/Chats';
import Post from './tabs/Post';
import Lecture from './tabs/Lecture';
import Profile from './tabs/Profile';

import Settings from './screens/Settings';
import ChangePassword from './screens/ChangePassword';
import ProfileSettings from './screens/settings/ProfileSettings';
import PersonalizationSettings from './screens/settings/PersonalizationSettings';
import NotificationSettings from './screens/settings/NotificationSettings';
import AccountSettings from './screens/settings/AccountSettings';
import ChatSettings from './screens/settings/ChatSettings';
import BlockList from './screens/settings/BlockList';
import SavedPosts from './screens/settings/SavedPosts';
import PostDetails from './screens/PostDetails';
import EditPost from './screens/EditPost';
import ChatRoom from './screens/ChatRoom';
import UserProfile from './screens/UserProfile';
import FollowList from './screens/FollowList';
import ManageRepresentatives from './screens/ManageRepresentatives';
import { RepVotingScreen, ReselectionRequestScreen } from './screens/representatives';
import Notifications from './screens/Notifications';
import LectureChannel from './screens/LectureChannel';
import { NewChat, UserSearch, CreateGroup, GroupSettings, ForwardMessage, AddMembers } from './screens/chats';

const shouldIgnoreAppwriteServerError = (args) => {
  if (!Array.isArray(args)) {
    return false;
  }

  return args.some((arg) => {
    if (!arg || typeof arg !== 'object') {
      return false;
    }

    const message = typeof arg.message === 'string' ? arg.message.toLowerCase() : '';
    return arg.code === 1008 && message.includes('server error');
  });
};

const shouldSilenceRealtimeDisconnect = (args) => {
  if (!Array.isArray(args)) {
    return false;
  }

  return args.some((arg) => {
    if (typeof arg === 'string') {
      return arg.includes('Realtime got disconnected. Reconnect will be attempted in');
    }

    if (arg && typeof arg.message === 'string') {
      return arg.message.includes('Realtime got disconnected. Reconnect will be attempted in');
    }

    return false;
  });
};

if (__DEV__ && !global.__APPWRITE_SERVER_ERROR_FILTER__) {
  global.__APPWRITE_SERVER_ERROR_FILTER__ = true;
  const originalConsoleError = console.error;

  console.error = (...args) => {
    if (shouldIgnoreAppwriteServerError(args)) {
      return;
    }

    if (shouldSilenceRealtimeDisconnect(args)) {
      realtimeDebugLogger.warn('realtime_disconnect_notice', {
        args,
      });
      return;
    }

    originalConsoleError.apply(console, args);
  };
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AnimatedTabIcon = ({ focused, iconName, color, size }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.2 : 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
  );
};

const TabNavigator = () => {
  const { t, theme, isDarkMode, loadUserChatSettings } = useAppSettings();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load user-specific chat settings when user changes
  useEffect(() => {
    if (user?.$id) {
      loadUserChatSettings(user.$id);
    }
  }, [user?.$id]);

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

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.$id || !user?.department) return;
    try {
      const stageValue = stageToValue(user.stage);
      const chats = await getAllUserChats(user.$id, user.department, stageValue);
      const allChats = [
        ...(chats.defaultGroups || []),
        ...(chats.customGroups || []),
        ...(chats.privateChats || []),
      ];
      const chatIds = allChats.map(c => c.$id);
      const total = await getTotalUnreadCount(user.$id, chatIds, {
        useCache: true,
        cacheOnly: true,
      });
      setUnreadCount(total);
    } catch (error) {
      // Silently fail
    }
  }, [user?.$id, user?.department, user?.stage]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Post') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Lecture') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <AnimatedTabIcon focused={focused} iconName={iconName} color={color} size={size} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={Home} 
        options={{ title: t('tabs.home') }}
      />
      <Tab.Screen 
        name="Chats" 
        component={Chats} 
        options={{ 
          title: t('tabs.chats'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            fontSize: 10,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tab.Screen 
        name="Post" 
        component={Post} 
        options={{ 
          title: t('tabs.post'),
          tabBarIconStyle: { marginTop: -4 }
        }}
      />
      <Tab.Screen 
        name="Lecture" 
        component={Lecture} 
        options={{ title: t('tabs.lecture') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={Profile} 
        options={{ title: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
};

const MainStack = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const user = await getCurrentUser();
      
      if (user) {
        try {
          const userDoc = await getUserDocument(user.$id);
          setIsAuthenticated(!!userDoc);
        } catch (error) {
          await signOut();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <Image
          source={require('../assets/icon.png')}
          style={loadingStyles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#007AFF" style={loadingStyles.loader} />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={isAuthenticated ? 'MainTabs' : 'SignIn'}
    >
      <Stack.Screen 
        name="SignIn" 
        component={SignIn}
      />
      <Stack.Screen 
        name="SignUp" 
        component={SignUp}
      />
      <Stack.Screen 
        name="VerifyEmail" 
        component={VerifyEmail}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPassword}
      />
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
      />
      <Stack.Screen 
        name="Settings" 
        component={Settings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProfileSettings" 
        component={ProfileSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PersonalizationSettings" 
        component={PersonalizationSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AccountSettings" 
        component={AccountSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatSettings" 
        component={ChatSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BlockList" 
        component={BlockList}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SavedPosts" 
        component={SavedPosts}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePassword}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PostDetails" 
        component={PostDetails}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EditPost" 
        component={EditPost}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatRoom" 
        component={ChatRoom}
        options={{ headerShown: true }}
      />
      <Stack.Screen 
        name="NewChat" 
        component={NewChat}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserSearch" 
        component={UserSearch}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroup}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GroupSettings" 
        component={GroupSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddMembers" 
        component={AddMembers}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ForwardMessage" 
        component={ForwardMessage}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FollowList" 
        component={FollowList}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageRepresentatives" 
        component={ManageRepresentatives}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RepVoting" 
        component={RepVotingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ReselectionRequest" 
        component={ReselectionRequestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={Notifications}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LectureChannel"
        component={LectureChannel}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const UpdatePrompt = () => {
  const { t, theme, isDarkMode } = useAppSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(null);

  const checkForUpdates = useCallback(async () => {
    if (!Updates.isEnabled) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setIsVisible(true);
        setStatus('available');
      }
    } catch (error) {
      // Silent fail for update check
    }
  }, []);

  useEffect(() => {
    checkForUpdates();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkForUpdates();
      }
    });

    let updatesSubscription;
    if (Updates.addListener) {
      updatesSubscription = Updates.addListener((event) => {
        if (event?.type === 'downloadProgress') {
          const { totalBytes, downloadedBytes } = event;
          if (totalBytes > 0) {
            setProgress(downloadedBytes / totalBytes);
          }
        }
      });
    }

    return () => {
      appStateSubscription?.remove();
      updatesSubscription?.remove?.();
    };
  }, [checkForUpdates]);

  const handleLater = () => {
    setIsVisible(false);
    setStatus('idle');
    setProgress(null);
  };

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(null);

    try {
      await Updates.fetchUpdateAsync();
      setStatus('ready');
    } catch (error) {
      setStatus('error');
    }
  };

  const handleInstall = async () => {
    setStatus('installing');
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setStatus('error');
    }
  };

  const titleText = t('common.updates.title');
  const bodyText = (() => {
    if (status === 'available') return t('common.updates.availableBody');
    if (status === 'downloading') return t('common.updates.downloading');
    if (status === 'ready') return t('common.updates.ready');
    if (status === 'installing') return t('common.updates.installing');
    if (status === 'error') return t('common.updates.error');
    return t('common.updates.availableBody');
  })();

  if (!isVisible || !Updates.isEnabled) {
    return null;
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={[updateStyles.overlay, { backgroundColor: theme.overlay }]}>
        <View
          style={[
            updateStyles.card,
            {
              backgroundColor: theme.card || theme.backgroundSecondary,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Text style={[updateStyles.title, { color: theme.text }]}>{titleText}</Text>
          <Text style={[updateStyles.body, { color: theme.textSecondary }]}>{bodyText}</Text>

          {status === 'downloading' && (
            <View style={updateStyles.progressContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[updateStyles.progressText, { color: theme.textSecondary }]}>
                {progress !== null
                  ? t('common.updates.progress', { percent: Math.round(progress * 100) })
                  : t('common.updates.downloading')}
              </Text>
              <View
                style={[
                  updateStyles.progressTrack,
                  { backgroundColor: theme.borderSecondary },
                ]}
              >
                <View
                  style={[
                    updateStyles.progressFill,
                    {
                      backgroundColor: theme.primary,
                      width: progress !== null ? `${Math.max(4, Math.round(progress * 100))}%` : '12%',
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {status === 'installing' && (
            <View style={updateStyles.progressContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[updateStyles.progressText, { color: theme.textSecondary }]}>
                {t('common.updates.installing')}
              </Text>
            </View>
          )}

          <View style={updateStyles.actions}>
            {status === 'available' && (
              <>
                <TouchableOpacity
                  style={[updateStyles.secondaryButton, { borderColor: theme.border }]}
                  activeOpacity={0.8}
                  onPress={handleLater}
                >
                  <Text style={[updateStyles.secondaryText, { color: theme.textSecondary }]}>
                    {t('common.updates.later')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[updateStyles.primaryButton, { backgroundColor: theme.primary }]}
                  activeOpacity={0.85}
                  onPress={handleDownload}
                >
                  <Text
                    style={[
                      updateStyles.primaryText,
                      { color: isDarkMode ? theme.text : theme.background },
                    ]}
                  >
                    {t('common.updates.download')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'ready' && (
              <TouchableOpacity
                style={[updateStyles.primaryButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.85}
                onPress={handleInstall}
              >
                <Text
                  style={[
                    updateStyles.primaryText,
                    { color: isDarkMode ? theme.text : theme.background },
                  ]}
                >
                  {t('common.updates.install')}
                </Text>
              </TouchableOpacity>
            )}

            {status === 'error' && (
              <>
                <TouchableOpacity
                  style={[updateStyles.secondaryButton, { borderColor: theme.border }]}
                  activeOpacity={0.8}
                  onPress={handleLater}
                >
                  <Text style={[updateStyles.secondaryText, { color: theme.textSecondary }]}>
                    {t('common.updates.later')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[updateStyles.primaryButton, { backgroundColor: theme.primary }]}
                  activeOpacity={0.85}
                  onPress={handleDownload}
                >
                  <Text
                    style={[
                      updateStyles.primaryText,
                      { color: isDarkMode ? theme.text : theme.background },
                    ]}
                  >
                    {t('common.updates.retry')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Component to handle notification setup and listeners
const NotificationSetup = ({ navigationRef }) => {
  const { user } = useUser();
  const { notificationsEnabled, t } = useAppSettings();
  const notificationListenerRef = useRef();
  const responseListenerRef = useRef();

  // Create Android notification channel at app startup (independent of permission)
  useEffect(() => {
    const setupNotificationChannel = async () => {
      if (Platform.OS === 'android') {
        await ExpoNotifications.setNotificationChannelAsync('default', {
          name: t('notifications.channels.defaultName'),
          importance: ExpoNotifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await ExpoNotifications.setNotificationChannelAsync('chat', {
          name: t('notifications.channels.chatName'),
          description: t('notifications.channels.chatDescription'),
          importance: ExpoNotifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }
    };
    setupNotificationChannel();
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!user?.$id || !notificationsEnabled) {
        return;
      }

      try {
        const token = await registerForPushNotifications();

        if (token) {
          await updateUserPushToken(user.$id, token, Platform.OS);
          await registerAppwriteTarget();
        }
      } catch (error) {
      }
    };

    setupNotifications();
  }, [user?.$id, notificationsEnabled]);

  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListenerRef.current = addNotificationReceivedListener(() => {
    });

    // Listen for user tapping on notifications
    responseListenerRef.current = addNotificationResponseListener(response => {
      const data = response?.notification?.request?.content?.data || {};
      const type = data?.type || '';
      
      // Navigate based on notification type
      if (navigationRef.current) {
        if ((type === 'lecture_upload' || type === 'lecture_mention') && data.postId) {
          navigationRef.current.navigate('LectureChannel', { channelId: data.postId });
        } else if (data.postId) {
          const navParams = { postId: data.postId };
          if (data.replyId && (type === 'post_reply')) {
            navParams.targetReplyId = data.replyId;
          }
          navigationRef.current.navigate('PostDetails', navParams);
        } else if (data.chatId) {
          navigationRef.current.navigate('ChatRoom', { chatId: data.chatId });
        } else if (data.userId && type === 'follow') {
          navigationRef.current.navigate('UserProfile', { userId: data.userId });
        } else if (type) {
          navigationRef.current.navigate('Notifications');
        }
      }
    });

    // Check if app was opened from a notification
    const checkInitialNotificationHandler = async () => {
      const data = await checkInitialNotification();
      if (data && navigationRef.current) {
        const type = data?.type || '';
        setTimeout(() => {
          if ((type === 'lecture_upload' || type === 'lecture_mention') && data.postId) {
            navigationRef.current.navigate('LectureChannel', { channelId: data.postId });
          } else if (data.postId) {
            const navParams = { postId: data.postId };
            if (data.replyId && type === 'post_reply') {
              navParams.targetReplyId = data.replyId;
            }
            navigationRef.current.navigate('PostDetails', navParams);
          } else if (data.chatId) {
            navigationRef.current.navigate('ChatRoom', { chatId: data.chatId });
          } else if (data.userId && type === 'follow') {
            navigationRef.current.navigate('UserProfile', { userId: data.userId });
          }
        }, 1000);
      }
    };

    checkInitialNotificationHandler();

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [navigationRef]);

  return null;
};

const RealtimeLifecycleManager = () => {
  const resumeTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Bootstrap Firebase anonymous auth early so RTDB listeners are ready.
  // ensureFirebaseAuth() already handles timeouts and returns false on
  // failure, but we add a .catch() guard for extra safety so no
  // unhandled rejection can surface even on bad networks.
  useEffect(() => {
    ensureFirebaseAuth().catch(() => {});
  }, []);

  const pauseRealtime = useCallback(() => {
    const realtime = appwriteClient?.realtime;
    if (!realtime) {
      return;
    }

    try {
      if (realtime.heartbeat) {
        clearInterval(realtime.heartbeat);
        realtime.heartbeat = undefined;
      }

      if (realtime.socket && realtime.socket.readyState < 2) {
        realtime.reconnect = false;
        realtime.socket.close();
      }
    } catch (error) {
      // Ignore realtime teardown errors
    }
  }, []);

  const resumeRealtime = useCallback(() => {
    const realtime = appwriteClient?.realtime;
    if (!realtime) {
      return;
    }

    try {
      realtime.reconnect = true;

      if (realtime.channels?.size > 0 && (!realtime.socket || realtime.socket.readyState > 1)) {
        realtime.connect?.();
      }
    } catch (error) {
      // Ignore realtime startup errors
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current?.match(/inactive|background/);

      if (nextState?.match(/inactive|background/)) {
        pauseRealtime();
      } else if (wasBackground && nextState === 'active') {
        if (resumeTimeoutRef.current) {
          clearTimeout(resumeTimeoutRef.current);
        }

        resumeTimeoutRef.current = setTimeout(() => {
          resumeRealtime();
        }, 300);
      }

      appStateRef.current = nextState;
    });

    return () => {
      subscription?.remove();
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [pauseRealtime, resumeRealtime]);

  return null;
};

/**
 * Tracks the current user's lastSeen timestamp so other users can
 * see online / last-seen status.  Respects the showActivityStatus
 * privacy setting.
 */
const LastSeenTracker = () => {
  const { user } = useUser();
  const { showActivityStatus } = useAppSettings();

  useEffect(() => {
    if (!user?.$id || !showActivityStatus) return;

    updateLastSeen(user.$id);

    const interval = setInterval(() => {
      updateLastSeen(user.$id);
    }, 60000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        updateLastSeen(user.$id);
      }
    });

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, [user?.$id, showActivityStatus]);

  return null;
};

// Component to handle deep links for password recovery
const DeepLinkHandler = ({ navigationRef, pendingRouteRef }) => {
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      if (!url) return;
      
      try {
        const parsed = Linking.parse(url);
        const parsedPath = parsed?.path || '';
        const parsedHost = parsed?.hostname || '';

        const navigateSafe = (name, params) => {
          if (navigationRef?.isReady?.()) {
            navigationRef.navigate(name, params);
            return true;
          }
          if (pendingRouteRef) {
            pendingRouteRef.current = { name, params };
          }
          return false;
        };
        
        // Handle password reset deep link (both schemes)
        // collegecommunity://reset-password OR appwrite-callback-xxx://reset-password
        if (parsedPath === 'reset-password' || url.includes('reset-password')) {
          const { userId, secret } = parsed.queryParams || {};
          if (userId && secret) {
            // Navigate to ForgotPassword with recovery params
            navigateSafe('ForgotPassword', { userId, secret });
          }
        }

        // Handle profile deep link
        // collegecommunity://profile/{userId}
        if (parsedPath && parsedPath.startsWith('profile/')) {
          const profileUserId = parsedPath.replace('profile/', '');
          if (profileUserId) {
            navigateSafe('UserProfile', { userId: profileUserId });
          }
        } else if (parsedHost === 'profile' && parsedPath) {
          const profileUserId = parsedPath;
          navigateSafe('UserProfile', { userId: profileUserId });
        }

        // Handle lecture channel deep link
        // collegecommunity://lecture-channel/{channelId}?assetId={assetId}
        const lectureAssetId = parsed?.queryParams?.assetId || '';
        if (parsedPath && parsedPath.startsWith('lecture-channel/')) {
          const lectureChannelId = parsedPath.replace('lecture-channel/', '');
          if (lectureChannelId) {
            navigateSafe('LectureChannel', { channelId: lectureChannelId, assetId: lectureAssetId });
          }
        } else if (parsedHost === 'lecture-channel' && parsedPath) {
          const lectureChannelId = parsedPath;
          navigateSafe('LectureChannel', { channelId: lectureChannelId, assetId: lectureAssetId });
        }
      } catch (error) {
        // Silent fail for deep link parsing errors
      }
    };

    // Check initial URL when app opens
    const checkInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };

    checkInitialURL();

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription?.remove();
    };
  }, [navigationRef, pendingRouteRef]);

  return null;
};

// Global CustomAlert rendered as a sibling to NavigationContainer
// This ensures the alert survives screen unmounts (e.g., Settings closing)
const GlobalCustomAlert = () => {
  const globalAlert = useGlobalAlert();
  if (!globalAlert) return null;

  const { alertConfig, hideAlert } = globalAlert;

  return (
    <CustomAlert
      visible={alertConfig.visible}
      type={alertConfig.type}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onDismiss={hideAlert}
    />
  );
};

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const pendingRouteRef = useRef(null);

  try {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <LanguageProvider>
              <AppSettingsProvider>
                <UserProvider>
                  <GlobalAlertProvider>
                    <NavigationContainer
                      ref={navigationRef}
                      onReady={() => {
                        if (pendingRouteRef.current && navigationRef.isReady()) {
                          const { name, params } = pendingRouteRef.current;
                          pendingRouteRef.current = null;
                          navigationRef.navigate(name, params);
                        }
                      }}>
                      <RealtimeLifecycleManager />
                      <LastSeenTracker />
                      <NotificationSetup navigationRef={navigationRef} />
                      <DeepLinkHandler navigationRef={navigationRef} pendingRouteRef={pendingRouteRef} />
                      <UpdatePrompt />
                      <MainStack />
                    </NavigationContainer>
                    <GlobalCustomAlert />
                  </GlobalAlertProvider>
                </UserProvider>
              </AppSettingsProvider>
            </LanguageProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  } catch (error) {
    throw error;
  }
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  loader: {
    marginTop: 10,
  },
});

const updateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: wp(86),
    maxWidth: 420,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.medium,
  },
  title: {
    fontSize: normalize(18),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: normalize(14),
    lineHeight: normalize(20),
    marginBottom: spacing.md,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressText: {
    marginTop: spacing.xs,
    fontSize: normalize(12),
  },
  progressTrack: {
    width: '100%',
    height: normalize(6),
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.round,
  },
  actions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: wp(28),
    alignItems: 'center',
  },
  primaryText: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
    minWidth: wp(28),
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
});