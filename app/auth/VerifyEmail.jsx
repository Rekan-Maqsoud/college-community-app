import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import {
  MailIcon,
  TimeIcon,
  AlertCircleIcon,
  CheckmarkCircleIcon,
  InformationCircleIcon,
  ArrowBackIcon,
} from '../components/icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import { GlassContainer } from '../components/GlassComponents';
import { createSuggestion } from '../../database/suggestions';
import { ACADEMIC_OTHER_KEY } from '../utils/academicSelection';
import { 
  verifyOTPCode,
  resendVerificationEmail, 
  cancelPendingVerification, 
  getCompleteUserData,
  checkExpiredVerification,
  isEducationalEmail,
} from '../../database/auth';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const VerifyEmail = ({ route, navigation }) => {
  const { email, expiresAt, formData } = route.params || {};
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [expirationCountdown, setExpirationCountdown] = useState(null);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  
  const { t, theme, isDarkMode } = useAppSettings();
  const { setUserData } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { formStyle } = useLayout();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Refs for OTP inputs
  const otpInputRefs = useRef([]);

  const handleExpired = useCallback(async () => {
    await cancelPendingVerification();
    showAlert({
      type: 'error',
      title: t('auth.verificationExpired'),
      message: t('auth.verificationExpiredMessage'),
      buttons: [
        {
          text: t('common.ok'),
          onPress: () => navigation.replace('SignUp'),
        },
      ],
    });
  }, [navigation, showAlert, t]);

  const getVerifyErrorMessage = useCallback((error) => {
    const rawMessage = String(error?.message || '').trim();
    if (!rawMessage) {
      return t('auth.verificationError');
    }

    const normalized = rawMessage.toLowerCase();
    if (normalized.includes('no pending verification') || normalized.includes('verification expired')) {
      return t('auth.verificationExpiredMessage');
    }

    return rawMessage;
  }, [t]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for email icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Resend countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Expiration countdown timer (15 minutes)
    if (expiresAt) {
      const updateExpiration = () => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          handleExpired();
        } else {
          setExpirationCountdown(Math.ceil(remaining / 1000));
        }
      };
      
      updateExpiration();
      const expirationTimer = setInterval(updateExpiration, 1000);
      
      return () => {
        clearInterval(timer);
        clearInterval(expirationTimer);
        pulse.stop();
      };
    }

    return () => {
      clearInterval(timer);
      pulse.stop();
    };
  }, [expiresAt, fadeAnim, handleExpired, pulseAnim, scaleAnim]);

  // Check for expired verification on mount
  useEffect(() => {
    const checkExpiration = async () => {
      const result = await checkExpiredVerification();
      if (result.expired) {
        handleExpired();
        return;
      }

      if (!result.hasPending) {
        showAlert({
          type: 'error',
          title: t('auth.verificationExpired'),
          message: t('auth.verificationExpiredMessage'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => navigation.replace('SignUp', { preservedData: formData }),
            },
          ],
        });
      }
    };
    checkExpiration();
  }, [formData, handleExpired, navigation, showAlert, t]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value, index) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');

    const nextOtp = [...otpCode];
    setOtpError('');

    if (!numericValue) {
      nextOtp[index] = '';
      setOtpCode(nextOtp);
      return;
    }

    // Support pasting a full 6-digit code into any field.
    if (numericValue.length > 1) {
      const pastedDigits = numericValue.slice(0, 6 - index).split('');
      pastedDigits.forEach((digit, offset) => {
        nextOtp[index + offset] = digit;
      });

      setOtpCode(nextOtp);

      const nextFocusIndex = index + pastedDigits.length;
      if (nextFocusIndex <= 5) {
        otpInputRefs.current[nextFocusIndex]?.focus();
      }

      if (nextOtp.every((digit) => digit && digit.length === 1)) {
        handleVerifyOTP(nextOtp.join(''));
      }
      return;
    }

    nextOtp[index] = numericValue.slice(-1);
    setOtpCode(nextOtp);

    // Auto-focus next input
    if (index < 5 && nextOtp[index]) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (nextOtp.every((digit) => digit && digit.length === 1)) {
      handleVerifyOTP(nextOtp.join(''));
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (code) => {
    if (isVerifying) return;

    const otpString = code || otpCode.join('');
    
    console.log('[VerifyEmail.handleVerifyOTP] Verification attempt started');
    console.log('[VerifyEmail.handleVerifyOTP] OTP code length:', otpString.length);
    
    if (otpString.length !== 6) {
      console.warn('[VerifyEmail.handleVerifyOTP] Invalid OTP length, expected 6, got:', otpString.length);
      setOtpError(t('auth.enterCompleteCode'));
      return;
    }
    
    console.log('[VerifyEmail.handleVerifyOTP] OTP validation passed, starting verification process');
    setIsVerifying(true);
    setOtpError('');
    
    try {
      console.log('[VerifyEmail.handleVerifyOTP] Calling verifyOTPCode...');
      await verifyOTPCode(otpString);
      console.log('[VerifyEmail.handleVerifyOTP] OTP verification successful');

      const pendingAcademicSuggestion = formData?.academicSuggestionPayload;
      console.log('[VerifyEmail.handleVerifyOTP] Pending academic suggestion:', !!pendingAcademicSuggestion);

      if (pendingAcademicSuggestion?.suggestionText) {
        try {
          console.log('[VerifyEmail.handleVerifyOTP] Creating academic suggestion...');
          await createSuggestion({
            category: 'other',
            title: t('auth.otherAcademicSuggestionTitle'),
            message: pendingAcademicSuggestion.suggestionText,
            contextType: 'academic_missing_option',
            missingUniversity: pendingAcademicSuggestion.university === ACADEMIC_OTHER_KEY ? 'yes' : undefined,
            missingCollege: pendingAcademicSuggestion.college === ACADEMIC_OTHER_KEY ? 'yes' : undefined,
            missingDepartment: pendingAcademicSuggestion.department === ACADEMIC_OTHER_KEY ? 'yes' : undefined,
            selectedUniversity: pendingAcademicSuggestion.university || undefined,
            selectedCollege: pendingAcademicSuggestion.college || undefined,
            selectedDepartment: pendingAcademicSuggestion.department || undefined,
            selectedStage: pendingAcademicSuggestion.stage || undefined,
          });
          console.log('[VerifyEmail.handleVerifyOTP] Academic suggestion created successfully');
        } catch (error) {
          console.error('[VerifyEmail.handleVerifyOTP] Failed to create suggestion:', error.message);
        }
      }
      
      console.log('[VerifyEmail.handleVerifyOTP] Fetching complete user data...');
      const completeUserData = await getCompleteUserData();
      
      console.log('[VerifyEmail.handleVerifyOTP] Complete user data retrieved:', {
        hasData: !!completeUserData,
        userId: completeUserData?.$id,
        email: completeUserData?.email?.substring(0, 5) + '***',
        role: completeUserData?.role,
      });
      
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
        
        console.log('[VerifyEmail.handleVerifyOTP] Setting user data with role:', userData.role);
        await setUserData(userData);
        console.log('[VerifyEmail.handleVerifyOTP] User data set successfully');
      } else {
        console.warn('[VerifyEmail.handleVerifyOTP] No complete user data retrieved');
      }

      const nextRouteName = getPostAuthRouteName(completeUserData?.role);
      console.log('[VerifyEmail.handleVerifyOTP] Navigating to route:', nextRouteName);
      navigation.replace(nextRouteName);
      
    } catch (error) {
      const normalizedMessage = String(error?.message || '').toLowerCase();
      const isExpectedVerificationError =
        normalizedMessage.includes('invalid')
        || normalizedMessage.includes('expired')
        || normalizedMessage.includes('pending verification')
        || normalizedMessage.includes('too many verification attempts');

      if (isExpectedVerificationError) {
        console.warn('[VerifyEmail.handleVerifyOTP] Verification rejected:', error.message || error);
      } else {
        console.error('[VerifyEmail.handleVerifyOTP] OTP verification failed:', error.message || error);
        console.error('[VerifyEmail.handleVerifyOTP] Error stack:', error.stack);
      }

      setIsVerifying(false);
      setOtpError(getVerifyErrorMessage(error));
      // Clear the OTP inputs on error
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    }
  };

  const handleResendEmail = async () => {
    if (!canResend) return;

    try {
      await resendVerificationEmail();
      
      setCanResend(false);
      setCountdown(60);
      setOtpCode(['', '', '', '', '', '']);
      setOtpError('');

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      showAlert({
        type: 'success',
        title: t('common.success'),
        message: t('auth.codeSent'),
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: t('auth.resendError'),
      });
    }
  };

  const handleOpenEmailApp = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Opens the default Mail app inbox on iOS
        await Linking.openURL('message://');
      } else {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
            category: 'android.intent.category.APP_EMAIL',
            flags: 268435456,
          });
          return;
        } catch (intentError) {
          // Continue to fallback options below.
        }

        const gmailUrl = 'googlegmail://';
        const canOpenGmail = await Linking.canOpenURL(gmailUrl);
        if (canOpenGmail) {
          await Linking.openURL(gmailUrl);
          return;
        }

        throw new Error('email_app_unavailable');
      }
    } catch (error) {
      showAlert({
        type: 'info',
        title: t('common.info'),
        message: t('auth.openEmailManually'),
      });
    }
  };

  const handleGoBack = async () => {
    showAlert({
      type: 'info',
      title: t('auth.changeEmail'),
      message: t('auth.changeEmailMessage'),
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.ok'),
          onPress: async () => {
            try {
              await cancelPendingVerification();
              navigation.replace('SignUp', { preservedData: formData });
            } catch (error) {
              navigation.replace('SignUp');
            }
          },
          style: 'destructive',
        },
      ],
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
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent, 
              formStyle,
              { paddingTop: Math.max(insets.top, hp(2)) }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}>
              
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: pulseAnim }] }
                ]}>
                <View style={styles.iconCircle}>
                  <MailIcon size={moderateScale(40)} color="#FFFFFF" />
                </View>
              </Animated.View>

              <View style={styles.headerContainer}>
                <Text style={[styles.headerText, { fontSize: fontSize(22) }]}>
                  {t('auth.verifyYourEmail')}
                </Text>
                <Text style={[styles.subHeaderText, { fontSize: fontSize(13) }]}>
                  {t('auth.verificationCodeSent')}
                </Text>
                <View style={styles.emailBox}>
                  <Text style={[styles.emailText, { fontSize: fontSize(13) }]} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
                {expirationCountdown !== null && (
                  <View style={styles.expirationContainer}>
                    <TimeIcon size={moderateScale(16)} color="#FF9500" />
                    <Text style={styles.expirationText}>
                      {`${t('auth.expiresIn')} ${formatTime(expirationCountdown)}`}
                    </Text>
                  </View>
                )}
              </View>

              <GlassContainer 
                style={styles.formContainer}
                intensity={isTablet() ? 30 : 25}
                borderRadius={borderRadius.xl}
                disableBackgroundOverlay
              >
                {/* OTP Input Section */}
                <View style={styles.otpSection}>
                  <Text style={[styles.otpLabel, { color: theme.text }]}>
                    {t('auth.enterCode')}
                  </Text>
                  
                  <View style={styles.otpContainer}>
                    {otpCode.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (otpInputRefs.current[index] = ref)}
                        style={[
                          styles.otpInput,
                          { 
                            borderColor: otpError ? '#FF3B30' : (digit ? theme.primary : 'rgba(0,0,0,0.2)'),
                            backgroundColor: digit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)',
                            color: '#1a1a2e',
                          }
                        ]}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={6}
                        selectTextOnFocus
                        autoFocus={index === 0}
                        textContentType="oneTimeCode"
                        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                      />
                    ))}
                  </View>
                  
                  {otpError ? (
                    <View style={styles.errorContainer}>
                      <AlertCircleIcon size={moderateScale(16)} color="#FF3B30" />
                      <Text style={styles.errorText}>{otpError}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Verify Button */}
                <TouchableOpacity 
                  style={[
                    styles.verifyButton, 
                    { 
                      backgroundColor: theme.primary,
                      opacity: isVerifying || otpCode.join('').length !== 6 ? 0.7 : 1
                    }
                  ]}
                  onPress={() => handleVerifyOTP()}
                  disabled={isVerifying || otpCode.join('').length !== 6}
                  activeOpacity={0.8}>
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CheckmarkCircleIcon size={moderateScale(20)} color="#FFFFFF" />
                      <Text style={[styles.verifyButtonText, { fontSize: fontSize(16) }]}>
                        {t('auth.verify')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Open Email App Button */}
                <TouchableOpacity 
                  style={[
                    styles.openEmailButton,
                    { 
                      backgroundColor: 'transparent',
                      borderColor: theme.primary,
                    }
                  ]}
                  onPress={handleOpenEmailApp}
                  activeOpacity={0.8}>
                  <MailIcon size={moderateScale(20)} color={theme.primary} />
                  <Text style={[styles.openEmailButtonText, { fontSize: fontSize(14), color: theme.primary }]}>
                    {t('auth.openEmailApp')}
                  </Text>
                </TouchableOpacity>

                {/* Spam notice */}
                <View style={styles.spamNotice}>
                  <InformationCircleIcon size={moderateScale(16)} color={theme.textSecondary} />
                  <Text style={[styles.spamNoticeText, { color: theme.textSecondary }]}>
                    {t('auth.checkSpamFolder')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendEmail}
                  disabled={!canResend}>
                  <Text style={[
                    styles.resendText,
                    { 
                      color: canResend ? theme.primary : theme.textSecondary,
                      fontSize: fontSize(14),
                    }
                  ]}>
                    {canResend 
                      ? t('auth.resendCode')
                      : `${t('auth.resendIn')} ${countdown}s`
                    }
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeEmailButton}
                  onPress={handleGoBack}>
                  <ArrowBackIcon size={moderateScale(16)} color={theme.textSecondary} />
                  <Text style={[
                    styles.changeEmailText,
                    { color: theme.textSecondary, fontSize: fontSize(14) }
                  ]}>
                    {t('auth.useAnotherEmail')}
                  </Text>
                </TouchableOpacity>
              </GlassContainer>
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
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    paddingTop: hp(4),
    paddingBottom: hp(2),
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: isTablet() ? 500 : undefined,
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subHeaderText: {
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  emailText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderRadius: borderRadius.sm,
  },
  expirationText: {
    color: '#FF9500',
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  formContainer: {
    padding: spacing.md,
    maxWidth: isTablet() ? 500 : '100%',
    width: '100%',
  },
  otpSection: {
    width: '100%',
    marginBottom: spacing.md,
  },
  otpLabel: {
    fontSize: fontSize(14),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  otpInput: {
    width: moderateScale(45),
    height: moderateScale(55),
    borderWidth: 2,
    borderRadius: borderRadius.md,
    fontSize: fontSize(22),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: fontSize(12),
    textAlign: 'center',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: fontSize(15),
  },
  openEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    width: '100%',
    borderWidth: 2,
  },
  openEmailButtonText: {
    fontWeight: 'bold',
    fontSize: fontSize(15),
  },
  spamNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  spamNoticeText: {
    flex: 1,
    fontSize: fontSize(11),
    color: '#666666',
  },
  resendButton: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  resendText: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: fontSize(13),
  },
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  changeEmailText: {
    fontWeight: '500',
    fontSize: fontSize(13),
  },
});

export default VerifyEmail;
