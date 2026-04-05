import { account, databases, config } from './config';
import { ID, Permission, Role, Query, OAuthProvider } from 'appwrite';
import safeStorage from '../app/utils/safeStorage';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { userCacheManager } from '../app/utils/cacheManager';
import telemetry from '../app/utils/telemetry';
import { isEducationalEmail as isEducationalEmailRule } from '../app/constants/academicEmailDomains';

// Ensure WebBrowser redirects work properly
WebBrowser.maybeCompleteAuthSession();

const PENDING_VERIFICATION_KEY = 'pending_verification';
const PENDING_OAUTH_KEY = 'pending_oauth_signup';
const PENDING_PASSWORD_RESET_KEY = 'pending_password_reset';
const PENDING_VERIFICATION_BACKUP_KEY = 'cc_auth_pending_verification';
const PENDING_OAUTH_BACKUP_KEY = 'cc_auth_pending_oauth_signup';
const VERIFICATION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const PASSWORD_RESET_TIMEOUT = 15 * 60 * 1000; // 15 minutes for password reset
const OTP_MAX_FAILED_ATTEMPTS = 5;
const OTP_LOCK_DURATION = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN = 60 * 1000; // 60 seconds
const OTP_MAX_RESENDS = 5;
const RESET_REQUEST_WINDOW = 15 * 60 * 1000; // 15 minutes
const RESET_MAX_REQUESTS = 5;
const RESET_REQUEST_COOLDOWN = 60 * 1000; // 60 seconds

const setPendingState = async (storageKey, backupKey, value) => {
    await safeStorage.setItem(storageKey, value);

    try {
        await SecureStore.setItemAsync(backupKey, value);
    } catch (_error) {
        // SecureStore is best-effort backup for restart recovery.
    }
};

const getPendingState = async (storageKey, backupKey) => {
    const primaryValue = await safeStorage.getItem(storageKey);
    if (primaryValue) {
        return primaryValue;
    }

    try {
        const backupValue = await SecureStore.getItemAsync(backupKey);
        if (backupValue) {
            await safeStorage.setItem(storageKey, backupValue);
            return backupValue;
        }
    } catch (_error) {
        // Ignore backup read errors and treat as missing pending state.
    }

    return null;
};

const clearPendingState = async (storageKey, backupKey) => {
    await safeStorage.removeItem(storageKey);

    try {
        await SecureStore.deleteItemAsync(backupKey);
    } catch (_error) {
        // Ignore cleanup backup errors.
    }
};

// Check if email is from an educational institution
export const isEducationalEmail = (email) => {
    return isEducationalEmailRule(email);
};

export const initiateSignup = async (email, password, name, additionalData = {}) => {
    try {
        const sanitizedEmail = sanitizeInput(email).toLowerCase();
        const sanitizedName = sanitizeInput(name);

        if (!sanitizedEmail || !sanitizedName) {
            throw new Error('Invalid input data');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            throw new Error('Invalid email format');
        }

        // Check if email is from an educational institution
        if (!isEducationalEmail(sanitizedEmail)) {
            throw new Error('Only educational email addresses are allowed. Please use your university or college email.');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const userId = ID.unique();

        try {
            await account.create({
                userId,
                email: sanitizedEmail,
                password,
                name: sanitizedName,
            });
        } catch (createError) {
            if (createError.message?.includes('already exists') ||
                createError.message?.includes('user with the same email')) {
                throw new Error('An account with this email already exists. Please sign in or use a different email.');
            }
            throw createError;
        }

        // Don't create session yet - use Email OTP to verify
        // Send OTP using Appwrite's Email OTP feature (must be enabled in console)
        let tokenResponse;
        try {
            // createEmailToken sends a 6-digit OTP to the user's email
            // If user already exists, it uses that account; otherwise it would create one
            // But we already created the account above, so this just sends the OTP
            tokenResponse = await account.createEmailToken({
                userId,
                email: sanitizedEmail,
            });
        } catch (otpError) {
            // If OTP sending fails, clean up the created account
            // Check for specific error types to provide better feedback
            if (otpError.message?.includes('SMTP') || otpError.message?.includes('email')) {
                throw new Error('Email service is temporarily unavailable. Please try again later.');
            }
            if (otpError.code === 501 || otpError.message?.includes('not implemented')) {
                throw new Error('Email verification is not configured. Please contact support.');
            }
            throw new Error('Failed to send verification code. Please try again.');
        }

        // Store pending data for completion after verification
        const pendingData = {
            userId,
            email: sanitizedEmail,
            name: sanitizedName,
            additionalData,
            timestamp: Date.now(),
            expiresAt: Date.now() + VERIFICATION_TIMEOUT,
            otpUserId: tokenResponse?.userId || userId,
            otpFailedAttempts: 0,
            otpLockedUntil: 0,
            otpResendCount: 0,
            lastOtpSentAt: Date.now(),
        };

        await setPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY,
            JSON.stringify(pendingData)
        );

        return {
            userId,
            email: sanitizedEmail,
            name: sanitizedName,
            otpSent: true
        };
    } catch (error) {
        throw error;
    }
};

export const checkAndCompleteVerification = async () => {
    try {
        const storedData = await getPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY
        );

        if (!storedData) {
            throw new Error('No pending verification found');
        }

        const pendingData = JSON.parse(storedData);

        // Check if user document already exists
        try {
            await getUserDocument(pendingData.userId);
            await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);
            return true;
        } catch (error) {
            // User document not found, need to create one
        }

        await createUserDocument(
            pendingData.userId,
            pendingData.name,
            pendingData.email,
            pendingData.additionalData
        );

        await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);

        return true;
    } catch (error) {
        throw error;
    }
};

