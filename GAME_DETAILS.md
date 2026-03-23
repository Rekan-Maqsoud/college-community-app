# College Community - Feature and Stack Reference

This document is a handoff reference for external agents that do not have codebase access. It describes the current app capabilities and the runtime versions to use when proposing future features.

Last updated: 2026-03-19
Source of truth for versions: package.json

## 1. Runtime Versions

- Expo: ^55.0.0 (SDK 55 line)
- React: 19.2.0
- React Native: 0.83.2

## 2. Platform and Architecture Snapshot

- App type: Expo React Native mobile app (JavaScript-only)
- Backend: Appwrite (Auth, Databases, Storage, Realtime)
- Navigation: React Navigation v7 (stack + tabs)
- i18n: react-i18next + i18next (English, Arabic, Kurdish)
- High-volume list rendering: @shopify/flash-list v2
- Local persistence: react-native-mmkv wrappers (safe storage/cache managers)
- Media: expo-video and expo-audio
- Crypto in chat: tweetnacl + react-native-quick-crypto + secure storage patterns
- Runtime note: Hermes V1 Android source-build path is conditionally enabled in app.config.js when explicit env flags and toolchain checks pass

## 3. Core Product Modules

### 3.1 Authentication and Account Access

- Email/password sign-up and sign-in
- OTP verification flow for account/email verification
- Forgot password flow with OTP verification
- Google sign-in path
- Session bootstrap and current-user hydration
- Account deletion with re-auth handling
- Password change flow

Primary implementation areas:

- app/auth/
- database/auth.js
- app/screens/ChangePassword.jsx
- app/screens/settings/AccountSettings.jsx

### 3.2 Feed, Posts, and Replies

- Feed modes across personal/department/public scopes
- Post creation with metadata (department, stage, type, tags/links)
- Post editing/deletion
- Post reactions and engagement tracking (likes/views/replies)
- Poll-capable post type support
- Repost capability and repost controls
- Post reporting/moderation with severity-aware flows
- Reply system with threaded context and accepted-answer semantics
- Reply voting (up/down style) and interactions
- Search/sort/filter paths in feed views

Primary implementation areas:

- app/tabs/Home.jsx
- app/tabs/Post.jsx
- app/screens/EditPost.jsx
- app/screens/PostDetails.jsx
- app/screens/postDetails/
- database/posts.js
- database/replies.js

### 3.3 Realtime Chat System

- Private chats
- Default group chats (stage/department style)
- Custom group chat creation and management
- Message send/read flows with status tracking
- Message reply/forward/reaction patterns
- Pinned message support
- Media/file sharing paths (images/files/voice related flows)
- Group admin/member operations
- Chat-level unread count and aggregate unread tracking
- Chat-level settings (mute, archive, clear/hide style settings)
- Block/permission checks integrated with chat sendability logic

Primary implementation areas:

- app/tabs/Chats.jsx
- app/screens/ChatRoom.jsx
- app/screens/chatRoom/
- app/screens/chats/
- database/chats.js
- database/chats/
- database/chatHelpers.js
- database/groupChatHelpers.js
- database/userChatSettings.js

### 3.4 Chat Encryption and Key Management

- E2EE-related primitives in chat modules
- User keypair handling
- Chat key establish/recovery/rotation-related paths
- Encrypted preview/decrypt helper paths

Primary implementation areas:

- database/chats/chatsEncryption.js
- database/chats/chatsShared.js

### 3.5 Lecture Hub

- Lecture channel listing and detail screens
- Channel creation/settings and role-aware management
- Join/access workflows (including approval-style patterns)
- Lecture assets (file/link/youtube style entries)
- Asset stats and interaction tracking (view/open/download patterns)
- Lecture comments and moderation actions
- Lecture channel admin/organizer tooling in UI

Primary implementation areas:

- app/tabs/Lecture.jsx
- app/screens/LectureChannel.jsx
- app/screens/lectureChannel/
- database/lectures.js
- database/lectureCleanup.js

### 3.6 Representatives and Elections

- Representative election lifecycle
- Voting flows and result views
- Reselection request flow
- Rep-aware behavior across relevant app surfaces

Primary implementation areas:

- app/screens/ManageRepresentatives.jsx
- app/screens/representatives/
- database/repElections.js
- database/repVotes.js

### 3.7 Notifications (In-App and Push)

