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
import { initiateSignup, getCompleteUserData, isEducationalEmail, completeOAuthSignup, getPendingOAuthSignup, clearPendingOAuthSignup } from '../../database/auth';
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
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  const { t, theme, isDarkMode } = useAppSettings();
  const isCompactPhone = hp(100) < 700;
  const isWidePhone = !isTablet() && wp(100) > 430;
  const isLargeScreen = windowWidth >= 900;
  const isShortScreen = hp(100) < 760;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isInitialMount = useRef(true);
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
  }, []);

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
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.fullNameRequired') });
      return false;
    }
    
    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.nameLengthError') });
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validEmailRequired') });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validEmailRequired') });
      return false;
    }
    
    if (!age || parseInt(age) < 16 || parseInt(age) > 100) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validAgeRequired') });
      return false;
    }
    if (!university) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.universityRequired') });
      return false;
    }
    if (!college) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.collegeRequired') });
      return false;
    }
    if (!department) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.departmentRequired') });
      return false;
    }
    if (isUniversityOther) {
      if (String(customUniversityName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherUniversityNameRequired') });
        return false;
      }
      if (String(customCollegeName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherCollegeNameRequired') });
        return false;
      }
      if (String(customDepartmentName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherDepartmentNameRequired') });
        return false;
      }
    } else if (isCollegeOther) {
      if (String(customCollegeName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherCollegeNameRequired') });
        return false;
      }
      if (String(customDepartmentName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherDepartmentNameRequired') });
        return false;
      }
    } else if (isDepartmentOther) {
      if (String(customDepartmentName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherDepartmentNameRequired') });
        return false;
      }
    }

    if (hasAcademicOther && !customDepartmentYears) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherStudyYearsRequired') });
      return false;
    }
    if (!stage) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.stageRequired') });
      return false;
    }
    
    if (!oauthMode) {
      if (password.length < 8) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.passwordTooShort') });
        return false;
      }
      if (passwordStrength === 'weak') {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.passwordGuideWeak') });
        return false;
      }
      if (password !== confirmPassword) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.passwordMismatch') });
        return false;
      }
    }
    return true;
  };

  const validateStepOne = () => {
    if (!fullName.trim()) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.fullNameRequired') });
      return false;
    }

    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.nameLengthError') });
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validEmailRequired') });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validEmailRequired') });
      return false;
    }

    if (!age || parseInt(age) < 16 || parseInt(age) > 100) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.validAgeRequired') });
      return false;
    }

    if (!oauthMode) {
      if (password.length < 8) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.passwordTooShort') });
        return false;
      }
      if (passwordStrength === 'weak') {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.passwordGuideWeak') });
        return false;
      }
      if (password !== confirmPassword) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.passwordMismatch') });
        return false;
      }
    }

    return true;
  };

  const validateStepTwo = () => {
    if (!university) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.universityRequired') });
      return false;
    }
    if (!college) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.collegeRequired') });
      return false;
    }
    if (!department) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.departmentRequired') });
      return false;
    }
    if (isUniversityOther) {
      if (String(customUniversityName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherUniversityNameRequired') });
        return false;
      }
      if (String(customCollegeName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherCollegeNameRequired') });
        return false;
      }
      if (String(customDepartmentName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherDepartmentNameRequired') });
        return false;
      }
    } else if (isCollegeOther) {
      if (String(customCollegeName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherCollegeNameRequired') });
        return false;
      }
      if (String(customDepartmentName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherDepartmentNameRequired') });
        return false;
      }
    } else if (isDepartmentOther) {
      if (String(customDepartmentName || '').trim().length < 2) {
        showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherDepartmentNameRequired') });
        return false;
      }
    }

    if (hasAcademicOther && !customDepartmentYears) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.otherStudyYearsRequired') });
      return false;
    }
    if (!stage) {
      showAlert({ type: 'error', title: t('common.error'), message: t('auth.stageRequired') });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStepOne()) return;
    if (currentStep === 2 && !validateStepTwo()) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const promptExistingAccountSignIn = () => {
    setCurrentStep(1);
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
    setCurrentStep(prev => Math.max(prev - 1, 1));
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

      let errorMessage = t('auth.signUpError');

      if (error.message?.includes('Password')) {
        errorMessage = t('auth.passwordRequirements');
      } else if (error.message?.includes('educational email') || error.message?.includes('Only educational')) {
        errorMessage = t('auth.educationalEmailRequired');
      }
      
      showAlert({ type: 'error', title: t('common.error'), message: errorMessage });
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
      
      <View
        style={[
          styles.gradient,
          { backgroundColor: theme.background },
        ]}>
      
      <AnimatedBackground particleCount={35} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, formStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.languageContainer}>
            <LanguageDropdown />
          </View>
          
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: '100%',
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
              style={[
                styles.formContainer,
                isCompactPhone && styles.formContainerCompact,
                isWidePhone && styles.formContainerWidePhone,
                isLargeScreen && styles.formContainerLargeScreen,
                isShortScreen && styles.formContainerShortScreen,
              ]}
              intensity={isTablet() ? 30 : 25}
              borderRadius={borderRadius.xl}
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
                            name={isEducationalEmail(email) ? 'checkmark-circle' : 'close-circle'}
                            size={moderateScale(20)}
                            color={isEducationalEmail(email) ? '#10B981' : '#EF4444'}
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

                  {!oauthMode && (
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
                              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
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
                    onSelect={setUniversity}
                    placeholder={t('auth.selectUniversity')}
                    icon="school-outline"
                    style={{ marginTop: spacing.md }}
                  />

                  {!isUniversityOther && (
                    <SearchableDropdown
                      items={colleges}
                      value={college}
                      onSelect={setCollege}
                      placeholder={t('auth.selectCollege')}
                      icon="book-outline"
                      disabled={!university}
                      style={{ marginTop: spacing.md }}
                    />
                  )}

                  {!isUniversityOther && !isCollegeOther && (
                    <SearchableDropdown
                      items={departments}
                      value={department}
                      onSelect={setDepartment}
                      placeholder={t('auth.selectDepartment')}
                      icon="school-outline"
                      disabled={!college}
                      style={{ marginTop: spacing.md }}
                    />
                  )}

                  <SearchableDropdown
                    items={stages}
                    value={stage}
                    onSelect={setStage}
                    placeholder={t('auth.selectStage')}
                    icon="library-outline"
                    style={{ marginTop: spacing.md }}
                  />

                  {isUniversityOther && (
                    <>
                      <GlassInput style={{ marginTop: spacing.md }}>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="school-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.inputIcon} />
                          <TextInput
                            style={[styles.input, { color: theme.text, fontSize: fontSize(15), minHeight: hp(6.2) }]}
                            value={customUniversityName}
                            onChangeText={setCustomUniversityName}
                            placeholder={t('auth.otherUniversityNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>

                      <GlassInput style={{ marginTop: spacing.md }}>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="book-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.inputIcon} />
                          <TextInput
                            style={[styles.input, { color: theme.text, fontSize: fontSize(15), minHeight: hp(6.2) }]}
                            value={customCollegeName}
                            onChangeText={setCustomCollegeName}
                            placeholder={t('auth.otherCollegeNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>

                      <GlassInput style={{ marginTop: spacing.md }}>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="business-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.inputIcon} />
                          <TextInput
                            style={[styles.input, { color: theme.text, fontSize: fontSize(15), minHeight: hp(6.2) }]}
                            value={customDepartmentName}
                            onChangeText={setCustomDepartmentName}
                            placeholder={t('auth.otherDepartmentNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                    </>
                  )}

                  {!isUniversityOther && isCollegeOther && (
                    <>
                      <GlassInput style={{ marginTop: spacing.md }}>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="book-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.inputIcon} />
                          <TextInput
                            style={[styles.input, { color: theme.text, fontSize: fontSize(15), minHeight: hp(6.2) }]}
                            value={customCollegeName}
                            onChangeText={setCustomCollegeName}
                            placeholder={t('auth.otherCollegeNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>

                      <GlassInput style={{ marginTop: spacing.md }}>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="business-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.inputIcon} />
                          <TextInput
                            style={[styles.input, { color: theme.text, fontSize: fontSize(15), minHeight: hp(6.2) }]}
                            value={customDepartmentName}
                            onChangeText={setCustomDepartmentName}
                            placeholder={t('auth.otherDepartmentNamePlaceholder')}
                            placeholderTextColor={theme.input.placeholder}
                            maxLength={120}
                          />
                        </View>
                      </GlassInput>
                    </>
                  )}

                  {!isUniversityOther && !isCollegeOther && isDepartmentOther && (
                    <GlassInput style={{ marginTop: spacing.md }}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="business-outline" size={moderateScale(20)} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { color: theme.text, fontSize: fontSize(15), minHeight: hp(6.2) }]}
                          value={customDepartmentName}
                          onChangeText={setCustomDepartmentName}
                          placeholder={t('auth.otherDepartmentNamePlaceholder')}
                          placeholderTextColor={theme.input.placeholder}
                          maxLength={120}
                        />
                      </View>
                    </GlassInput>
                  )}

                  {hasAcademicOther && (
                    <SearchableDropdown
                      items={otherDepartmentYearsOptions}
                      value={customDepartmentYears}
                      onSelect={setCustomDepartmentYears}
                      placeholder={t('auth.otherStudyYearsPlaceholder')}
                      icon="time-outline"
                      style={{ marginTop: spacing.md }}
                    />
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

            <View style={[styles.footer, isCompactPhone && styles.footerCompact]}>
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

          <View style={{ height: isCompactPhone ? hp(5) : hp(8) }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
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
  headerContainer: {
    marginBottom: spacing.lg,
    maxWidth: isTablet() ? 700 : 560,
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
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  signInText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default SignUp;