// Verify OTP code entered by user
export const verifyOTPCode = async (otpCode) => {
    try {
        console.log('[verifyOTPCode] Starting OTP verification');
        const normalizedCode = String(otpCode || '').trim();
        
        if (!/^\d{6}$/.test(normalizedCode)) {
            console.error('[verifyOTPCode] Invalid OTP format');
            throw new Error('Invalid verification code. Please check and try again.');
        }

        console.log('[verifyOTPCode] OTP format is valid');

        console.log('[verifyOTPCode] Retrieving pending verification data...');
        const storedData = await getPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY
        );

        if (!storedData) {
            console.error('[verifyOTPCode] No pending verification data found in storage');
            throw new Error('No pending verification found');
        }

        console.log('[verifyOTPCode] Pending data found, parsing...');
        const pendingData = JSON.parse(storedData);
        const now = Date.now();

        console.log('[verifyOTPCode] Checking data expiration');
        if (pendingData.expiresAt && now > pendingData.expiresAt) {
            console.warn('[verifyOTPCode] Verification code has expired');
            await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);
            throw new Error('Verification code expired. Please sign up again.');
        }

        console.log('[verifyOTPCode] Checking OTP lockout status');
        if (pendingData.otpLockedUntil && now < pendingData.otpLockedUntil) {
            console.warn('[verifyOTPCode] Too many failed attempts, account locked');
            throw new Error('Too many verification attempts. Please wait and try again.');
        }

        console.log('[verifyOTPCode] Attempting to create session with OTP code...');
        // Verify OTP by creating a session with the code
        // The OTP code acts as the "secret" for createSession
        try {
            const otpUserId = pendingData.otpUserId || pendingData.userId;
            if (!otpUserId) {
                throw new Error('No pending verification found');
            }

            // Backfill older pending records created before otpUserId was stored.
            if (!pendingData.otpUserId) {
                pendingData.otpUserId = otpUserId;
                await setPendingState(
                    PENDING_VERIFICATION_KEY,
                    PENDING_VERIFICATION_BACKUP_KEY,
                    JSON.stringify(pendingData)
                );
            }

            await account.createSession({
                userId: otpUserId,
                secret: normalizedCode,
            });
            console.log('[verifyOTPCode] Session created successfully with OTP');
        } catch (sessionError) {
            const isOtpValidationError = sessionError.message?.includes('Invalid')
                || sessionError.message?.includes('expired')
                || sessionError.code === 401;

            if (isOtpValidationError) {
                console.warn('[verifyOTPCode] Session creation rejected OTP:', sessionError.message || sessionError);
                const failedAttempts = (pendingData.otpFailedAttempts || 0) + 1;
                const shouldLock = failedAttempts >= OTP_MAX_FAILED_ATTEMPTS;
                console.log('[verifyOTPCode] Invalid OTP attempt', { failedAttempts, shouldLock });
                
                const updatedPendingData = {
                    ...pendingData,
                    otpFailedAttempts: failedAttempts,
                    otpLockedUntil: shouldLock ? (now + OTP_LOCK_DURATION) : 0,
                };
                await setPendingState(
                    PENDING_VERIFICATION_KEY,
                    PENDING_VERIFICATION_BACKUP_KEY,
                    JSON.stringify(updatedPendingData)
                );
                if (shouldLock) {
                    throw new Error('Too many verification attempts. Please wait and try again.');
                }
            } else {
                console.error('[verifyOTPCode] Session creation failed:', sessionError.message || sessionError);
            }

            if (isOtpValidationError) {
                throw new Error('Invalid or expired verification code. Please try again.');
            }
            throw sessionError;
        }

        // OTP verified successfully, now complete the signup
        console.log('[verifyOTPCode] OTP verified, checking user document...');
        // Check if user document already exists
        try {
            await getUserDocument(pendingData.userId);
            console.log('[verifyOTPCode] User document already exists');
        } catch (error) {
            // User document not found, create one
            console.log('[verifyOTPCode] User document not found, creating new one...');
            await createUserDocument(
                pendingData.userId,
                pendingData.name,
                pendingData.email,
                pendingData.additionalData
            );
            console.log('[verifyOTPCode] User document created successfully');
        }

        // Clean up storage
        console.log('[verifyOTPCode] Cleaning up pending verification data...');
        await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);
        console.log('[verifyOTPCode] Verification complete');

        return true;
    } catch (error) {
        console.error('[verifyOTPCode] Verification error:', error.message || error);
        console.error('[verifyOTPCode] Error stack:', error.stack);
        
        if (error.message?.includes('Invalid token') ||
            error.message?.includes('Invalid credentials') ||
            error.code === 401) {
            throw new Error('Invalid verification code. Please check and try again.');
        }
        throw error;
    }
};

// Resend OTP verification email
export const resendVerificationEmail = async () => {
    try {
        const storedData = await getPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY
        );

        if (!storedData) {
            throw new Error('No pending verification found');
        }

        const pendingData = JSON.parse(storedData);
        const now = Date.now();

        if (pendingData.expiresAt && now > pendingData.expiresAt) {
            await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);
            throw new Error('Verification session expired. Please sign up again.');
        }

        if (pendingData.otpLockedUntil && now < pendingData.otpLockedUntil) {
            throw new Error('Too many verification attempts. Please wait and try again.');
        }

        if (pendingData.lastOtpSentAt && (now - pendingData.lastOtpSentAt) < OTP_RESEND_COOLDOWN) {
            throw new Error('Please wait before requesting another verification code.');
        }

        const resendCount = pendingData.otpResendCount || 0;
        if (resendCount >= OTP_MAX_RESENDS) {
            throw new Error('Too many verification code requests. Please sign up again.');
        }

        // Send new OTP using Email OTP
        const tokenResponse = await account.createEmailToken({
            userId: pendingData.userId,
            email: pendingData.email,
        });

        // Update expiration time and token data
        pendingData.expiresAt = Date.now() + VERIFICATION_TIMEOUT;
        pendingData.otpUserId = tokenResponse?.userId || pendingData.userId;
        pendingData.otpResendCount = resendCount + 1;
        pendingData.lastOtpSentAt = now;
        await setPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY,
            JSON.stringify(pendingData)
        );

        return true;
    } catch (error) {
        throw error;
    }
};

// ==================== GOOGLE OAUTH ====================

// Get the Appwrite project ID for OAuth callback
const getAppwriteProjectId = () => {
    return process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || config.projectId || '';
};

// Helper to get the correct redirect URL for OAuth
// Appwrite expects callbacks in the format: appwrite-callback-[PROJECT_ID]://
const getOAuthRedirectUrl = () => {
    const projectId = getAppwriteProjectId();
    const appwriteCallbackUrl = `appwrite-callback-${projectId}://`;

    // Appwrite validates success/failure URLs against project platforms.
    // During migrations, this can be overridden via env without code changes.
    const overrideRedirectUrl = (process.env.EXPO_PUBLIC_APPWRITE_OAUTH_REDIRECT_URL || '').trim();
    return overrideRedirectUrl || appwriteCallbackUrl;
};

const parseOAuthCallbackParams = (callbackUrl = '') => {
    try {
        const parsedUrl = new URL(callbackUrl);
        const querySecret = parsedUrl.searchParams.get('secret');
        const queryUserId = parsedUrl.searchParams.get('userId');
        const queryError = parsedUrl.searchParams.get('error');

        let hashSecret = null;
        let hashUserId = null;
        let hashError = null;

        if (parsedUrl.hash) {
            const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
            hashSecret = hashParams.get('secret');
            hashUserId = hashParams.get('userId');
            hashError = hashParams.get('error');
        }

        const secret = querySecret || hashSecret;
        const userId = queryUserId || hashUserId;
        const error = queryError || hashError;

        return { secret, userId, error };
    } catch (parseError) {
        return { secret: null, userId: null, error: null };
    }
};

