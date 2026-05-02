import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity, View } from 'react-native';
import SignIn from '../app/auth/SignIn';

const mockSetUserData = jest.fn();
const mockShowAlert = jest.fn();
const mockHideAlert = jest.fn();
const mockStartTrace = jest.fn(() => ({ finish: jest.fn() }));
const mockRecordEvent = jest.fn();

const mockSignInWithApple = jest.fn();
const mockCheckOAuthUserExists = jest.fn();
const mockStorePendingOAuthSignup = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockGetCompleteUserData = jest.fn();

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('expo-image', () => ({
  Image: (props) => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View {...props} />;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../app/hooks/useLayout', () => ({
  __esModule: true,
  default: () => ({ formStyle: {} }),
}));

jest.mock('../app/context/AppSettingsContext', () => ({
  useAppSettings: () => ({
    t: (key) => ({
      'auth.continueWithApple': 'Continue with Apple',
      'auth.appleGuestModeTitle': 'Signed in as Guest',
      'auth.appleGuestModeMessage': 'Guest mode message',
      'auth.appleSignInError': 'Apple sign-in failed',
      'common.error': 'Error',
      'auth.orContinueWith': 'or',
      'auth.signIn': 'Sign In',
      'auth.dontHaveAccount': "Don't have an account?",
      'auth.signUp': 'Sign Up',
      'auth.notAStudent': 'Not a student?',
      'auth.signUpAsGuest': 'Sign up as guest',
      'auth.forgotPassword': 'Forgot Password?',
      'auth.continueWithGoogle': 'Continue with Google',
      'auth.welcomeBack': 'Welcome Back!',
      'auth.signInToAccount': 'Sign in to your account',
      'auth.collegeEmail': 'College Email',
      'auth.password': 'Password',
      'common.networkError': 'Network Error',
    }[key] || key),
    theme: {
      text: '#111111',
      textSecondary: '#666666',
      primary: '#0057FF',
      card: '#FFFFFF',
      input: { placeholder: '#999999' },
    },
    isDarkMode: false,
    isRTL: false,
  }),
}));

jest.mock('../app/context/UserContext', () => ({
  useUser: () => ({
    setUserData: mockSetUserData,
  }),
}));

jest.mock('../app/hooks/useCustomAlert', () => ({
  useCustomAlert: () => ({
    alertConfig: { visible: false, type: 'info', title: '', message: '', buttons: [] },
    showAlert: mockShowAlert,
    hideAlert: mockHideAlert,
  }),
}));

jest.mock('../app/components/LanguageDropdown', () => () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return <View />;
});

jest.mock('../app/components/AnimatedBackground', () => () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return <View />;
});

jest.mock('../app/components/GlassComponents', () => ({
  GlassContainer: ({ children }) => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  GlassInput: ({ children }) => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../app/components/CustomAlert', () => () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return <View />;
});

jest.mock('../app/components/icons', () => ({
  MailIcon: () => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View />;
  },
  LockIcon: () => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View />;
  },
  EyeIcon: () => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View />;
  },
  EyeOffIcon: () => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View />;
  },
  ArrowForwardIcon: () => {
    const ReactModule = require('react');
    const { View } = require('react-native');
    return <View />;
  },
}));

jest.mock('../app/utils/telemetry', () => ({
  __esModule: true,
  default: {
    startTrace: (...args) => mockStartTrace(...args),
    recordEvent: (...args) => mockRecordEvent(...args),
  },
}));

jest.mock('../database/auth', () => ({
  signIn: jest.fn(),
  getCurrentUser: (...args) => mockGetCurrentUser(...args),
  signOut: jest.fn(),
  getCompleteUserData: (...args) => mockGetCompleteUserData(...args),
  signInWithGoogle: jest.fn(),
  signInWithApple: (...args) => mockSignInWithApple(...args),
  checkOAuthUserExists: (...args) => mockCheckOAuthUserExists(...args),
  storePendingOAuthSignup: (...args) => mockStorePendingOAuthSignup(...args),
  isEducationalEmail: (email) => String(email || '').toLowerCase().endsWith('.edu') || String(email || '').toLowerCase().endsWith('.edu.iq'),
}));

const createNavigation = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
});

const pressContinueWithApple = async (testRenderer) => {
  const appleButton = testRenderer.root.findAll((node) => {
    if (node.type !== TouchableOpacity || typeof node.props?.onPress !== 'function') {
      return false;
    }

    const hasAppleText = node.findAll((child) => (
      child.type === Text && child.props?.children === 'Continue with Apple'
    )).length > 0;

    return hasAppleText;
  })[0];

  await act(async () => {
    await appleButton.props.onPress();
  });
};

describe('SignIn Apple OAuth integration routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetCompleteUserData.mockResolvedValue(null);
    mockSignInWithApple.mockResolvedValue({ success: true });
    mockStorePendingOAuthSignup.mockResolvedValue();
  });

  it('routes non-college Apple OAuth users to guest signup and shows limitation notice', async () => {
    const navigation = createNavigation();

    mockCheckOAuthUserExists.mockResolvedValue({
      exists: false,
      user: {
        $id: 'apple-user-1',
        email: 'person@gmail.com',
        name: 'Guest Candidate',
      },
      email: 'person@gmail.com',
      name: 'Guest Candidate',
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<SignIn navigation={navigation} route={{ params: {} }} />);
    });

    await pressContinueWithApple(tree);

    expect(mockStorePendingOAuthSignup).toHaveBeenCalledWith({
      userId: 'apple-user-1',
      email: 'person@gmail.com',
      name: 'Guest Candidate',
    });

    expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({
      type: 'info',
      title: 'Signed in as Guest',
    }));

    expect(navigation.navigate).toHaveBeenCalledWith(
      'GuestSignUp',
      expect.objectContaining({
        oauthMode: true,
        oauthEmail: 'person@gmail.com',
        oauthUserId: 'apple-user-1',
        showGuestModeNotice: true,
      })
    );
  });

  it('routes college Apple OAuth users to student signup flow', async () => {
    const navigation = createNavigation();

    mockCheckOAuthUserExists.mockResolvedValue({
      exists: false,
      user: {
        $id: 'apple-user-2',
        email: 'student@college.edu',
        name: 'Student Candidate',
      },
      email: 'student@college.edu',
      name: 'Student Candidate',
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<SignIn navigation={navigation} route={{ params: {} }} />);
    });

    await pressContinueWithApple(tree);

    expect(mockStorePendingOAuthSignup).toHaveBeenCalledWith({
      userId: 'apple-user-2',
      email: 'student@college.edu',
      name: 'Student Candidate',
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      'SignUp',
      expect.objectContaining({
        oauthMode: true,
        oauthEmail: 'student@college.edu',
        oauthUserId: 'apple-user-2',
      })
    );
  });
});
