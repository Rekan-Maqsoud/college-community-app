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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAppSettings } from '../context/AppSettingsContext';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { sendPasswordResetOTP, completePasswordReset, resendPasswordResetOTP } from '../../database/auth';
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

const ForgotPassword = ({ navigation, route }) => {
  // Steps: 'email' -> 'checkEmail' -> 'newPassword'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  
  // Recovery credentials from deep link
  const [recoveryUserId, setRecoveryUserId] = useState(null);
  const [recoverySecret, setRecoverySecret] = useState(null);
  
  const { t, theme, isDarkMode } = useAppSettings();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { formStyle } = useLayout();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Check if opened via deep link with recovery params
  useEffect(() => {
    const checkDeepLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };
    
    checkDeepLink();
    
    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Check route params for recovery data
  useEffect(() => {
    if (route?.params?.userId && route?.params?.secret) {
      setRecoveryUserId(route.params.userId);
      setRecoverySecret(route.params.secret);
      setStep('newPassword');
    }
  }, [route?.params]);

  const handleDeepLink = (event) => {
    try {
      const url = event.url;
      if (!url) return;
      
      // Parse the URL to extract userId and secret
      // Expected formats: 
      // - collegecommunity://reset-password?userId=xxx&secret=xxx
      // - appwrite-callback-68fc77710039413087aa://reset-password?userId=xxx&secret=xxx
      const parsed = Linking.parse(url);
      
      // Check if this is a password reset deep link
      if (parsed.path === 'reset-password' || url.includes('reset-password')) {
        const { queryParams } = parsed;
        if (queryParams?.userId && queryParams?.secret) {
          setRecoveryUserId(queryParams.userId);
          setRecoverySecret(queryParams.secret);
          setStep('newPassword');
        }
      }
    } catch (error) {
      // Silent fail for deep link parsing errors
    }
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

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (text.includes('@') && !text.includes('@epu.edu.iq') && !text.endsWith('.')) {
      const atIndex = text.lastIndexOf('@');
      const afterAt = text.substring(atIndex + 1);
      if (afterAt.length === 0 || 'epu.edu.iq'.startsWith(afterAt.toLowerCase())) {
        setShowEmailSuggestion(true);
      } else {
        setShowEmailSuggestion(false);
      }
    } else {
      setShowEmailSuggestion(false);
    }
  };

  const applyEmailSuggestion = () => {
    const atIndex = email.lastIndexOf('@');
    if (atIndex !== -1) {
      const beforeAt = email.substring(0, atIndex);
      setEmail(beforeAt + '@epu.edu.iq');
      setShowEmailSuggestion(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  };

  const passwordStrength = getPasswordStrength();

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return '#FF4444';
      case 'medium': return '#FFAA00';
      case 'strong': return '#44DD44';
      default: return 'transparent';
    }
  };

  const getStrengthWidth = () => {
    switch (passwordStrength) {
      case 'weak': return '33%';
      case 'medium': return '66%';
      case 'strong': return '100%';
      default: return '0%';
    }
  };

  const handleSendResetEmail = async () => {
    
    if (!email.trim()) {
      showAlert(t('common.error'), t('auth.validEmailRequired'), 'error');
      return;
    }

    if (!email.includes('@')) {
      showAlert(t('common.error'), t('auth.validEmailRequired'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetOTP(email.trim());
      setStep('checkEmail');
      setResendTimer(60);
      showAlert(t('common.success'), t('auth.resetEmailSent'), 'success');
    } catch (error) {
      let errorMessage = t('auth.sendResetCodeError');
      
      if (error.message === 'User not found' || error.message?.includes('not found')) {
        errorMessage = t('auth.emailNotRegistered');
      } else if (error.message === 'SMTP_NOT_CONFIGURED') {
        errorMessage = t('auth.smtpNotConfigured');
      } else if (error.message === 'REDIRECT_URL_NOT_ALLOWED') {
        errorMessage = t('auth.redirectUrlError');
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = t('common.networkError');
      } else if (error.message) {
        // Show the actual error message for debugging
        errorMessage = error.message;
      }
      
      showAlert(t('common.error'), errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);

    try {
      await resendPasswordResetOTP(email.trim());
      setResendTimer(60);
      showAlert(t('common.success'), t('auth.resetEmailResent'), 'success');
    } catch (error) {
      showAlert(t('common.error'), t('auth.sendResetCodeError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!recoveryUserId || !recoverySecret) {
      showAlert(t('common.error'), t('auth.invalidRecoveryLink'), 'error');
      setStep('email');
      return;
    }
    
    if (newPassword.length < 8) {
      showAlert(t('common.error'), t('auth.passwordTooShort'), 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(t('common.error'), t('auth.passwordMismatch'), 'error');
      return;
    }

    setIsLoading(true);

    try {
      await completePasswordReset(recoveryUserId, recoverySecret, newPassword);
      
      setIsLoading(false);
      showAlert({
        type: 'success',
        title: t('common.success'),
        message: t('auth.passwordResetSuccess'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => navigation.replace('SignIn'),
            style: 'primary',
          }
        ],
      });
    } catch (error) {
      setIsLoading(false);
      
      let errorMessage = t('auth.passwordResetError');
      
      if (error.message?.includes('expired')) {
        errorMessage = t('auth.recoveryLinkExpired');
        setStep('email');
        setRecoveryUserId(null);
        setRecoverySecret(null);
      } else if (error.message?.includes('Invalid')) {
        errorMessage = t('auth.invalidRecoveryLink');
        setStep('email');
        setRecoveryUserId(null);
        setRecoverySecret(null);
      }
      
      showAlert(t('common.error'), errorMessage, 'error');
    }
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="key-outline" 
            size={moderateScale(48)} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={[styles.headerText, { fontSize: fontSize(isTablet() ? 28 : 24) }]}>
          {t('auth.forgotPasswordTitle')}
        </Text>
        <Text style={[styles.subHeaderText, { fontSize: fontSize(14) }]}>
          {t('auth.forgotPasswordSubtitle')}
        </Text>
      </View>

      <GlassContainer 
        style={styles.formContainer}
        intensity={isDarkMode ? 25 : 40}
      >
        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons 
              name="mail-outline" 
              size={moderateScale(20)} 
              color={emailFocused ? '#BB86FC' : 'rgba(255, 255, 255, 0.6)'} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                { fontSize: fontSize(15) },
                emailFocused && styles.inputFocused,
              ]}
              placeholder={t('auth.enterEmail')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          {showEmailSuggestion && (
            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={applyEmailSuggestion}
              activeOpacity={0.7}
            >
              <Ionicons name="flash" size={16} color="#BB86FC" />
              <Text style={[styles.suggestionText, { fontSize: fontSize(13) }]}>
                {t('auth.useEpuEmail')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleSendResetEmail}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#9C27B0', '#7B1FA2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={[styles.buttonText, { fontSize: fontSize(16) }]}>
                  {t('auth.sendResetLink')}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </GlassContainer>
    </>
  );

  const renderCheckEmailStep = () => (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="mail-open-outline" 
            size={moderateScale(48)} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={[styles.headerText, { fontSize: fontSize(isTablet() ? 28 : 24) }]}>
          {t('auth.checkYourEmail')}
        </Text>
        <Text style={[styles.subHeaderText, { fontSize: fontSize(14) }]}>
          {t('auth.resetEmailInstructions')?.replace('{email}', email)}
        </Text>
      </View>

      <GlassContainer 
        style={styles.formContainer}
        intensity={isDarkMode ? 25 : 40}
      >
        <View style={styles.instructionsBox}>
          <Ionicons name="information-circle-outline" size={24} color="#BB86FC" />
          <Text style={[styles.instructionsText, { fontSize: fontSize(14) }]}>
            {t('auth.checkSpamFolder')}
          </Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.secondaryButton,
            resendTimer > 0 && styles.buttonDisabled
          ]}
          onPress={handleResendEmail}
          disabled={resendTimer > 0 || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#BB86FC" size="small" />
          ) : (
            <Text style={[styles.secondaryButtonText, { fontSize: fontSize(15) }]}>
              {resendTimer > 0 
                ? `${t('auth.resendIn')} ${resendTimer}s` 
                : t('auth.resendResetLink')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.changeEmailButton}
          onPress={() => {
            setStep('email');
            setEmail('');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="rgba(255, 255, 255, 0.7)" />
          <Text style={[styles.changeEmailText, { fontSize: fontSize(14) }]}>
            {t('auth.useAnotherEmail')}
          </Text>
        </TouchableOpacity>
      </GlassContainer>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="lock-open-outline" 
            size={moderateScale(48)} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={[styles.headerText, { fontSize: fontSize(isTablet() ? 28 : 24) }]}>
          {t('auth.createNewPassword')}
        </Text>
        <Text style={[styles.subHeaderText, { fontSize: fontSize(14) }]}>
          {t('auth.createNewPasswordSubtitle')}
        </Text>
      </View>

      <GlassContainer 
        style={styles.formContainer}
        intensity={isDarkMode ? 25 : 40}
      >
        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons 
              name="lock-closed-outline" 
              size={moderateScale(20)} 
              color={newPasswordFocused ? '#BB86FC' : 'rgba(255, 255, 255, 0.6)'} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { fontSize: fontSize(15) },
                newPasswordFocused && styles.inputFocused,
              ]}
              placeholder={t('auth.newPassword')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setNewPasswordFocused(true)}
              onBlur={() => setNewPasswordFocused(false)}
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                size={moderateScale(22)} 
                color="rgba(255, 255, 255, 0.6)" 
              />
            </TouchableOpacity>
          </View>

          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View 
                  style={[
                    styles.strengthFill, 
                    { width: getStrengthWidth(), backgroundColor: getStrengthColor() }
                  ]} 
                />
              </View>
              <Text style={[styles.strengthText, { color: getStrengthColor(), fontSize: fontSize(12) }]}>
                {passwordStrength === 'weak' && t('auth.weakPassword')}
                {passwordStrength === 'medium' && t('auth.mediumPassword')}
                {passwordStrength === 'strong' && t('auth.strongPassword')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons 
              name="lock-closed-outline" 
              size={moderateScale(20)} 
              color={confirmPasswordFocused ? '#BB86FC' : 'rgba(255, 255, 255, 0.6)'} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { fontSize: fontSize(15) },
                confirmPasswordFocused && styles.inputFocused,
              ]}
              placeholder={t('auth.confirmNewPassword')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setConfirmPasswordFocused(true)}
              onBlur={() => setConfirmPasswordFocused(false)}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={moderateScale(22)} 
                color="rgba(255, 255, 255, 0.6)" 
              />
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={[styles.errorText, { fontSize: fontSize(12) }]}>
              {t('auth.passwordMismatch')}
            </Text>
          )}

          {confirmPassword.length > 0 && newPassword === confirmPassword && (
            <View style={styles.matchIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#44DD44" />
              <Text style={[styles.matchText, { fontSize: fontSize(12) }]}>
                {t('auth.passwordsMatch')}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#9C27B0', '#7B1FA2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={[styles.buttonText, { fontSize: fontSize(16) }]}>
                  {t('auth.resetPassword')}
                </Text>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </GlassContainer>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AnimatedBackground />
      <LinearGradient
        colors={['rgba(26, 26, 46, 0.95)', 'rgba(22, 22, 36, 0.98)']}
        style={styles.overlay}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, formStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <View style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Animated.View 
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}>
              
              {step === 'email' && renderEmailStep()}
              {step === 'checkEmail' && renderCheckEmailStep()}
              {step === 'newPassword' && renderNewPasswordStep()}

              <View style={styles.footer}>
                <Text style={[styles.footerText, { fontSize: fontSize(13) }]}>
                  {t('auth.rememberPassword')}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
                  <Text style={[styles.footerText, styles.signInText, { fontSize: fontSize(13) }]}>
                    {t('auth.signIn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  overlay: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: wp(6),
    paddingBottom: hp(4),
  },
  backButton: {
    marginTop: Platform.OS === 'ios' ? hp(6) : hp(4),
    marginBottom: hp(2),
    alignSelf: 'flex-start',
  },
  backButtonInner: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  iconContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: 'rgba(187, 134, 252, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  headerText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  subHeaderText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: wp(4),
    lineHeight: 22,
  },
  formContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: spacing.md + spacing.xs,
  },
  passwordInput: {
    paddingRight: moderateScale(40),
  },
  inputFocused: {
    borderColor: '#BB86FC',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.xs,
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  suggestionText: {
    color: '#BB86FC',
    marginLeft: spacing.xs,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontWeight: '500',
  },
  errorText: {
    color: '#FF4444',
    marginTop: spacing.sm,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  matchText: {
    color: '#44DD44',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  instructionsText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  secondaryButton: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BB86FC',
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    color: '#BB86FC',
    fontWeight: '600',
  },
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  changeEmailText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: spacing.md + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: spacing.xs,
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
  signInText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default ForgotPassword;