// Start Google OAuth flow using the Token-based approach (recommended for React Native)
export const signInWithGoogle = async () => {
    try {
        const redirectUrl = getOAuthRedirectUrl();
        telemetry.recordEvent('google_auth_start', {
            redirectUrl,
            redirectUrlKind: redirectUrl?.startsWith('appwrite-callback-') ? 'appwrite-callback' : 'app-scheme',
            projectId: getAppwriteProjectId(),
            endpoint: config.endpoint,
        });

        await clearCurrentSessionIfPresent();

        // Use createOAuth2Token for React Native - it returns userId and secret
        // that we use to create a session manually
        const authUrl = account.createOAuth2Token({
            provider: OAuthProvider.Google,
            success: redirectUrl, // success URL
            failure: redirectUrl,  // failure URL (same, we parse the result)
        });

        // Open the browser for OAuth authentication
        const result = await WebBrowser.openAuthSessionAsync(
            authUrl.toString(),
            redirectUrl,
            {
                showInRecents: true,
            }
        );

        telemetry.recordEvent('google_auth_browser_session_result', {
            type: result?.type,
            hasUrl: Boolean(result?.url),
            urlPreview: result?.url ? String(result.url).slice(0, 120) : null,
        });

        if (result.type === 'success' && result.url) {
            const { secret, userId, error } = parseOAuthCallbackParams(result.url);

            telemetry.recordEvent('google_auth_callback_parsed', {
                hasSecret: Boolean(secret),
                hasUserId: Boolean(userId),
                hasError: Boolean(error),
            });

            if (secret && userId) {
                // Create a session using the token
                await createSessionWithRecovery(() => account.createSession({ userId, secret }));
                telemetry.recordEvent('google_auth_session_created', {
                    userId,
                });
                return { success: true };
            }

            // Check for error in URL parameters
            if (error) {
                telemetry.recordEvent('google_auth_provider_error', { error });
                return { success: false, error: error };
            }

            telemetry.recordEvent('google_auth_callback_missing_params', {
                hasSecret: Boolean(secret),
                hasUserId: Boolean(userId),
            });
        }

        if (result.type === 'cancel' || result.type === 'dismiss') {
            telemetry.recordEvent('google_auth_cancelled', {
                type: result.type,
            });
            return { success: false, cancelled: true };
        }

        telemetry.recordEvent('google_auth_unsuccessful', {
            resultType: result?.type || 'unknown',
        });
        return { success: false };
    } catch (error) {
        telemetry.recordEvent('google_auth_threw_error', {
            code: error?.code,
            type: error?.type,
            message: error?.message,
        });
        if (error.code === 401) {
            return { success: false, cancelled: true };
        }
        throw error;
    }
};

// Check if Google OAuth user exists in our database
export const checkOAuthUserExists = async (userId = null) => {
    try {
        const user = await account.get();
        if (!user) {
            return { exists: false, user: null };
        }

        // If userId provided, verify it matches
        if (userId && user.$id !== userId) {
            return { exists: false, user: null };
        }

        // Check if user has a document in our users collection
        try {
            const userDoc = await getUserDocument(user.$id);
            return {
                exists: true,
                user: user,
                userDoc: userDoc,
                isComplete: true
            };
        } catch (docError) {
            const isMissingDocument = docError?.code === 404
                || String(docError?.message || '').toLowerCase().includes('not found')
                || String(docError?.type || '').toLowerCase().includes('document_not_found');

            if (!isMissingDocument) {
                throw docError;
            }

            // User authenticated with Google but doesn't have a user document
            // They need to complete signup
            return {
                exists: false,
                user: user,
                email: user.email,
                name: user.name,
                isComplete: false
            };
        }
    } catch (error) {
        telemetry.recordEvent('google_auth_user_check_failed', {
            message: error?.message || String(error),
            code: error?.code,
            type: error?.type,
        });
        return { exists: false, user: null };
    }
};

// Store OAuth user data for completing signup
export const storePendingOAuthSignup = async (data) => {
    try {
        const pendingData = {
            userId: data.userId,
            email: data.email,
            name: data.name || '',
            timestamp: Date.now(),
            isOAuth: true
        };
        await setPendingState(
            PENDING_OAUTH_KEY,
            PENDING_OAUTH_BACKUP_KEY,
            JSON.stringify(pendingData)
        );
        return true;
    } catch (error) {
        throw error;
    }
};

