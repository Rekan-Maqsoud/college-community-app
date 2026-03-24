import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import { updateUserPassword } from '../../database/auth';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import useLayout from '../hooks/useLayout';

const ChangePassword = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordFocused, setCurrentPasswordFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const discardConfirmedRef = useRef(false);
  
  const { t, theme, isDarkMode } = useAppSettings();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { formStyle } = useLayout();
  const backgroundGradientColors = isDarkMode
    ? [theme.background, theme.backgroundSecondary, theme.gradient[0]]
    : [theme.gradientLight[0], theme.gradientLight[1], theme.backgroundSecondary];

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

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const hasUnsavedChanges = currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
  const passwordRequirementItems = [
    {
      key: 'length',
      label: t('auth.passwordRequirementLength'),
      met: newPassword.length >= 8,
    },
    {
      key: 'letters',
      label: t('auth.passwordRequirementLetters'),
      met: /[a-zA-Z]/.test(newPassword),
    },
    {
      key: 'numbers',
      label: t('auth.passwordRequirementNumbers'),
      met: /[0-9]/.test(newPassword),
    },
    {
      key: 'symbols',
      label: t('auth.passwordRequirementSymbols'),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    },
  ];

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return theme.danger;
      case 'medium': return theme.warning;
      case 'strong': return theme.success;
      default: return theme.textSecondary;
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

  const isFormValid = () => {
    return (
      currentPassword.trim() !== '' &&
      newPassword.length >= 8 &&
      newPassword === confirmPassword &&
      confirmPassword.length > 0
    );
  };

  const confirmDiscardChanges = useCallback((onDiscard) => {
    if (!hasUnsavedChanges || isLoading) {
      onDiscard();
      return;
    }

    showAlert({
      type: 'warning',
      title: t('settings.discardPasswordChangesTitle'),
      message: t('settings.discardPasswordChangesMessage'),
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('post.discard'),
          style: 'destructive',
          onPress: () => {
            discardConfirmedRef.current = true;
            onDiscard();
          },
        },
      ],
    });
  }, [hasUnsavedChanges, isLoading, showAlert, t]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (isLoading) {
        event.preventDefault();
        return;
      }

      if (!hasUnsavedChanges || discardConfirmedRef.current) {
        discardConfirmedRef.current = false;
        return;
      }

      event.preventDefault();
      confirmDiscardChanges(() => navigation.dispatch(event.data.action));
    });

    return unsubscribe;
  }, [confirmDiscardChanges, hasUnsavedChanges, isLoading, navigation]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLoading) {
        return true;
      }

      if (!hasUnsavedChanges) {
        return false;
      }

      confirmDiscardChanges(() => navigation.goBack());
      return true;
    });

    return () => subscription.remove();
  }, [confirmDiscardChanges, hasUnsavedChanges, isLoading, navigation]);

  const handleChangePassword = async () => {
    if (!isFormValid()) {
      showAlert({ type: 'error', title: t('common.error'), message: t('settings.fillAllPasswordFields') || 'Please fill all fields correctly' });
      return;
    }

    setIsLoading(true);

    try {
      await updateUserPassword(newPassword, currentPassword);
      
      showAlert({
        type: 'success',
        title: t('common.success'),
        message: t('settings.passwordChanged') || 'Password changed successfully!',
        buttons: [
          {
            text: t('common.ok') || 'OK',
            onPress: () => {
              discardConfirmedRef.current = true;
              navigation.goBack();
            },
          }
        ]
      });
    } catch (error) {
      let errorMessage = t('settings.changePasswordError') || 'Failed to change password. Please try again.';
      
      if (error.message?.includes('Invalid credentials') || error.message?.includes('password')) {
        errorMessage = t('settings.currentPasswordIncorrect') || 'Current password is incorrect.';
      }
      
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
    } finally {
      setIsLoading(false);
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
        colors={backgroundGradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          
          <ScrollView
            contentContainerStyle={[styles.scrollContent, formStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => confirmDiscardChanges(() => navigation.goBack())}
              activeOpacity={0.7}>
              <Ionicons 
                name="arrow-back" 
                size={moderateScale(24)} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <Text style={[styles.headerText, { fontSize: fontSize(28) }]}>
                {t('settings.changePassword') || 'Change Password'}
              </Text>
              <Text style={[styles.subHeaderText, { fontSize: fontSize(15) }]}>
                {t('settings.changePasswordDesc') || 'Update your account password'}
              </Text>
            </View>

            <GlassContainer 
              style={styles.formContainer}
              intensity={25}
              borderRadius={borderRadius.xl}
              disableBackgroundOverlay
            >
              <GlassInput focused={currentPasswordFocused}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={moderateScale(20)} 
                    color={currentPasswordFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      fontSize: fontSize(15),
                    }]}
                    placeholder={t('settings.currentPassword') || 'Current Password'}
                    placeholderTextColor={theme.input.placeholder}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    onFocus={() => setCurrentPasswordFocused(true)}
                    onBlur={() => setCurrentPasswordFocused(false)}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                      size={moderateScale(20)} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </GlassInput>

              <GlassInput focused={newPasswordFocused} style={{ marginTop: spacing.md }}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="key-outline" 
                    size={moderateScale(20)} 
                    color={newPasswordFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      fontSize: fontSize(15),
                    }]}
                    placeholder={t('settings.newPassword') || 'New Password'}
                    placeholderTextColor={theme.input.placeholder}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setNewPasswordFocused(true)}
                    onBlur={() => setNewPasswordFocused(false)}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                      size={moderateScale(20)} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </GlassInput>

              <View style={styles.passwordRequirementsContainer}>
                <Text
                  style={[
                    styles.passwordRequirementsTitle,
                    {
                      color: theme.textSecondary,
                      fontSize: fontSize(12),
                    },
                  ]}>
                  {t('auth.passwordRequirements')}
                </Text>
                {passwordRequirementItems.map((requirement) => (
                  <View key={requirement.key} style={styles.passwordRequirementRow}>
                    <Ionicons
                      name={requirement.met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={moderateScale(16)}
                      color={requirement.met ? theme.success : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.passwordRequirementText,
                        {
                          color: requirement.met ? theme.success : theme.textSecondary,
                          fontSize: fontSize(12),
                        },
                      ]}>
                      {requirement.label}
                    </Text>
                  </View>
                ))}
              </View>

              {newPassword.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.strengthBarContainer}>
                    <View 
                      style={[
                        styles.strengthBar,
                        { 
                          width: getStrengthWidth(),
                          backgroundColor: getStrengthColor(),
                        }
                      ]} 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.strengthText,
                      { 
                        color: getStrengthColor(),
                        fontSize: fontSize(12),
                      }
                    ]}>
                    {t('auth.passwordStrength')}: {t(`auth.${passwordStrength}`)}
                  </Text>
                </View>
              )}

              <GlassInput focused={confirmPasswordFocused} style={{ marginTop: spacing.md }}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={moderateScale(20)} 
                    color={confirmPasswordFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      fontSize: fontSize(15),
                    }]}
                    placeholder={t('auth.confirmPassword') || 'Confirm New Password'}
                    placeholderTextColor={theme.input.placeholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={moderateScale(20)} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                  {confirmPassword.length > 0 && passwordsMatch && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={moderateScale(20)} 
                      color={theme.success} 
                      style={styles.checkIcon}
                    />
                  )}
                </View>
              </GlassInput>

              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={[
                  styles.errorText, 
                  { 
                    color: theme.danger,
                    fontSize: fontSize(12),
                  }
                ]}>
                  {t('auth.passwordMismatch')}
                </Text>
              )}

              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={handleChangePassword}
                disabled={isLoading || !isFormValid()}
                activeOpacity={0.85}>
                <LinearGradient
                  colors={!isFormValid() ? ['#999', '#666'] : theme.gradient}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={[
                        styles.buttonText,
                        { fontSize: fontSize(17), opacity: !isFormValid() ? 0.6 : 1 }
                      ]}>
                        {t('settings.updatePassword') || 'Update Password'}
                      </Text>
                      <Ionicons 
                        name="checkmark" 
                        size={moderateScale(20)} 
                        color="#FFFFFF" 
                        style={[styles.buttonIcon, { opacity: !isFormValid() ? 0.6 : 1 }]}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </GlassContainer>
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
    paddingTop: Platform.OS === 'ios' ? hp(8) : hp(6),
    paddingBottom: hp(4),
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headerContainer: {
    marginBottom: spacing.xl,
  },
  headerText: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subHeaderText: {
    opacity: 0.9,
    color: '#FFFFFF',
  },
  formContainer: {
    padding: spacing.lg,
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
  },
  eyeIcon: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  passwordStrengthContainer: {
    marginTop: spacing.sm,
  },
  passwordRequirementsContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  passwordRequirementsTitle: {
    fontWeight: '600',
  },
  passwordRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  passwordRequirementText: {
    flex: 1,
    fontWeight: '500',
  },
  strengthBarContainer: {
    height: moderateScale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontWeight: '600',
  },
  errorText: {
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  changePasswordButton: {
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
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: spacing.xs,
  },
});

export default ChangePassword;
