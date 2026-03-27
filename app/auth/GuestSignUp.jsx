import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { 
  PersonIcon, MailIcon, ArrowForwardIcon, LockIcon, LockFilledIcon, EyeIcon, EyeOffIcon 
} from '../components/icons';
import { Ionicons } from '../components/icons/CompatIonicon';
import { useAppSettings } from '../context/AppSettingsContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import LanguageDropdown from '../components/LanguageDropdown';
import SearchableDropdown from '../components/SearchableDropdownNew';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import { initiateGuestSignup, clearPendingOAuthSignup } from '../../database/auth';
import { uploadProfilePicture } from '../../services/imgbbService';
import { 
  wp, hp, fontSize, spacing, isTablet, moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import telemetry from '../utils/telemetry';

const GuestSignUp = ({ navigation, route }) => {
  const oauthMode = route?.params?.oauthMode || false;
  const oauthEmail = route?.params?.oauthEmail || '';
  const oauthName = route?.params?.oauthName || '';
  
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { formStyle } = useLayout();
  const insets = useSafeAreaInsets();
  
  const [fullName, setFullName] = useState(oauthName);
  const [email, setEmail] = useState(oauthEmail);
  const [age, setAge] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [hasBlurredNameField, setHasBlurredNameField] = useState(false);
  
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  const { t, theme, isDarkMode, isRTL } = useAppSettings();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Age options: 16 to 100
  const ageOptions = Array.from({ length: 85 }, (_, i) => ({
    key: String(i + 16),
    label: String(i + 16)
  }));

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

  // Clean up pending Google Auth on unmount if we didn't complete it
  useEffect(() => {
    return () => {
      if (oauthMode) {
        clearPendingOAuthSignup().catch(() => {});
      }
    };
  }, [oauthMode]);

  const getInputErrorStyle = (fieldName) => {
    return fieldErrors[fieldName]
      ? { borderColor: theme.danger, borderWidth: 1 }
      : {};
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearSubmitError = () => {
    if (submitError) setSubmitError('');
  };

  const hasTwoNameParts = (name) => {
    const parts = (name || '').trim().split(/\s+/);
    return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
  };

  const hasUnsupportedNameCharacters = (name) => {
    const regex = /^[a-zA-Z\u0600-\u06FF\s]*$/;
    return !regex.test(name || '');
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd || pwd.length < 8) return 'weak';
    
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    const criteriasMet = [hasLetters, hasNumbers, hasSymbols].filter(Boolean).length;
    
    if (criteriasMet === 3 && pwd.length >= 8) return 'strong';
    if (criteriasMet >= 2 || pwd.length >= 10) return 'medium';
    return 'weak';
  };

  const passwordStrength = getPasswordStrength(password);
  
  const validateForm = () => {
    const errors = {};
    
    if (!fullName.trim()) {
      errors.fullName = t('auth.fullNameRequired');
    } else if (!hasTwoNameParts(fullName)) {
      errors.fullName = t('auth.fullNameTwoWordsRequired');
    } else if (hasUnsupportedNameCharacters(fullName)) {
      errors.fullName = t('auth.fullNameLettersOnly');
    }
    
    if (!email.trim()) {
      errors.email = t('auth.validEmailRequired');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = t('auth.validEmailRequired');
      }
    }
    
    if (!age) {
      errors.age = t('auth.ageRequired');
    }

    if (password.length < 8) {
      errors.password = t('auth.passwordTooShort');
    } else if (passwordStrength === 'weak') {
      errors.password = t('auth.passwordGuideWeak');
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = t('auth.passwordMismatch');
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFullNameBlur = () => {
    setHasBlurredNameField(true);
    setNameFocused(false);
    
    if (!fullName.trim()) {
      setFieldErrors(prev => ({ ...prev, fullName: t('auth.fullNameRequired') }));
      return;
    }
    if (!hasTwoNameParts(fullName)) {
      setFieldErrors(prev => ({ ...prev, fullName: t('auth.fullNameTwoWordsRequired') }));
      return;
    }
    if (hasUnsupportedNameCharacters(fullName)) {
      setFieldErrors(prev => ({ ...prev, fullName: t('auth.fullNameLettersOnly') }));
    }
  };

  const handleUploadProfilePicture = async () => {
    try {
      setIsUploadingImage(true);
      const result = await uploadProfilePicture({ t });
      if (result && result.displayUrl) {
        setProfilePicture(result.displayUrl);
      }
    } catch (error) {
      if (error?.code === 'NSFW_IMAGE_BLOCKED' || error?.code === 'NSFW_SCAN_FAILED') return;
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: error.message === 'Permission to access camera roll is required!'
          ? t('settings.cameraPermissionRequired', 'Camera roll permission is required')
          : t('settings.profilePictureUploadError', 'Failed to upload picture'),
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      const firstErrorKey = Object.keys(fieldErrors)[0];
      if (firstErrorKey) {
        setSubmitError(fieldErrors[firstErrorKey]);
      } else {
        setSubmitError(t('auth.pleaseFixErrors', 'Please fix all formulation errors'));
      }
      return;
    }
    
    setIsLoading(true);
    setSubmitError('');
    
    try {
      if (oauthMode) {
        // OAuth mode means the account is already 'created' by Google,
        // we just need to pass the extra info to VerifyEmail, or maybe complete it directly.
        // But since this is guest, the API already generated verify token, so we do the same flow.
        const pendingData = {
          userId: route.params.oauthUserId,
          email,
          name: fullName,
          additionalData: { age, profilePicture, role: 'guest' },
          timestamp: Date.now(),
        };
        // Just directly navigate to VerifyEmail in OAuth mode if verification is needed,
        // Actually Google OAuth doesn't need email verification!
        // We can just call completeOAuthSignup directly for guests.
        import('../../database/auth').then(async ({ completeOAuthSignup }) => {
          try {
            await completeOAuthSignup(pendingData.userId, email, fullName, pendingData.additionalData);
            navigation.replace('MainTabs');
          } catch (error) {
            setSubmitError(error.message || t('auth.signUpError'));
            setIsLoading(false);
          }
        }).catch(err => {
          setSubmitError(t('auth.signUpError'));
          setIsLoading(false);
        });
        return;
      }
      
      const payload = { stage: age, profilePicture }; // stage holds age temporarily for backend
      const result = await initiateGuestSignup(email, password, fullName, payload);
      
      if (result.success) {
        telemetry.recordEvent('guest_signup_initiated');
        navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
      }
    } catch (error) {
      let errorMessage = t('auth.signUpError');
      if (error.message?.includes('already exists') || error.message?.includes('user')) {
        errorMessage = t('auth.emailInUse', 'This email is already registered.');
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = t('common.networkError');
      } else if (error.message?.includes('Only educational')) {
        // Should not happen since we bypass it for guests, but just in case
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
      setSubmitError(errorMessage);
    } finally {
      if (!oauthMode) {
        setIsLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <AnimatedBackground particleCount={30} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, formStyle, { paddingTop: Math.max(insets.top, hp(2)) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.languageContainer, isRTL && styles.languageContainerRtl]}>
              <LanguageDropdown />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.headerContainer}>
                <Text style={[styles.headerText, { fontSize: fontSize(isTablet() ? 32 : 24) }]}>
                  {t('auth.guestSignUpTitle', 'Guest Sign Up')}
                </Text>
                <Text style={[styles.subHeaderText, { fontSize: fontSize(14) }]}>
                  {oauthMode ? t('auth.finishSetup', 'Complete your profile') : t('auth.guestSignUpSubtitle', 'Join to view public discussions')}
                </Text>
              </View>

              <GlassContainer style={styles.formContainer} intensity={isTablet() ? 30 : 25} borderRadius={borderRadius.xl} disableBackgroundOverlay>
                <View style={styles.profilePictureContainer}>
                  <TouchableOpacity 
                    onPress={handleUploadProfilePicture} 
                    disabled={isUploadingImage}
                    activeOpacity={0.8}
                    style={styles.profilePictureWrapper}
                  >
                    {profilePicture ? (
                      <Image source={{ uri: profilePicture }} style={styles.profilePicture} resizeMode="cover" />
                    ) : (
                      <View style={[styles.profilePicturePlaceholder, { backgroundColor: isDarkMode ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.2)' }]}>
                        <Ionicons name="person" size={moderateScale(40)} color={theme.primary} />
                      </View>
                    )}
                    <View style={[styles.uploadBadge, { backgroundColor: theme.primary }]}>
                      {isUploadingImage ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="camera" size={moderateScale(14)} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.uploadHint, { color: theme.textSecondary }]}>
                    {profilePicture ? t('auth.changePicture', 'Change Picture') : t('auth.addProfilePicture', 'Add Profile Picture (Optional)')}
                  </Text>
                </View>

                {submitError ? (
                  <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{submitError}</Text>
                  </View>
                ) : null}

                <GlassInput focused={nameFocused} style={getInputErrorStyle('fullName')}>
                  <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                    <PersonIcon size={moderateScale(20)} color={nameFocused ? theme.primary : theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                    <TextInput
                      style={[styles.input, isRTL && styles.inputRtl, { color: theme.text, fontSize: fontSize(15), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                      placeholder={t('auth.fullName')}
                      placeholderTextColor={theme.input.placeholder}
                      value={fullName}
                      onChangeText={(value) => {
                        setFullName(value);
                        if (!hasBlurredNameField) {
                          clearSubmitError();
                          return;
                        }
                        if (!hasTwoNameParts(value)) {
                          setFieldErrors(prev => ({ ...prev, fullName: t('auth.fullNameTwoWordsRequired') }));
                          clearSubmitError();
                          return;
                        }
                        if (hasUnsupportedNameCharacters(value)) {
                          setFieldErrors(prev => ({ ...prev, fullName: t('auth.fullNameLettersOnly') }));
                          clearSubmitError();
                          return;
                        }
                        clearFieldError('fullName');
                        clearSubmitError();
                      }}
                      onFocus={() => setNameFocused(true)}
                      onBlur={handleFullNameBlur}
                      autoCorrect={false}
                    />
                  </View>
                </GlassInput>
                {fieldErrors.fullName && <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.fullName}</Text>}

                <GlassInput focused={emailFocused} style={[{ marginTop: spacing.md }, getInputErrorStyle('email')]}>
                  <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                    <MailIcon size={moderateScale(20)} color={emailFocused ? theme.primary : theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                    <TextInput
                       style={[styles.input, isRTL && styles.inputRtl, { color: oauthMode ? theme.textSecondary : theme.text, fontSize: fontSize(15), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                       placeholder={oauthMode ? t('auth.emailFromGoogle') : t('auth.email', 'Email Address')}
                       placeholderTextColor={theme.input.placeholder}
                       value={email}
                       onChangeText={oauthMode ? undefined : (value) => {
                         setEmail(value);
                         clearFieldError('email');
                         clearSubmitError();
                       }}
                       onFocus={() => setEmailFocused(true)}
                       onBlur={() => setEmailFocused(false)}
                       keyboardType="email-address"
                       autoCapitalize="none"
                       editable={!oauthMode}
                    />
                  </View>
                </GlassInput>
                {fieldErrors.email && <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.email}</Text>}

                <GlassInput focused={passwordFocused} style={[{ marginTop: spacing.md }, getInputErrorStyle('password')]}>
                  <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                    <LockIcon size={moderateScale(20)} color={passwordFocused ? theme.primary : theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                    <TextInput
                      style={[styles.input, isRTL && styles.inputRtl, { color: theme.text, fontSize: fontSize(15), textAlign: isRTL ? 'right' : 'left' }]}
                      placeholder={t('auth.password')}
                      placeholderTextColor={theme.input.placeholder}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        clearFieldError('password');
                        clearSubmitError();
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={[styles.eyeIcon, isRTL && styles.eyeIconRtl]}>
                      {showPassword ? <EyeOffIcon size={moderateScale(20)} color={theme.textSecondary} /> : <EyeIcon size={moderateScale(20)} color={theme.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </GlassInput>
                {fieldErrors.password && <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.password}</Text>}

                {password.length > 0 && (
                  <View style={styles.passwordRequirementsContainer}>
                    <Text style={[styles.passwordRequirementsTitle, { color: theme.text, fontSize: fontSize(13) }]}>
                      {t('auth.passwordStrength')}: <Text style={{ color: getPasswordStrength(password) === 'strong' ? theme.success : getPasswordStrength(password) === 'medium' ? theme.warning : theme.danger }}>{t(`auth.${getPasswordStrength(password)}`)}</Text>
                    </Text>
                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: getPasswordStrength(password) === 'strong' ? '100%' : getPasswordStrength(password) === 'medium' ? '66%' : '33%', backgroundColor: getPasswordStrength(password) === 'strong' ? theme.success : getPasswordStrength(password) === 'medium' ? theme.warning : theme.danger }} />
                    </View>
                  </View>
                )}

                <GlassInput focused={confirmPasswordFocused} style={[{ marginTop: spacing.md }, getInputErrorStyle('confirmPassword')]}>
                  <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                    <LockFilledIcon size={moderateScale(20)} color={confirmPasswordFocused ? theme.primary : theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                    <TextInput
                      style={[styles.input, isRTL && styles.inputRtl, { color: theme.text, fontSize: fontSize(15), textAlign: isRTL ? 'right' : 'left' }]}
                      placeholder={t('auth.confirmPassword')}
                      placeholderTextColor={theme.input.placeholder}
                      value={confirmPassword}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        clearFieldError('confirmPassword');
                        clearSubmitError();
                      }}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={[styles.eyeIcon, isRTL && styles.eyeIconRtl]}>
                      {showConfirmPassword ? <EyeOffIcon size={moderateScale(20)} color={theme.textSecondary} /> : <EyeIcon size={moderateScale(20)} color={theme.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </GlassInput>
                {fieldErrors.confirmPassword && <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.confirmPassword}</Text>}

                <SearchableDropdown
                  items={ageOptions}
                  value={age}
                  onSelect={(value) => {
                    setAge(value);
                    clearFieldError('age');
                    clearSubmitError();
                  }}
                  placeholder={t('auth.age')}
                  icon="calendar-outline"
                  style={{ marginTop: spacing.md }}
                />
                {fieldErrors.age && <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.age}</Text>}

                <TouchableOpacity 
                   style={styles.actionButton}
                   onPress={handleSignUp}
                   activeOpacity={0.8}
                   disabled={isLoading || isUploadingImage}>
                   <LinearGradient
                     colors={isLoading || isUploadingImage ? ['#999', '#777'] : ['#667eea', '#764ba2']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 0 }}
                     style={styles.buttonGradient}>
                     {isLoading ? (
                       <ActivityIndicator color="#FFFFFF" size="small" />
                     ) : (
                       <>
                         <Text style={[styles.actionButtonText, { fontSize: fontSize(15) }]}>
                           {oauthMode ? t('common.save', 'Save Profile') : t('auth.signUp', 'Sign Up')}
                         </Text>
                         <ArrowForwardIcon size={moderateScale(20)} color="#FFFFFF" style={styles.buttonIcon} />
                       </>
                     )}
                   </LinearGradient>
                 </TouchableOpacity>

                 <View style={styles.footer}>
                   <Text style={[styles.footerText, { fontSize: fontSize(13) }]}>
                     {t('auth.alreadyHaveAccount', 'Already have an account?')}
                   </Text>
                   <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
                     <Text style={[styles.footerText, styles.signInText, { fontSize: fontSize(13) }]}>
                       {t('auth.signIn', 'Sign In')}
                     </Text>
                   </TouchableOpacity>
                 </View>
              </GlassContainer>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <CustomAlert visible={alertConfig.visible} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onDismiss={hideAlert} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: wp(5), paddingBottom: hp(4) },
  languageContainer: { position: 'absolute', top: Platform.OS === 'ios' ? hp(6) : hp(5), right: wp(5), zIndex: 1000 },
  languageContainerRtl: { right: 'auto', left: wp(5) },
  content: { flex: 1, alignItems: 'center' },
  headerContainer: { marginBottom: spacing.lg, alignItems: 'center', maxWidth: isTablet() ? 700 : '95%', marginTop: hp(4) },
  headerText: { fontWeight: 'bold', marginBottom: spacing.sm, letterSpacing: 0.5, color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subHeaderText: { opacity: 0.9, color: '#FFFFFF', textAlign: 'center' },
  formContainer: { padding: spacing.lg, maxWidth: isTablet() ? 700 : '95%', width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm },
  inputWrapperRtl: { flexDirection: 'row-reverse' },
  inputIcon: { marginRight: spacing.sm },
  inputIconRtl: { marginRight: 0, marginLeft: spacing.sm },
  input: { flex: 1, fontWeight: '500', minHeight: moderateScale(24), paddingVertical: Platform.OS === 'ios' ? spacing.xs : 0, textAlignVertical: 'center' },
  inputRtl: { textAlign: 'right' },
  eyeIcon: { padding: spacing.xs, marginLeft: spacing.xs },
  eyeIconRtl: { marginLeft: 0, marginRight: spacing.xs },
  errorContainer: { padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: spacing.md, alignItems: 'center' },
  errorText: { fontSize: fontSize(13), fontWeight: '500', textAlign: 'center' },
  fieldErrorText: { fontSize: fontSize(12), marginTop: spacing.xs, marginLeft: spacing.sm },
  passwordRequirementsContainer: { marginTop: spacing.md, padding: spacing.sm, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: borderRadius.md },
  passwordRequirementsTitle: { fontWeight: '600', marginBottom: spacing.xs },
  passwordRequirementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  passwordRequirementText: { marginLeft: spacing.sm, fontWeight: '500' },
  actionButton: { borderRadius: borderRadius.lg, overflow: 'hidden', marginTop: spacing.xl },
  buttonGradient: { paddingVertical: spacing.md + spacing.xs, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  actionButtonText: { color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 0.5 },
  buttonIcon: { marginLeft: spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl },
  footerText: { color: 'rgba(255, 255, 255, 0.9)' },
  signInText: { fontWeight: 'bold', textDecorationLine: 'underline' },
  profilePictureContainer: { alignItems: 'center', marginBottom: spacing.lg },
  profilePictureWrapper: { width: moderateScale(90), height: moderateScale(90), borderRadius: moderateScale(45), backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.2)' },
  profilePicture: { width: '100%', height: '100%' },
  profilePicturePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  uploadBadge: { position: 'absolute', bottom: 0, width: '100%', height: '30%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  uploadHint: { marginTop: spacing.sm, fontSize: fontSize(12), opacity: 0.8 },
});

export default GuestSignUp;