// Get pending OAuth signup data
export const getPendingOAuthSignup = async () => {
    try {
        const data = await getPendingState(PENDING_OAUTH_KEY, PENDING_OAUTH_BACKUP_KEY);
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
};

// Clear pending OAuth signup data
export const clearPendingOAuthSignup = async () => {
    try {
        await clearPendingState(PENDING_OAUTH_KEY, PENDING_OAUTH_BACKUP_KEY);
    } catch (error) {
        // Ignore errors
    }
};

// Complete OAuth signup - create user document with additional data.
// If the email is non-educational the user becomes a guest instead of being rejected.
export const completeOAuthSignup = async (userId, email, name, additionalData = {}) => {
    try {
        console.log('[completeOAuthSignup] Starting OAuth completion for:', {
            userId,
            email: email?.substring(0, 5) + '***',
            name,
            additionalDataKeys: Object.keys(additionalData),
        });

        // Verify we have an authenticated user
        console.log('[completeOAuthSignup] Verifying authenticated user...');
        const user = await account.get();
        
        console.log('[completeOAuthSignup] Current user retrieved:', {
            retrievedUserId: user?.$id,
            providedUserId: userId,
            userMatch: user?.$id === userId,
        });

        if (!user || user.$id !== userId) {
            console.error('[completeOAuthSignup] User authentication mismatch');
            throw new Error('User authentication mismatch');
        }

        // Non-educational email → guest role (no rejection; no academic fields needed)
        console.log('[completeOAuthSignup] Checking if email is educational:', email);
        const isEdu = isEducationalEmail(email);
        console.log('[completeOAuthSignup] Is educational email:', isEdu);

        const resolvedRole = isEdu
            ? (additionalData.role || 'student')
            : 'guest';

        console.log('[completeOAuthSignup] Resolved role:', resolvedRole);

        const resolvedData = resolvedRole === 'guest'
            ? { ...additionalData, role: 'guest', university: '', college: '', department: '', stage: '' }
            : additionalData;

        console.log('[completeOAuthSignup] Resolved data:', {
            role: resolvedData.role,
            additionalDataKeys: Object.keys(resolvedData),
        });

        // Create user document
        console.log('[completeOAuthSignup] Creating user document...');
        const userDoc = await createUserDocument(
            userId,
            name,
            email,
            resolvedData
        );

        console.log('[completeOAuthSignup] User document created:', {
            docId: userDoc?.$id,
            docEmail: userDoc?.email,
        });

        // Clear pending data
        console.log('[completeOAuthSignup] Clearing pending OAuth data...');
        await clearPendingOAuthSignup();
        console.log('[completeOAuthSignup] Pending data cleared');

        const result = {
            success: true,
            userId: userId,
            email: email,
            name: name,
            role: resolvedRole,
            isGuest: resolvedRole === 'guest',
            userDoc: userDoc
        };

        console.log('[completeOAuthSignup] OAuth completion successful, returning result');
        return result;
    } catch (error) {
        console.error('[completeOAuthSignup] Caught error:', error.message || error);
        console.error('[completeOAuthSignup] Error stack:', error.stack);
        throw error;
    }
};

/**
 * Simplified sign-up for guest users (any email — no edu check).
 * Mirrors initiateSignup but skips the educational email gate.
 */
export const initiateGuestSignup = async (email, password, name, additionalData = {}) => {
    const guestSignupTrace = telemetry.startTrace('auth_guest_signup_initiate', {
        hasEmail: Boolean(email),
        emailDomain: String(email || '').includes('@') ? String(email || '').split('@').pop() : 'unknown',
    });

    try {
        console.log('[initiateGuestSignup] Starting guest signup with:', {
            email: email?.substring(0, 5) + '***',
            name,
            additionalDataKeys: Object.keys(additionalData),
        });

        const sanitizedEmail = sanitizeInput(email).toLowerCase();
        const sanitizedName = sanitizeInput(name);

        console.log('[initiateGuestSignup] Sanitized values:', {
            email: sanitizedEmail?.substring(0, 5) + '***',
            name: sanitizedName,
        });

        if (!sanitizedEmail || !sanitizedName) {
            console.error('[initiateGuestSignup] Invalid input data after sanitization');
            throw new Error('Invalid input data');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            console.error('[initiateGuestSignup] Invalid email format:', sanitizedEmail);
            throw new Error('Invalid email format');
        }

        // Explicitly reject edu emails here — they should use the student flow
        if (isEducationalEmail(sanitizedEmail)) {
            console.error('[initiateGuestSignup] Educational email provided, rejecting:', sanitizedEmail);
            throw new Error('Educational email addresses should use the student sign-up flow.');
        }

        console.log('[initiateGuestSignup] Email validation passed');

        if (password.length < 8) {
            console.error('[initiateGuestSignup] Password too short:', password.length);
            throw new Error('Password must be at least 8 characters');
        }

        console.log('[initiateGuestSignup] Password validation passed');

        const userId = ID.unique();
        console.log('[initiateGuestSignup] Generated userId:', userId);

        try {
            console.log('[initiateGuestSignup] Creating account with Appwrite...');
            await account.create({
                userId,
                email: sanitizedEmail,
                password,
                name: sanitizedName,
            });
            console.log('[initiateGuestSignup] Account created successfully');
        } catch (createError) {
            console.error('[initiateGuestSignup] Account creation failed:', createError.message || createError);
            if (createError.message?.includes('already exists') ||
                createError.message?.includes('user with the same email')) {
                throw new Error('An account with this email already exists. Please sign in or use a different email.');
            }
            throw createError;
        }

        let tokenResponse;
        try {
            console.log('[initiateGuestSignup] Creating email verification token...');
            tokenResponse = await account.createEmailToken({
                userId,
                email: sanitizedEmail,
            });
            console.log('[initiateGuestSignup] Email token created successfully');
        } catch (otpError) {
            console.error('[initiateGuestSignup] Email token creation failed:', otpError.message || otpError);
            if (otpError.message?.includes('SMTP') || otpError.message?.includes('email')) {
                throw new Error('Email service is temporarily unavailable. Please try again later.');
            }
            throw new Error('Failed to send verification code. Please try again.');
        }

        // Store pending data (same format as initiateSignup so VerifyEmail works unchanged)
        const pendingData = {
            userId,
            email: sanitizedEmail,
            name: sanitizedName,
            additionalData: { ...additionalData, role: 'guest' },
            timestamp: Date.now(),
            expiresAt: Date.now() + VERIFICATION_TIMEOUT,
            otpUserId: tokenResponse?.userId || userId,
            otpFailedAttempts: 0,
            otpLockedUntil: 0,
            otpResendCount: 0,
            lastOtpSentAt: Date.now(),
            tokenId: tokenResponse?.$id || null,
        };

        console.log('[initiateGuestSignup] Storing pending data:', {
            userId,
            email: sanitizedEmail?.substring(0, 5) + '***' || '***',
            additionalData: pendingData.additionalData,
        });

        await setPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY,
            JSON.stringify(pendingData)
        );
        console.log('[initiateGuestSignup] Pending data stored successfully');

        const result = {
            success: true,
            userId,
            email: sanitizedEmail,
            name: sanitizedName,
            requiresVerification: true,
        };

        console.log('[initiateGuestSignup] Returning success result');
        guestSignupTrace.finish({
            success: true,
            meta: {
                userId,
                requiresVerification: true,
            },
        });
        return result;
    } catch (error) {
        guestSignupTrace.finish({ success: false, error });
        console.error('[initiateGuestSignup] Caught error:', error.message || error);
        console.error('[initiateGuestSignup] Error stack:', error.stack);
        throw error;
    }
};

export const cancelPendingVerification = async () => {
    try {
        try {
            // Delete the current session
            await account.deleteSession({ sessionId: 'current' });
        } catch (sessionError) {
            // Session might already be deleted
        }

        // Remove pending verification data
        await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);

        return true;
    } catch (error) {
        // Even if there's an error, try to clean up storage
        await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);
        throw error;
    }
};

export const checkExpiredVerification = async () => {
    try {
        const storedData = await getPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY
        );

        if (!storedData) {
            return { expired: false, hasPending: false };
        }

        const pendingData = JSON.parse(storedData);
        const now = Date.now();

        if (pendingData.expiresAt && now > pendingData.expiresAt) {
            // Verification expired, cleanup
            try {
                await account.deleteSession({ sessionId: 'current' });
            } catch (sessionError) {
                // Session might already be deleted
            }

            await clearPendingState(PENDING_VERIFICATION_KEY, PENDING_VERIFICATION_BACKUP_KEY);

            return { expired: true, hasPending: false };
        }

        return {
            expired: false,
            hasPending: true,
            email: pendingData.email,
            expiresAt: pendingData.expiresAt,
            timeRemaining: pendingData.expiresAt - now
        };
    } catch (error) {
        return { expired: false, hasPending: false };
    }
};

