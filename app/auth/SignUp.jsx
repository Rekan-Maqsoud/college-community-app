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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import LanguageDropdown from '../components/LanguageDropdown';
import SearchableDropdown from '../components/SearchableDropdownNew';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import { getUniversityKeys, getCollegesForUniversity, getDepartmentsForCollege } from '../data/universitiesData';
import { initiateSignup, getCompleteUserData, isEducationalEmail, completeOAuthSignup, getPendingOAuthSignup, clearPendingOAuthSignup } from '../../database/auth';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  isTablet,
  moderateScale,
} from '../utils/responsive';
import { borderRadius, shadows } from '../theme/designTokens';

const SignUp = ({ navigation, route }) => {
  const oauthMode = route?.params?.oauthMode || false;
  const oauthEmail = route?.params?.oauthEmail || '';
  const oauthName = route?.params?.oauthName || '';
  const oauthUserId = route?.params?.oauthUserId || '';
  const preservedData = route?.params?.preservedData || null;
  
  const { setUserData } = useUser();
  const [fullName, setFullName] = useState(preservedData?.fullName || oauthName);
  const [email, setEmail] = useState(preservedData?.email || oauthEmail);
  const [age, setAge] = useState(preservedData?.age || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState(preservedData?.university || '');
  const [college, setCollege] = useState(preservedData?.college || '');
  const [department, setDepartment] = useState(preservedData?.department || '');
  const [stage, setStage] = useState(preservedData?.stage || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  const { t, theme, isDarkMode } = useAppSettings();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isInitialMount = useRef(true);
  const scrollViewRef = useRef(null);

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
    if (oauthMode && oauthEmail) {
      setEmail(oauthEmail);
      if (oauthName) setFullName(oauthName);
    }
  }, [oauthMode, oauthEmail, oauthName]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (university) {
      setCollege('');
      setDepartment('');
    }
  }, [university]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (college) {
      setDepartment('');
    }
  }, [college]);


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
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('auth.fullNameRequired'));
      return false;
    }
    
    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      Alert.alert(t('common.error'), t('auth.nameLengthError'));
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.validEmailRequired'));
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('common.error'), t('auth.validEmailRequired'));
      return false;
    }
    
    if (!age || parseInt(age) < 16 || parseInt(age) > 100) {
      Alert.alert(t('common.error'), t('auth.validAgeRequired'));
      return false;
    }
    if (!university) {
      Alert.alert(t('common.error'), t('auth.universityRequired'));
      return false;
    }
    if (!college) {
      Alert.alert(t('common.error'), t('auth.collegeRequired'));
      return false;
    }
    if (!department) {
      Alert.alert(t('common.error'), t('auth.departmentRequired'));
      return false;
    }
    if (!stage) {
      Alert.alert(t('common.error'), t('auth.stageRequired'));
      return false;
    }
    
    if (!oauthMode) {
      if (password.length < 8) {
        Alert.alert(t('common.error'), t('auth.passwordTooShort'));
        return false;
      }
      if (passwordStrength === 'weak') {
        Alert.alert(t('common.error'), t('auth.passwordGuideWeak'));
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert(t('common.error'), t('auth.passwordMismatch'));
        return false;
      }
    }
    return true;
  };

  const steps = oauthMode ? ['basic', 'academic'] : ['basic', 'academic', 'security'];
  const totalSteps = steps.length;
  const isFinalStep = currentStep === totalSteps - 1;

  const getStepLabel = () => {
    const stepKey = steps[currentStep];
    if (stepKey === 'basic') return t('auth.stepBasicInfo');
    if (stepKey === 'academic') return t('auth.stepAcademicInfo');
    return t('auth.stepSecurity');
  };

  const validateStep = (stepKey) => {
    if (stepKey === 'basic') {
      if (!fullName.trim()) {
        Alert.alert(t('common.error'), t('auth.fullNameRequired'));
        return false;
      }
      if (fullName.trim().length < 2 || fullName.trim().length > 100) {
        Alert.alert(t('common.error'), t('auth.nameLengthError'));
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        Alert.alert(t('common.error'), t('auth.validEmailRequired'));
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert(t('common.error'), t('auth.validEmailRequired'));
        return false;
      }
      if (!age || parseInt(age) < 16 || parseInt(age) > 100) {
        Alert.alert(t('common.error'), t('auth.validAgeRequired'));
        return false;
      }
      return true;
    }

    if (stepKey === 'academic') {
      if (!university) {
        Alert.alert(t('common.error'), t('auth.universityRequired'));
        return false;
      }
      if (!college) {
        Alert.alert(t('common.error'), t('auth.collegeRequired'));
        return false;
      }
      if (!department) {
        Alert.alert(t('common.error'), t('auth.departmentRequired'));
        return false;
      }
      if (!stage) {
        Alert.alert(t('common.error'), t('auth.stageRequired'));
        return false;
      }
      return true;
    }

    if (!oauthMode) {
      if (password.length < 8) {
        Alert.alert(t('common.error'), t('auth.passwordTooShort'));
        return false;
      }
      if (passwordStrength === 'weak') {
        Alert.alert(t('common.error'), t('auth.passwordGuideWeak'));
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert(t('common.error'), t('auth.passwordMismatch'));
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    const stepKey = steps[currentStep];
    if (!validateStep(stepKey)) return;
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const isFormValid = () => {
    const baseValid = (
      fullName.trim() !== '' &&
      email.trim() !== '' &&
      email.includes('@') &&
      age !== '' &&
      parseInt(age) >= 16 &&
      parseInt(age) <= 100 &&
      university !== '' &&
      college !== '' &&
      department !== '' &&
      stage !== ''
    );
    
    if (oauthMode) {
      return baseValid;
    }
    
    return baseValid &&
      password.length >= 8 &&
      password === confirmPassword &&
      confirmPassword.length > 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const stageMap = {
        firstYear: 1,
        secondYear: 2,
        thirdYear: 3,
        fourthYear: 4,
        fifthYear: 5,
        sixthYear: 6,
      };
      const stageNumber = stageMap[stage] || parseInt(stage, 10);
      
      const additionalData = {
        university,
        college,
        department,
        stage: stageNumber || 1,
      };

      if (oauthMode && oauthUserId) {
        const result = await completeOAuthSignup(oauthUserId, email, fullName, additionalData);
        
        await clearPendingOAuthSignup();
        
        if (result.success) {
          const userData = {
            $id: result.userDoc.$id,
            email: result.userDoc.email,
            fullName: result.userDoc.name,
            bio: result.userDoc.bio || '',
            profilePicture: result.userDoc.profilePicture || '',
            university: result.userDoc.university || '',
            college: result.userDoc.major || '',
            department: result.userDoc.department || '',
            stage: result.userDoc.year || '',
            postsCount: result.userDoc.postsCount || 0,
            followersCount: result.userDoc.followersCount || 0,
            followingCount: result.userDoc.followingCount || 0,
            isEmailVerified: true,
            lastAcademicUpdate: result.userDoc.lastAcademicUpdate || null,
          };
          
          await setUserData(userData);
          navigation.replace('MainTabs');
        }
      } else {
        const result = await initiateSignup(email, password, fullName, additionalData);
        
        setIsLoading(false);
        
        navigation.navigate('VerifyEmail', {
          email: result.email,
          userId: result.userId,
          name: result.name,
          expiresAt: Date.now() + (15 * 60 * 1000),
          verificationCode: result.verificationCode,
          formData: {
            fullName,
            email: result.email,
            age,
            university,
            college,
            department,
            stage,
          }
        });
      }
      
    } catch (error) {
      setIsLoading(false);
      
      let errorMessage = t('auth.signUpError');
      
      if (error.message?.includes('user with the same email')) {
        errorMessage = t('auth.emailAlreadyExists');
      } else if (error.message?.includes('Password')) {
        errorMessage = t('auth.passwordRequirements');
      } else if (error.message?.includes('educational email') || error.message?.includes('Only educational')) {
        errorMessage = t('auth.educationalEmailRequired');
      }
      
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const universities = getUniversityKeys().map(key => ({
    key,
    label: t(`universities.${key}`)
  }));

  const getAvailableColleges = () => {
    if (!university) return [];
    
    const collegeKeys = getCollegesForUniversity(university);
    return collegeKeys.map(key => ({
      key,
      label: t(`colleges.${key}`)
    }));
  };

  const colleges = getAvailableColleges();

  const getAvailableDepartments = () => {
    if (!college || !university) return [];
    
    const departmentKeys = getDepartmentsForCollege(university, college);
    return departmentKeys.map(key => ({
      key,
      label: t(`departments.${key}`)
    }));
  };

  const departments = getAvailableDepartments();

  const baseStages = [
    { key: 'firstYear', label: t('stages.firstYear') },
    { key: 'secondYear', label: t('stages.secondYear') },
    { key: 'thirdYear', label: t('stages.thirdYear') },
    { key: 'fourthYear', label: t('stages.fourthYear') },
    { key: 'fifthYear', label: t('stages.fifthYear') },
    { key: 'sixthYear', label: t('stages.sixthYear') },
  ];

  const extendedStagePrograms = {
    universities: ['medical', 'medicine', 'health', 'law', 'legal', 'dent', 'pharmacy', 'nursing'],
    colleges: ['technicalhealth', 'medical', 'medicine', 'health', 'law', 'legal', 'dent', 'pharmacy', 'nursing'],
    departments: ['medicallaboratory', 'radiology', 'anesthesia', 'pharmacy', 'dentalhealth', 'nursing', 'medicine', 'law'],
  };

  const isExtendedStageProgram = () => {
    const universityKey = (university || '').toLowerCase();
    const collegeKey = (college || '').toLowerCase();
    const departmentKey = (department || '').toLowerCase();

    const keywordMatch = (value, keywords) => keywords.some((keyword) => value.includes(keyword));

    return (
      keywordMatch(universityKey, extendedStagePrograms.universities) ||
      keywordMatch(collegeKey, extendedStagePrograms.colleges) ||
      keywordMatch(departmentKey, extendedStagePrograms.departments)
    );
  };

  useEffect(() => {
    if (!stage) return;
    const allowsExtendedStages = isExtendedStageProgram();
    if (!allowsExtendedStages && ['fifthYear', 'sixthYear'].includes(stage)) {
      setStage('');
    }
  }, [university, college, department, stage]);

  const stages = isExtendedStageProgram() ? baseStages : baseStages.slice(0, 4);

  const ageOptions = Array.from({ length: 28 }, (_, i) => ({
    key: String(17 + i),
    label: String(17 + i),
  }));

  const renderInput = (props) => {
    const { icon, placeholder, value, onChangeText, field, keyboardType, secureTextEntry, showToggle } = props;
    const isFocused = focusedField === field;

    return (
      <GlassInput focused={isFocused} style={{ marginTop: spacing.md }}>
        <View style={styles.inputWrapper}>
          <Ionicons 
            name={icon} 
            size={moderateScale(20)} 
            color={isFocused ? theme.primary : theme.textSecondary} 
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { 
              color: theme.text,
              fontSize: fontSize(16),
            }]}
            placeholder={placeholder}
            placeholderTextColor={theme.input.placeholder}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField(null)}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
            autoCorrect={false}
            secureTextEntry={secureTextEntry}
          />
          {showToggle && (
            <TouchableOpacity 
              onPress={showToggle}
              style={styles.eyeIcon}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={secureTextEntry ? "eye-outline" : "eye-off-outline"} 
                size={moderateScale(20)} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          )}
          {field === 'confirmPassword' && passwordsMatch && (
            <Ionicons 
              name="checkmark-circle" 
              size={moderateScale(20)} 
              color={theme.success} 
              style={styles.checkIcon}
            />
          )}
        </View>
      </GlassInput>
    );
  };

  const isTabletDevice = isTablet();

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
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.languageContainer}>
            <LanguageDropdown />
          </View>
          
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}>
            
            <View style={styles.headerContainer}>
              <Text style={[styles.headerText, { fontSize: fontSize(isTabletDevice ? 32 : 24) }]}>
                {oauthMode ? t('auth.completeYourProfile') : t('auth.createAccount')}
              </Text>
              <Text style={[styles.subHeaderText, { fontSize: fontSize(14) }]}>
                {oauthMode ? t('auth.finishSetup') : t('auth.joinCommunity')}
              </Text>
            </View>

            <GlassContainer 
              style={styles.formContainer}
              intensity={isTablet() ? 30 : 25}
              borderRadius={borderRadius.xl}
            >
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { fontSize: fontSize(13), color: theme.textSecondary }]}>
                  {t('auth.stepIndicator', { current: currentStep + 1, total: totalSteps })}
                </Text>
                <Text style={[styles.stepLabel, { fontSize: fontSize(16), color: theme.text }]}>
                  {getStepLabel()}
                </Text>
                <View style={styles.stepDots}>
                  {steps.map((step, index) => (
                    <View
                      key={`${step}-${index}`}
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: index <= currentStep ? theme.primary : theme.input.border,
                          width: index === currentStep ? moderateScale(22) : moderateScale(8),
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {steps[currentStep] === 'basic' && (
                <>
              <GlassInput focused={nameFocused}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="person-outline" 
                    size={moderateScale(20)} 
                    color={nameFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      fontSize: fontSize(15),
                    }]}
                    placeholder={t('auth.fullName')}
                    placeholderTextColor={theme.input.placeholder}
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    autoCorrect={false}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    textContentType="name"
                  />
                </View>
              </GlassInput>

              <GlassInput focused={emailFocused} style={{ marginTop: spacing.md }}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="mail-outline" 
                    size={moderateScale(20)} 
                    color={emailFocused ? theme.primary : theme.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { 
                      color: oauthMode ? theme.textSecondary : theme.text,
                      fontSize: fontSize(15),
                      textAlign: 'left',
                    }]}
                    placeholder={oauthMode ? t('auth.emailFromGoogle') : t('auth.collegeEmail')}
                    placeholderTextColor={theme.input.placeholder}
                    value={email}
                    onChangeText={oauthMode ? null : handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      setTimeout(() => setShowEmailSuggestion(false), 200);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!oauthMode}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    textContentType="emailAddress"
                  />
                  {!oauthMode && showEmailSuggestion && (
                    <TouchableOpacity 
                      onPress={applyEmailSuggestion}
                      style={[styles.emailSuggestion, { backgroundColor: theme.primary }]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emailSuggestionText}>{t('auth.epuEmailDomain')}</Text>
                    </TouchableOpacity>
                  )}
                  {oauthMode ? (
                    <Ionicons 
                      name="lock-closed" 
                      size={moderateScale(18)} 
                      color={theme.textSecondary} 
                    />
                  ) : (
                    !showEmailSuggestion && email.length > 0 && (
                      <Ionicons 
                        name={isEducationalEmail(email) ? "checkmark-circle" : "close-circle"} 
                        size={moderateScale(20)} 
                        color={isEducationalEmail(email) ? "#10B981" : "#EF4444"} 
                      />
                    )
                  )}
                </View>
              </GlassInput>
              {!oauthMode && email.length > 0 && !isEducationalEmail(email) && (
                <Text style={[styles.emailWarning, { color: '#EF4444' }]}>
                  {t('auth.useEducationalEmail')}
                </Text>
              )}

              <SearchableDropdown
                items={ageOptions}
                value={age}
                onSelect={setAge}
                placeholder={t('auth.age')}
                icon="calendar-outline"
                style={{ marginTop: spacing.md }}
              />
                </>
              )}

              {steps[currentStep] === 'academic' && (
                <>

              <SearchableDropdown
                items={universities}
                value={university}
                onSelect={setUniversity}
                placeholder={t('auth.selectUniversity')}
                icon="school-outline"
                style={{ marginTop: spacing.md }}
              />

              <SearchableDropdown
                items={colleges}
                value={college}
                onSelect={setCollege}
                placeholder={t('auth.selectCollege')}
                icon="book-outline"
                disabled={!university}
                style={{ marginTop: spacing.md }}
              />

              <SearchableDropdown
                items={departments}
                value={department}
                onSelect={setDepartment}
                placeholder={t('auth.selectDepartment')}
                icon="school-outline"
                disabled={!college}
                style={{ marginTop: spacing.md }}
              />

              <SearchableDropdown
                items={stages}
                value={stage}
                onSelect={setStage}
                placeholder={t('auth.selectStage')}
                icon="library-outline"
                style={{ marginTop: spacing.md }}
              />
                </>
              )}

              {steps[currentStep] === 'security' && !oauthMode && (
                <>
                  <GlassInput focused={passwordFocused} style={{ marginTop: spacing.md }}>
                    <View style={styles.inputWrapper}>
                      <Ionicons 
                        name="lock-closed-outline" 
                        size={moderateScale(20)} 
                        color={passwordFocused ? theme.primary : theme.textSecondary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { 
                          color: theme.text,
                          fontSize: fontSize(15),
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
                        contextMenuHidden={false}
                        selectTextOnFocus={false}
                        textContentType="newPassword"
                      />
                      <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={moderateScale(20)} 
                          color={theme.textSecondary} 
                        />
                      </TouchableOpacity>
                    </View>
                  </GlassInput>

                  {password.length > 0 && (
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
                        name="lock-closed-outline" 
                        size={moderateScale(20)} 
                        color={confirmPasswordFocused ? theme.primary : theme.textSecondary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { 
                          color: theme.text,
                          fontSize: fontSize(15),
                        }]}
                        placeholder={t('auth.confirmPassword')}
                        placeholderTextColor={theme.input.placeholder}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setConfirmPasswordFocused(true)}
                        onBlur={() => setConfirmPasswordFocused(false)}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        contextMenuHidden={false}
                        selectTextOnFocus={false}
                        textContentType="newPassword"
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
                </>
              )}
              <View style={styles.stepActions}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      { borderColor: theme.border, backgroundColor: theme.glass.background },
                    ]}
                    onPress={handlePrevStep}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={moderateScale(18)} color={theme.text} />
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                      {t('common.back')}
                    </Text>
                  </TouchableOpacity>
                )}

                {isFinalStep ? (
                  <TouchableOpacity
                    style={[styles.signUpButton, shadows.large, currentStep > 0 ? styles.primaryButtonWide : null]}
                    onPress={handleSignUp}
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
                            styles.signUpButtonText,
                            { fontSize: fontSize(17), opacity: !isFormValid() ? 0.6 : 1 }
                          ]}>
                            {oauthMode ? t('common.continue') : t('auth.createAccount')}
                          </Text>
                          <Ionicons 
                            name="arrow-forward" 
                            size={moderateScale(20)} 
                            color="#FFFFFF" 
                            style={[styles.buttonIcon, { opacity: !isFormValid() ? 0.6 : 1 }]}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.signUpButton, shadows.large, currentStep > 0 ? styles.primaryButtonWide : null]}
                    onPress={handleNextStep}
                    disabled={isLoading}
                    activeOpacity={0.85}>
                    <LinearGradient
                      colors={theme.gradient}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}>
                      <Text style={[styles.signUpButtonText, { fontSize: fontSize(17) }]}>
                        {t('common.next')}
                      </Text>
                      <Ionicons 
                        name="arrow-forward" 
                        size={moderateScale(20)} 
                        color="#FFFFFF" 
                        style={styles.buttonIcon}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </GlassContainer>

            <View style={styles.footer}>
              <Text style={[
                styles.footerText, 
                { fontSize: fontSize(15) }
              ]}>
                {t('auth.alreadyHaveAccount')}
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignIn')} 
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.signInText, 
                  { 
                    color: '#FFFFFF',
                    fontSize: fontSize(15),
                  }
                ]}>
                  {t('auth.signIn')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={{ height: hp(10) }} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? hp(8) : hp(6),
    paddingHorizontal: wp(3),
    paddingBottom: hp(4),
  },
  languageContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(5.5) : hp(4.5),
    right: wp(5),
    zIndex: 1000,
  },
  headerContainer: {
    marginBottom: spacing.lg,
    maxWidth: isTablet() ? 700 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  headerText: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
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
    padding: isTablet() ? spacing.xxl : spacing.lg,
    maxWidth: isTablet() ? 700 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  stepHeader: {
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stepLabel: {
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    height: moderateScale(8),
    borderRadius: borderRadius.round,
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
  checkIcon: {
    marginLeft: spacing.xs,
  },
  passwordStrengthContainer: {
    marginTop: spacing.sm,
  },
  strengthBarContainer: {
    height: moderateScale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  strengthBar: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  strengthText: {
    fontWeight: '600',
  },
  errorText: {
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  emailWarning: {
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    fontSize: fontSize(12),
    fontWeight: '500',
  },
  signUpButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.lg,
    minHeight: moderateScale(48),
    flex: 1,
  },
  stepActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: moderateScale(48),
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: fontSize(15),
  },
  primaryButtonWide: {
    flex: 1,
  },
  buttonGradient: {
    paddingVertical: spacing.md + spacing.xs,
    paddingHorizontal: spacing.lg,
    minHeight: moderateScale(48),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  signUpButtonText: {
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  signInText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default SignUp;
