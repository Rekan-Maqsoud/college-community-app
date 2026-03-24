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
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import LanguageDropdown from '../components/LanguageDropdown';
import SearchableDropdown from '../components/SearchableDropdownNew';
import AnimatedBackground from '../components/AnimatedBackground';
import { GlassContainer, GlassInput } from '../components/GlassComponents';
import { getUniversityKeys, getCollegesForUniversity, getDepartmentsForCollege, getStagesForDepartment } from '../data/universitiesData';
import { initiateSignup, isEducationalEmail, completeOAuthSignup, clearPendingOAuthSignup } from '../../database/auth';
import { getAcademicDomainSuggestions, applyDomainToEmail, getUniversityKeyByEmailDomain } from '../constants/academicEmailDomains';
import { createSuggestion } from '../../database/suggestions';
import { ACADEMIC_OTHER_KEY, hasAcademicOtherSelection } from '../utils/academicSelection';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  isTablet,
  moderateScale,
} from '../utils/responsive';
import { borderRadius, shadows } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import telemetry from '../utils/telemetry';

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

const SignUp = ({ navigation, route }) => {
  const oauthMode = route?.params?.oauthMode || false;
  const oauthEmail = route?.params?.oauthEmail || '';
  const oauthName = route?.params?.oauthName || '';
  const oauthUserId = route?.params?.oauthUserId || '';
  const preservedData = route?.params?.preservedData || null;
  
  const { setUserData } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { formStyle } = useLayout();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [fullName, setFullName] = useState(preservedData?.fullName || oauthName);
  const [email, setEmail] = useState(preservedData?.email || oauthEmail);
  const [age, setAge] = useState(preservedData?.age || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState(preservedData?.university || '');
  const [college, setCollege] = useState(preservedData?.college || '');
  const [department, setDepartment] = useState(preservedData?.department || '');
  const [stage, setStage] = useState(preservedData?.stage || '');
  const [accountRole, setAccountRole] = useState(preservedData?.accountRole || 'student');
  const [customUniversityName, setCustomUniversityName] = useState(preservedData?.customUniversityName || '');
  const [customCollegeName, setCustomCollegeName] = useState(preservedData?.customCollegeName || '');
  const [customDepartmentName, setCustomDepartmentName] = useState(preservedData?.customDepartmentName || '');
  const [customDepartmentYears, setCustomDepartmentYears] = useState(preservedData?.customDepartmentYears || '');
  const isTeacherSignupEnabled = false;
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [hasBlurredNameField, setHasBlurredNameField] = useState(false);
  
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const isCompactPhone = hp(100) < 700;
  const isWidePhone = !isTablet() && wp(100) > 430;
  const isLargeScreen = windowWidth >= 900;
  const isShortScreen = hp(100) < 760;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isInitialMount = useRef(true);
  const universityKeyLookup = useRef(new Set(getUniversityKeys()));
  const hasAcademicOther = hasAcademicOtherSelection({ university, college, department });
  const isUniversityOther = university === ACADEMIC_OTHER_KEY;
  const isCollegeOther = college === ACADEMIC_OTHER_KEY;
  const isDepartmentOther = department === ACADEMIC_OTHER_KEY;

  const buildMergedAcademicSuggestionText = () => {
    if (!hasAcademicOther) {
      return '';
    }

    if (isUniversityOther) {
      return [
        `University: ${String(customUniversityName || '').trim()}`,
        `College: ${String(customCollegeName || '').trim()}`,
        `Department: ${String(customDepartmentName || '').trim()}`,
        `Years: ${String(customDepartmentYears || '').trim()}`,
      ].join('\n');
    }

    if (isCollegeOther) {
      return [
        `University: ${String(university || '').trim()}`,
        `College: ${String(customCollegeName || '').trim()}`,
        `Department: ${String(customDepartmentName || '').trim()}`,
        `Years: ${String(customDepartmentYears || '').trim()}`,
      ].join('\n');
    }

    return [
      `University: ${String(university || '').trim()}`,
      `College: ${String(college || '').trim()}`,
      `Department: ${String(customDepartmentName || '').trim()}`,
      `Years: ${String(customDepartmentYears || '').trim()}`,
    ].join('\n');
  };

  // Handle email change and show suggestion when @ is typed
  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailSuggestions(getAcademicDomainSuggestions(text, 3));

    const autoDetectedUniversity = getUniversityKeyByEmailDomain(text);
    if (
      autoDetectedUniversity &&
      universityKeyLookup.current.has(autoDetectedUniversity) &&
      autoDetectedUniversity !== university
    ) {
      setUniversity(autoDetectedUniversity);
      clearFieldError('university');
    }
  };

  // Apply email suggestion
  const applyEmailSuggestion = (domain) => {
    const nextEmail = applyDomainToEmail(email, domain);
    setEmail(nextEmail);
    setEmailSuggestions([]);

    const autoDetectedUniversity = getUniversityKeyByEmailDomain(domain);
    if (
      autoDetectedUniversity &&
      universityKeyLookup.current.has(autoDetectedUniversity) &&
      autoDetectedUniversity !== university
    ) {
      setUniversity(autoDetectedUniversity);
      clearFieldError('university');
    }
  };

  useEffect(() => {
    if (oauthMode && oauthEmail) {
      setEmail(oauthEmail);
      if (oauthName) setFullName(oauthName);
    }
  }, [oauthMode, oauthEmail, oauthName]);

  useEffect(() => {
    const handleOAuthDomainGuard = async () => {
      if (!oauthMode || !oauthEmail) return;

      if (!isEducationalEmail(oauthEmail)) {
        showAlert({
          type: 'error',
          title: t('common.error'),
          message: t('auth.educationalEmailRequired'),
        });

        try {
          await clearPendingOAuthSignup();
        } catch (error) {
        }

        navigation.replace('SignIn');
      }
    };

    handleOAuthDomainGuard();
  }, [oauthMode, oauthEmail, navigation, showAlert, t]);

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
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!university) {
      return;
    }

    if (university === ACADEMIC_OTHER_KEY) {
      setCollege(ACADEMIC_OTHER_KEY);
      setDepartment(ACADEMIC_OTHER_KEY);
      return;
    }

    setCollege('');
    setDepartment('');
  }, [university]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (!college) {
      return;
    }

    if (college === ACADEMIC_OTHER_KEY) {
      setDepartment(ACADEMIC_OTHER_KEY);
      return;
    }

    setDepartment('');
  }, [college]);

  useEffect(() => {
    const availableStageKeys = hasAcademicOther
      ? ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear', 'sixthYear']
      : getStagesForDepartment(university, college, department);
    if (stage && !availableStageKeys.includes(stage)) {
      setStage('');
    }
  }, [university, college, department, stage, hasAcademicOther]);

  useEffect(() => {
    if (!isTeacherSignupEnabled && accountRole === 'teacher') {
      setAccountRole('student');
    }
  }, [accountRole, isTeacherSignupEnabled]);

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
  const passwordRequirementItems = [
    {
      key: 'length',
      label: t('auth.passwordRequirementLength'),
      met: password.length >= 8,
    },
    {
      key: 'letters',
      label: t('auth.passwordRequirementLetters'),
      met: /[a-zA-Z]/.test(password),
    },
    {
      key: 'numbers',
      label: t('auth.passwordRequirementNumbers'),
      met: /[0-9]/.test(password),
    },
    {
      key: 'symbols',
      label: t('auth.passwordRequirementSymbols'),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const stepOneFieldKeys = ['fullName', 'email', 'age', 'password', 'confirmPassword'];
  const stepTwoFieldKeys = [
    'university',
    'college',
    'department',
    'stage',
    'customUniversityName',
    'customCollegeName',
    'customDepartmentName',
    'customDepartmentYears',
  ];

  const clearSubmitError = () => setSubmitError('');

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearFieldErrors = (fields) => {
    setFieldErrors((prev) => {
      let changed = false;
      const next = { ...prev };

      fields.forEach((field) => {
        if (next[field]) {
          delete next[field];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  };

  const setSingleFieldError = (field, message, stepNumber) => {
    if (stepNumber && currentStep !== stepNumber) {
      setCurrentStep(stepNumber);
    }
    setSubmitError('');
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const getInputErrorStyle = (field) => (fieldErrors[field] ? styles.inputError : null);

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
    const stepOneValid = validateStepOne();
    if (!stepOneValid) {
      return false;
    }

    const stepTwoValid = validateStepTwo();
    if (!stepTwoValid) {
      return false;
    }

    clearSubmitError();
    return true;
  };

  const hasEmailPlusAlias = (emailValue) => {
    const normalized = String(emailValue || '').trim();
    if (!normalized.includes('@')) return false;
    const localPart = normalized.split('@')[0] || '';
    return localPart.includes('+');
  };

  const hasTwoNameParts = (nameValue) => String(nameValue || '').trim().split(/\s+/).filter(Boolean).length >= 2;

  const hasUnsupportedNameCharacters = (nameValue) => /[^\p{L}\s]/u.test(String(nameValue || '').trim());

  const validateFullName = (nameValue) => {
    const normalizedName = String(nameValue || '').trim();

    if (!normalizedName) {
      return t('auth.fullNameRequired');
    }

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return t('auth.nameLengthError');
    }

    if (hasUnsupportedNameCharacters(normalizedName)) {
      return t('auth.fullNameLettersOnly');
    }

    if (!hasTwoNameParts(normalizedName)) {
      return t('auth.fullNameTwoWordsRequired');
    }

    return '';
  };

  const handleFullNameBlur = () => {
    setNameFocused(false);
    setHasBlurredNameField(true);

    const normalizedName = String(fullName || '').trim();
    if (!normalizedName) {
      clearFieldError('fullName');
      return;
    }

    if (!hasTwoNameParts(normalizedName)) {
      setSingleFieldError('fullName', t('auth.fullNameTwoWordsRequired'), 1);
      return;
    }

    if (hasUnsupportedNameCharacters(normalizedName)) {
      setSingleFieldError('fullName', t('auth.fullNameLettersOnly'), 1);
      return;
    }

    clearFieldError('fullName');
  };

  const validateStepOne = () => {
    clearSubmitError();
    clearFieldErrors(stepOneFieldKeys);

    const fullNameError = validateFullName(fullName);
    if (fullNameError) {
      setSingleFieldError('fullName', fullNameError, 1);
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      setSingleFieldError('email', t('auth.validEmailRequired'), 1);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setSingleFieldError('email', t('auth.validEmailRequired'), 1);
      return false;
    }

    if (!isEducationalEmail(email.trim())) {
      setSingleFieldError('email', t('auth.educationalEmailRequired'), 1);
      return false;
    }

    if (hasEmailPlusAlias(email)) {
      setSingleFieldError('email', t('auth.emailPlusNotAllowed'), 1);
      return false;
    }

    if (!age || parseInt(age) < 16 || parseInt(age) > 100) {
      setSingleFieldError('age', t('auth.validAgeRequired'), 1);
      return false;
    }

    if (!oauthMode) {
      if (password.length < 8) {
        setSingleFieldError('password', t('auth.passwordTooShort'), 1);
        return false;
      }
      if (passwordStrength === 'weak') {
        setSingleFieldError('password', t('auth.passwordGuideWeak'), 1);
        return false;
      }
      if (password !== confirmPassword) {
        setSingleFieldError('confirmPassword', t('auth.passwordMismatch'), 1);
        return false;
      }
    }

    return true;
  };

  const validateStepTwo = () => {
    clearSubmitError();
    clearFieldErrors(stepTwoFieldKeys);

    if (!university) {
      setSingleFieldError('university', t('auth.universityRequired'), 2);
      return false;
    }
    if (!college) {
      setSingleFieldError('college', t('auth.collegeRequired'), 2);
      return false;
    }
    if (!department) {
      setSingleFieldError('department', t('auth.departmentRequired'), 2);
      return false;
    }
    if (isUniversityOther) {
      if (String(customUniversityName || '').trim().length < 2) {
        setSingleFieldError('customUniversityName', t('auth.otherUniversityNameRequired'), 2);
        return false;
      }
      if (String(customCollegeName || '').trim().length < 2) {
        setSingleFieldError('customCollegeName', t('auth.otherCollegeNameRequired'), 2);
        return false;
      }
      if (String(customDepartmentName || '').trim().length < 2) {
        setSingleFieldError('customDepartmentName', t('auth.otherDepartmentNameRequired'), 2);
        return false;
      }
    } else if (isCollegeOther) {
      if (String(customCollegeName || '').trim().length < 2) {
        setSingleFieldError('customCollegeName', t('auth.otherCollegeNameRequired'), 2);
        return false;
      }
      if (String(customDepartmentName || '').trim().length < 2) {
        setSingleFieldError('customDepartmentName', t('auth.otherDepartmentNameRequired'), 2);
        return false;
      }
    } else if (isDepartmentOther) {
      if (String(customDepartmentName || '').trim().length < 2) {
        setSingleFieldError('customDepartmentName', t('auth.otherDepartmentNameRequired'), 2);
        return false;
      }
    }

    if (hasAcademicOther && !customDepartmentYears) {
      setSingleFieldError('customDepartmentYears', t('auth.otherStudyYearsRequired'), 2);
      return false;
    }
    if (!stage) {
      setSingleFieldError('stage', t('auth.stageRequired'), 2);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    clearSubmitError();
    if (currentStep === 1 && !validateStepOne()) return;
    if (currentStep === 2 && !validateStepTwo()) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const promptExistingAccountSignIn = () => {
    setCurrentStep(1);
    setSingleFieldError('email', t('auth.emailAlreadyExists'), 1);
    showAlert({
      type: 'warning',
      title: t('auth.emailAlreadyExists'),
      message: t('auth.emailExistsGoToSignInPrompt'),
      buttons: [
        {
          text: t('common.no'),
          style: 'cancel',
        },
        {
          text: t('common.yes'),
          style: 'primary',
          onPress: () => navigation.replace('SignIn', { prefillEmail: email.trim().toLowerCase() }),
        },
      ],
    });
  };

  const handlePreviousStep = () => {
    clearSubmitError();
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const isFormValid = () => {
    const baseValid = (
      fullName.trim() !== '' &&
      email.trim() !== '' &&
      email.includes('@') &&
      isEducationalEmail(email) &&
      age !== '' &&
      parseInt(age) >= 16 &&
      parseInt(age) <= 100 &&
      university !== '' &&
      college !== '' &&
      department !== '' &&
      (!hasAcademicOther || !!customDepartmentYears) &&
      (!isUniversityOther || (
        String(customUniversityName || '').trim().length >= 2 &&
        String(customCollegeName || '').trim().length >= 2 &&
        String(customDepartmentName || '').trim().length >= 2
      )) &&
      (!isCollegeOther || (
        String(customCollegeName || '').trim().length >= 2 &&
        String(customDepartmentName || '').trim().length >= 2
      )) &&
      (!isDepartmentOther || String(customDepartmentName || '').trim().length >= 2) &&
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

    const signUpTrace = telemetry.startTrace('auth_sign_up', {
      oauthMode,
      hasAcademicOther,
      stage,
      emailDomain: String(email || '').includes('@') ? String(email || '').split('@').pop() : 'unknown',
    });

    setIsLoading(true);
    clearSubmitError();
    
    try {
      const stageYearMap = {
        firstYear: 1,
        secondYear: 2,
        thirdYear: 3,
        fourthYear: 4,
        fifthYear: 5,
        sixthYear: 6,
      };
      const stageYear = stageYearMap[stage] || parseInt(stage, 10);
      if (!stageYear) {
        setIsLoading(false);
        signUpTrace.finish({ success: false, meta: { reason: 'invalid_stage' } });
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.stageRequired') });
        return;
      }
      
      const additionalData = {
        university,
        college,
        department,
        stage: stageYear,
        role: accountRole,
      };

      const mergedAcademicSuggestion = buildMergedAcademicSuggestionText();

      const academicSuggestionPayload = hasAcademicOther
        ? {
            university,
            college,
            department,
            stage,
            years: customDepartmentYears,
            customUniversityName: String(customUniversityName || '').trim(),
            customCollegeName: String(customCollegeName || '').trim(),
            customDepartmentName: String(customDepartmentName || '').trim(),
            suggestionText: mergedAcademicSuggestion,
          }
        : null;

      if (oauthMode && oauthUserId) {
        const result = await completeOAuthSignup(oauthUserId, email, fullName, additionalData);
        
        await clearPendingOAuthSignup();
        
        if (result.success) {
          if (academicSuggestionPayload) {
            try {
              await createSuggestion({
                category: 'other',
                title: t('auth.otherAcademicSuggestionTitle'),
                message: academicSuggestionPayload.suggestionText,
                contextType: 'academic_missing_option',
                missingUniversity: academicSuggestionPayload.university === ACADEMIC_OTHER_KEY ? 'yes' : undefined,
                missingCollege: academicSuggestionPayload.college === ACADEMIC_OTHER_KEY ? 'yes' : undefined,
                missingDepartment: academicSuggestionPayload.department === ACADEMIC_OTHER_KEY ? 'yes' : undefined,
                selectedUniversity: academicSuggestionPayload.university || undefined,
                selectedCollege: academicSuggestionPayload.college || undefined,
                selectedDepartment: academicSuggestionPayload.department || undefined,
                selectedStage: academicSuggestionPayload.stage || undefined,
              });
            } catch (error) {
            }
          }

          const academicChangesCount = getAcademicChangesCountFromProfileViews(result.userDoc.profileViews);
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
            role: result.userDoc.role || 'student',
            postsCount: result.userDoc.postsCount || 0,
            followersCount: result.userDoc.followersCount || 0,
            followingCount: result.userDoc.followingCount || 0,
            isEmailVerified: true,
            lastAcademicUpdate: result.userDoc.lastAcademicUpdate || null,
            academicChangesCount,
          };
          
          await setUserData(userData);
          signUpTrace.finish({ success: true, meta: { path: 'oauth_complete' } });
          navigation.replace('MainTabs');
        } else {
          setIsLoading(false);
          signUpTrace.finish({ success: false, meta: { path: 'oauth_complete_failed' } });
          showAlert({ type: 'error', title: t('common.error'), message: t('auth.signUpError') });
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
            accountRole,
            customUniversityName,
            customCollegeName,
            customDepartmentName,
            customDepartmentYears,
            academicSuggestionPayload,
          }
        });
        signUpTrace.finish({ success: true, meta: { path: 'otp_verify' } });
      }
      
    } catch (error) {
      signUpTrace.finish({ success: false, error });
      setIsLoading(false);
      const isEmailExistsError =
        error.message?.includes('user with the same email') ||
        error.message?.includes('already exists');

      if (isEmailExistsError) {
        promptExistingAccountSignIn();
        return;
      }

      if (error.message?.includes('Password')) {
        setSingleFieldError('password', t('auth.passwordRequirements'), 1);
        return;
      }

      if (error.message?.includes('educational email') || error.message?.includes('Only educational')) {
        setSingleFieldError('email', t('auth.educationalEmailRequired'), 1);
        return;
      }

      if (error.message?.includes('name')) {
        setSingleFieldError('fullName', error.message, 1);
        return;
      }

      if (error.message?.includes('university')) {
        setSingleFieldError('university', error.message, 2);
        return;
      }

      if (error.message?.includes('college')) {
        setSingleFieldError('college', error.message, 2);
        return;
      }

      if (error.message?.includes('department')) {
        setSingleFieldError('department', error.message, 2);
        return;
      }

      if (error.message?.includes('stage')) {
        setSingleFieldError('stage', error.message, 2);
        return;
      }

      setSubmitError(error.message || t('auth.signUpError'));
    }
  };

  const universities = getUniversityKeys().map(key => ({
    key,
    label: t(`universities.${key}`)
  }));

  const universitiesWithOther = [
    ...universities,
    {
      key: ACADEMIC_OTHER_KEY,
      label: t('common.other'),
    },
  ];

  const getAvailableColleges = () => {
    if (!university) return [];
    
    const collegeKeys = getCollegesForUniversity(university);
    const collegeOptions = collegeKeys.map(key => ({
      key,
      label: t(`colleges.${key}`)
    }));

    return [
      ...collegeOptions,
      {
        key: ACADEMIC_OTHER_KEY,
        label: t('common.other'),
      },
    ];
  };

  const colleges = getAvailableColleges();

  const getAvailableDepartments = () => {
    if (!college || !university) return [];
    
    const departmentKeys = getDepartmentsForCollege(university, college);
    const departmentOptions = departmentKeys.map(key => ({
      key,
      label: t(`departments.${key}`)
    }));

    return [
      ...departmentOptions,
      {
        key: ACADEMIC_OTHER_KEY,
        label: t('common.other'),
      },
    ];
  };

  const departments = getAvailableDepartments();

  const fallbackOtherStages = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear', 'sixthYear'];
  const resolvedStageKeys = hasAcademicOther
    ? fallbackOtherStages
    : getStagesForDepartment(university, college, department);

  const stages = resolvedStageKeys.map(stageKey => ({
    key: stageKey,
    label: t(`stages.${stageKey}`),
  }));

  const ageOptions = Array.from({ length: 28 }, (_, i) => ({
    key: String(17 + i),
    label: String(17 + i),
  }));

  const otherDepartmentYearsOptions = [
    { key: '2', label: '2' },
    { key: '4', label: '4' },
    { key: '5', label: '5' },
    { key: '6', label: '6' },
  ];

  const isTabletDevice = isTablet();
  const stepTitleByIndex = {
    1: t('auth.signupStep1Title'),
    2: t('auth.signupStep2Title'),
    3: t('auth.signupStep3Title'),
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
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView 
          style={styles.scrollView}
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
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: '100%',
            }}>
            
            <View style={[styles.headerContainer, isRTL && styles.headerContainerRtl]}>
              <Text style={[styles.headerText, isRTL && styles.headerTextRtl, { fontSize: fontSize(isTabletDevice ? 32 : 24) }]}>
                {oauthMode ? t('auth.completeYourProfile') : t('auth.createAccount')}
              </Text>
              <Text style={[styles.subHeaderText, isRTL && styles.subHeaderTextRtl, { fontSize: fontSize(14) }]}>
                {oauthMode ? t('auth.finishSetup') : t('auth.joinCommunity')}
              </Text>
            </View>

            <GlassContainer 
              style={[
                styles.formContainer,
                isCompactPhone && styles.formContainerCompact,
                isWidePhone && styles.formContainerWidePhone,
                isLargeScreen && styles.formContainerLargeScreen,
                isShortScreen && styles.formContainerShortScreen,
              ]}
              intensity={isTablet() ? 30 : 25}
              borderRadius={borderRadius.xl}
              disableBackgroundOverlay
            >
              <View style={styles.stepIndicatorRow}>
                {[1, 2, 3].map((step) => (
                  <View key={step} style={styles.stepIndicatorItem}>
                    <View
                      style={[
                        styles.stepIndicatorCircle,
                        {
                          backgroundColor: step <= currentStep ? theme.primary : 'rgba(255,255,255,0.2)',
                        },
                      ]}
                    >
                      <Text style={styles.stepIndicatorText}>{step}</Text>
                    </View>
                    {step < 3 && (
                      <View
                        style={[
                          styles.stepIndicatorLine,
                          { backgroundColor: step < currentStep ? theme.primary : 'rgba(255,255,255,0.2)' },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>

              <Text style={[styles.stepTitle, { color: theme.text }]}>{stepTitleByIndex[currentStep]}</Text>

              {currentStep === 1 && (
                <>
                  <GlassInput focused={nameFocused} style={getInputErrorStyle('fullName')}>
                    <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                      <Ionicons
                        name="person-outline"
                        size={moderateScale(20)}
                        color={nameFocused ? theme.primary : theme.textSecondary}
                        style={[styles.inputIcon, isRTL && styles.inputIconRtl]}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          isRTL && styles.inputRtl,
                          {
                            color: theme.text,
                            fontSize: fontSize(15),
                            textAlign: isRTL ? 'right' : 'left',
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                          },
                        ]}
                        placeholder={t('auth.fullName')}
                        placeholderTextColor={theme.input.placeholder}
                        value={fullName}
                        onChangeText={(value) => {
                          setFullName(value);
                          if (!hasBlurredNameField) {
                            clearSubmitError();
                            return;
                          }

                          if (!String(value || '').trim()) {
                            clearFieldError('fullName');
                            clearSubmitError();
                            return;
                          }

                          if (!hasTwoNameParts(value)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              fullName: t('auth.fullNameTwoWordsRequired'),
                            }));
                            clearSubmitError();
                            return;
                          }

                          if (hasUnsupportedNameCharacters(value)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              fullName: t('auth.fullNameLettersOnly'),
                            }));
                            clearSubmitError();
                            return;
                          }

                          clearFieldError('fullName');
                          clearSubmitError();
                        }}
                        onFocus={() => setNameFocused(true)}
                        onBlur={handleFullNameBlur}
                        autoCorrect={false}
                        contextMenuHidden={false}
                        selectTextOnFocus={false}
                        textContentType="name"
                      />
                    </View>
                  </GlassInput>
                  {fieldErrors.fullName && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.fullName}</Text>
                  )}
                  <Text style={[styles.fieldGuideText, { color: theme.textSecondary }]}>{t('auth.fullNameGuide')}</Text>

                  <GlassInput focused={emailFocused} style={[{ marginTop: spacing.md }, getInputErrorStyle('email')]}>
                    <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                      <Ionicons
                        name="mail-outline"
                        size={moderateScale(20)}
                        color={emailFocused ? theme.primary : theme.textSecondary}
                        style={[styles.inputIcon, isRTL && styles.inputIconRtl]}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          isRTL && styles.inputRtl,
                          {
                            color: oauthMode ? theme.textSecondary : theme.text,
                            fontSize: fontSize(15),
                            textAlign: isRTL ? 'right' : 'left',
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                          },
                        ]}
                        placeholder={oauthMode ? t('auth.emailFromGoogle') : t('auth.collegeEmail')}
                        placeholderTextColor={theme.input.placeholder}
                        value={email}
                        onChangeText={oauthMode ? null : (value) => {
                          handleEmailChange(value);
                          clearFieldError('email');
                          clearSubmitError();
                        }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => {
                          setEmailFocused(false);
                          setTimeout(() => setEmailSuggestions([]), 200);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!oauthMode}
                        contextMenuHidden={false}
                        selectTextOnFocus={false}
                        textContentType="emailAddress"
                      />
                      {oauthMode ? (
                        <Ionicons
                          name="lock-closed"
                          size={moderateScale(18)}
                          color={theme.textSecondary}
                        />
                      ) : (
                        emailSuggestions.length === 0 && email.length > 0 && (
                          <Ionicons
                            name={isEducationalEmail(email) ? 'checkmark-circle' : 'close-circle'}
                            size={moderateScale(20)}
                            color={isEducationalEmail(email) ? '#10B981' : '#EF4444'}
                          />
                        )
                      )}
                    </View>
                  </GlassInput>
                  {!oauthMode && emailSuggestions.length > 0 && (
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
                  {fieldErrors.email && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.email}</Text>
                  )}

                  {!oauthMode && email.length > 0 && !isEducationalEmail(email) && (
                    <Text style={[styles.emailWarning, { color: '#EF4444' }]}>
                      {t('auth.useEducationalEmail')}
                    </Text>
                  )}

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
                  {fieldErrors.age && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.age}</Text>
                  )}

                  {!oauthMode && (
                    <>
                      <GlassInput focused={passwordFocused} style={[{ marginTop: spacing.md }, getInputErrorStyle('password')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons
                            name="lock-closed-outline"
                            size={moderateScale(20)}
                            color={passwordFocused ? theme.primary : theme.textSecondary}
                            style={[styles.inputIcon, isRTL && styles.inputIconRtl]}
                          />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
                            placeholder={t('auth.password')}
                            placeholderTextColor={theme.input.placeholder}
                            value={password}
                            onChangeText={(value) => {
                              setPassword(value);
                              clearFieldError('password');
                              clearFieldError('confirmPassword');
                              clearSubmitError();
                            }}
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
                            style={[styles.eyeIcon, isRTL && styles.eyeIconRtl]}
                            activeOpacity={0.7}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          >
                            <Ionicons
                              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={moderateScale(20)}
                              color={theme.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                      </GlassInput>
                      {fieldErrors.password && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.password}</Text>
                      )}

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

                      {password.length > 0 && (
                        <View style={styles.passwordStrengthContainer}>
                          <View style={styles.strengthBarContainer}>
                            <View
                              style={[
                                styles.strengthBar,
                                {
                                  width: getStrengthWidth(),
                                  backgroundColor: getStrengthColor(),
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.strengthText,
                              {
                                color: getStrengthColor(),
                                fontSize: fontSize(12),
                              },
                            ]}
                          >
                            {t('auth.passwordStrength')}: {t(`auth.${passwordStrength}`)}
                          </Text>
                        </View>
                      )}

                      <GlassInput focused={confirmPasswordFocused} style={[{ marginTop: spacing.md }, getInputErrorStyle('confirmPassword')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons
                            name="lock-closed-outline"
                            size={moderateScale(20)}
                            color={confirmPasswordFocused ? theme.primary : theme.textSecondary}
                            style={[styles.inputIcon, isRTL && styles.inputIconRtl]}
                          />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
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
                            autoCapitalize="none"
                            autoCorrect={false}
                            contextMenuHidden={false}
                            selectTextOnFocus={false}
                            textContentType="newPassword"
                          />
                          <TouchableOpacity
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={[styles.eyeIcon, isRTL && styles.eyeIconRtl]}
                            activeOpacity={0.7}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          >
                            <Ionicons
                              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={moderateScale(20)}
                              color={theme.textSecondary}
                            />
                          </TouchableOpacity>
                          {confirmPassword.length > 0 && passwordsMatch && (
                            <Ionicons
                              name="checkmark-circle"
                              size={moderateScale(20)}
                              color={theme.success}
                              style={[styles.checkIcon, isRTL && styles.checkIconRtl]}
                            />
                          )}
                        </View>
                      </GlassInput>
                      {fieldErrors.confirmPassword && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.confirmPassword}</Text>
                      )}

                      {confirmPassword.length > 0 && !passwordsMatch && (
                        <Text style={[
                          styles.errorText,
                          {
                            color: theme.danger,
                            fontSize: fontSize(12),
                          },
                        ]}>
                          {t('auth.passwordMismatch')}
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}

              {currentStep === 2 && (
                <>
                  <SearchableDropdown
                    items={universitiesWithOther}
                    value={university}
                    onSelect={(value) => {
                      setUniversity(value);
                      clearFieldError('university');
                      clearSubmitError();
                    }}
                    placeholder={t('auth.selectUniversity')}
                    icon="school-outline"
                    style={{ marginTop: spacing.md }}
                  />
                  {fieldErrors.university && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.university}</Text>
                  )}

                  {!isUniversityOther && (
                    <SearchableDropdown
                      items={colleges}
                      value={college}
                      onSelect={(value) => {
                        setCollege(value);
                        clearFieldError('college');
                        clearSubmitError();
                      }}
                      placeholder={t('auth.selectCollege')}
                      icon="book-outline"
                      disabled={!university}
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                  {fieldErrors.college && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.college}</Text>
                  )}

                  {!isUniversityOther && !isCollegeOther && (
                    <SearchableDropdown
                      items={departments}
                      value={department}
                      onSelect={(value) => {
                        setDepartment(value);
                        clearFieldError('department');
                        clearSubmitError();
                      }}
                      placeholder={t('auth.selectDepartment')}
                      icon="school-outline"
                      disabled={!college}
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                  {fieldErrors.department && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.department}</Text>
                  )}

                  <SearchableDropdown
                    items={stages}
                    value={stage}
                    onSelect={(value) => {
                      setStage(value);
                      clearFieldError('stage');
                      clearSubmitError();
                    }}
                    placeholder={t('auth.selectStage')}
                    icon="library-outline"
                    style={{ marginTop: spacing.md }}
                  />
                  {fieldErrors.stage && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.stage}</Text>
                  )}

                  {isUniversityOther && (
                    <>
                      <GlassInput style={[{ marginTop: spacing.md }, getInputErrorStyle('customUniversityName')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons name="school-outline" size={moderateScale(20)} color={theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                minHeight: hp(6.2),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
                            value={customUniversityName}
                            onChangeText={(value) => {
                              setCustomUniversityName(value);
                              clearFieldError('customUniversityName');
                              clearSubmitError();
                            }}
                            placeholder={t('auth.otherUniversityNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                      {fieldErrors.customUniversityName && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customUniversityName}</Text>
                      )}

                      <GlassInput style={[{ marginTop: spacing.md }, getInputErrorStyle('customCollegeName')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons name="book-outline" size={moderateScale(20)} color={theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                minHeight: hp(6.2),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
                            value={customCollegeName}
                            onChangeText={(value) => {
                              setCustomCollegeName(value);
                              clearFieldError('customCollegeName');
                              clearSubmitError();
                            }}
                            placeholder={t('auth.otherCollegeNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                      {fieldErrors.customCollegeName && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customCollegeName}</Text>
                      )}

                      <GlassInput style={[{ marginTop: spacing.md }, getInputErrorStyle('customDepartmentName')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons name="business-outline" size={moderateScale(20)} color={theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                minHeight: hp(6.2),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
                            value={customDepartmentName}
                            onChangeText={(value) => {
                              setCustomDepartmentName(value);
                              clearFieldError('customDepartmentName');
                              clearSubmitError();
                            }}
                            placeholder={t('auth.otherDepartmentNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                      {fieldErrors.customDepartmentName && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customDepartmentName}</Text>
                      )}
                    </>
                  )}

                  {!isUniversityOther && isCollegeOther && (
                    <>
                      <GlassInput style={[{ marginTop: spacing.md }, getInputErrorStyle('customCollegeName')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons name="book-outline" size={moderateScale(20)} color={theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                minHeight: hp(6.2),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
                            value={customCollegeName}
                            onChangeText={(value) => {
                              setCustomCollegeName(value);
                              clearFieldError('customCollegeName');
                              clearSubmitError();
                            }}
                            placeholder={t('auth.otherCollegeNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                      {fieldErrors.customCollegeName && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customCollegeName}</Text>
                      )}

                      <GlassInput style={[{ marginTop: spacing.md }, getInputErrorStyle('customDepartmentName')]}>
                        <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                          <Ionicons name="business-outline" size={moderateScale(20)} color={theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                          <TextInput
                            style={[
                              styles.input,
                              isRTL && styles.inputRtl,
                              {
                                color: theme.text,
                                fontSize: fontSize(15),
                                minHeight: hp(6.2),
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr',
                              },
                            ]}
                            value={customDepartmentName}
                            onChangeText={(value) => {
                              setCustomDepartmentName(value);
                              clearFieldError('customDepartmentName');
                              clearSubmitError();
                            }}
                            placeholder={t('auth.otherDepartmentNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                      {fieldErrors.customDepartmentName && (
                        <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customDepartmentName}</Text>
                      )}
                    </>
                  )}

                  {!isUniversityOther && !isCollegeOther && isDepartmentOther && (
                    <GlassInput style={[{ marginTop: spacing.md }, getInputErrorStyle('customDepartmentName')]}>
                      <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
                        <Ionicons name="business-outline" size={moderateScale(20)} color={theme.textSecondary} style={[styles.inputIcon, isRTL && styles.inputIconRtl]} />
                        <TextInput
                          style={[
                            styles.input,
                            isRTL && styles.inputRtl,
                            {
                              color: theme.text,
                              fontSize: fontSize(15),
                              minHeight: hp(6.2),
                              textAlign: isRTL ? 'right' : 'left',
                              writingDirection: isRTL ? 'rtl' : 'ltr',
                            },
                          ]}
                          value={customDepartmentName}
                          onChangeText={(value) => {
                            setCustomDepartmentName(value);
                            clearFieldError('customDepartmentName');
                            clearSubmitError();
                          }}
                          placeholder={t('auth.otherDepartmentNamePlaceholder')}
                          placeholderTextColor={theme.input.placeholder}
                          maxLength={120}
                        />
                      </View>
                    </GlassInput>
                  )}
                  {fieldErrors.customDepartmentName && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customDepartmentName}</Text>
                  )}

                  {hasAcademicOther && (
                    <SearchableDropdown
                      items={otherDepartmentYearsOptions}
                      value={customDepartmentYears}
                      onSelect={(value) => {
                        setCustomDepartmentYears(value);
                        clearFieldError('customDepartmentYears');
                        clearSubmitError();
                      }}
                      placeholder={t('auth.otherStudyYearsPlaceholder')}
                      icon="time-outline"
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                  {fieldErrors.customDepartmentYears && (
                    <Text style={[styles.fieldErrorText, { color: theme.danger }]}>{fieldErrors.customDepartmentYears}</Text>
                  )}
                </>
              )}

              {currentStep === 3 && (
                <>
                  <Text style={[styles.roleLabel, { color: theme.text }]}>{t('auth.chooseAccountType')}</Text>

                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      {
                        borderColor: accountRole === 'student' ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setAccountRole('student')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleOptionContent}>
                      <Ionicons name="school-outline" size={moderateScale(20)} color={theme.text} />
                      <Text style={[styles.roleOptionText, { color: theme.text }]}>{t('auth.studentRole')}</Text>
                    </View>
                    {accountRole === 'student' && (
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color={theme.primary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      !isTeacherSignupEnabled && styles.roleOptionDisabled,
                      {
                        borderColor: (!isTeacherSignupEnabled || accountRole !== 'teacher') ? theme.border : theme.primary,
                      },
                    ]}
                    disabled={!isTeacherSignupEnabled}
                    onPress={() => {
                      if (isTeacherSignupEnabled) {
                        setAccountRole('teacher');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleOptionContent}>
                      <Ionicons
                        name="book-outline"
                        size={moderateScale(20)}
                        color={!isTeacherSignupEnabled ? theme.textSecondary : theme.text}
                      />
                      <View style={styles.roleTextContainer}>
                        <Text
                          style={[
                            styles.roleOptionText,
                            { color: !isTeacherSignupEnabled ? theme.textSecondary : theme.text },
                          ]}
                        >
                          {t('auth.teacherRole')}
                        </Text>
                        {!isTeacherSignupEnabled && (
                          <Text style={[styles.roleOptionMeta, { color: theme.textSecondary }]}>
                            {t('auth.teacherSignupComingSoon')}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isTeacherSignupEnabled && accountRole === 'teacher' && (
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                </>
              )}

              {!!submitError && (
                <Text style={[styles.submitErrorText, { color: theme.danger }]}>{submitError}</Text>
              )}
              <View style={[
                styles.navigationButtonsRow,
                isCompactPhone && styles.navigationButtonsRowCompact,
              ]}>
                {currentStep > 1 && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      isCompactPhone && styles.secondaryButtonCompact,
                      { borderColor: 'rgba(255,255,255,0.3)' },
                    ]}
                    onPress={handlePreviousStep}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.secondaryButtonText, { color: '#FFFFFF' }]}>{t('common.previous')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.signUpButton,
                    shadows.large,
                    { flex: 1 },
                    isCompactPhone && styles.signUpButtonCompact,
                  ]}
                  onPress={currentStep < 3 ? handleNextStep : handleSignUp}
                  disabled={isLoading || (currentStep === 3 && !isFormValid())}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={(currentStep === 3 && !isFormValid()) ? ['#999', '#666'] : theme.gradient}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.signUpButtonText,
                            {
                              fontSize: fontSize(17),
                              opacity: (currentStep === 3 && !isFormValid()) ? 0.6 : 1,
                            },
                          ]}
                        >
                          {currentStep < 3
                            ? t('common.next')
                            : (oauthMode ? t('common.next') : t('auth.createAccount'))}
                        </Text>
                        {!isCompactPhone && (
                          <Ionicons
                            name="arrow-forward"
                            size={moderateScale(20)}
                            color="#FFFFFF"
                            style={[styles.buttonIcon, { opacity: (currentStep === 3 && !isFormValid()) ? 0.6 : 1 }]}
                          />
                        )}
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassContainer>

            <View style={[styles.footer, isCompactPhone && styles.footerCompact, isRTL && styles.footerRtl]}>
              <Text style={[
                styles.footerText, 
                isRTL && styles.footerTextRtl,
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
                  isRTL && styles.footerTextRtl,
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

          <View style={{ height: isCompactPhone ? hp(5) : hp(8) }} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? hp(7) : hp(5.5),
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
    alignItems: 'center',
  },
  languageContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(4.8) : hp(4),
    right: wp(4),
    zIndex: 1000,
  },
  languageContainerRtl: {
    right: 'auto',
    left: wp(4),
  },
  headerContainer: {
    marginBottom: spacing.lg,
    maxWidth: isTablet() ? 700 : 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerContainerRtl: {
    alignItems: 'flex-end',
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
  headerTextRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subHeaderText: {
    opacity: 0.9,
    color: '#FFFFFF',
  },
  subHeaderTextRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  formContainer: {
    padding: isTablet() ? spacing.xxl : spacing.lg,
    maxWidth: isTablet() ? 700 : 560,
    alignSelf: 'center',
    width: '100%',
  },
  formContainerCompact: {
    padding: spacing.md,
  },
  formContainerWidePhone: {
    maxWidth: 620,
  },
  formContainerLargeScreen: {
    maxWidth: 520,
    padding: spacing.lg,
  },
  formContainerShortScreen: {
    paddingVertical: spacing.md,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicatorCircle: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize(12),
  },
  stepIndicatorLine: {
    width: moderateScale(32),
    height: moderateScale(2),
    marginHorizontal: spacing.xs,
  },
  stepTitle: {
    fontSize: fontSize(14),
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
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
  checkIcon: {
    marginLeft: spacing.xs,
  },
  checkIconRtl: {
    marginLeft: 0,
    marginRight: spacing.xs,
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
  fieldErrorText: {
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    fontSize: fontSize(12),
    fontWeight: '600',
  },
  submitErrorText: {
    width: '100%',
    marginBottom: spacing.xs,
    fontSize: fontSize(12),
    fontWeight: '700',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
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
  },
  signUpButtonCompact: {
    minHeight: moderateScale(46),
  },
  navigationButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  navigationButtonsRowCompact: {
    gap: spacing.xs,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    minWidth: moderateScale(96),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonCompact: {
    minWidth: moderateScale(78),
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontWeight: '700',
    letterSpacing: 0.3,
    fontSize: fontSize(15),
    textAlign: 'center',
  },
  buttonGradient: {
    paddingVertical: spacing.md + spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleLabel: {
    fontSize: fontSize(14),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  roleOption: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  roleOptionDisabled: {
    opacity: 0.55,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleOptionText: {
    fontSize: fontSize(15),
    fontWeight: '600',
    flexShrink: 1,
  },
  roleOptionMeta: {
    marginTop: spacing.xs / 2,
    fontSize: fontSize(12),
    fontWeight: '500',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    flexShrink: 1,
  },
  buttonIcon: {
    marginLeft: 0,
    flexShrink: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  footerCompact: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  footerRtl: {
    flexDirection: 'row-reverse',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  footerTextRtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  signInText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default SignUp;