export const getPendingVerificationData = async () => {
    try {
        const storedData = await getPendingState(
            PENDING_VERIFICATION_KEY,
            PENDING_VERIFICATION_BACKUP_KEY
        );

        if (!storedData) {
            return null;
        }

        return JSON.parse(storedData);
    } catch (error) {
        return null;
    }
};

export const signUp = async (email, password, name, additionalData = {}) => {
    let userId = null;
    let userCreated = false;

    try {
        const sanitizedEmail = sanitizeInput(email).toLowerCase();
        const sanitizedName = sanitizeInput(name);

        if (!sanitizedEmail || !sanitizedName) {
            throw new Error('Invalid input data');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            throw new Error('Invalid email format');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        userId = ID.unique();

        const user = await account.create({
            userId,
            email: sanitizedEmail,
            password,
            name: sanitizedName,
        });
        userCreated = true;

        await signIn(sanitizedEmail, password);

        await createUserDocument(userId, name, email, additionalData);

        return user;
    } catch (error) {

        if (userCreated && userId) {
            try {
                await account.deleteSession({ sessionId: 'current' });
            } catch (sessionError) {
            }

            try {
                await databases.deleteDocument({
                    databaseId: config.databaseId,
                    collectionId: config.usersCollectionId || '68fc7b42001bf7efbba3',
                    documentId: userId,
                });
            } catch (cleanupError) {
            }
        }

        throw error;
    }
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>"']/g, '');
};

const isSessionConflictError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    const type = String(error?.type || '').toLowerCase();

    return message.includes('session is active')
        || message.includes('user already has an active session')
        || message.includes('too many sessions')
        || message.includes('maximum allowed sessions')
        || type.includes('user_session_already_exists')
        || type.includes('user_session_limit_exceeded');
};

const clearCurrentSessionIfPresent = async () => {
    try {
        await account.deleteSession({ sessionId: 'current' });
        return true;
    } catch (error) {
        return false;
    }
};

const createSessionWithRecovery = async (sessionFactory) => {
    try {
        return await sessionFactory();
    } catch (error) {
        if (!isSessionConflictError(error)) {
            throw error;
        }

        await clearCurrentSessionIfPresent();
        return sessionFactory();
    }
};

const normalizeUserYear = ({ rawYear, isGuestRole = false }) => {
    if (isGuestRole) {
        // The users schema enforces year >= 1. Guest users still need a valid value.
        return 1;
    }

    const parsedYear = Number.parseInt(rawYear, 10);
    if (!Number.isFinite(parsedYear)) {
        return 1;
    }

    return Math.min(6, Math.max(1, parsedYear));
};

const createUserDocument = async (userId, name, email, additionalData = {}) => {
    try {
        const sanitizedName = sanitizeInput(name);
        const sanitizedEmail = sanitizeInput(email);
        // Accept 'guest' as a valid role; default to 'student' for everything else
        const rawRole = String(additionalData.role || 'student').trim().toLowerCase();
        const sanitizedRole = ['guest', 'student', 'teacher'].includes(rawRole) ? rawRole : 'student';
        const isGuestRole = sanitizedRole === 'guest';
        const hasAcademicEmail = isEducationalEmail(sanitizedEmail);
        const canPersistAcademicDetails = hasAcademicEmail && !isGuestRole;

        if (!sanitizedName || !sanitizedEmail) {
            throw new Error('Invalid user data');
        }

        const normalizedYear = normalizeUserYear({
            rawYear: canPersistAcademicDetails ? additionalData.stage : null,
            isGuestRole,
        });

        telemetry.recordEvent('auth_user_document_prepare', {
            role: sanitizedRole,
            isGuestRole,
            hasAcademicEmail,
            year: normalizedYear,
        });

        const basePayload = {
            userId: userId,
            name: sanitizedName,
            email: sanitizedEmail,
            bio: '',
            profilePicture: sanitizeInput(additionalData.profilePicture || ''),
            isEmailVerified: true,
            // Non-academic emails cannot persist academic details.
            university: canPersistAcademicDetails ? sanitizeInput(additionalData.university || '') : '',
            major: canPersistAcademicDetails ? sanitizeInput(additionalData.college || '') : '',
            department: canPersistAcademicDetails ? sanitizeInput(additionalData.department || '') : '',
            year: normalizedYear,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
        };

        const payloadWithRole = {
            ...basePayload,
            role: sanitizedRole,
        };

        let userDoc;
        try {
            userDoc = await databases.createDocument({
                databaseId: config.databaseId,
                collectionId: config.usersCollectionId || '68fc7b42001bf7efbba3',
                documentId: userId,
                data: payloadWithRole,
                permissions: [
                    Permission.read(Role.users()),
                    Permission.update(Role.users()),
                    Permission.delete(Role.user(userId)),
                ],
            });
        } catch (createError) {
            if (createError?.message?.includes('Unknown attribute') && createError?.message?.includes('role')) {
                userDoc = await databases.createDocument({
                    databaseId: config.databaseId,
                    collectionId: config.usersCollectionId || '68fc7b42001bf7efbba3',
                    documentId: userId,
                    data: basePayload,
                    permissions: [
                        Permission.read(Role.users()),
                        Permission.update(Role.users()),
                        Permission.delete(Role.user(userId)),
                    ],
                });
            } else {
                throw createError;
            }
        }

        return userDoc;
    } catch (error) {
        throw error;
    }
};

export const signIn = async (email, password) => {
    try {
        const sanitizedEmail = sanitizeInput(email).toLowerCase();

        if (!sanitizedEmail || !password) {
            throw new Error('Email and password are required');
        }

        const session = await createSessionWithRecovery(() => account.createEmailPasswordSession({
            email: sanitizedEmail,
            password,
        }));
        return session;
    } catch (error) {
        throw error;
    }
};

export const signOut = async () => {
    try {
        await account.deleteSession({ sessionId: 'current' });
    } catch (error) {
        throw error;
    }
};

export const getCurrentUser = async () => {
    try {
        const user = await account.get();
        return user;
    } catch (error) {
        if (error.message?.includes('missing scopes') || error.code === 401) {
            return null;
        }
        return null;
    }
};

