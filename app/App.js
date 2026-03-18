import React, { Activity, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, useIsFocused, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ActivityIndicator, View, Animated, Image, StyleSheet, AppState, TouchableOpacity, Text, LogBox } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { UserProvider, useUser } from './context/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import PostViewModal from './components/PostViewModal';
import CustomAlert from './components/CustomAlert';
import { GlobalAlertProvider, useGlobalAlert } from './context/GlobalAlertContext';
import { wp, normalize, spacing } from './utils/responsive';
import { borderRadius, shadows } from './theme/designTokens';
import realtimeDebugLogger from './utils/realtimeDebugLogger';
import telemetry from './utils/telemetry';
import { initCrashReporting, setCrashReportingUser } from './utils/crashReporting';
import { REFRESH_TOPICS, publishRefreshEvent, subscribeToRefreshTopic } from './utils/dataRefreshBus';
import {
  computeReconnectDelayMs,
  isRealtimeSocketConnected,
  shouldReconnectRealtime,
  tryReconnectRealtime,
} from './utils/realtimeReconnect';
import { getCurrentUser, getUserDocument, signOut } from '../database/auth';
import { getAllUserChats } from '../database/chatHelpers';
import { getTotalUnreadCount, getChat } from '../database/chats';
import { updateUserPushToken, updateLastSeen } from '../database/users';
import appwriteClient from '../database/config';
import {
  registerForPushNotifications,
  registerAppwriteTarget,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  checkInitialNotification,
  dismissPresentedNotificationsByTarget,
} from '../services/pushNotificationService';
import { markNotificationsAsReadByContext } from '../database/notifications';

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
import SuggestionSettings from './screens/settings/SuggestionSettings';
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
import LectureChannel from './screens/lectureChannel';
import { NewChat, UserSearch, CreateGroup, GroupSettings, ForwardMessage, AddMembers } from './screens/chats';

initCrashReporting();

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

LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
  'InteractionManager has been deprecated',
  'InteractionManager is deprecated',
]);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const withActivityBoundary = (ScreenComponent, screenName) => {
  const WrappedScreen = (props) => {
    const isFocused = useIsFocused();
    const renderCountRef = useRef(0);
    const focusTraceRef = useRef(null);

    renderCountRef.current += 1;

    useEffect(() => {
      telemetry.recordEvent('screen_render', {
        screen: screenName,
        renderCount: renderCountRef.current,
      });

      if (__DEV__) {
        console.log(`[render] ${screenName} #${renderCountRef.current}`);
      }
    }, [screenName]);

    useEffect(() => {
      if (isFocused) {
        telemetry.recordEvent('screen_focus', {
          screen: screenName,
          renderCount: renderCountRef.current,
        });
        focusTraceRef.current = telemetry.startTrace('screen_focus_duration', {
          screen: screenName,
          disableSlowFlag: true,
        });
        return;
      }

      if (focusTraceRef.current) {
        focusTraceRef.current.finish({ success: true });
        focusTraceRef.current = null;
      }
    }, [isFocused]);

    useEffect(() => {
      return () => {
        if (focusTraceRef.current) {
          focusTraceRef.current.finish({ success: true });
          focusTraceRef.current = null;
        }
      };
    }, []);

    return (
      <Activity mode={isFocused ? 'visible' : 'hidden'}>
        <ScreenComponent {...props} />
      </Activity>
    );
  };

  WrappedScreen.displayName = `${screenName}ActivityBoundary`;
  return WrappedScreen;
};

