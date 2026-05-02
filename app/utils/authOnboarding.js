import { isEducationalEmail } from '../constants/academicEmailDomains';

export const OAUTH_SIGNUP_PATHS = {
  STUDENT: 'student',
  GUEST: 'guest',
};

export const resolveOAuthSignupPath = (email) => {
  return isEducationalEmail(email)
    ? OAUTH_SIGNUP_PATHS.STUDENT
    : OAUTH_SIGNUP_PATHS.GUEST;
};

export const hasAcceptedRequiredPolicies = ({
  hasAcceptedTermsEula,
  hasAcknowledgedNoTolerancePolicy,
}) => {
  return Boolean(hasAcceptedTermsEula && hasAcknowledgedNoTolerancePolicy);
};

export const buildOAuthSignupNavigationTarget = ({
  email,
  oauthEmail,
  oauthName,
  oauthUserId,
  provider,
}) => {
  const resolvedEmail = String(email || oauthEmail || '').trim();

  if (!resolvedEmail) {
    if (provider === 'apple') {
      return {
        routeName: 'GuestSignUp',
        params: {
          oauthMode: true,
          oauthEmail: '',
          oauthName: oauthName || '',
          oauthUserId: oauthUserId || '',
          oauthProvider: provider,
          allowEmailEdit: true,
          showGuestModeNotice: true,
        },
      };
    }
    
    return {
      routeName: 'SignUp',
      params: {
        oauthMode: true,
        oauthEmail: '',
        oauthName: oauthName || '',
        oauthUserId: oauthUserId || '',
        oauthProvider: provider || 'social',
        allowEmailEdit: true,
      },
    };
  }

  const signupPath = resolveOAuthSignupPath(resolvedEmail);

  if (signupPath === OAUTH_SIGNUP_PATHS.GUEST) {
    return {
      routeName: 'GuestSignUp',
      params: {
        oauthMode: true,
        oauthEmail: resolvedEmail,
        oauthName: oauthName || '',
        oauthUserId: oauthUserId || '',
        oauthProvider: provider || 'social',
        allowEmailEdit: false,
        showGuestModeNotice: provider === 'apple',
      },
    };
  }

  return {
    routeName: 'SignUp',
    params: {
      oauthMode: true,
      oauthEmail: resolvedEmail,
      oauthName: oauthName || '',
      oauthUserId: oauthUserId || '',
      oauthProvider: provider || 'social',
      allowEmailEdit: false,
    },
  };
};