export const getCompleteUserData = async () => {
    try {
        const authUser = await account.get();
        if (!authUser) return null;

        const userDoc = await getUserDocument(authUser.$id);

        return {
            ...authUser,
            ...userDoc
        };
    } catch (error) {
        if (error.message?.includes('missing scopes') || error.code === 401) {
            return null;
        }
        return null;
    }
};

export const getUserDocument = async (userId, skipCache = false) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        // Check cache first (unless explicitly skipped)
        if (!skipCache) {
            const cachedUser = await userCacheManager.getCachedUserData(userId);
            if (cachedUser) {
                return cachedUser;
            }
        }

        const userDoc = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.usersCollectionId || '68fc7b42001bf7efbba3',
            documentId: userId,
        });

        // Cache the user data for future requests
        await userCacheManager.cacheUserData(userId, userDoc);

        return userDoc;
    } catch (error) {
        throw error;
    }
};

export const updateUserDocument = async (userId, data) => {
    try {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID');
        }

        const nextData = { ...data };

        if (nextData.name) {
            nextData.name = sanitizeInput(nextData.name);
        }
        if (nextData.bio) {
            nextData.bio = sanitizeInput(nextData.bio);
        }
        if (nextData.pronouns) {
            nextData.pronouns = sanitizeInput(nextData.pronouns);
        }
        if (Object.prototype.hasOwnProperty.call(nextData, 'university')) {
            nextData.university = sanitizeInput(nextData.university || '');
        }
        if (Object.prototype.hasOwnProperty.call(nextData, 'major')) {
            nextData.major = sanitizeInput(nextData.major || '');
        }
        if (Object.prototype.hasOwnProperty.call(nextData, 'department')) {
            nextData.department = sanitizeInput(nextData.department || '');
        }

        const currentUserDoc = await databases.getDocument({
            databaseId: config.databaseId,
            collectionId: config.usersCollectionId || '68fc7b42001bf7efbba3',
            documentId: userId,
        });

        const effectiveEmail = sanitizeInput(nextData.email || currentUserDoc?.email || '');
        const canPersistAcademicDetails = isEducationalEmail(effectiveEmail);

        if (!canPersistAcademicDetails) {
            nextData.university = '';
            nextData.major = '';
            nextData.department = '';

            if (Object.prototype.hasOwnProperty.call(nextData, 'year')) {
                delete nextData.year;
            }
        }

        const userDoc = await databases.updateDocument({
            databaseId: config.databaseId,
            collectionId: config.usersCollectionId || '68fc7b42001bf7efbba3',
            documentId: userId,
            data: nextData,
        });

        // Invalidate user cache
        await userCacheManager.invalidateUser(userId);

        return userDoc;
    } catch (error) {
        throw error;
    }
};

export const updateUserName = async (name) => {
    try {
        const user = await account.updateName({ name });
        return user;
    } catch (error) {
        throw error;
    }
};

export const updateUserPassword = async (newPassword, oldPassword) => {
    try {
        const user = await account.updatePassword({
            password: newPassword,
            oldPassword,
        });
        return user;
    } catch (error) {
        throw error;
    }
};

export const sendEmailVerification = async () => {
    try {
        const verification = await account.createVerification({
            url: `${config.endpoint}/verify`,
        });
        return verification;
    } catch (error) {
        throw error;
    }
};

export const confirmEmailVerification = async (userId, secret) => {
    try {
        await account.updateVerification({ userId, secret });

        const user = await getCurrentUser();
        if (user) {
            await updateUserDocument(user.$id, { isEmailVerified: true });
        }

        return true;
    } catch (error) {
        throw error;
    }
};

export const checkEmailVerification = async () => {
    try {
        const user = await account.get();
        return user.emailVerification;
    } catch (error) {
        return false;
    }
};

export const resendEmailVerification = async () => {
    try {
        const verification = await account.createVerification({
            url: `${config.endpoint}/verify`,
        });
        return verification;
    } catch (error) {
        throw error;
    }
};

const createDeleteAccountClientError = (code, extra = {}) => {
    const error = new Error(code);
    error.code = code;
    Object.assign(error, extra);
    return error;
};

const isDeleteAccountRateLimitError = (error) => {
    const code = Number(error?.code ?? error?.response?.code ?? 0);
    const type = String(error?.type ?? error?.response?.type ?? '').toLowerCase();
    const message = `${String(error?.message ?? '')} ${String(error?.response?.message ?? '')}`.toLowerCase();

    return code === 429 || type.includes('rate_limit') || message.includes('rate limit');
};

const isUnauthorizedSessionError = (error) => {
    const code = Number(error?.code ?? error?.response?.code ?? 0);
    const type = String(error?.type ?? error?.response?.type ?? '').toLowerCase();
    const message = `${String(error?.message ?? '')} ${String(error?.response?.message ?? '')}`.toLowerCase();
    return code === 401 || type.includes('unauthorized') || message.includes('unauthorized') || message.includes('missing scopes');
};

const extractDeleteProxyResponse = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const withTimeout = async (promise, timeoutMs, timeoutCode) => {
    let timeoutHandle = null;

    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(createDeleteAccountClientError(timeoutCode));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 20000, timeoutCode = 'DELETE_ACCOUNT_NETWORK_TIMEOUT') => {
    return withTimeout(fetch(url, options), timeoutMs, timeoutCode);
};

