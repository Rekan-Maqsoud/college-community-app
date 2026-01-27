import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ActivityIndicator, View, Animated, Image, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { UserProvider, useUser } from './context/UserContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import { getCurrentUser, getUserDocument, signOut } from '../database/auth';
import { getAllUserChats } from '../database/chatHelpers';
import { getTotalUnreadCount } from '../database/chats';
import { updateUserPushToken } from '../database/users';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  checkInitialNotification,
  setBadgeCount,
} from '../services/pushNotificationService';

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
import PostDetails from './screens/PostDetails';
import EditPost from './screens/EditPost';
import ChatRoom from './screens/ChatRoom';
import UserProfile from './screens/UserProfile';
import FollowList from './screens/FollowList';
import ManageRepresentatives from './screens/ManageRepresentatives';
import Notifications from './screens/Notifications';
import { NewChat, UserSearch, CreateGroup, GroupSettings, ForwardMessage, AddMembers } from './screens/chats';

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
      const total = await getTotalUnreadCount(user.$id, chatIds);
      setUnreadCount(total);
    } catch (error) {
      // Silently fail
    }
  }, [user?.$id, user?.department, user?.stage]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
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
        name="Notifications" 
        component={Notifications}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Component to handle notification setup and listeners
const NotificationSetup = ({ navigationRef }) => {
  const { user } = useUser();
  const { notificationsEnabled } = useAppSettings();
  const notificationListenerRef = useRef();
  const responseListenerRef = useRef();

  useEffect(() => {
    const setupNotifications = async () => {
      if (!user?.$id || !notificationsEnabled) return;

      try {
        // Register for push notifications
        const token = await registerForPushNotifications();
        
        if (token) {
          // Save the token to the pushTokens collection
          await updateUserPushToken(user.$id, token, Platform.OS);
        }
      } catch (error) {
        // Silent fail for notification setup
      }
    };

    setupNotifications();
  }, [user?.$id, notificationsEnabled]);

  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListenerRef.current = addNotificationReceivedListener(notification => {
      // Notification received while app is in foreground
      // The notification will be displayed automatically based on our handler config
    });

    // Listen for user tapping on notifications
    responseListenerRef.current = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (navigationRef.current) {
        if (data.postId) {
          navigationRef.current.navigate('PostDetails', { postId: data.postId });
        } else if (data.chatId) {
          navigationRef.current.navigate('ChatRoom', { chatId: data.chatId });
        } else if (data.userId && data.type === 'follow') {
          navigationRef.current.navigate('UserProfile', { userId: data.userId });
        } else if (data.type) {
          // General notification - go to notifications screen
          navigationRef.current.navigate('Notifications');
        }
      }
    });

    // Check if app was opened from a notification
    const checkInitialNotificationHandler = async () => {
      const data = await checkInitialNotification();
      if (data && navigationRef.current) {
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          if (data.postId) {
            navigationRef.current.navigate('PostDetails', { postId: data.postId });
          } else if (data.chatId) {
            navigationRef.current.navigate('ChatRoom', { chatId: data.chatId });
          } else if (data.userId && data.type === 'follow') {
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

// Component to handle deep links for password recovery
const DeepLinkHandler = ({ navigationRef }) => {
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      if (!url) return;
      
      try {
        const parsed = Linking.parse(url);
        
        // Handle password reset deep link (both schemes)
        // collegecommunity://reset-password OR appwrite-callback-xxx://reset-password
        if (parsed.path === 'reset-password' || url.includes('reset-password')) {
          const { userId, secret } = parsed.queryParams || {};
          if (userId && secret && navigationRef.current) {
            // Navigate to ForgotPassword with recovery params
            navigationRef.current.navigate('ForgotPassword', { userId, secret });
          }
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
  }, [navigationRef]);

  return null;
};

export default function App() {
  const navigationRef = useNavigationContainerRef();
  
  try {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <LanguageProvider>
              <AppSettingsProvider>
                <UserProvider>
                  <NavigationContainer ref={navigationRef}>
                    <NotificationSetup navigationRef={navigationRef} />
                    <DeepLinkHandler navigationRef={navigationRef} />
                    <MainStack />
                  </NavigationContainer>
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