import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowForwardIcon } from '../components/icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import LanguageDropdown from '../components/LanguageDropdown';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import safeStorage from '../utils/safeStorage';
import { signIn, getCurrentUser, signOut, getCompleteUserData, signInWithGoogle, signInWithApple, checkOAuthUserExists, storePendingOAuthSignup, isEducationalEmail } from '../../database/auth';
import { getAcademicDomainSuggestions, applyDomainToEmail } from '../constants/academicEmailDomains';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  isTablet,
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import telemetry from '../utils/telemetry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { buildOAuthSignupNavigationTarget } from '../utils/authOnboarding';

const getAcademicChangesCountFromProfileViews = (profileViews) => {
  if (!profileViews) return 0;

  try {
    const parsed = JSON.parse(profileViews);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 0;
    return Number(parsed.academicChangesCount) || 0;
  } catch (e) {
    return 0;
  }
};

const normalizeUserRole = (roleValue) => {
  if (roleValue === null || roleValue === undefined) return 'student';
  const text = String(roleValue).trim().toLowerCase();
  if (!text || text === 'null' || text === 'undefined') return 'student';
  return text;
};

const getPostAuthRouteName = (roleValue) => {
  return normalizeUserRole(roleValue) === 'guest' ? 'GuestTabs' : 'MainTabs';
};

const shouldExposeAcademicFields = (roleValue, emailValue) => {
  return normalizeUserRole(roleValue) !== 'guest' && isEducationalEmail(emailValue);
};

