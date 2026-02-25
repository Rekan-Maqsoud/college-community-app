import { account, databases, config } from './config';
import { ID, Permission, Role, Query, OAuthProvider } from 'appwrite';
import safeStorage from '../app/utils/safeStorage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { userCacheManager } from '../app/utils/cacheManager';

// Ensure WebBrowser redirects work properly
WebBrowser.maybeCompleteAuthSession();

const PENDING_VERIFICATION_KEY = 'pending_verification';
const PENDING_OAUTH_KEY = 'pending_oauth_signup';
const PENDING_PASSWORD_RESET_KEY = 'pending_password_reset';
const VERIFICATION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const PASSWORD_RESET_TIMEOUT = 15 * 60 * 1000; // 15 minutes for password reset
const OTP_MAX_FAILED_ATTEMPTS = 5;
const OTP_LOCK_DURATION = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN = 60 * 1000; // 60 seconds
const OTP_MAX_RESENDS = 5;
const RESET_REQUEST_WINDOW = 15 * 60 * 1000; // 15 minutes
const RESET_MAX_REQUESTS = 5;
const RESET_REQUEST_COOLDOWN = 60 * 1000; // 60 seconds

// List of blocked public email domains
const BLOCKED_EMAIL_DOMAINS = [
    'gmail.com',
    'googlemail.com',
    'hotmail.com',
    'hotmail.co.uk',
    'outlook.com',
    'outlook.co.uk',
    'live.com',
    'msn.com',
    'yahoo.com',
    'yahoo.co.uk',
    'yahoo.fr',
    'ymail.com',
    'aol.com',
    'protonmail.com',
    'proton.me',
    'icloud.com',
    'me.com',
    'mac.com',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'gmx.com',
    'gmx.net',
    'tutanota.com',
    'fastmail.com',
    'inbox.com',
    'mail.ru',
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'rediffmail.com',
    'web.de',
    'libero.it',
    'virgilio.it',
    'laposte.net',
    'orange.fr',
    'wanadoo.fr',
    'free.fr',
    't-online.de',
    'arcor.de',
    'rambler.ru',
    'ukr.net',
];

// Generate a 6-digit verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if email is from an educational institution
export const isEducationalEmail = (email) => {
    if (!email) return false;
    const domain = email.toLowerCase().split('@')[1];
    if (!domain) return false;

    // Check if it's a blocked public email domain
    if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
        return false;
    }

    // If not a public email domain, allow it
    // This allows educational domains like epu.edu.iq, university.edu, etc.
    return true;
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
            await account.create(
                userId,
                sanitizedEmail,
                password,
                sanitizedName
            );
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
            tokenResponse = await account.createEmailToken(userId, sanitizedEmail);
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
            otpUserId: tokenResponse.userId,
            otpFailedAttempts: 0,
            otpLockedUntil: 0,
            otpResendCount: 0,
            lastOtpSentAt: Date.now(),
        };

        await safeStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(pendingData));

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
        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);

        if (!storedData) {
            throw new Error('No pending verification found');
        }

        const pendingData = JSON.parse(storedData);

        // Check if user document already exists
        try {
            await getUserDocument(pendingData.userId);
            await safeStorage.removeItem(PENDING_VERIFICATION_KEY);
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

        await safeStorage.removeItem(PENDING_VERIFICATION_KEY);

        return true;
    } catch (error) {
        throw error;
    }
};