const HomeWithActivity = withActivityBoundary(Home, 'Home');
const ChatsWithActivity = withActivityBoundary(Chats, 'Chats');
const PostWithActivity = withActivityBoundary(Post, 'Post');
const LectureWithActivity = withActivityBoundary(Lecture, 'Lecture');
const ProfileWithActivity = withActivityBoundary(Profile, 'Profile');
const SignInWithActivity = withActivityBoundary(SignIn, 'SignIn');
const SignUpWithActivity = withActivityBoundary(SignUp, 'SignUp');
const VerifyEmailWithActivity = withActivityBoundary(VerifyEmail, 'VerifyEmail');
const ForgotPasswordWithActivity = withActivityBoundary(ForgotPassword, 'ForgotPassword');
const SettingsWithActivity = withActivityBoundary(Settings, 'Settings');
const ProfileSettingsWithActivity = withActivityBoundary(ProfileSettings, 'ProfileSettings');
const PersonalizationSettingsWithActivity = withActivityBoundary(PersonalizationSettings, 'PersonalizationSettings');
const NotificationSettingsWithActivity = withActivityBoundary(NotificationSettings, 'NotificationSettings');
const SuggestionSettingsWithActivity = withActivityBoundary(SuggestionSettings, 'SuggestionSettings');
const AccountSettingsWithActivity = withActivityBoundary(AccountSettings, 'AccountSettings');
const ChatSettingsWithActivity = withActivityBoundary(ChatSettings, 'ChatSettings');
const BlockListWithActivity = withActivityBoundary(BlockList, 'BlockList');
const SavedPostsWithActivity = withActivityBoundary(SavedPosts, 'SavedPosts');
const ChangePasswordWithActivity = withActivityBoundary(ChangePassword, 'ChangePassword');
const PostDetailsWithActivity = withActivityBoundary(PostDetails, 'PostDetails');
const EditPostWithActivity = withActivityBoundary(EditPost, 'EditPost');
const ChatRoomWithActivity = withActivityBoundary(ChatRoom, 'ChatRoom');
const NewChatWithActivity = withActivityBoundary(NewChat, 'NewChat');
const UserSearchWithActivity = withActivityBoundary(UserSearch, 'UserSearch');
const CreateGroupWithActivity = withActivityBoundary(CreateGroup, 'CreateGroup');
const GroupSettingsWithActivity = withActivityBoundary(GroupSettings, 'GroupSettings');
const AddMembersWithActivity = withActivityBoundary(AddMembers, 'AddMembers');
const ForwardMessageWithActivity = withActivityBoundary(ForwardMessage, 'ForwardMessage');
const UserProfileWithActivity = withActivityBoundary(UserProfile, 'UserProfile');
const FollowListWithActivity = withActivityBoundary(FollowList, 'FollowList');
const ManageRepresentativesWithActivity = withActivityBoundary(ManageRepresentatives, 'ManageRepresentatives');
const RepVotingScreenWithActivity = withActivityBoundary(RepVotingScreen, 'RepVoting');
const ReselectionRequestScreenWithActivity = withActivityBoundary(ReselectionRequestScreen, 'ReselectionRequest');
const NotificationsWithActivity = withActivityBoundary(Notifications, 'Notifications');
const LectureChannelWithActivity = withActivityBoundary(LectureChannel, 'LectureChannel');

const AnimatedTabIcon = ({ focused, iconName, color, size }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.2 : 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [focused, scaleValue]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
  );
};