export const deleteAccount = async (password) => {
    try {
        const currentUser = await withTimeout(
            getCurrentUser(),
            10000,
            'DELETE_ACCOUNT_GET_CURRENT_USER_TIMEOUT'
        );
        if (!currentUser) {
            throw createDeleteAccountClientError('DELETE_ACCOUNT_UNAUTHORIZED');
        }

        const providedPassword = typeof password === 'string' ? password : '';
        if (!providedPassword) {
            throw createDeleteAccountClientError('DELETE_ACCOUNT_PASSWORD_REQUIRED');
        }

        const currentEmail = sanitizeInput(currentUser.email || '');
        if (!currentEmail) {
            throw createDeleteAccountClientError('DELETE_ACCOUNT_EMAIL_REQUIRED');
        }

        const reauthEmailCandidates = [currentEmail];

        let reauthSucceeded = false;
        let reauthFailure = null;
        try {
            for (const emailCandidate of reauthEmailCandidates) {
                try {
                    await withTimeout(
                        account.createEmailPasswordSession({
                            email: emailCandidate,
                            password: providedPassword,
                        }),
                        20000,
                        'DELETE_ACCOUNT_REAUTH_TIMEOUT'
                    );

                    reauthSucceeded = true;
                    break;
                } catch (reauthError) {
                    reauthFailure = reauthError;
                }
            }

            if (!reauthSucceeded && reauthFailure) {
                throw reauthFailure;
            }
        } catch (reauthError) {
            const message = String(reauthError?.message || '').toLowerCase();
            const responseMessage = String(reauthError?.response?.message || '').toLowerCase();
            const responseType = String(reauthError?.response?.type || reauthError?.type || '').toLowerCase();
            const combined = `${message} ${responseMessage} ${responseType}`;
            const invalidCredentials = combined.includes('invalid credentials')
                || combined.includes('invalid email')
                || combined.includes('invalid password')
                || combined.includes('user_invalid_credentials');

            if (invalidCredentials) {
                throw createDeleteAccountClientError('DELETE_ACCOUNT_INVALID_PASSWORD', {
                    originalError: reauthError,
                });
            }

            if (isDeleteAccountRateLimitError(reauthError)) {
                // Reauth endpoint is rate-limited by Appwrite; continue with current
                // authenticated session JWT instead of blocking account deletion.
                reauthSucceeded = true;
            }

            // If the credentials are valid but session-creation fails for another reason,
            // continue using the current authenticated session JWT.
        }

        const endpoint = sanitizeInput(config.deleteAccountEndpoint || '');
        if (!endpoint) {
            throw createDeleteAccountClientError('DELETE_ACCOUNT_ENDPOINT_NOT_CONFIGURED');
        }

        const jwt = await withTimeout(
            account.createJWT(),
            20000,
            'DELETE_ACCOUNT_AUTH_TOKEN_TIMEOUT'
        );
        const token = jwt?.jwt;
        if (!token) {
            throw createDeleteAccountClientError('DELETE_ACCOUNT_AUTH_TOKEN_MISSING');
        }

        const payload = {
            action: 'delete_account',
            requestedAt: new Date().toISOString(),
            authToken: token,
        };

        const isExecutionEndpoint = endpoint.includes('/functions/') && endpoint.includes('/executions');

        if (isExecutionEndpoint) {
            const executionResponse = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Appwrite-Project': config.projectId,
                },
                body: JSON.stringify({
                    async: true,
                    method: 'POST',
                    path: '/',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }),
            }, 20000, 'DELETE_ACCOUNT_PROXY_EXECUTION_CREATE_TIMEOUT');

            const createdExecution = await extractDeleteProxyResponse(executionResponse);
            const executionId = String(createdExecution?.$id || '');
            if (!executionResponse.ok || !executionId) {
                throw createDeleteAccountClientError('DELETE_ACCOUNT_PROXY_EXECUTION_CREATE_FAILED');
            }

            const executionBaseEndpoint = endpoint.replace(/\/executions\/?$/, '');
            let execution = createdExecution;
            let reachedTerminal = false;
            let pollWithAuth = true;

            for (let attempt = 0; attempt < 45; attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, 2000));

                const pollHeaders = {
                    'X-Appwrite-Project': config.projectId,
                    ...(pollWithAuth ? { Authorization: `Bearer ${token}` } : {}),
                };

                const pollResponse = await fetchWithTimeout(`${executionBaseEndpoint}/${encodeURIComponent(executionId)}`, {
                    method: 'GET',
                    headers: pollHeaders,
                }, 15000, 'DELETE_ACCOUNT_PROXY_EXECUTION_POLL_TIMEOUT');

                if ((pollResponse.status === 401 || pollResponse.status === 403) && pollWithAuth) {
                    pollWithAuth = false;
                    continue;
                }

                const pollExecution = await extractDeleteProxyResponse(pollResponse);
                if (pollResponse.ok && pollExecution) {
                    execution = pollExecution;
                }

                const status = String(execution?.status || '').toLowerCase();
                if (status === 'completed' || status === 'failed' || status === 'crashed' || status === 'timeout' || status === 'cancelled') {
                    reachedTerminal = true;
                    break;
                }
            }

            const status = String(execution?.status || '').toLowerCase();
            if (!reachedTerminal) {
                try {
                    await withTimeout(
                        account.get(),
                        5000,
                        'DELETE_ACCOUNT_POST_TIMEOUT_ACCOUNT_CHECK_TIMEOUT'
                    );
                } catch (postTimeoutCheckError) {
                    if (isUnauthorizedSessionError(postTimeoutCheckError)) {
                        return { success: true, accepted: true, reason: 'session_gone_after_timeout' };
                    }
                }

                throw createDeleteAccountClientError('DELETE_ACCOUNT_PROXY_TIMEOUT');
            }

            if (status !== 'completed') {
                throw createDeleteAccountClientError('DELETE_ACCOUNT_PROXY_TIMEOUT');
            }

            const executionStatus = Number(execution?.responseStatusCode || 0);

            let body = null;
            try {
                body = execution?.responseBody ? JSON.parse(execution.responseBody) : null;
            } catch {
                body = null;
            }

            if (!executionResponse.ok || executionStatus >= 400 || body?.success === false) {
                throw createDeleteAccountClientError(
                    String(body?.errorCode || body?.error || 'DELETE_ACCOUNT_PROXY_FAILED')
                );
            }
        } else {
            const response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            }, 20000, 'DELETE_ACCOUNT_PROXY_REQUEST_TIMEOUT');

            const data = await extractDeleteProxyResponse(response);
            if (!response.ok || data?.success === false) {
                throw createDeleteAccountClientError(
                    String(data?.errorCode || data?.error || 'DELETE_ACCOUNT_PROXY_FAILED')
                );
            }
        }

        try {
            await withTimeout(
                account.deleteSession({ sessionId: 'current' }),
                5000,
                'DELETE_ACCOUNT_DELETE_SESSION_TIMEOUT'
            );
        } catch {
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
};

// ==================== PASSWORD RESET ====================

// Get the recovery redirect URL for the app
const getRecoveryRedirectUrl = () => {
    const configuredUrl = process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_REDIRECT_URL;
    const fallbackUrl = 'https://collegecommunity.app/reset-password';
    const rawUrl = (configuredUrl || fallbackUrl || '').trim();

    console.log('[reset-password][getRecoveryRedirectUrl] inputs', {
        configuredUrl,
        fallbackUrl,
        rawUrl,
    });

    if (!rawUrl) {
        const defaultUrl = 'https://collegecommunity.app/reset-password';
        console.log('[reset-password][getRecoveryRedirectUrl] return (empty rawUrl)', defaultUrl);
        return defaultUrl;
    }

    if (/^https?:\/\//i.test(rawUrl)) {
        console.log('[reset-password][getRecoveryRedirectUrl] return (already absolute)', rawUrl);
        return rawUrl;
    }

    const normalizedUrl = `https://${rawUrl.replace(/^\/+/, '')}`;
    console.log('[reset-password][getRecoveryRedirectUrl] return (normalized)', normalizedUrl);
    return normalizedUrl;
};