// Verify OTP code entered by user
export const verifyOTPCode = async (otpCode) => {
    try {
        const normalizedCode = String(otpCode || '').trim();
        if (!/^\d{6}$/.test(normalizedCode)) {
            throw new Error('Invalid verification code. Please check and try again.');
        }

        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);

        if (!storedData) {
            throw new Error('No pending verification found');
        }

        const pendingData = JSON.parse(storedData);
        const now = Date.now();

        if (pendingData.expiresAt && now > pendingData.expiresAt) {
            await safeStorage.removeItem(PENDING_VERIFICATION_KEY);
            throw new Error('Verification code expired. Please sign up again.');
        }

        if (pendingData.otpLockedUntil && now < pendingData.otpLockedUntil) {
            throw new Error('Too many verification attempts. Please wait and try again.');
        }

        // Verify OTP by creating a session with the code
        // The OTP code acts as the "secret" for createSession
        try {
            await account.createSession(pendingData.otpUserId, normalizedCode);
        } catch (sessionError) {
            if (sessionError.message?.includes('Invalid') ||
                sessionError.message?.includes('expired') ||
                sessionError.code === 401) {
                const failedAttempts = (pendingData.otpFailedAttempts || 0) + 1;
                const shouldLock = failedAttempts >= OTP_MAX_FAILED_ATTEMPTS;
                const updatedPendingData = {
                    ...pendingData,
                    otpFailedAttempts: failedAttempts,
                    otpLockedUntil: shouldLock ? (now + OTP_LOCK_DURATION) : 0,
                };
                await safeStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(updatedPendingData));
                if (shouldLock) {
                    throw new Error('Too many verification attempts. Please wait and try again.');
                }
            }

            if (sessionError.message?.includes('Invalid') ||
                sessionError.message?.includes('expired') ||
                sessionError.code === 401) {
                throw new Error('Invalid or expired verification code. Please try again.');
            }
            throw sessionError;
        }

        // OTP verified successfully, now complete the signup
        // Check if user document already exists
        try {
            await getUserDocument(pendingData.userId);
        } catch (error) {
            // User document not found, create one
            await createUserDocument(
                pendingData.userId,
                pendingData.name,
                pendingData.email,
                pendingData.additionalData
            );
        }

        // Clean up storage
        await safeStorage.removeItem(PENDING_VERIFICATION_KEY);

        return true;
    } catch (error) {
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
        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);

        if (!storedData) {
            throw new Error('No pending verification found');
        }

        const pendingData = JSON.parse(storedData);
        const now = Date.now();

        if (pendingData.expiresAt && now > pendingData.expiresAt) {
            await safeStorage.removeItem(PENDING_VERIFICATION_KEY);
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
        const tokenResponse = await account.createEmailToken(pendingData.userId, pendingData.email);

        // Update expiration time and token data
        pendingData.expiresAt = Date.now() + VERIFICATION_TIMEOUT;
        pendingData.otpUserId = tokenResponse.userId;
        pendingData.otpResendCount = resendCount + 1;
        pendingData.lastOtpSentAt = now;
        await safeStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(pendingData));

        return true;
    } catch (error) {
        throw error;
    }
};

// ==================== GOOGLE OAUTH ====================

// Get the Appwrite project ID for OAuth callback
const getAppwriteProjectId = () => {
    return process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '';
};

// Helper to get the correct redirect URL for OAuth
// Appwrite expects callbacks in the format: appwrite-callback-[PROJECT_ID]://
const getOAuthRedirectUrl = () => {
    const projectId = getAppwriteProjectId();
    // Appwrite's expected OAuth callback format for mobile apps
    // This scheme is automatically recognized by Appwrite without needing
    // to register it as a separate platform
    return `appwrite-callback-${projectId}://`;
};

// Start Google OAuth flow using the Token-based approach (recommended for React Native)
export const signInWithGoogle = async () => {
    try {
        const redirectUrl = getOAuthRedirectUrl();

        // Use createOAuth2Token for React Native - it returns userId and secret
        // that we use to create a session manually
        const authUrl = account.createOAuth2Token(
            OAuthProvider.Google,
            redirectUrl, // success URL
            redirectUrl  // failure URL (same, we parse the result)
        );

        // Open the browser for OAuth authentication
        const result = await WebBrowser.openAuthSessionAsync(
            authUrl.toString(),
            redirectUrl,
            {
                showInRecents: true,
            }
        );

        if (result.type === 'success' && result.url) {
            // Parse the callback URL to extract userId and secret
            const url = new URL(result.url);
            const secret = url.searchParams.get('secret');
            const userId = url.searchParams.get('userId');

            if (secret && userId) {
                // Create a session using the token
                await account.createSession(userId, secret);
                return { success: true };
            }

            // Check for error in URL parameters
            const error = url.searchParams.get('error');
            if (error) {
                return { success: false, error: error };
            }
        }

        if (result.type === 'cancel' || result.type === 'dismiss') {
            return { success: false, cancelled: true };
        }

        return { success: false };
    } catch (error) {
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
        await safeStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify(pendingData));
        return true;
    } catch (error) {
        throw error;
    }
};

