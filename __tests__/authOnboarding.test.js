import {
  OAUTH_SIGNUP_PATHS,
  buildOAuthSignupNavigationTarget,
  hasAcceptedRequiredPolicies,
  resolveOAuthSignupPath,
} from '../app/utils/authOnboarding';

describe('auth onboarding helpers', () => {
  describe('resolveOAuthSignupPath', () => {
    it('returns student for educational emails', () => {
      const result = resolveOAuthSignupPath('student@epu.edu.iq');
      expect(result).toBe(OAUTH_SIGNUP_PATHS.STUDENT);
    });

    it('returns guest for non-educational emails', () => {
      const result = resolveOAuthSignupPath('person@gmail.com');
      expect(result).toBe(OAUTH_SIGNUP_PATHS.GUEST);
    });
  });

  describe('buildOAuthSignupNavigationTarget', () => {
    it('routes non-educational Apple OAuth users to GuestSignUp with notice', () => {
      const result = buildOAuthSignupNavigationTarget({
        email: 'person@gmail.com',
        oauthName: 'Guest User',
        oauthUserId: 'user-1',
        provider: 'apple',
      });

      expect(result.routeName).toBe('GuestSignUp');
      expect(result.params).toMatchObject({
        oauthMode: true,
        oauthEmail: 'person@gmail.com',
        oauthName: 'Guest User',
        oauthUserId: 'user-1',
        showGuestModeNotice: true,
      });
    });

    it('routes educational OAuth users to SignUp', () => {
      const result = buildOAuthSignupNavigationTarget({
        email: 'student@epu.edu.iq',
        oauthName: 'Student User',
        oauthUserId: 'user-2',
        provider: 'apple',
      });

      expect(result.routeName).toBe('SignUp');
      expect(result.params).toMatchObject({
        oauthMode: true,
        oauthEmail: 'student@epu.edu.iq',
        oauthName: 'Student User',
        oauthUserId: 'user-2',
      });
      expect(result.params.showGuestModeNotice).toBeUndefined();
    });

    it('routes missing OAuth email to SignUp with editable email', () => {
      const result = buildOAuthSignupNavigationTarget({
        email: '',
        oauthEmail: '',
        oauthName: 'Unknown Email User',
        oauthUserId: 'user-3',
        provider: 'apple',
      });

      expect(result.routeName).toBe('SignUp');
      expect(result.params).toMatchObject({
        oauthMode: true,
        oauthEmail: '',
        oauthName: 'Unknown Email User',
        oauthUserId: 'user-3',
        oauthProvider: 'apple',
        allowEmailEdit: true,
      });
    });

    it('does not enable Apple guest notice for non-Apple providers', () => {
      const result = buildOAuthSignupNavigationTarget({
        email: 'person@gmail.com',
        oauthName: 'Google User',
        oauthUserId: 'user-4',
        provider: 'google',
      });

      expect(result.routeName).toBe('GuestSignUp');
      expect(result.params).toMatchObject({
        oauthProvider: 'google',
        showGuestModeNotice: false,
      });
    });
  });

  describe('hasAcceptedRequiredPolicies', () => {
    it('returns true only when terms and no-tolerance are both accepted', () => {
      expect(
        hasAcceptedRequiredPolicies({
          hasAcceptedTermsEula: true,
          hasAcknowledgedNoTolerancePolicy: true,
        })
      ).toBe(true);

      expect(
        hasAcceptedRequiredPolicies({
          hasAcceptedTermsEula: true,
          hasAcknowledgedNoTolerancePolicy: false,
        })
      ).toBe(false);

      expect(
        hasAcceptedRequiredPolicies({
          hasAcceptedTermsEula: false,
          hasAcknowledgedNoTolerancePolicy: true,
        })
      ).toBe(false);
    });
  });
});