// Send password reset email using Appwrite Recovery
export const sendPasswordResetOTP = async (email) => {
    try {
        const sanitizedEmail = sanitizeInput(email).toLowerCase();

        console.log('[reset-password][sendPasswordResetOTP] called', {
            providedEmail: email,
            sanitizedEmail,
        });

        if (!sanitizedEmail) {
            throw new Error('Invalid email');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            throw new Error('Invalid email format');
        }

        // Use Appwrite's Recovery feature - do not expose whether an account exists
        const redirectUrl = getRecoveryRedirectUrl();
        const now = Date.now();

        console.log('[reset-password][sendPasswordResetOTP] redirect URL resolved', {
            redirectUrl,
            hasCustomRecoveryUrl: Boolean(process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_REDIRECT_URL),
        });

        try {
            const existing = await safeStorage.getItem(PENDING_PASSWORD_RESET_KEY);
            if (existing) {
                const pendingResetData = JSON.parse(existing);
                if (pendingResetData?.email === sanitizedEmail) {
                    const firstRequestedAt = Number(pendingResetData.firstRequestedAt || pendingResetData.timestamp || now);
                    const lastRequestedAt = Number(pendingResetData.lastRequestedAt || pendingResetData.timestamp || 0);
                    const requestCount = Number(pendingResetData.requestCount || 0);

                    if (now - lastRequestedAt < RESET_REQUEST_COOLDOWN) {
                        throw new Error('Please wait before requesting another password reset email.');
                    }

                    if ((now - firstRequestedAt) < RESET_REQUEST_WINDOW && requestCount >= RESET_MAX_REQUESTS) {
                        throw new Error('Too many password reset requests. Please try again later.');
                    }
                }
            }
        } catch (throttleError) {
            if (throttleError.message?.includes('Please wait') || throttleError.message?.includes('Too many password reset requests')) {
                throw throttleError;
            }
        }

        const saveResetAttempt = async () => {
            const existing = await safeStorage.getItem(PENDING_PASSWORD_RESET_KEY);
            let firstRequestedAt = now;
            let requestCount = 1;

            if (existing) {
                try {
                    const parsed = JSON.parse(existing);
                    if (parsed?.email === sanitizedEmail && (now - Number(parsed.firstRequestedAt || parsed.timestamp || now)) < RESET_REQUEST_WINDOW) {
                        firstRequestedAt = Number(parsed.firstRequestedAt || parsed.timestamp || now);
                        requestCount = Number(parsed.requestCount || 0) + 1;
                    }
                } catch {
                }
            }

            await safeStorage.setItem(PENDING_PASSWORD_RESET_KEY, JSON.stringify({
                email: sanitizedEmail,
                timestamp: now,
                expiresAt: now + PASSWORD_RESET_TIMEOUT,
                firstRequestedAt,
                lastRequestedAt: now,
                requestCount,
            }));
        };

        try {
            console.log('[reset-password][sendPasswordResetOTP] createRecovery request', {
                email: sanitizedEmail,
                redirectUrl,
            });
            const recoveryResult = await account.createRecovery({
                email: sanitizedEmail,
                url: redirectUrl,
            });
            console.log('[reset-password][sendPasswordResetOTP] createRecovery success', recoveryResult);

            await saveResetAttempt();

            const result = {
                success: true,
                email: sanitizedEmail,
                useDeepLink: true,
            };
            console.log('[reset-password][sendPasswordResetOTP] return', result);
            return result;
        } catch (recoveryError) {
            console.log('[reset-password][sendPasswordResetOTP] createRecovery error', {
                code: recoveryError?.code,
                type: recoveryError?.type,
                message: recoveryError?.message,
                response: recoveryError?.response,
                redirectUrl,
            });
            // Prevent account enumeration: treat unknown accounts as success.
            if (recoveryError.code === 404 || recoveryError.message?.includes('User not found')) {
                await saveResetAttempt();
                const result = {
                    success: true,
                    email: sanitizedEmail,
                    useDeepLink: true,
                };
                console.log('[reset-password][sendPasswordResetOTP] return (masked not found)', result);
                return result;
            }

            // Throw a more descriptive error
            if (recoveryError.code === 501 || recoveryError.message?.includes('SMTP') || recoveryError.message?.includes('mail')) {
                throw new Error('SMTP_NOT_CONFIGURED');
            }
            if (recoveryError.message?.includes('URL')) {
                throw new Error('REDIRECT_URL_NOT_ALLOWED');
            }
            throw new Error(recoveryError.message || 'Unknown error occurred');
        }
    } catch (error) {
        throw error;
    }
};

// Complete password reset using recovery token from deep link
export const completePasswordReset = async (userId, secret, newPassword) => {
    try {
        console.log('[reset-password][completePasswordReset] called', {
            userId,
            hasSecret: Boolean(secret),
            passwordLength: newPassword?.length,
        });

        if (!userId || !secret) {
            throw new Error('Invalid recovery link. Please request a new password reset.');
        }

        if (!newPassword || newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        // Use Appwrite's updateRecovery to set the new password
        console.log('[reset-password][completePasswordReset] updateRecovery request', {
            userId,
            hasSecret: Boolean(secret),
        });
        const updateRecoveryResult = await account.updateRecovery({
            userId,
            secret,
            password: newPassword,
        });
        console.log('[reset-password][completePasswordReset] updateRecovery success', updateRecoveryResult);

        // Clean up stored data
        await safeStorage.removeItem(PENDING_PASSWORD_RESET_KEY);

        const result = {
            success: true,
        };
        console.log('[reset-password][completePasswordReset] return', result);
        return result;
    } catch (error) {
        console.log('[reset-password][completePasswordReset] error', {
            code: error?.code,
            type: error?.type,
            message: error?.message,
            response: error?.response,
        });
        if (error.message?.includes('expired') || error.code === 401) {
            throw new Error('Recovery link has expired. Please request a new password reset.');
        }
        if (error.message?.includes('Invalid')) {
            throw new Error('Invalid recovery link. Please request a new password reset.');
        }

        throw error;
    }
};

// Resend password reset email
export const resendPasswordResetOTP = async (email) => {
    try {
        return await sendPasswordResetOTP(email);
    } catch (error) {
        throw error;
    }
};

// Clear pending password reset data
export const clearPendingPasswordReset = async () => {
    try {
        await safeStorage.removeItem(PENDING_PASSWORD_RESET_KEY);
    } catch (error) {
        // Ignore errors
    }
};
