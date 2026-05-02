import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';
import { GlassContainer, GlassButton } from '../components/GlassComponents';
import { CheckIcon, CloseIcon } from '../components/icons';
import { wp, hp, fontSize, spacing, isTablet } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';
import useLayout from '../hooks/useLayout';
import safeStorage from '../utils/safeStorage';
import telemetry from '../utils/telemetry';

const TermsAndConditions = ({ navigation, route }) => {
  const { t, theme, isDarkMode, isRTL } = useAppSettings();
  const { user } = useUser();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useLayout();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isModal = route?.params?.isModal ?? false;
  const onAcceptCallback = route?.params?.onAccept;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setHasScrolledToBottom(distanceFromBottom < 100);
  };

  const handleAccept = async () => {
    const trace = telemetry.startTrace('terms_accepted');
    
    try {
      setIsLoading(true);

      // Store acceptance in local storage
      await safeStorage.setItem('terms_accepted', 'true');
      await safeStorage.setItem('terms_accepted_at', new Date().toISOString());

      telemetry.recordEvent('user_accepted_terms_and_conditions', {
        timestamp: new Date().toISOString(),
      });

      trace.finish({ success: true });

      if (onAcceptCallback) {
        await onAcceptCallback();
      } else if (isModal) {
        navigation.goBack();
      } else {
        // Navigate to appropriate main tabs based on user role
        // The navigation stack will be reset to show the main tabs
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      trace.finish({ success: false, error: error.message });
      showAlert({
        type: 'error',
        title: t('common.error'),
        message: t('terms.acceptError') || 'Failed to accept terms. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    showAlert({
      type: 'warning',
      title: t('terms.declineTitle') || 'Decline Terms',
      message: t('terms.declineMessage') || 'You must accept the Terms and Conditions to use this app.',
      buttons: [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('common.decline') || 'Decline',
          style: 'destructive',
          onPress: () => {
            if (route?.params?.isModal || (navigation.canGoBack && navigation.canGoBack())) {
              navigation.goBack();
            } else {
              navigation.reset({ index: 0, routes: [{ name: 'SignIn', params: { preventAutoLogin: true } }] });
            }
          },
        },
      ],
    });
  };

  const termsContent = `COLLEGE COMMUNITY - TERMS AND CONDITIONS

Last Updated: April 23, 2026

1. ACCEPTANCE OF TERMS
By accessing and using the College Community application ("App"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.

2. USER-GENERATED CONTENT
This App contains user-generated content including posts, comments, messages, and other materials submitted by users. By using this App, you acknowledge that you will encounter user-generated content.

2.1 CONTENT MODERATION
We maintain zero tolerance for:
- Hate speech, harassment, or bullying
- Misinformation or false information
- Explicit or graphic content
- Threats or violence
- Spam or scams
- Discrimination or prejudice
- Any other objectionable or abusive content

Violations of these policies may result in content removal, account warnings, or permanent account suspension.

2.2 YOUR RESPONSIBILITIES
You agree that you will NOT:
- Post, share, or promote abusive, offensive, or illegal content
- Harass, bully, or threaten other users
- Spread misinformation or false information
- Use the App to discriminate against others
- Violate any applicable laws or regulations

3. REPORTING AND FLAGGING
3.1 REPORTING OBJECTIONABLE CONTENT
If you encounter user-generated content that you believe violates these Terms and Conditions, you can report it using the flag/report button available on posts, comments, and user profiles. Reports are reviewed by our moderation team.

3.2 BLOCKING ABUSIVE USERS
You have the right to block users who are abusive, harassing, or inappropriate. Blocked users cannot contact you, see your content, or interact with you on the App. You can manage your blocked users list in Settings.

4. DATA COLLECTION AND PRIVACY
4.1 LOGIN OPTIONS
We offer multiple login options to protect your privacy:
- Email/Password login
- Sign in with Google
- Sign in with Apple

4.2 DATA COLLECTION LIMITS
When using any login method:
- We collect only your name and email address
- You have the option to keep your email private from other users
- We do not collect your app interactions for advertising purposes
- No third-party tracking for advertising is enabled

Your privacy is important to us. Please review our Privacy Policy for complete details on how we handle your data.

5. PROHIBITED USES
You agree not to:
- Impersonate others
- Share personal information without consent
- Engage in harassment or abusive behavior
- Post illegal content
- Circumvent security measures
- Interfere with App functionality

6. ACCOUNT SUSPENSION
We reserve the right to suspend or terminate accounts that violate these Terms and Conditions without prior notice. Severe violations may result in permanent account termination.

7. LIMITATION OF LIABILITY
The App is provided "as is" without warranties. We are not responsible for user-generated content or actions of other users. We are not liable for any indirect, incidental, or consequential damages.

8. CHANGES TO TERMS
We may update these Terms and Conditions at any time. Continued use of the App constitutes acceptance of updated terms.

9. CONTACT US
If you have questions about these Terms and Conditions, please contact our support team through the App or email support@collegecommunity.app

10. ACKNOWLEDGMENT
By clicking "Accept," you acknowledge that:
- You have read and understand these Terms and Conditions
- You agree to follow all rules and policies outlined above
- You understand the consequences of violating these terms
- You commit to using the App responsibly and respectfully`;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: isModal ? insets.top : 0 },
      ]}
      edges={isModal ? ['left', 'right', 'bottom'] : ['left', 'right', 'bottom']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('terms.title') || 'Terms & Conditions'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
          {t('terms.subtitle') || 'Please read and accept our terms'}
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
        style={styles.scrollView}
      >
        <GlassContainer style={[styles.termsContainer, contentStyle]}>
          <Text
            style={[
              styles.termsText,
              { color: theme.text },
            ]}
          >
            {termsContent}
          </Text>
        </GlassContainer>

        {/* Scroll indicator */}
        {!hasScrolledToBottom && (
          <View style={styles.scrollIndicatorContainer}>
            <Text style={[styles.scrollIndicator, { color: theme.secondaryText }]}>
              {t('terms.scrollToBottom') || '↓ Scroll to bottom to continue'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Buttons */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          { opacity: fadeAnim, backgroundColor: theme.background },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.declineButton,
            { borderColor: theme.border, backgroundColor: 'transparent' },
          ]}
          onPress={handleDecline}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={[styles.declineButtonText, { color: theme.text }]}>
            {t('terms.decline') || 'Decline'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            {
              backgroundColor: hasScrolledToBottom
                ? theme.primary
                : theme.border,
              opacity: hasScrolledToBottom ? 1 : 0.5,
            },
          ]}
          onPress={handleAccept}
          disabled={!hasScrolledToBottom || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.acceptButtonText}>
              {t('terms.accept') || 'Accept & Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Alert */}
      {alertConfig.visible && <CustomAlert {...alertConfig} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  termsContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  termsText: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.6,
    fontWeight: '400',
  },
  scrollIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  scrollIndicator: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  buttonsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  declineButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'white',
  },
});

export default TermsAndConditions;
