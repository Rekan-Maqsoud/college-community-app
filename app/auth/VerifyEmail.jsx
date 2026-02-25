import React, { useState, useEffect, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import { GlassContainer } from '../components/GlassComponents';
import { 
  verifyOTPCode,
  resendVerificationEmail, 
  cancelPendingVerification, 
  getCompleteUserData,
  checkExpiredVerification
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Refs for OTP inputs
  const otpInputRefs = useRef([]);

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
  }, [expiresAt]);

  // Check for expired verification on mount
  useEffect(() => {
    const checkExpiration = async () => {
      const result = await checkExpiredVerification();
      if (result.expired) {
        handleExpired();
      }
    };
    checkExpiration();
  }, []);

  const handleExpired = async () => {
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
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value, index) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    const newOtp = [...otpCode];
    newOtp[index] = numericValue;
    setOtpCode(newOtp);
    setOtpError('');
    
    // Auto-focus next input
    if (numericValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all 6 digits are entered
    if (index === 5 && numericValue) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerifyOTP(fullCode);
      }
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (code) => {
    const otpString = code || otpCode.join('');
    
    if (otpString.length !== 6) {
      setOtpError(t('auth.enterCompleteCode'));
      return;
    }
    
    setIsVerifying(true);
    setOtpError('');
    
    try {
      await verifyOTPCode(otpString);
      
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
          role: completeUserData.role || 'student',
          postsCount: completeUserData.postsCount || 0,
          followersCount: completeUserData.followersCount || 0,
          followingCount: completeUserData.followingCount || 0,
          isEmailVerified: true,
          lastAcademicUpdate: completeUserData.lastAcademicUpdate || null,
        };
        
        await setUserData(userData);
      }
      
      navigation.replace('MainTabs');
    } catch (error) {
      setIsVerifying(false);
      setOtpError(t('auth.verificationError'));
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
        // On Android, try Gmail inbox first, then generic email intent
        const gmailUrl = 'googlegmail://';
        const canOpenGmail = await Linking.canOpenURL(gmailUrl);
        if (canOpenGmail) {
          await Linking.openURL(gmailUrl);
        } else {
          // Fallback: open device email chooser via intent
          await Linking.openURL('mailto:');
        }
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
            contentContainerStyle={[styles.scrollContent, formStyle]}
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
                  <Ionicons 
                    name="mail-unread-outline" 
                    size={moderateScale(40)} 
                    color="#FFFFFF" 
                  />
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
                    <Ionicons name="time-outline" size={moderateScale(16)} color="#FF9500" />
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
                        maxLength={1}
                        selectTextOnFocus
                        autoFocus={index === 0}
                      />
                    ))}
                  </View>
                  
                  {otpError ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={moderateScale(16)} color="#FF3B30" />
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
                      <Ionicons name="checkmark-circle-outline" size={moderateScale(20)} color="#FFFFFF" />
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
                  <Ionicons name="mail-open-outline" size={moderateScale(20)} color={theme.primary} />
                  <Text style={[styles.openEmailButtonText, { fontSize: fontSize(14), color: theme.primary }]}>
                    {t('auth.openEmailApp')}
                  </Text>
                </TouchableOpacity>

                {/* Spam notice */}
                <View style={styles.spamNotice}>
                  <Ionicons name="information-circle-outline" size={moderateScale(16)} color={theme.textSecondary} />
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
                  <Ionicons 
                    name="arrow-back" 
                    size={moderateScale(16)} 
                    color={theme.textSecondary} 
                  />
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
