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
            password,
            additionalData,
            timestamp: Date.now(),
            expiresAt: Date.now() + VERIFICATION_TIMEOUT,
            otpUserId: tokenResponse.userId
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
        const storedData = await safeStorage.getItem(PENDING_VERIFICATION_KEY);
        
        if (!storedData) {
            throw new Error('No pending verification found');
        }
        
        const pendingData = JSON.parse(storedData);
        
        // Verify OTP by creating a session with the code
        // The OTP code acts as the "secret" for createSession
        try {
            await account.createSession(pendingData.otpUserId, otpCode);
        } catch (sessionError) {
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
        
        // Send new OTP using Email OTP
        const tokenResponse = await account.createEmailToken(pendingData.userId, pendingData.email);
        
        // Update expiration time and token data
        pendingData.expiresAt = Date.now() + VERIFICATION_TIMEOUT;
        pendingData.otpUserId = tokenResponse.userId;
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
        
        if (!sanitizedName || !sanitizedEmail) {
            throw new Error('Invalid user data');
        }
        
        const userDoc = await databases.createDocument(
            config.databaseId,
            config.usersCollectionId || '68fc7b42001bf7efbba3',
            userId,
            {
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
                postsCount: 0
            },
            [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
            ]
        );
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

export const deleteAccount = async () => {
    try {
        const user = await getCurrentUser();
        if (user) {
            await databases.deleteDocument(
                config.databaseId,
                config.usersCollectionId || '68fc7b42001bf7efbba3',
                user.$id
            );
            
            await account.deleteSessions();
        }
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
        
        // Check if user exists by trying to find their document
        let userDoc = null;
        try {
            const users = await databases.listDocuments(
                config.databaseId,
                config.usersCollectionId || '68fc7b42001bf7efbba3',
                [Query.equal('email', sanitizedEmail)]
            );
            
            if (users.documents.length === 0) {
                throw new Error('User not found');
            }
            
            userDoc = users.documents[0];
        } catch (error) {
            if (error.message === 'User not found') {
                throw error;
            }
            throw new Error('Failed to verify user: ' + error.message);
        }
        
        // Use Appwrite's Recovery feature - sends email with recovery link
        const redirectUrl = getRecoveryRedirectUrl();
        
        try {
            const result = await account.createRecovery(sanitizedEmail, redirectUrl);
            
            // Store pending reset data
            const pendingData = {
                email: sanitizedEmail,
                userId: userDoc.userID || userDoc.$id,
                timestamp: Date.now(),
                expiresAt: Date.now() + PASSWORD_RESET_TIMEOUT,
            };
            
            await safeStorage.setItem(PENDING_PASSWORD_RESET_KEY, JSON.stringify(pendingData));
            
            return {
                success: true,
                email: sanitizedEmail,
                useDeepLink: true,
            };
        } catch (recoveryError) {
            // Throw a more descriptive error
            if (recoveryError.code === 501 || recoveryError.message?.includes('SMTP') || recoveryError.message?.includes('mail')) {
                throw new Error('SMTP_NOT_CONFIGURED');
            }
            if (recoveryError.code === 404) {
                throw new Error('User not found');
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