// Get pending OAuth signup data
export const getPendingOAuthSignup = async () => {
    try {
        const data = await safeStorage.getItem(PENDING_OAUTH_KEY);
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
};

// Clear pending OAuth signup data
export const clearPendingOAuthSignup = async () => {
    try {
        await safeStorage.removeItem(PENDING_OAUTH_KEY);
    } catch (error) {
        // Ignore errors
    }
};

// Complete OAuth signup - create user document with additional data
export const completeOAuthSignup = async (userId, email, name, additionalData = {}) => {
    try {
        // Verify we have an authenticated user
        const user = await account.get();
        if (!user || user.$id !== userId) {
            throw new Error('User authentication mismatch');
        }

        // Check if email is educational
        if (!isEducationalEmail(email)) {
            // Sign out the user since they can't use this app
            await account.deleteSession('current');
            throw new Error('Only educational email addresses are allowed. Please use your university or college email.');
        }

        // Create user document
        const userDoc = await createUserDocument(
            userId,
            name,
            email,
            additionalData
        );

        // Clear pending data
        await clearPendingOAuthSignup();

        return {
            success: true,
            userId: userId,
            email: email,
            name: name,
            userDoc: userDoc
        };
    } catch (error) {
        throw error;
    }
};

export const cancelPendingVerification = async () => {
    try {
        // Get pending data to know if we need cleanup
        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);

        try {
            // Delete the current session
            await account.deleteSession('current');
        } catch (sessionError) {
            // Session might already be deleted
        }

        // Remove pending verification data
        await safeStorage.removeItem(PENDING_VERIFICATION_KEY);

        return true;
    } catch (error) {
        // Even if there's an error, try to clean up storage
        await safeStorage.removeItem(PENDING_VERIFICATION_KEY);
        throw error;
    }
};