const SignIn = ({ navigation, route }) => {
  const [email, setEmail] = useState(route?.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const googleLogoUri = 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png';
  const appleLogoUri = isDarkMode 
    ? 'https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg' 
    : 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg';
  const { setUserData } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { formStyle } = useLayout();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Handle email change and show suggestion when @ is typed
  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailSuggestions(getAcademicDomainSuggestions(text, 3));
  };

  // Apply email suggestion
  const applyEmailSuggestion = (domain) => {
    setEmail(applyDomainToEmail(email, domain));
    setEmailSuggestions([]);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const prefillEmail = route?.params?.prefillEmail;
    if (typeof prefillEmail === 'string' && prefillEmail.trim()) {
      setEmail(prefillEmail.trim().toLowerCase());
    }
  }, [route?.params?.prefillEmail]);

  useEffect(() => {
    let isMounted = true;

    const resumePendingOAuthFlow = async () => {
      if (route?.params?.preventAutoLogin) return;

      const resumeTrace = telemetry.startTrace('auth_resume_pending_oauth');

      try {
        const existingUser = await getCurrentUser();
        if (!existingUser) {
          resumeTrace.finish({ success: true, meta: { hasSession: false } });
          return;
        }

        const userCheck = await checkOAuthUserExists(existingUser.$id);

        if (userCheck.exists && userCheck.userDoc) {
          const completeUserData = await getCompleteUserData();
          if (completeUserData && isMounted) {
            const academicChangesCount = getAcademicChangesCountFromProfileViews(completeUserData.profileViews);
            const canUseAcademicFields = shouldExposeAcademicFields(completeUserData.role, completeUserData.email);
            const userData = {
              $id: completeUserData.$id,
              email: completeUserData.email,
              fullName: completeUserData.name,
              bio: completeUserData.bio || '',
              profilePicture: completeUserData.profilePicture || '',
              university: canUseAcademicFields ? (completeUserData.university || '') : '',
              college: canUseAcademicFields ? (completeUserData.major || '') : '',
              department: canUseAcademicFields ? (completeUserData.department || '') : '',
              stage: canUseAcademicFields ? (completeUserData.year || '') : '',
              role: normalizeUserRole(completeUserData.role),
              postsCount: completeUserData.postsCount || 0,
              followersCount: completeUserData.followersCount || 0,
              followingCount: completeUserData.followingCount || 0,
              isEmailVerified: true,
              lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
              academicChangesCount,
            };

            await setUserData(userData);
            
            const termsAccepted = await safeStorage.getItem('terms_accepted');
            if (termsAccepted === 'true') {
              navigation.replace(getPostAuthRouteName(userData.role));
            } else {
              navigation.replace('TermsAndConditions');
            }
            
            resumeTrace.finish({ success: true, meta: { path: 'existing_user' } });
            return;
          }
        }

        if (!userCheck.user || !isMounted) {
          resumeTrace.finish({ success: true, meta: { hasSession: true, profileResolved: false } });
          return;
        }

        const oauthResolvedEmail = userCheck.email || userCheck.user.email || '';
        const oauthResolvedName = userCheck.name || userCheck.user.name || '';

        await storePendingOAuthSignup({
          userId: userCheck.user.$id,
          email: oauthResolvedEmail,
          name: oauthResolvedName,
        });

        if (!isEducationalEmail(oauthResolvedEmail)) {
          navigation.replace('GuestSignUp', {
            oauthMode: true,
            oauthEmail: oauthResolvedEmail,
            oauthName: oauthResolvedName,
            oauthUserId: userCheck.user.$id,
          });
          resumeTrace.finish({ success: true, meta: { path: 'guest_signup' } });
          return;
        }

        navigation.replace('SignUp', {
          oauthMode: true,
          oauthEmail: oauthResolvedEmail,
          oauthName: oauthResolvedName,
          oauthUserId: userCheck.user.$id,
        });
        resumeTrace.finish({ success: true, meta: { path: 'signup' } });
      } catch (error) {
        resumeTrace.finish({ success: false, error });
      }
    };

    resumePendingOAuthFlow();

    return () => {
      isMounted = false;
    };
  }, [navigation, setUserData]);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.fillAllFields') });
      return;
    }

    if (!email.includes('@')) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validEmailRequired') });
      return;
    }

    const signInTrace = telemetry.startTrace('auth_sign_in', {
      hasEmail: Boolean(email?.trim()),
      emailDomain: String(email || '').includes('@') ? String(email || '').split('@').pop() : 'unknown',
    });

    setIsLoading(true);

    try {
      const existingUser = await getCurrentUser();
      
      if (existingUser) {
        if (existingUser.email === email.trim()) {
          const completeUserData = await getCompleteUserData();
          
          if (completeUserData) {
            const academicChangesCount = getAcademicChangesCountFromProfileViews(completeUserData.profileViews);
            const canUseAcademicFields = shouldExposeAcademicFields(completeUserData.role, completeUserData.email);
            const userData = {
              $id: completeUserData.$id,
              email: completeUserData.email,
              fullName: completeUserData.name,
              bio: completeUserData.bio || '',
              profilePicture: completeUserData.profilePicture || '',
              university: canUseAcademicFields ? (completeUserData.university || '') : '',
              college: canUseAcademicFields ? (completeUserData.major || '') : '',
              department: canUseAcademicFields ? (completeUserData.department || '') : '',
              stage: canUseAcademicFields ? (completeUserData.year || '') : '',
              role: normalizeUserRole(completeUserData.role),
              postsCount: completeUserData.postsCount || 0,
              followersCount: completeUserData.followersCount || 0,
              followingCount: completeUserData.followingCount || 0,
              isEmailVerified: completeUserData.emailVerification || false,
              lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
              academicChangesCount,
            };
            
            await setUserData(userData);
            signInTrace.finish({ success: true, meta: { reusedSession: true } });
            
            const termsAccepted = await safeStorage.getItem('terms_accepted');
            if (termsAccepted === 'true') {
              navigation.replace(getPostAuthRouteName(userData.role));
            } else {
              navigation.replace('TermsAndConditions');
            }
            return;
          }
          // User data couldn't be loaded — clear the stale session and re-authenticate
          await signOut();
        } else {
          await signOut();
        }
      }
      
      await signIn(email.trim(), password);
      
      const completeUserData = await getCompleteUserData();
      
      if (!completeUserData) {
        // Auth succeeded but no user document exists — this happens when account
        // creation was started but never completed (e.g. cancelled OTP flow).
        // Sign out so the stale session does not persist, then tell the user.
        try { await signOut(); } catch (_) {}
        signInTrace.finish({ success: false, meta: { reason: 'no_user_doc' } });
        showAlert({
          type: 'warning',
          title: t('auth.incompleteRegistration'),
          message: t('auth.incompleteRegistrationMessage'),
          buttons: [
            {
              text: t('common.ok'),
              style: 'primary',
              onPress: () => navigation.navigate('SignUp', { preservedData: { email: email.trim().toLowerCase() } }),
            },
          ],
        });
        return;
      }

      const academicChangesCount = getAcademicChangesCountFromProfileViews(completeUserData.profileViews);
      const canUseAcademicFields = shouldExposeAcademicFields(completeUserData.role, completeUserData.email);
      const userData = {
        $id: completeUserData.$id,
        email: completeUserData.email,
        fullName: completeUserData.name,
        bio: completeUserData.bio || '',
        profilePicture: completeUserData.profilePicture || '',
        university: canUseAcademicFields ? (completeUserData.university || '') : '',
        college: canUseAcademicFields ? (completeUserData.major || '') : '',
        department: canUseAcademicFields ? (completeUserData.department || '') : '',
        stage: canUseAcademicFields ? (completeUserData.year || '') : '',
        role: normalizeUserRole(completeUserData.role),
        postsCount: completeUserData.postsCount || 0,
        followersCount: completeUserData.followersCount || 0,
        followingCount: completeUserData.followingCount || 0,
        isEmailVerified: completeUserData.emailVerification || false,
        lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
        academicChangesCount,
      };
      
      await setUserData(userData);
      signInTrace.finish({ success: true, meta: { reusedSession: false } });
      
      const termsAccepted = await safeStorage.getItem('terms_accepted');
      if (termsAccepted === 'true') {
        navigation.replace(getPostAuthRouteName(userData.role));
      } else {
        navigation.replace('TermsAndConditions');
      }
    } catch (error) {
      signInTrace.finish({ success: false, error });
      let errorMessage = t('auth.signInError');
      
      if (error.message?.includes('Invalid credentials') || error.message?.includes('user') || error.message?.includes('password')) {
        errorMessage = t('auth.invalidCredentials');
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = t('common.networkError');
      } else if (error.message?.includes('session is active')) {
        errorMessage = t('auth.sessionActiveError');
        
        try {
          await signOut();
        } catch (signOutError) {
        }
      }
      
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    const googleTrace = telemetry.startTrace('auth_google_sign_in');
    
    setIsGoogleLoading(true);
    
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        const userCheck = await checkOAuthUserExists();
        
        if (userCheck.exists && userCheck.userDoc) {
          const completeUserData = await getCompleteUserData();
          
          if (completeUserData) {
            const academicChangesCount = getAcademicChangesCountFromProfileViews(completeUserData.profileViews);
            const canUseAcademicFields = shouldExposeAcademicFields(completeUserData.role, completeUserData.email);
            const userData = {
              $id: completeUserData.$id,
              email: completeUserData.email,
              fullName: completeUserData.name,
              bio: completeUserData.bio || '',
              profilePicture: completeUserData.profilePicture || '',
              university: canUseAcademicFields ? (completeUserData.university || '') : '',
              college: canUseAcademicFields ? (completeUserData.major || '') : '',
              department: canUseAcademicFields ? (completeUserData.department || '') : '',
              stage: canUseAcademicFields ? (completeUserData.year || '') : '',
              role: normalizeUserRole(completeUserData.role),
              postsCount: completeUserData.postsCount || 0,
              followersCount: completeUserData.followersCount || 0,
              followingCount: completeUserData.followingCount || 0,
              isEmailVerified: true,
              lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
              academicChangesCount,
            };
            
            await setUserData(userData);
            googleTrace.finish({ success: true, meta: { path: 'existing_user' } });
            
            const termsAccepted = await safeStorage.getItem('terms_accepted');
            if (termsAccepted === 'true') {
              navigation.replace(getPostAuthRouteName(userData.role));
            } else {
              navigation.replace('TermsAndConditions');
            }
          }
        } else if (userCheck.user) {
          const oauthResolvedEmail = userCheck.email || userCheck.user.email || '';

          if (!isEducationalEmail(oauthResolvedEmail)) {
            // Non-edu Google account → redirect to guest sign-up (pre-fill name/email)
            await storePendingOAuthSignup({
              userId: userCheck.user.$id,
              email: oauthResolvedEmail,
              name: userCheck.name || userCheck.user.name || '',
            });
            googleTrace.finish({ success: true, meta: { path: 'guest_signup' } });
            navigation.navigate('GuestSignUp', {
              oauthMode: true,
              oauthEmail: oauthResolvedEmail,
              oauthName: userCheck.name || userCheck.user.name || '',
              oauthUserId: userCheck.user.$id,
            });
            return;
          }

          await storePendingOAuthSignup({
            userId: userCheck.user.$id,
            email: oauthResolvedEmail,
            name: userCheck.name || userCheck.user.name || '',
          });
          
          navigation.navigate('SignUp', { 
            oauthMode: true,
            oauthEmail: oauthResolvedEmail,
            oauthName: userCheck.name || userCheck.user.name || '',
            oauthUserId: userCheck.user.$id,
          });
          googleTrace.finish({ success: true, meta: { path: 'needs_profile_completion' } });
        } else {
          googleTrace.finish({ success: false, meta: { reason: 'oauth_user_context_missing' } });
          showAlert({
            type: 'error',
            title: t('common.error'),
            message: t('auth.googleSignInError'),
          });
        }
      } else if (result.cancelled) {
        googleTrace.finish({ success: true, meta: { cancelled: true } });
        setIsGoogleLoading(false);
        return;
      } else {
        googleTrace.finish({ success: false, meta: { reason: 'google_sign_in_unsuccessful' } });
      }
    } catch (error) {
      googleTrace.finish({ success: false, error });
      let errorMessage = t('auth.googleSignInError');
      
      if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = t('common.networkError');
      }
      
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const navigateToAuthScreen = (routeName, params) => {
    try {
      navigation.navigate(routeName, params);
      return true;
    } catch (navigateError) {
      telemetry.recordEvent('auth_navigation_error', {
        source: 'SignIn',
        target: routeName,
        method: 'navigate',
        message: navigateError?.message || String(navigateError),
      });

      try {
        navigation.replace(routeName, params);
        return true;
      } catch (replaceError) {
        telemetry.recordEvent('auth_navigation_error', {
          source: 'SignIn',
          target: routeName,
          method: 'replace',
          message: replaceError?.message || String(replaceError),
        });
        return false;
      }
    }
  };

  const handleForgotPasswordPress = () => {
    if (!navigateToAuthScreen('ForgotPassword')) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.signInError') });
    }
  };

  const handleSignUpPress = () => {
    if (!navigateToAuthScreen('SignUp')) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.signUpError') });
    }
  };

  const handleGuestSignUpPress = () => {
    if (!navigateToAuthScreen('GuestSignUp')) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.signUpError') });
    }
  };

  const handleSignInPress = () => {
    handleSignIn().catch((error) => {
      telemetry.recordEvent('auth_sign_in_unhandled_error', {
        message: error?.message || String(error),
      });
      setIsLoading(false);
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.signInError') });
    });
  };

  const handleGoogleSignInPress = () => {
    handleGoogleSignIn().catch((error) => {
      telemetry.recordEvent('auth_google_sign_in_unhandled_error', {
        message: error?.message || String(error),
      });
      setIsGoogleLoading(false);
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.googleSignInError') });
    });
  };

  const handleAppleSignIn = async () => {
    if (isAppleLoading) return;
    const appleTrace = telemetry.startTrace('auth_apple_sign_in');
    
    setIsAppleLoading(true);
    
    try {
      const result = await signInWithApple();
      
      if (result.success) {
        const userCheck = await checkOAuthUserExists();
        
        if (userCheck.exists && userCheck.userDoc) {
          const completeUserData = await getCompleteUserData();
          
          if (completeUserData) {
            const academicChangesCount = getAcademicChangesCountFromProfileViews(completeUserData.profileViews);
            const canUseAcademicFields = shouldExposeAcademicFields(completeUserData.role, completeUserData.email);
            const userData = {
              $id: completeUserData.$id,
              email: completeUserData.email,
              fullName: completeUserData.name,
              bio: completeUserData.bio || '',
              profilePicture: completeUserData.profilePicture || '',
              university: canUseAcademicFields ? (completeUserData.university || '') : '',
              college: canUseAcademicFields ? (completeUserData.major || '') : '',
              department: canUseAcademicFields ? (completeUserData.department || '') : '',
              stage: canUseAcademicFields ? (completeUserData.year || '') : '',
              role: normalizeUserRole(completeUserData.role),
              postsCount: completeUserData.postsCount || 0,
              followersCount: completeUserData.followersCount || 0,
              followingCount: completeUserData.followingCount || 0,
              isEmailVerified: true,
              lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
              academicChangesCount,
            };
            
            await setUserData(userData);
            appleTrace.finish({ success: true, meta: { path: 'existing_user' } });
            
            const termsAccepted = await safeStorage.getItem('terms_accepted');
            if (termsAccepted === 'true') {
              navigation.replace(getPostAuthRouteName(userData.role));
            } else {
              navigation.replace('TermsAndConditions');
            }
            return;
          }

          appleTrace.finish({ success: false, meta: { reason: 'missing_complete_user_data' } });
          showAlert({
            type: 'error',
            title: t('common.error'),
            message: t('auth.appleSignInError'),
          });
          return;
        } else if (userCheck.user) {
          const oauthResolvedEmail = userCheck.email || userCheck.user.email || '';

          const oauthNavigationTarget = buildOAuthSignupNavigationTarget({
            email: oauthResolvedEmail,
            oauthEmail: oauthResolvedEmail,
            oauthName: userCheck.name || userCheck.user.name || '',
            oauthUserId: userCheck.user.$id,
            provider: 'apple',
          });

          await storePendingOAuthSignup({
            userId: userCheck.user.$id,
            email: oauthResolvedEmail,
            name: userCheck.name || userCheck.user.name || '',
          });

          if (oauthNavigationTarget.routeName === 'GuestSignUp') {
            showAlert({
              type: 'info',
              title: t('auth.appleGuestModeTitle'),
              message: t('auth.appleGuestModeMessage'),
            });
            appleTrace.finish({ success: true, meta: { path: 'guest_signup' } });
          } else {
            appleTrace.finish({ success: true, meta: { path: 'needs_profile_completion' } });
          }
          
          navigation.navigate(oauthNavigationTarget.routeName, oauthNavigationTarget.params);
        } else {
          appleTrace.finish({ success: false, meta: { reason: 'oauth_user_context_missing' } });
          showAlert({
            type: 'error',
            title: t('common.error'),
            message: t('auth.appleSignInError'),
          });
        }
      } else if (result.cancelled) {
        appleTrace.finish({ success: true, meta: { cancelled: true } });
        setIsAppleLoading(false);
        return;
      } else {
        appleTrace.finish({ success: false, meta: { reason: 'apple_sign_in_unsuccessful' } });
      }
    } catch (error) {
      appleTrace.finish({ success: false, error });
      let errorMessage = t('auth.appleSignInError');
      
      if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = t('common.networkError');
      }
      
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleAppleSignInPress = () => {
    handleAppleSignIn().catch((error) => {
      telemetry.recordEvent('auth_apple_sign_in_unhandled_error', {
        message: error?.message || String(error),
      });
      setIsAppleLoading(false);
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.appleSignInError') });
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      <LinearGradient
        colors={isDarkMode 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#667eea', '#764ba2', '#f093fb']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <AnimatedBackground particleCount={35} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent, 
              formStyle,
              { paddingTop: Math.max(insets.top, hp(2)) }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
          
            <View style={[styles.languageContainer, isRTL && styles.languageContainerRtl]}>
              <LanguageDropdown />
            </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}>
            
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo-white.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headerContainer}>
              <Text style={[styles.headerText, { fontSize: fontSize(isTablet() ? 32 : 24) }]}>
                {t('auth.welcomeBack')}
              </Text>
              <Text style={[styles.subHeaderText, { fontSize: fontSize(14) }]}>
                {t('auth.signInToAccount')}
              </Text>
            </View>

            <GlassContainer 
              style={styles.formContainer}
              intensity={isTablet() ? 30 : 25}
              borderRadius={borderRadius.xl}
              disableBackgroundOverlay
            >
              <GlassInput focused={emailFocused}>
                <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                  <MailIcon 
                    size={moderateScale(22)} 
                    color={emailFocused ? theme.primary : theme.textSecondary} 
                    style={[styles.inputIcon, isRTL && styles.inputIconRtl]}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      isRTL && styles.inputRtl,
                      {
                        color: theme.text,
                        fontSize: fontSize(14),
                        textAlign: isRTL ? 'right' : 'left',
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                      },
                    ]}
                    placeholder={t('auth.collegeEmail')}
                    placeholderTextColor={theme.input.placeholder}
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      // Hide suggestion on blur with a small delay
                      setTimeout(() => setEmailSuggestions([]), 200);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    textContentType="emailAddress"
                  />
                </View>
              </GlassInput>
              {emailSuggestions.length > 0 && (
                <View style={[styles.emailSuggestionsContainer, isRTL && styles.emailSuggestionsContainerRtl]}>
                  {emailSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.domain}
                      onPress={() => applyEmailSuggestion(suggestion.domain)}
                      style={[styles.emailSuggestion, { backgroundColor: theme.primary }]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emailSuggestionText}>@{suggestion.domain}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <GlassInput focused={passwordFocused} style={{ marginTop: spacing.md }}>
                <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                  <LockIcon 
                    size={moderateScale(22)} 
                    color={passwordFocused ? theme.primary : theme.textSecondary} 
                    style={[styles.inputIcon, isRTL && styles.inputIconRtl]}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      isRTL && styles.inputRtl,
                      {
                        color: theme.text,
                        fontSize: fontSize(14),
                        textAlign: isRTL ? 'right' : 'left',
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                      },
                    ]}
                    placeholder={t('auth.password')}
                    placeholderTextColor={theme.input.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleSignInPress}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    textContentType="password"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={[styles.eyeIcon, isRTL && styles.eyeIconRtl]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    {showPassword ? (
                      <EyeOffIcon size={moderateScale(22)} color={theme.textSecondary} />
                    ) : (
                      <EyeIcon size={moderateScale(22)} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </GlassInput>

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                activeOpacity={0.7}
                onPress={handleForgotPasswordPress}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Text style={[styles.forgotPasswordText, { 
                  color: theme.primary,
                  fontSize: fontSize(13),
                }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signInButton}
                onPress={handleSignInPress}
                activeOpacity={0.8}
                disabled={isLoading || isGoogleLoading || !email.trim() || !password.trim()}>
                <LinearGradient
                  colors={isLoading || isGoogleLoading || !email.trim() || !password.trim() ? ['#999', '#777'] : ['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={[styles.signInButtonText, { fontSize: fontSize(15) }]}>
                        {t('auth.signIn')}
                      </Text>
                      <ArrowForwardIcon 
                        size={moderateScale(20)} 
                        color="#FFFFFF" 
                        style={styles.buttonIcon}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { color: theme.textSecondary, fontSize: fontSize(12) }]}>
                  {t('auth.orContinueWith')}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.googleButton}
                onPress={handleGoogleSignInPress}
                activeOpacity={0.8}
                disabled={isGoogleLoading || isLoading}>
                <View style={[styles.googleButtonContent, { backgroundColor: theme.card }]}>
                  {isGoogleLoading ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <>
                      <Image
                        source={{ uri: googleLogoUri }}
                        style={styles.googleLogo}
                        resizeMode="contain"
                      />
                      <Text style={[styles.googleButtonText, { color: theme.text, fontSize: fontSize(14) }]}>
                        {t('auth.continueWithGoogle')}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.googleButton, { marginTop: spacing.md }]}
                onPress={handleAppleSignInPress}
                activeOpacity={0.8}
                disabled={isAppleLoading || isLoading}>
                <View style={[styles.googleButtonContent, { backgroundColor: theme.card }]}>
                  {isAppleLoading ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <>
                      <Image
                        source={{ uri: appleLogoUri }}
                        style={styles.googleLogo}
                        resizeMode="contain"
                      />
                      <Text style={[styles.googleButtonText, { color: theme.text, fontSize: fontSize(14) }]}>
                        {t('auth.continueWithApple')}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </GlassContainer>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { fontSize: fontSize(13) }]}>
                {t('auth.dontHaveAccount')}
              </Text>
              <TouchableOpacity onPress={handleSignUpPress} activeOpacity={0.7}>
                <Text style={[styles.footerText, styles.signUpText, { fontSize: fontSize(13) }]}>
                  {t('auth.signUp')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Guest sign-up entry point */}
            <TouchableOpacity
              style={styles.guestSignUpButton}
              activeOpacity={0.7}
              onPress={handleGuestSignUpPress}
            >
              <Text style={[styles.guestSignUpText, { fontSize: fontSize(12) }]}>
                {t('auth.notAStudent')}{' '}
                <Text style={styles.guestSignUpLink}>
                  {t('auth.signUpAsGuest')}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: wp(5),
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(5),
    paddingBottom: hp(4),
  },
  languageContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(6) : hp(5),
    right: wp(5),
    zIndex: 1000,
  },
  languageContainerRtl: {
    right: 'auto',
    left: wp(5),
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  logoImage: {
    width: moderateScale(120),
    height: moderateScale(120),
  },
  headerContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    maxWidth: isTablet() ? 700 : '95%',
  },
  headerText: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subHeaderText: {
    opacity: 0.9,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formContainer: {
    padding: spacing.lg,
    maxWidth: isTablet() ? 700 : '95%',
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  inputWrapperRtl: {
    flexDirection: 'row-reverse',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  inputIconRtl: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    fontWeight: '500',
    minHeight: moderateScale(24),
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputRtl: {
    textAlign: 'right',
  },
  emailSuggestion: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  emailSuggestionsContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  emailSuggestionsContainerRtl: {
    alignItems: 'flex-end',
  },
  emailSuggestionText: {
    color: '#FFFFFF',
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  eyeIcon: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  eyeIconRtl: {
    marginLeft: 0,
    marginRight: spacing.xs,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  buttonGradient: {
    paddingVertical: spacing.md + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
  demoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
  },
  demoText: {
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  signUpText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  googleButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  googleButtonContent: {
    paddingVertical: spacing.md + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  googleButtonText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  googleLogo: {
    width: moderateScale(18),
    height: moderateScale(18),
  },
  guestSignUpButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  guestSignUpText: {
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  guestSignUpLink: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default SignIn;