const TabNavigator = () => {
  const { t, theme, isDarkMode, loadUserChatSettings } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastUnreadSyncAtRef = useRef(0);
  const isUnreadSyncInFlightRef = useRef(false);

  // Load user-specific chat settings when user changes
  useEffect(() => {
    if (user?.$id) {
      loadUserChatSettings(user.$id);
    }
  }, [user?.$id, loadUserChatSettings]);

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
    if (isUnreadSyncInFlightRef.current) return;

    try {
      isUnreadSyncInFlightRef.current = true;
      const stageValue = stageToValue(user.stage);
      const chats = await getAllUserChats(user.$id, user.department, stageValue);
      const allChats = [
        ...(chats.defaultGroups || []),
        ...(chats.customGroups || []),
        ...(chats.privateChats || []),
      ];
      const chatIds = allChats.map(c => c.$id);
      const total = await getTotalUnreadCount(user.$id, chatIds);
      setUnreadCount(total);
    } catch (error) {
      // Silently fail
    } finally {
      isUnreadSyncInFlightRef.current = false;
    }
  }, [user?.$id, user?.department, user?.stage]);

  const scheduleUnreadSync = useCallback((minIntervalMs = 3000) => {
    const now = Date.now();
    if (now - lastUnreadSyncAtRef.current < minIntervalMs) {
      return;
    }

    lastUnreadSyncAtRef.current = now;
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    const unsubChats = subscribeToRefreshTopic(REFRESH_TOPICS.CHATS, () => {
      scheduleUnreadSync(2500);
    });

    const unsubNotifications = subscribeToRefreshTopic(REFRESH_TOPICS.NOTIFICATIONS, () => {
      scheduleUnreadSync(4000);
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduleUnreadSync(5000);
      }
    });

    return () => {
      unsubChats();
      unsubNotifications();
      appStateSubscription?.remove();
    };
  }, [scheduleUnreadSync]);
  
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
          height: Platform.OS === 'ios' ? (60 + Math.max(insets.bottom, 20)) : (56 + Math.max(insets.bottom, 10)),
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 10),
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
        sceneStyle: {
          backgroundColor: theme.background,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeWithActivity} 
        options={{ title: t('tabs.home') }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsWithActivity} 
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
        component={PostWithActivity} 
        options={{ 
          title: t('tabs.post'),
          tabBarIconStyle: { marginTop: -4 }
        }}
      />
      <Tab.Screen 
        name="Lecture" 
        component={LectureWithActivity} 
        options={{ title: t('tabs.lecture') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileWithActivity} 
        options={{ title: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
};

const TabNavigatorWithActivity = withActivityBoundary(TabNavigator, 'MainTabs');

const MainStack = () => {
  const { theme, isDarkMode } = useAppSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const sessionTrace = telemetry.startTrace('app_check_session');
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
      sessionTrace.finish({
        success: true,
        meta: {
          isAuthenticated: Boolean(user),
        },
      });
    } catch (error) {
      sessionTrace.finish({ success: false, error });
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
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
      }}
      initialRouteName={isAuthenticated ? 'MainTabs' : 'SignIn'}
    >
      <Stack.Screen 
        name="SignIn" 
        component={SignInWithActivity}
      />
      <Stack.Screen 
        name="SignUp" 
        component={SignUpWithActivity}
      />
      <Stack.Screen 
        name="VerifyEmail" 
        component={VerifyEmailWithActivity}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordWithActivity}
      />
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigatorWithActivity}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProfileSettings" 
        component={ProfileSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PersonalizationSettings" 
        component={PersonalizationSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SuggestionSettings"
        component={SuggestionSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AccountSettings" 
        component={AccountSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatSettings" 
        component={ChatSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BlockList" 
        component={BlockListWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SavedPosts" 
        component={SavedPostsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PostDetails" 
        component={PostDetailsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EditPost" 
        component={EditPostWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatRoom" 
        component={ChatRoomWithActivity}
        options={{
          headerShown: true,
          cardStyle: { backgroundColor: theme.background },
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen 
        name="NewChat" 
        component={NewChatWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserSearch" 
        component={UserSearchWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GroupSettings" 
        component={GroupSettingsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddMembers" 
        component={AddMembersWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ForwardMessage" 
        component={ForwardMessageWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FollowList" 
        component={FollowListWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageRepresentatives" 
        component={ManageRepresentativesWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RepVoting" 
        component={RepVotingScreenWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ReselectionRequest" 
        component={ReselectionRequestScreenWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsWithActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LectureChannel"
        component={LectureChannelWithActivity}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const UpdatePrompt = () => {
  const { t, theme, isDarkMode } = useAppSettings();
  const insets = useSafeAreaInsets();
  const TOAST_DEFAULT_HIDE_MS = 2200;
  const TOAST_ERROR_HIDE_MS = 5200;
  const [isVisible, setIsVisible] = useState(false);
  const [toastKind, setToastKind] = useState('idle');
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const hideTimerRef = useRef(null);
  const isDownloadingRef = useRef(false);
  const hasReadyUpdateRef = useRef(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-16)).current;

  const animateToastIn = useCallback(() => {
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-16);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toastOpacity, toastTranslateY]);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: -10,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsVisible(false);
      }
    });
  }, [toastOpacity, toastTranslateY]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback((kind, autoHideMs = TOAST_DEFAULT_HIDE_MS) => {
    clearHideTimer();
    setToastKind(kind);
    setIsVisible(true);
    animateToastIn();

    if (autoHideMs > 0) {
      hideTimerRef.current = setTimeout(() => {
        hideToast();
      }, autoHideMs);
    }
  }, [clearHideTimer, animateToastIn, hideToast, TOAST_DEFAULT_HIDE_MS]);

  const fetchAndPrepareUpdate = useCallback(async () => {
    if (isDownloadingRef.current || hasReadyUpdateRef.current) {
      return;
    }

    isDownloadingRef.current = true;
    showToast('available');

    try {
      await Updates.fetchUpdateAsync();
      hasReadyUpdateRef.current = true;
      setIsReadyToInstall(true);
      showToast('downloaded', 0);
    } catch (error) {
      showToast('error', TOAST_ERROR_HIDE_MS);
    } finally {
      isDownloadingRef.current = false;
    }
  }, [showToast, TOAST_ERROR_HIDE_MS]);

  const checkForUpdates = useCallback(async () => {
    if (!Updates.isEnabled || isDownloadingRef.current || hasReadyUpdateRef.current) {
      return;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        fetchAndPrepareUpdate();
      }
    } catch (error) {
      // Silent fail for update check
    }
  }, [fetchAndPrepareUpdate]);

  useEffect(() => {
    checkForUpdates();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkForUpdates();
      }
    });

    return () => {
      appStateSubscription?.remove();
    };
  }, [checkForUpdates]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  const handleInstall = async () => {
    if (isInstalling) {
      return;
    }

    setIsInstalling(true);
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setIsInstalling(false);
      showToast('error', TOAST_ERROR_HIDE_MS);
    }
  };

  const toastBodyText = (() => {
    if (toastKind === 'available') return t('common.updates.detected');
    if (toastKind === 'downloaded') return t('common.updates.downloaded');
    if (toastKind === 'error') return t('common.updates.error');
    return '';
  })();

  const toastIconName = (() => {
    if (toastKind === 'downloaded') return 'checkmark-circle';
    if (toastKind === 'error') return 'alert-circle';
    return 'cloud-download';
  })();

  const toneColor = (() => {
    if (toastKind === 'downloaded') return theme.success || '#16A34A';
    if (toastKind === 'error') return theme.danger || '#DC2626';
    return theme.primary;
  })();

  const toastBackgroundColor = (() => {
    if (toastKind === 'downloaded') {
      return isDarkMode ? 'rgba(22, 163, 74, 0.18)' : 'rgba(22, 163, 74, 0.08)';
    }

    if (toastKind === 'error') {
      return isDarkMode ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.08)';
    }

    return theme.card || theme.backgroundSecondary;
  })();

  if (!isVisible || !Updates.isEnabled) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[updateStyles.toastHost, { top: insets.top + spacing.sm }]}>
      <Animated.View
        style={[
          updateStyles.toastCard,
          {
            backgroundColor: toastBackgroundColor,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }],
          },
        ]}
      >
        <View style={[updateStyles.accentBar, { backgroundColor: toneColor }]} />
        <View style={updateStyles.toastRow}>
          <Ionicons
            name={toastIconName}
            size={normalize(18)}
            color={toneColor}
            style={updateStyles.toastIcon}
          />
          <View style={updateStyles.toastTextWrap}>
            <Text style={[updateStyles.toastTitle, { color: theme.text }]}>{t('common.updates.title')}</Text>
            <Text style={[updateStyles.toastBody, { color: theme.textSecondary }]}>{toastBodyText}</Text>
          </View>
          {toastKind === 'available' && <ActivityIndicator size="small" color={theme.primary} />}
          {toastKind === 'downloaded' && isReadyToInstall && (
            <TouchableOpacity
              style={[updateStyles.actionButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <ActivityIndicator size="small" color={isDarkMode ? theme.text : theme.background} />
              ) : (
                <Text
                  style={[
                    updateStyles.actionText,
                    { color: isDarkMode ? theme.text : theme.background },
                  ]}
                >
                  {t('common.updates.restartApp')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

// Component to handle notification setup and listeners
const NotificationSetup = ({ navigationRef }) => {
  const { user } = useUser();
  const { notificationsEnabled, t } = useAppSettings();
  const notificationListenerRef = useRef();
  const responseListenerRef = useRef();
  const [postViewModalPostId, setPostViewModalPostId] = useState(null);

  // Navigate to chat by fetching the full chat document first
  const navigateToChat = useCallback(async (chatId) => {
    if (!navigationRef.current || !chatId) return;
    try {
      const chat = await getChat(chatId, true);
      if (chat) {
        navigationRef.current.navigate('ChatRoom', { chat });
      }
    } catch (error) {
      navigationRef.current.navigate('Notifications');
    }
  }, [navigationRef]);

  // Handle notification data for navigation
  const handleNotificationData = useCallback(async (data) => {
    if (!navigationRef.current || !data) return;
    const type = data?.type || '';

    if (data.chatId || type === 'chat_message' || type === 'direct_chat' || type === 'group_chat') {
      publishRefreshEvent(REFRESH_TOPICS.CHATS, {
        source: 'push_open',
        chatId: data.chatId || null,
        type,
      });
    }

    publishRefreshEvent(REFRESH_TOPICS.NOTIFICATIONS, {
      source: 'push_open',
      type,
      postId: data.postId || null,
      senderId: data.senderId || null,
    });

    const runDismissByContext = async () => {
      const currentUserId = user?.$id;
      if (!currentUserId) return;

      if (data.chatId) {
        await dismissPresentedNotificationsByTarget({ chatId: data.chatId });
        return;
      }

      if (data.postId) {
        await Promise.all([
          dismissPresentedNotificationsByTarget({ postId: data.postId }),
          markNotificationsAsReadByContext(currentUserId, { postId: data.postId }),
        ]);
        return;
      }

      if (type === 'follow' && data.senderId) {
        await Promise.all([
          dismissPresentedNotificationsByTarget({ senderId: data.senderId, types: ['follow'] }),
          markNotificationsAsReadByContext(currentUserId, {
            senderId: data.senderId,
            types: ['follow'],
          }),
        ]);
      }
    };

    runDismissByContext().catch(() => {});

    if ((type === 'lecture_upload' || type === 'lecture_mention') && data.postId) {
      navigationRef.current.navigate('LectureChannel', { channelId: data.postId });
    } else if (data.postId) {
      if (type === 'post_reply') {
        const navParams = { postId: data.postId };
        if (data.replyId) {
          navParams.targetReplyId = data.replyId;
        }
        navigationRef.current.navigate('PostDetails', navParams);
      } else {
        setPostViewModalPostId(data.postId);
      }
    } else if (data.chatId) {
      await navigateToChat(data.chatId);
    } else if (data.userId && type === 'follow') {
      navigationRef.current.navigate('UserProfile', { userId: data.userId });
    } else if (type) {
      navigationRef.current.navigate('Notifications');
    }
  }, [navigationRef, navigateToChat, user?.$id]);

  // Create Android notification channel at app startup (independent of permission)
  useEffect(() => {
    const setupNotificationChannel = async () => {
      if (Platform.OS === 'android') {
        await ExpoNotifications.setNotificationChannelAsync('default', {
          name: t('notifications.channels.defaultName'),
          importance: ExpoNotifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: true,
        });

        await ExpoNotifications.setNotificationChannelAsync('chat', {
          name: t('notifications.channels.chatName'),
          description: t('notifications.channels.chatDescription'),
          importance: ExpoNotifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: true,
        });
      }
    };
    setupNotificationChannel();
  }, [t]);

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
    notificationListenerRef.current = addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data || {};
      const type = data?.type || '';
      const currentIdentifier = notification?.request?.identifier;

      if (data?.chatId) {
        dismissPresentedNotificationsByTarget({
          chatId: data.chatId,
          excludeIdentifiers: currentIdentifier ? [currentIdentifier] : [],
        }).catch(() => {});
      } else if (data?.postId) {
        dismissPresentedNotificationsByTarget({
          postId: data.postId,
          excludeIdentifiers: currentIdentifier ? [currentIdentifier] : [],
        }).catch(() => {});
      } else if (type === 'follow' && data?.senderId) {
        dismissPresentedNotificationsByTarget({
          senderId: data.senderId,
          types: ['follow'],
          excludeIdentifiers: currentIdentifier ? [currentIdentifier] : [],
        }).catch(() => {});
      }

      publishRefreshEvent(REFRESH_TOPICS.NOTIFICATIONS, {
        source: 'push_foreground',
        type,
        postId: data.postId || null,
        senderId: data.senderId || null,
      });

      if (data.chatId || type === 'chat_message' || type === 'direct_chat' || type === 'group_chat') {
        publishRefreshEvent(REFRESH_TOPICS.CHATS, {
          source: 'push_foreground',
          chatId: data.chatId || null,
          type,
        });
      }
    });

    // Listen for user tapping on notifications
    responseListenerRef.current = addNotificationResponseListener(response => {
      const data = response?.notification?.request?.content?.data || {};
      handleNotificationData(data);
    });

    // Check if app was opened from a notification
    const checkInitialNotificationHandler = async () => {
      const data = await checkInitialNotification();
      if (data && navigationRef.current) {
        setTimeout(() => {
          handleNotificationData(data);
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
  }, [navigationRef, handleNotificationData]);

  return (
    <PostViewModal
      visible={!!postViewModalPostId}
      onClose={() => setPostViewModalPostId(null)}
      postId={postViewModalPostId}
      navigation={navigationRef.current}
      onViewReplies={() => {
        const pid = postViewModalPostId;
        setPostViewModalPostId(null);
        if (navigationRef.current && pid) {
          navigationRef.current.navigate('PostDetails', { postId: pid });
        }
      }}
    />
  );
};

const RealtimeLifecycleManager = () => {
  const resumeTimeoutRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();

    const delayMs = computeReconnectDelayMs(reconnectAttemptRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;

      if (appStateRef.current !== 'active') {
        return;
      }

      const realtime = appwriteClient?.realtime;
      if (!realtime || !shouldReconnectRealtime(realtime)) {
        reconnectAttemptRef.current = 0;
        return;
      }

      const connected = tryReconnectRealtime(realtime);
      if (connected || isRealtimeSocketConnected(realtime)) {
        reconnectAttemptRef.current = 0;
        return;
      }

      reconnectAttemptRef.current += 1;
      scheduleReconnect();
    }, delayMs);
  }, [clearReconnectTimer]);

  const reconnectRealtimeSafely = useCallback(() => {
    const realtime = appwriteClient?.realtime;
    if (!realtime || !shouldReconnectRealtime(realtime)) {
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      return;
    }

    const connected = tryReconnectRealtime(realtime);
    if (connected || isRealtimeSocketConnected(realtime)) {
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      return;
    }

    reconnectAttemptRef.current += 1;
    scheduleReconnect();
  }, [clearReconnectTimer, scheduleReconnect]);

  const pauseRealtime = useCallback(() => {
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;

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
  }, [clearReconnectTimer]);

  const resumeRealtime = useCallback(() => {
    const realtime = appwriteClient?.realtime;
    if (!realtime) {
      return;
    }

    try {
      realtime.reconnect = true;

      const hasChannels = realtime.channels instanceof Set
        ? realtime.channels.size > 0
        : Array.isArray(realtime.channels)
          ? realtime.channels.length > 0
          : false;

      if (hasChannels && (!realtime.socket || realtime.socket.readyState > 1)) {
        reconnectRealtimeSafely();
      }
    } catch (error) {
      // Ignore realtime startup errors
    }
  }, [reconnectRealtimeSafely]);

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
      clearReconnectTimer();
    };
  }, [clearReconnectTimer, pauseRealtime, resumeRealtime]);

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

const CrashReportingUserSync = () => {
  const { user } = useUser();

  useEffect(() => {
    setCrashReportingUser(user || null);
  }, [user]);

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

        // Handle post deep link
        // collegecommunity://post/{postId}
        if (parsedPath && parsedPath.startsWith('post/')) {
          const deepLinkedPostId = parsedPath.replace('post/', '');
          if (deepLinkedPostId) {
            navigateSafe('PostDetails', { postId: deepLinkedPostId, source: 'shared_post' });
          }
        } else if (parsedHost === 'post' && parsedPath) {
          navigateSafe('PostDetails', { postId: parsedPath, source: 'shared_post' });
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

const AppNavigationRoot = ({ navigationRef, pendingRouteRef, coldStartTrace }) => {
  const { theme, isDarkMode } = useAppSettings();
  const navigationTheme = useMemo(() => {
    const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.primary,
        background: theme.background,
        card: theme.card || theme.backgroundSecondary || theme.background,
        text: theme.text,
        border: theme.border,
        notification: theme.primary,
      },
    };
  }, [isDarkMode, theme.background, theme.backgroundSecondary, theme.border, theme.card, theme.primary, theme.text]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => {
        if (coldStartTrace.current) {
          coldStartTrace.current.finish({ success: true });
          coldStartTrace.current = null;
        }
        if (pendingRouteRef.current && navigationRef.isReady()) {
          const { name, params } = pendingRouteRef.current;
          pendingRouteRef.current = null;
          navigationRef.navigate(name, params);
        }
      }}>
      <RealtimeLifecycleManager />
      <CrashReportingUserSync />
      <LastSeenTracker />
      <NotificationSetup navigationRef={navigationRef} />
      <DeepLinkHandler navigationRef={navigationRef} pendingRouteRef={pendingRouteRef} />
      <UpdatePrompt />
      <MainStack />
    </NavigationContainer>
  );
};

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const pendingRouteRef = useRef(null);
  const coldStartTrace = useRef(telemetry.startTrace('app_cold_start'));

  try {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <AppSettingsProvider>
              <UserProvider>
                <GlobalAlertProvider>
                  <AppNavigationRoot
                    navigationRef={navigationRef}
                    pendingRouteRef={pendingRouteRef}
                    coldStartTrace={coldStartTrace}
                  />
                  <GlobalCustomAlert />
                </GlobalAlertProvider>
              </UserProvider>
            </AppSettingsProvider>
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
  toastHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 40,
  },
  toastCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.medium,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },
  toastRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIcon: {
    marginRight: spacing.sm,
  },
  toastTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toastTitle: {
    fontSize: normalize(13),
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  toastBody: {
    fontSize: normalize(12),
    lineHeight: normalize(16),
  },
  actionButton: {
    minWidth: wp(24),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: normalize(12),
    fontWeight: '600',
  },
});