- In-app notifications list and read-state handling
- Notification routing for key social/chat/content events
- Mark-as-read and bulk state operations
- Push registration/token lifecycle and app response handlers

Primary implementation areas:

- app/screens/Notifications.jsx
- app/screens/settings/NotificationSettings.jsx
- database/notifications.js
- services/pushNotificationService.js

### 3.8 Profile, Social Graph, and User Controls

- User profile view/edit paths
- Follow/unfollow and follower/following lists
- Saved/bookmarked posts views
- User blocking and chat-only blocking modes
- Personalization settings (language/theme/preferences)
- Suggestion/feedback submission flow

Primary implementation areas:

- app/tabs/Profile.jsx
- app/screens/UserProfile.jsx
- app/screens/FollowList.jsx
- app/screens/settings/
- database/users.js
- database/suggestions.js

## 4. Reliability, Performance, and Offline-First Behavior

- Realtime reconnect logic with bounded retry strategy and jitter helpers
- Cache manager utilities for feed/chat/notification-adjacent data
- MMKV-backed safe storage wrappers
- Network error handling helpers
- Online status and last-seen style helper logic
- FlashList adoption in high-volume list screens
- Telemetry traces/events in major loading/fetch paths

Primary implementation areas:

- app/utils/realtimeReconnect.js
- app/hooks/useRealtimeSubscription.js
- app/utils/cacheManager.js
- app/utils/safeStorage.js
- app/utils/networkErrorHandler.js
- app/utils/onlineStatus.js
- app/utils/telemetry.js

## 5. Security and Guardrails Present in Current Implementation

- Appwrite document/collection ACL-aware implementation patterns
- Ownership/permission checks in security guard modules
- Rate-limiting helpers in sensitive flows
- Post report/review proxy support via serverless functions
- No TypeScript app architecture (JavaScript-only codebase)

Primary implementation areas:

- database/securityGuards.js
- appwrite-functions/report-review-proxy/
- appwrite-functions/lecture-guard-proxy/

## 6. Localization and RTL

- Supported locales: en, ar, ku
- Runtime translation hooks and key-based text usage
- RTL-aware language support for Arabic/Kurdish paths

Primary implementation areas:

- locales/i18n.js
- locales/en.js
- locales/ar.js
- locales/ku.js
- app/hooks/useTranslation.js

## 7. Data Domains (Appwrite Collections in Use)

Core domains implemented in app logic include:

- users
- posts
- replies
- chats
- messages
- userChatSettings
- notifications
- pushTokens
- lecture channels/memberships/assets/comments
- representative elections/votes
- suggestions

See database schema reference for live IDs and field contracts:

- .github/instructions/database-schema.instructions.md

## 8. Test Coverage Areas

Existing tests cover many core behaviors including:

- Auth and edge cases
- Feed categories/ranking/moderation/repost flows
- Chat realtime/message retry/file handling/E2EE hardening
- Realtime reconnect behavior
- Lecture access/utilities
- Notifications routing
- Safe storage/cache/network error utilities
- Representatives election logic

Primary implementation area:

- **tests**/

## 9. Constraints External Agents Must Respect (When Proposing New Features)

- Keep JavaScript-only code (no TypeScript syntax)
- Keep user-visible text translation-key based
- Preserve telemetry in loading/fetch/refresh flows
- Do not introduce AsyncStorage-based persistence in app logic
- Use object-argument Appwrite SDK calls in touched/new code
- Keep list reads bounded with explicit pagination/order strategy
- Keep RTL and localization parity for en/ar/ku
- Do not add native ios/android folders in this project

## 10. Recommended Prompt Seed for Outside Agents

Use this app context when generating feature plans:

"You are designing for a production Expo React Native social-learning app called College Community. Stack: Expo SDK 55, React 19.2.0, React Native 0.83.2, Appwrite backend, React Navigation v7, react-i18next, MMKV-based caching, FlashList v2, expo-video/expo-audio media paths, realtime reconnect safeguards, and multilingual support (en/ar/ku with RTL). Existing modules include auth, feed/posts/replies, realtime chat with group/private flows and E2EE helpers, lecture channels/assets/comments, representatives elections/voting, notifications/push, profile/settings/blocking/suggestions, and moderation/reporting. Provide a personalized implementation guide that fits these constraints and avoids architecture drift."
