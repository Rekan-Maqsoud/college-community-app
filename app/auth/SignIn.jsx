import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import LanguageDropdown from '../components/LanguageDropdown';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import { signIn, getCurrentUser, signOut, getCompleteUserData, signInWithGoogle, checkOAuthUserExists, storePendingOAuthSignup } from '../../database/auth';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  isTablet,
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const SignIn = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  
  const { t, theme, isDarkMode } = useAppSettings();
  const { setUserData } = useUser();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Handle email change and show suggestion when @ is typed
  const handleEmailChange = (text) => {
    setEmail(text);
    // Show suggestion when user types @ but hasn't completed the domain
    if (text.includes('@') && !text.includes('@epu.edu.iq') && !text.endsWith('.')) {
      const atIndex = text.lastIndexOf('@');
      const afterAt = text.substring(atIndex + 1);
      // Show suggestion if the domain part is incomplete
      if (afterAt.length === 0 || 'epu.edu.iq'.startsWith(afterAt.toLowerCase())) {
        setShowEmailSuggestion(true);
      } else {
        setShowEmailSuggestion(false);
      }
    } else {
      setShowEmailSuggestion(false);
    }
  };

  // Apply email suggestion
  const applyEmailSuggestion = () => {
    const atIndex = email.lastIndexOf('@');
    if (atIndex !== -1) {
      const beforeAt = email.substring(0, atIndex);
      setEmail(beforeAt + '@epu.edu.iq');
    } else {
      setEmail(email + '@epu.edu.iq');
    }
    setShowEmailSuggestion(false);
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
  }, []);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.validEmailRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const existingUser = await getCurrentUser();
      
      if (existingUser) {
        if (existingUser.email === email.trim()) {
          const completeUserData = await getCompleteUserData();
          
          if (completeUserData) {
            const userData = {
              $id: completeUserData.$id,
              email: completeUserData.email,
              fullName: completeUserData.name,
              bio: completeUserData.bio || '',
              profilePicture: completeUserData.profilePicture || '',
              university: completeUserData.university || '',
              college: completeUserData.major || '',
              department: completeUserData.department || '',
              stage: completeUserData.year || '',
              postsCount: completeUserData.postsCount || 0,
              followersCount: completeUserData.followersCount || 0,
              followingCount: completeUserData.followingCount || 0,
              isEmailVerified: completeUserData.emailVerification || false,
              lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
            };
            
            await setUserData(userData);
            navigation.replace('MainTabs');
            return;
          }
        } else {
          await signOut();
        }
      }
      
      await signIn(email.trim(), password);
      
      const completeUserData = await getCompleteUserData();
      
      if (completeUserData) {
        const userData = {
          $id: completeUserData.$id,
          email: completeUserData.email,
          fullName: completeUserData.name,
          bio: completeUserData.bio || '',
          profilePicture: completeUserData.profilePicture || '',
          university: completeUserData.university || '',
          college: completeUserData.major || '',
          department: completeUserData.department || '',
          stage: completeUserData.year || '',
          postsCount: completeUserData.postsCount || 0,
          followersCount: completeUserData.followersCount || 0,
          followingCount: completeUserData.followingCount || 0,
          isEmailVerified: completeUserData.emailVerification || false,
          lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
        };
        
        await setUserData(userData);
      }
      
      navigation.replace('MainTabs');
    } catch (error) {
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
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    
    setIsGoogleLoading(true);
    
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        const userCheck = await checkOAuthUserExists();
        
        if (userCheck.exists && userCheck.userDoc) {
          const completeUserData = await getCompleteUserData();
          
          if (completeUserData) {
            const userData = {
              $id: completeUserData.$id,
              email: completeUserData.email,
              fullName: completeUserData.name,
              bio: completeUserData.bio || '',
              profilePicture: completeUserData.profilePicture || '',
              university: completeUserData.university || '',
              college: completeUserData.major || '',
              department: completeUserData.department || '',
              stage: completeUserData.year || '',
              postsCount: completeUserData.postsCount || 0,
              followersCount: completeUserData.followersCount || 0,
              followingCount: completeUserData.followingCount || 0,
              isEmailVerified: true,
              lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
            };
            
            await setUserData(userData);
            navigation.replace('MainTabs');
          }
        } else if (userCheck.user) {
          await storePendingOAuthSignup({
            userId: userCheck.user.$id,
            email: userCheck.email || userCheck.user.email,
            name: userCheck.name || userCheck.user.name || '',
          });
          
          navigation.navigate('SignUp', { 
            oauthMode: true,
            oauthEmail: userCheck.email || userCheck.user.email,
            oauthName: userCheck.name || userCheck.user.name || '',
            oauthUserId: userCheck.user.$id,
          });
        }
      } else if (result.cancelled) {
        setIsGoogleLoading(false);
        return;
      }
    } catch (error) {
      let errorMessage = t('auth.googleSignInError');
      
      if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = t('common.networkError');
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
          
            <View style={styles.languageContainer}>
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
            >
              <GlassInput focused={emailFocused}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="mail-outline" 
                    size={moderateScale(22)} 
                    color={emailFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      fontSize: fontSize(14),
                      textAlign: 'left',
                    }]}
                    placeholder={t('auth.collegeEmail')}
                    placeholderTextColor={theme.input.placeholder}
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      // Hide suggestion on blur with a small delay
                      setTimeout(() => setShowEmailSuggestion(false), 200);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    textContentType="emailAddress"
                  />
                  {showEmailSuggestion && (
                    <TouchableOpacity 
                      onPress={applyEmailSuggestion}
                      style={[styles.emailSuggestion, { backgroundColor: theme.primary }]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emailSuggestionText}>@epu.edu.iq</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GlassInput>

              <GlassInput focused={passwordFocused} style={{ marginTop: spacing.md }}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={moderateScale(22)} 
                    color={passwordFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      fontSize: fontSize(14),
                    }]}
                    placeholder={t('auth.password')}
                    placeholderTextColor={theme.input.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleSignIn}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    textContentType="password"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={moderateScale(22)} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </GlassInput>

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={[styles.forgotPasswordText, { 
                  color: theme.primary,
                  fontSize: fontSize(13),
                }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signInButton}
                onPress={handleSignIn}
                activeOpacity={0.8}
                disabled={isLoading || !email.trim() || !password.trim()}>
                <LinearGradient
                  colors={isLoading || !email.trim() || !password.trim() ? ['#999', '#777'] : ['#667eea', '#764ba2']}
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
                      <Ionicons 
                        name="arrow-forward" 
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
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
                disabled={isGoogleLoading}>
                <View style={[styles.googleButtonContent, { backgroundColor: theme.card }]}>
                  {isGoogleLoading ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <>
                      <Ionicons 
                        name="logo-google" 
                        size={moderateScale(20)} 
                        color="#DB4437" 
                      />
                      <Text style={[styles.googleButtonText, { color: theme.text, fontSize: fontSize(14) }]}>
                        {t('auth.continueWithGoogle')}
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
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
                <Text style={[styles.footerText, styles.signUpText, { fontSize: fontSize(13) }]}>
                  {t('auth.signUp')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
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
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontWeight: '500',
    minHeight: Platform.OS === 'ios' ? 22 : 40,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  emailSuggestion: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginLeft: spacing.xs,
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
});

export default SignIn;