export const checkExpiredVerification = async () => {
    try {
        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);

        if (!storedData) {
            return { expired: false, hasPending: false };
        }

        const pendingData = JSON.parse(storedData);
        const now = Date.now();

        if (pendingData.expiresAt && now > pendingData.expiresAt) {
            // Verification expired, cleanup
            try {
                await account.deleteSession('current');
            } catch (sessionError) {
                // Session might already be deleted
            }

            await safeStorage.removeItem(PENDING_VERIFICATION_KEY);

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
        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);

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

        const user = await account.create(
            userId,
            sanitizedEmail,
            password,
            sanitizedName
        );
        userCreated = true;

        await signIn(sanitizedEmail, password);

        await createUserDocument(userId, name, email, additionalData);

        return user;
    } catch (error) {

        if (userCreated && userId) {
            try {
                await account.deleteSession('current');
            } catch (sessionError) {
            }

            try {
                await databases.deleteDocument(
                    config.databaseId,
                    config.usersCollectionId || '68fc7b42001bf7efbba3',
                    userId
                );
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

const createUserDocument = async (userId, name, email, additionalData = {}) => {
    try {
        const sanitizedName = sanitizeInput(name);
        const sanitizedEmail = sanitizeInput(email);
        const sanitizedRole = sanitizeInput(additionalData.role || 'student') || 'student';

        if (!sanitizedName || !sanitizedEmail) {
            throw new Error('Invalid user data');
        }

        const basePayload = {
            userID: userId,
            name: sanitizedName,
            email: sanitizedEmail,
            bio: '',
            profilePicture: '',
            isEmailVerified: true,
            university: sanitizeInput(additionalData.university || ''),
            major: sanitizeInput(additionalData.college || ''),
            department: sanitizeInput(additionalData.department || ''),
            year: parseInt(additionalData.stage) || 1,
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
            userDoc = await databases.createDocument(
                config.databaseId,
                config.usersCollectionId || '68fc7b42001bf7efbba3',
                userId,
                payloadWithRole,
                [
                    Permission.read(Role.users()),
                    Permission.read(Role.user(userId)),
                    Permission.update(Role.user(userId)),
                    Permission.delete(Role.user(userId)),
                ]
            );
        } catch (createError) {
            if (createError?.message?.includes('Unknown attribute') && createError?.message?.includes('role')) {
                userDoc = await databases.createDocument(
                    config.databaseId,
                    config.usersCollectionId || '68fc7b42001bf7efbba3',
                    userId,
                    basePayload,
                    [
                        Permission.read(Role.users()),
                        Permission.read(Role.user(userId)),
                        Permission.update(Role.user(userId)),
                        Permission.delete(Role.user(userId)),
                    ]
                );
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

        const session = await account.createEmailPasswordSession(sanitizedEmail, password);
        return session;
    } catch (error) {
        throw error;
    }
};

export const signOut = async () => {
    try {
        await account.deleteSession('current');
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

        const userDoc = await databases.getDocument(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            userId
        );

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

        if (data.name) {
            data.name = sanitizeInput(data.name);
        }
        if (data.bio) {
            data.bio = sanitizeInput(data.bio);
        }
        if (data.pronouns) {
            data.pronouns = sanitizeInput(data.pronouns);
        }
        if (data.university) {
            data.university = sanitizeInput(data.university);
        }
        if (data.major) {
            data.major = sanitizeInput(data.major);
        }
        if (data.department) {
            data.department = sanitizeInput(data.department);
        }

        const userDoc = await databases.updateDocument(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            userId,
            data
        );

        // Invalidate user cache
        await userCacheManager.invalidateUser(userId);

        return userDoc;
    } catch (error) {
        throw error;
    }
};

export const updateUserName = async (name) => {
    try {
        const user = await account.updateName(name);
        return user;
    } catch (error) {
        throw error;
    }
};

export const updateUserPassword = async (newPassword, oldPassword) => {
    try {
        const user = await account.updatePassword(newPassword, oldPassword);
        return user;
    } catch (error) {
        throw error;
    }
};

export const sendEmailVerification = async () => {
    try {
        const verification = await account.createVerification(
            `${config.endpoint}/verify`
        );
        return verification;
    } catch (error) {
        throw error;
    }
};

export const confirmEmailVerification = async (userId, secret) => {
    try {
        await account.updateVerification(userId, secret);

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
        const verification = await account.createVerification(
            `${config.endpoint}/verify`
        );
        return verification;
    } catch (error) {
        throw error;
    }
};

export const deleteAccount = async (password) => {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('No authenticated user found');
        }

        const userId = currentUser.$id;

        // Re-authenticate to confirm identity
        const trimmedPassword = typeof password === 'string' ? password.trim() : '';
        if (trimmedPassword) {
            try {
                await account.createEmailPasswordSession(currentUser.email, trimmedPassword);
            } catch (reauthError) {
                const reauthMessage = reauthError?.message || '';
                const invalidCredentials = reauthError?.code === 401
                    || reauthMessage.includes('Invalid credentials')
                    || reauthMessage.includes('Invalid email')
                    || reauthMessage.includes('Invalid password');

                if (invalidCredentials) {
                    throw reauthError;
                }

                const passwordAuthUnavailable = reauthMessage.includes('password')
                    || reauthMessage.includes('provider')
                    || reauthMessage.includes('OAuth')
                    || reauthMessage.includes('sessions limit');

                if (!passwordAuthUnavailable) {
                    throw reauthError;
                }
            }
        }

        // 1. Delete all user's posts (cascades to replies & notifications via deletePost)
        await _deleteAllUserPosts(userId);

        // 2. Delete all user's replies on other posts
        await _deleteAllUserReplies(userId);

        // 3. Delete all notifications for/from this user
        await _deleteAllUserNotifications(userId);

        // 4. Delete all push tokens
        await _deleteAllUserPushTokens(userId);

        // 5. Delete all user chat settings
        await _deleteAllUserChatSettings(userId);

        // 6. Anonymize messages sent by this user (set senderName to "Deleted Account")
        await _anonymizeUserMessages(userId);

        // 7. Remove user from chat participants
        await _removeUserFromChats(userId);

        // 8. Remove user from followers/following lists of other users
        await _removeUserFromFollowLists(userId);

        // 9. Anonymize the user document instead of deleting it
        // This ensures any remaining references resolve to "Deleted Account"
        try {
            await databases.updateDocument(
                config.databaseId,
                config.usersCollectionId,
                userId,
                {
                    name: 'Deleted Account',
                    email: `deleted_${userId}@deleted.local`,
                    bio: null,
                    profilePicture: null,
                    coverPhoto: null,
                    isActive: false,
                    pronouns: null,
                    university: null,
                    major: null,
                    department: null,
                    following: [],
                    followers: [],
                    blockedUsers: [],
                    followersCount: 0,
                    followingCount: 0,
                    postsCount: 0,
                }
            );
        } catch (err) {
            // If update fails, try to delete the document entirely
            await databases.deleteDocument(
                config.databaseId,
                config.usersCollectionId,
                userId
            );
        }

        // 10. Disable the Appwrite auth identity
        try {
            await account.updateStatus();
        } catch (err) {
            // Continue even if status update fails
        }

        // 11. Clear sessions from this device
        try {
            await account.deleteSession('current');
        } catch (err) {
            // Continue even if session cleanup fails
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
};

/**
 * Delete all posts created by a user (bypasses assertPostOwner for account deletion)
 */
const _deleteAllUserPosts = async (userId) => {
    try {
        let hasMore = true;
        while (hasMore) {
            const posts = await databases.listDocuments(
                config.databaseId,
                config.postsCollectionId,
                [Query.equal('userId', userId), Query.limit(100)]
            );

            if (posts.documents.length === 0) {
                hasMore = false;
                break;
            }

            for (const post of posts.documents) {
                try {
                    // Delete replies for this post
                    const { deleteRepliesByPost } = require('./replies');
                    const { deleteNotificationsByPostId } = require('./notifications');
                    await deleteRepliesByPost(post.$id);
                    await deleteNotificationsByPostId(post.$id);

                    await databases.deleteDocument(
                        config.databaseId,
                        config.postsCollectionId,
                        post.$id
                    );
                } catch (err) {
                    // Continue deleting other posts
                }
            }

            if (posts.documents.length < 100) {
                hasMore = false;
            }
        }
    } catch (error) {
        // Non-critical: continue with account deletion
    }
};

/**
 * Delete all replies created by a user on other people's posts
 */
const _deleteAllUserReplies = async (userId) => {
    try {
        let hasMore = true;
        while (hasMore) {
            const replies = await databases.listDocuments(
                config.databaseId,
                config.repliesCollectionId,
                [Query.equal('userId', userId), Query.limit(100)]
            );

            if (replies.documents.length === 0) {
                hasMore = false;
                break;
            }

            for (const reply of replies.documents) {
                try {
                    await databases.deleteDocument(
                        config.databaseId,
                        config.repliesCollectionId,
                        reply.$id
                    );

                    // Decrement reply count on the parent post
                    if (reply.postId) {
                        try {
                            const post = await databases.getDocument(
                                config.databaseId,
                                config.postsCollectionId,
                                reply.postId
                            );
                            if (post) {
                                await databases.updateDocument(
                                    config.databaseId,
                                    config.postsCollectionId,
                                    reply.postId,
                                    { replyCount: Math.max(0, (post.replyCount || 1) - 1) }
                                );
                            }
                        } catch (err) {
                            // Post may already be deleted
                        }
                    }
                } catch (err) {
                    // Continue deleting other replies
                }
            }

            if (replies.documents.length < 100) {
                hasMore = false;
            }
        }
    } catch (error) {
        // Non-critical
    }
};

/**
 * Delete all notifications for and from a user
 */
const _deleteAllUserNotifications = async (userId) => {
    try {
        // Delete notifications received by the user
        let hasMore = true;
        while (hasMore) {
            const notifs = await databases.listDocuments(
                config.databaseId,
                config.notificationsCollectionId,
                [Query.equal('userId', userId), Query.limit(100)]
            );

            if (notifs.documents.length === 0) break;

            for (const n of notifs.documents) {
                try {
                    await databases.deleteDocument(config.databaseId, config.notificationsCollectionId, n.$id);
                } catch (err) { /* continue */ }
            }

            if (notifs.documents.length < 100) hasMore = false;
        }

        // Delete notifications sent by the user
        hasMore = true;
        while (hasMore) {
            const notifs = await databases.listDocuments(
                config.databaseId,
                config.notificationsCollectionId,
                [Query.equal('senderId', userId), Query.limit(100)]
            );

            if (notifs.documents.length === 0) break;

            for (const n of notifs.documents) {
                try {
                    await databases.deleteDocument(config.databaseId, config.notificationsCollectionId, n.$id);
                } catch (err) { /* continue */ }
            }

            if (notifs.documents.length < 100) hasMore = false;
        }
    } catch (error) {
        // Non-critical
    }
};

/**
 * Delete all push tokens for a user
 */
const _deleteAllUserPushTokens = async (userId) => {
    try {
        const tokens = await databases.listDocuments(
            config.databaseId,
            config.pushTokensCollectionId,
            [Query.equal('userId', userId), Query.limit(100)]
        );

        for (const token of tokens.documents) {
            try {
                await databases.deleteDocument(config.databaseId, config.pushTokensCollectionId, token.$id);
            } catch (err) { /* continue */ }
        }
    } catch (error) {
        // Non-critical
    }
};

/**
 * Delete all user chat settings
 */
const _deleteAllUserChatSettings = async (userId) => {
    try {
        let hasMore = true;
        while (hasMore) {
            const settings = await databases.listDocuments(
                config.databaseId,
                config.userChatSettingsCollectionId,
                [Query.equal('userId', userId), Query.limit(100)]
            );

            if (settings.documents.length === 0) break;

            for (const s of settings.documents) {
                try {
                    await databases.deleteDocument(config.databaseId, config.userChatSettingsCollectionId, s.$id);
                } catch (err) { /* continue */ }
            }

            if (settings.documents.length < 100) hasMore = false;
        }
    } catch (error) {
        // Non-critical
    }
};

/**
 * Anonymize all messages sent by this user (set senderName to "Deleted Account")
 */
const _anonymizeUserMessages = async (userId) => {
    try {
        let hasMore = true;
        while (hasMore) {
            const messages = await databases.listDocuments(
                config.databaseId,
                config.messagesCollectionId,
                [Query.equal('senderId', userId), Query.limit(100)]
            );

            if (messages.documents.length === 0) break;

            for (const msg of messages.documents) {
                try {
                    await databases.updateDocument(
                        config.databaseId,
                        config.messagesCollectionId,
                        msg.$id,
                        { senderName: 'Deleted Account' }
                    );
                } catch (err) { /* continue */ }
            }

            if (messages.documents.length < 100) hasMore = false;
        }
    } catch (error) {
        // Non-critical
    }
};

/**
 * Remove user from all chat participant lists
 */
const _removeUserFromChats = async (userId) => {
    try {
        let hasMore = true;
        while (hasMore) {
            const chats = await databases.listDocuments(
                config.databaseId,
                config.chatsCollectionId,
                [Query.contains('participants', [userId]), Query.limit(50)]
            );

            if (chats.documents.length === 0) break;

            for (const chat of chats.documents) {
                try {
                    const updatedParticipants = (chat.participants || []).filter(id => id !== userId);
                    const updatedAdmins = (chat.admins || []).filter(id => id !== userId);
                    const updatedReps = (chat.representatives || []).filter(id => id !== userId);

                    await databases.updateDocument(
                        config.databaseId,
                        config.chatsCollectionId,
                        chat.$id,
                        {
                            participants: updatedParticipants,
                            admins: updatedAdmins,
                            representatives: updatedReps,
                        }
                    );
                } catch (err) { /* continue */ }
            }

            if (chats.documents.length < 50) hasMore = false;
        }
    } catch (error) {
        // Non-critical
    }
};

/**
 * Remove user from followers/following lists of other users
 */
const _removeUserFromFollowLists = async (userId) => {
    try {
        // Get the user's followers and following lists
        let userDoc;
        try {
            userDoc = await databases.getDocument(
                config.databaseId,
                config.usersCollectionId,
                userId
            );
        } catch (err) {
            return;
        }

        const followers = userDoc.followers || [];
        const following = userDoc.following || [];

        // Remove this user from each follower's "following" list
        for (const followerId of followers) {
            try {
                const follower = await databases.getDocument(
                    config.databaseId,
                    config.usersCollectionId,
                    followerId
                );
                const updatedFollowing = (follower.following || []).filter(id => id !== userId);
                await databases.updateDocument(
                    config.databaseId,
                    config.usersCollectionId,
                    followerId,
                    {
                        following: updatedFollowing,
                        followingCount: Math.max(0, (follower.followingCount || 1) - 1),
                    }
                );
            } catch (err) { /* continue */ }
        }

        // Remove this user from each followed user's "followers" list
        for (const followedId of following) {
            try {
                const followed = await databases.getDocument(
                    config.databaseId,
                    config.usersCollectionId,
                    followedId
                );
                const updatedFollowers = (followed.followers || []).filter(id => id !== userId);
                await databases.updateDocument(
                    config.databaseId,
                    config.usersCollectionId,
                    followedId,
                    {
                        followers: updatedFollowers,
                        followersCount: Math.max(0, (followed.followersCount || 1) - 1),
                    }
                );
            } catch (err) { /* continue */ }
        }
    } catch (error) {
        // Non-critical
    }
};

// ==================== PASSWORD RESET ====================

// Get the recovery redirect URL for the app
const getRecoveryRedirectUrl = () => {
    const configuredUrl = process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_REDIRECT_URL;
    const fallbackUrl = 'https://collegecommunity.app/reset-password';
    const rawUrl = (configuredUrl || fallbackUrl || '').trim();

    if (!rawUrl) {
        return 'https://collegecommunity.app/reset-password';
    }

    if (/^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
    }

    return `https://${rawUrl.replace(/^\/+/, '')}`;
};

// Send password reset email using Appwrite Recovery
export const sendPasswordResetOTP = async (email) => {
    try {
        const sanitizedEmail = sanitizeInput(email).toLowerCase();

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
            await account.createRecovery(sanitizedEmail, redirectUrl);

            await saveResetAttempt();

            return {
                success: true,
                email: sanitizedEmail,
                useDeepLink: true,
            };
        } catch (recoveryError) {
            // Prevent account enumeration: treat unknown accounts as success.
            if (recoveryError.code === 404 || recoveryError.message?.includes('User not found')) {
                await saveResetAttempt();
                return {
                    success: true,
                    email: sanitizedEmail,
                    useDeepLink: true,
                };
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
        if (!userId || !secret) {
            throw new Error('Invalid recovery link. Please request a new password reset.');
        }

        if (!newPassword || newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        // Use Appwrite's updateRecovery to set the new password
        await account.updateRecovery(userId, secret, newPassword);

        // Clean up stored data
        await safeStorage.removeItem(PENDING_PASSWORD_RESET_KEY);

        return {
            success: true,
        };
    } catch (error) {
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
