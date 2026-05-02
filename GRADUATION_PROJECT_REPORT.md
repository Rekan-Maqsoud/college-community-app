# College Community Mobile Application

## Graduation Project Technical Report

Document version: 1.0  
Prepared date: 2026-04-21  
Project repository: college-community  
Platform: Expo React Native (JavaScript only)

---

## 1. Executive Summary

College Community is a cross-platform mobile application built for university students to communicate, share academic content, collaborate in class communities, and participate in representative elections. The project combines social networking patterns (posts, replies, likes, follows, chat) with academic workflows (lecture channels, lecture assets, comments, class governance voting).

Core architecture is client-heavy with Appwrite as Backend-as-a-Service for authentication, database, storage, and realtime events. Critical write paths and privileged operations are protected by dedicated Appwrite Functions (server-side proxies).

This report consolidates current production-oriented implementation details from source code, project configuration, runtime modules, tests, and schema documentation.

---

## 2. Problem Statement

University students usually rely on fragmented channels for communication:

- General social apps for informal communication.
- Messaging apps for class groups.
- Separate channels for lecture resources and announcements.
- Manual or ad hoc processes for student representative selection.

This fragmentation causes:

- Poor discoverability of class-relevant discussions.
- Weak moderation and accountability.
- No integrated academic social graph.
- No native election workflow for class representation.
- Inconsistent multilingual and RTL support in local context apps.

College Community addresses these gaps by combining social, academic, realtime, and governance features into one mobile app.

---

## 3. Project Goals and Objectives

### 3.1 Main Goal

Build a scalable, multilingual, mobile-first student community platform with integrated academic collaboration and governance tools.

### 3.2 Functional Objectives

1. Provide secure account onboarding (email, OTP verification, Google OAuth, password recovery).
2. Provide feed-based posting and threaded replies for questions/discussions.
3. Support realtime private/group chat with rich message types.
4. Provide lecture channels with member roles, assets, and comments.
5. Implement representative election and voting workflows.
6. Provide in-app and push notifications with preference controls.
7. Support guest accounts with controlled permissions.

### 3.3 Technical Objectives

1. Use Expo SDK 55 and React Native 0.83+ stack.
2. Use Appwrite for auth, data, storage, and realtime.
3. Maintain JavaScript-only codebase.
4. Use MMKV-backed storage abstraction for fast local persistence.
5. Implement bounded queries with pagination and ordering.
6. Implement resilient realtime reconnect using exponential backoff + jitter.
7. Maintain translation-driven UI for English, Arabic, Kurdish.

---

## 4. Scope

### 4.1 In Scope

- Mobile app frontend (Android/iOS via Expo workflow).
- User auth and profile management.
- Posts, replies, moderation/reporting.
- Private and group chats, message interactions, basic E2EE key workflow.
- Lecture channels, lecture assets, lecture comments.
- Representative elections and votes.
- Suggestions/feedback submission.
- Notification system (in-app + push).
- ACL audit and schema management scripts.

### 4.2 Out of Scope

- Full custom backend server (project uses Appwrite BaaS + small serverless proxies).
- Desktop/web-first UI parity as primary target.
- Heavy ML backend operations (only local model warmup hooks are present for moderation utilities).

---

## 5. Product Features (Current State)

### 5.1 Authentication and Account Access

- Email/password sign up and sign in.
- OTP verification flow.
- Google OAuth sign in.
- Guest sign-up flow for non-educational emails.
- Forgot password and reset completion flow.
- Account deletion flow through server-side delete-account proxy.

### 5.2 Feed, Posts, and Replies

- Feed modes: public, department/stage-oriented, user-focused views.
- Post creation/edit/delete with metadata.
- Post types including discussions, questions, announcements, polls.
- Poll vote handling.
- Repost support and repost controls.
- Post reporting and moderation thresholds.
- Threaded replies with accept-answer workflow.
- Reply voting behavior.
- Ranking logic with recency, engagement, and relationship signals.

### 5.3 Chat System

- Private chats.
- Default stage and department group chats.
- Custom group chats with admins/representatives.
- Message send/read/delivery status.
- Message types: text, image, GIF, voice, location, poll, post share, lecture banner.
- Reactions, pin/unpin, mentions, @everyone checks.
- Chat settings and unread tracking.
- Guest restrictions for certain chat operations.

### 5.4 E2EE-Related Chat Hardening

- Per-user keypair generation and secure-store persistence.
- Chat key encryption/decryption workflow.
- Key rotation and recovery support.
- Encrypted content prefixes and decrypt fallback sanitization.

### 5.5 Lecture Hub

- Lecture channel creation and listing.
- Community and official channel types.
- Join requests and membership approval.
- Manager role operations.
- Lecture assets (file/link/youtube), pinning, usage tracking.
- Lecture comments and moderation operations.
- Share links and channel-level utilities.

### 5.6 Representative Elections and Voting

- Election lifecycle management.
- Seat-based representative model (up to 3 representatives per class).
- Voting and vote replacement logic.
- Reselection/tiebreaker logic.
- Election timer constraints.

### 5.7 Notifications and Preferences

- In-app notification creation and retrieval.
- Notification batching strategy for repeated interactions.
- Push notification registration and routing.
- Quiet hours support.
- Category-specific notification settings.

### 5.8 User Profiles and Social Graph

- Follow/unfollow workflows.
- Block and chat-block handling.
- User search and filtered discovery.
- Saved posts and profile-related settings.

### 5.9 Suggestions Module

- Structured suggestion categories.
- Input sanitization and rate limiting.
- User-owned read/update/delete permissions on suggestion documents.

---

## 6. System Architecture

### 6.1 High-Level Architecture

- Client: React Native app (Expo).
- Backend platform: Appwrite (Account, Databases, Storage, Realtime).
- Server-side function layer: Appwrite Functions for privileged/guarded operations.
- Local data layer: MMKV abstraction + cache managers.

### 6.2 Main Code Layers

- app/: UI, screens, tabs, contexts, hooks, utilities.
- database/: Appwrite data access modules and business rules.
- services/: external integrations and upload/notification services.
- appwrite-functions/: server-side proxy endpoints.
- locales/: translation resources and i18n bootstrap.
- scripts/: schema, ACL, migration, and maintenance tooling.

### 6.3 Startup and Runtime Pipeline

1. Root wrapper initializes global font scale from safe storage.
2. App providers initialize settings, user state, global alerts.
3. Navigation root initializes telemetry cold-start trace.
4. Session check determines auth route and role-based navigation.
5. Notification listeners and deep-link handlers are registered.
6. Realtime lifecycle manager handles app foreground/background reconnect logic.
7. NSFW model warmup starts in background.

### 6.4 Realtime Resilience Strategy

Reconnect delay is exponential with jitter:

- Base delay: 500 ms
- Max delay: 15000 ms
- Jitter: up to 700 ms

Formula used by app utility:

- delay = min(maxDelay, base \* 2^attempt) + jitter

The app pauses realtime when backgrounded and attempts safe reconnect when active.

---

## 7. Technology Stack

### 7.1 Core Runtime

- Expo: ^55.0.8
- React Native: 0.83.2
- React: 19.2.0
- JavaScript-only architecture

### 7.2 Navigation and UI Infrastructure

- @react-navigation/native + stack + bottom-tabs (v7 line)
- react-native-reanimated
- react-native-gesture-handler
- react-native-safe-area-context
- @shopify/flash-list v2

### 7.3 Backend and Data

- appwrite SDK 21.5.0
- node-appwrite in serverless functions

### 7.4 Storage and Performance

- react-native-mmkv (wrapped by safeStorage)
- Custom cache managers by domain

### 7.5 Media and Device APIs

- expo-video
- expo-audio
- expo-image
- expo-image-picker
- expo-document-picker
- expo-notifications
- expo-file-system

### 7.6 Internationalization

- i18next
- react-i18next
- expo-localization
- Languages: en, ar, ku

### 7.7 Security and Reliability Packages

- tweetnacl + tweetnacl-util
- expo-secure-store
- @sentry/react-native

### 7.8 Testing

- jest
- jest-expo
- react-test-renderer

### 7.9 Dependency Inventory

- Production dependencies: 71
- Development dependencies: 11

---

## 8. Navigation and UI Structure

### 8.1 Main Tabs

Authenticated student flow:

- Home
- Chats
- Post
- Lecture
- Profile

Guest flow:

- Home
- Chats
- Post
- Profile

### 8.2 Stack Screens

Major stack routes include:

- Auth screens: SignIn, SignUp, GuestSignUp, VerifyEmail, ForgotPassword.
- Settings screens: Settings, ProfileSettings, PersonalizationSettings, NotificationSettings, SuggestionSettings, AccountSettings, ChatSettings, BlockList, SavedPosts, ChangePassword.
- Core activity screens: PostDetails, EditPost, ChatRoom, UserProfile, FollowList, Notifications, LectureChannel.
- Chat management screens: NewChat, UserSearch, CreateGroup, GroupSettings, AddMembers, ForwardMessage.
- Representative screens: ManageRepresentatives, RepVoting, ReselectionRequest.

### 8.3 UX and Accessibility Signals

- Global font scaling controls and max multiplier constraints.
- Theme preferences (light/dark/system/scheduled).
- Reduce motion support profile.
- Quiet hours and notification granularity.
- RTL support path for Arabic and Kurdish.

---

## 9. Data Layer and Backend Modules

### 9.1 Database Module Responsibilities

- auth.js: signup/signin/OAuth/verification/password reset/account deletion.
- users.js: profile read/update, search, follow/block, class user queries.
- posts.js: post CRUD, polling, likes, reports, review requests.
- replies.js: reply CRUD, accepted-answer handling.
- chats + chatHelpers + groupChatHelpers: chat lifecycle and group logic.
- userChatSettings.js: per-user chat preferences.
- notifications.js: notification lifecycle and batched interaction notifications.
- lectures.js: channels, memberships, managers, assets, comments.
- lectureCleanup.js: safe lecture channel deletion.
- repElections.js: elections lifecycle and rules.
- repVotes.js: vote cast/remove/results.
- suggestions.js: structured user feedback submissions.
- securityGuards.js: actor assertion, in-memory rate limiting, block checks.

### 9.2 Services Layer Responsibilities

- pushNotificationService.js: token registration, permission checks, push routing, collapse/batch behavior.
- appwriteFileUpload.js: robust file upload with SDK/fetch fallback and permission patching.
- imgbbService.js: image upload and deletion helper workflows.
- giphyService.js: GIF/sticker search integration.
- uploadQueue.js: queued upload support.

### 9.3 Serverless Function Proxies

1. delete-account-proxy:

- Authenticated user-triggered account deletion.
- Removes/anonymizes related data across multiple collections.
- Handles chats/messages cleanup and metadata recomputation.

2. lecture-guard-proxy:

- Enforces manager/owner authorization for lecture-critical mutations.
- Handles membership status updates, manager updates, settings changes, asset pinning.

3. report-review-proxy:

- Validates authenticated report review requests.
- Forwards post review request payload to Discord webhook.

---

## 10. Database Schema (Live Snapshot Summary)

Database ID: 68fc78fd0030f049a781  
Total collections: 15  
Document security: enabled across collections

### 10.1 Collection Catalog

| Collection Name     | Collection ID        | Purpose                                       |
| ------------------- | -------------------- | --------------------------------------------- |
| users               | 68fc7b42001bf7efbba3 | User profiles, social graph, account metadata |
| posts               | 68ff7914000948dbd572 | Feed posts, engagement, moderation fields     |
| replies             | 68ff7b8f000492463724 | Post reply threads and vote fields            |
| chats               | chats                | Chat room metadata, participants, settings    |
| messages            | messages             | Message documents and interaction metadata    |
| userChatSettings    | 69500c9c000bd955c984 | Per-user per-chat preferences                 |
| notifications       | 69554fd5001d447c8c1c | In-app notification docs                      |
| pushTokens          | pushtokens           | Expo push token storage                       |
| Lecture Channels    | 699733ee001cbf86e7a4 | Lecture channel entities                      |
| Lecture Memberships | 699734170003f998b862 | Channel membership records                    |
| Lecture Assets      | 6997342b0012ee32448b | Uploaded/linked lecture resources             |
| lectureComments     | 69973f680024de7fd9fe | Lecture comment threads                       |
| repElections        | 6999f9de00313552a9c9 | Representative election records               |
| repVotes            | 6999fed2001ac021d056 | Vote records per election                     |
| Suggestions         | suggestions          | User feedback submissions                     |

### 10.2 Key Attribute Groups by Collection

users:

- Identity: userId, name, email, isEmailVerified.
- Academic profile: university, major, department, year.
- Social graph: followers, following, blockedUsers.
- Counters: followersCount, followingCount, postsCount.
- Extended profile: profilePicture, coverPhoto, bio, publicKey, bookmarkedPostIds.

posts:

- Core: userId, text, topic, department, stage, postType.
- Media: images, imageDeleteUrls, links, tags.
- Engagement: likeCount, replyCount, viewCount, viewedBy, likedBy.
- Moderation: reportCount, isHidden, isHiddenFromProfile.
- Features: isResolved, poll/repost-related fields, canOthersRepost, originalPostId.

replies:

- Core: postId, userId, text.
- Threading: parentReplyId.
- Engagement: likeCount, up/down counts, upvotedBy/downvotedBy.
- Media: images, imageDeleteUrls, links.

chats:

- Identity/type: name, type, department, stage, course.
- Membership: participants, admins, representatives.
- Activity: lastMessage, lastMessageAt, messageCount, lastMessageSenderId.
- Features: pinnedMessages, typingUsers, settings, groupPhoto, chatKey.

messages:

- Core: chatId, senderId, senderName, content.
- Media: images, imageUrl.
- Threading: replyToId, replyToContent, replyToSender.
- State: readBy, deliveredTo, status.
- Moderation/UX: reactions, mentions, mentionsAll, pin fields.

userChatSettings:

- Identity: userId, chatId.
- Preferences: mute, notifyOnMention, notifyOnAll, reactionDefaults.
- Lifecycle: clearedAt, hiddenMessageIds, archive state.

notifications:

- Context: userId, senderId, senderName, postId.
- Content: type, postPreview, senderProfilePicture.
- State: isRead.

pushTokens:

- Identity: userId, token.
- Platform: platform.

Lecture Channels:

- Core: name, channelType, accessType, ownerId.
- Roles: managerIds.
- Settings/meta: linkedChatId, settingsJson, tags, coverImageUrl.
- Counters: membersCount, pendingCount.

Lecture Memberships:

- Core: channelId, userId, joinStatus, role.
- Timeline: requestedAt, approvedAt.
- Preferences: notificationsEnabled, settingsJson, pinnedChannelsJson.

Lecture Assets:

- Core: channelId, title, uploadType, uploaderId.
- Resource refs: youtubeUrl, externalUrl, fileUrl, fileId, fileName, fileSize, mimeType.
- Metrics: viewsCount, opensCount, downloadsCount.
- Flags: isPinned, isActive.
- Interaction arrays: viewedBy, openedBy, downloadedBy.

lectureComments:

- Core: commentId, channelId, assetId, userId, text.
- Threading: parentCommentId.
- Mentions: mentions.

repElections:

- Class context: department, stage.
- Seat and state: seatNumber, status, winner.
- Counters/thresholds: totalStudents, reselectionThreshold.
- Timeline: startedAt, endedAt.
- Voters: reselectionVoters.

repVotes:

- electionId, department, stage, voterId, candidateId.

Suggestions:

- userId, userName, userEmail.
- category, title, message, status.
- metadata: appVersion, platform.

---

## 11. Security, Privacy, and Governance

### 11.1 Access Control Model

- Row-level security strategy with document-level permissions.
- Sensitive collections configured with strict create-only table permission and row ACL enforcement.
- ACL auditing supported through scripts and checklist.

### 11.2 Identity and Authorization

- Account-derived authenticated user checks in data layer.
- Actor identity assertions for sensitive actions.
- Function-layer JWT verification for privileged server-side actions.

### 11.3 Abuse and Rate Limiting

In-memory rate limit guard is applied for actions such as:

- create_post
- follow_user
- send_chat_message
- suggestion_submit
- message reaction toggles

Guest accounts have stricter limits for follow/post/reply/message behavior.

### 11.4 Moderation

- Post reporting with weighted reason model.
- Auto-hide logic based on reports and visibility thresholds.
- Server-routed review requests to external moderation channel (Discord webhook).

### 11.5 Data Deletion and Account Removal

Delete-account-proxy performs deep cleanup across posts/replies/chats/messages/notifications/tokens/lecture data/votes/suggestions and attempts auth user deletion.

### 11.6 Encryption Hardening

- E2EE-like message content encryption support in chat layer.
- Per-user keypair generation and secure storage.
- Chat key rotation and recovery support paths.

---

## 12. Reliability and Performance Design

### 12.1 Caching Strategy

Cache durations are scoped by domain:

- user: 1 hour
- posts: 30 min
- chats: 20 min
- messages: 7 days
- chat settings: 10 min
- replies: 20 min
- notifications: 10 min
- unread counters: 2 min

### 12.2 Storage Strategy

- MMKV is primary backend via safeStorage wrapper.
- Volatile in-memory fallback is available if MMKV is unavailable.

### 12.3 Realtime Recovery

- Reconnect logic with exponential backoff + jitter.
- App lifecycle-aware pause/resume behavior.
- Hook-level retry scheduling in realtime subscription utilities.

### 12.4 App Stability

- Error boundary wrapping.
- Global error handler forwarding in production.
- Telemetry events for runtime failures.
- Sentry integration through Expo plugin path.

### 12.5 OTA Update Strategy

- Expo updates check/fetch/reload flow in-app.
- User-facing update prompt with restart action.
- Runtime version policy bound to app version.

---

## 13. Internationalization and RTL

### 13.1 Language Architecture

- i18next + react-i18next bootstrap in locales/i18n.js.
- Supported languages: en, ar, ku.
- Fallback language: en.

### 13.2 Resource Structure

- Top-level bundles: locales/en.js, locales/ar.js, locales/ku.js.
- Domain split under each language: base, auth, chats, settings, departments, moderation.

### 13.3 RTL

- RTL language list includes ar and ku.
- UI writing direction and tab layout adapt to RTL context.

---

## 14. Testing and Quality Assurance

### 14.1 Test Framework

- Jest with jest-expo preset.
- Test pattern: **tests**/\*_/_.test.js.

### 14.2 Test Suite Size

- Total test files: 42

### 14.3 Covered Domains (from test inventory)

- Authentication flows and OTP/session recovery edge cases.
- Feed ranking, categories, moderation, repost and guest access.
- Chat realtime, retries, E2EE hardening, file utilities.
- Realtime reconnect behavior.
- Lecture access and lecture utility behavior.
- Notification routing and helper logic.
- Safe storage, cache, network error handling.
- Representative election and vote behavior.
- i18n config and translation parity checks.
- UI helper and platform behavior tests.

### 14.4 Representative Test Commands

- npm run test
- npm run test:critical
- npm run test:realtime
- npm run test:lectures

---

## 15. Build, Deployment, and Operations

### 15.1 Build Profiles (EAS)

Configured profiles include:

- development
- development-hermesv1-strict
- preview
- production
- development-simulator

### 15.2 Android Runtime Config Highlights

- newArchEnabled=true
- hermesEnabled=true
- edgeToEdgeEnabled=true
- reactNativeArchitectures: armeabi-v7a, arm64-v8a, x86, x86_64

### 15.3 Hermes V1 Guard

Hermes V1 source build path is guarded by env flags and local toolchain checks to avoid failing local builds when ICU prerequisites are missing.

### 15.4 Appwrite Project Binding

- appwrite.config.json binds projectId: 69a46b6f0020cf0d5e4b.
- Function proxies are separate Node runtimes with node-appwrite.

### 15.5 Scripted Operations Toolkit

The scripts folder includes utilities for:

- ACL audit/fix operations.
- Suggestions collection creation.
- Deep schema harmonization and attribute-size migrations.
- User ID attribute standardization.
- Guest attribute migration.
- Post poll attribute ensure script.
- Version code increment automation.
- Full destructive project purge (explicit warning script).

---

## 16. Environment Configuration

### 16.1 Public Expo Variables (Client)

- EXPO_PUBLIC_APPWRITE_ENDPOINT
- EXPO_PUBLIC_APPWRITE_PROJECT_ID
- EXPO_PUBLIC_APPWRITE_DATABASE_ID
- EXPO_PUBLIC_APPWRITE_BUCKET_ID
- EXPO_PUBLIC_APPWRITE_STORAGE_ID
- EXPO*PUBLIC_APPWRITE*\*\_COLLECTION_ID values for all active collections
- EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT
- EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT
- EXPO_PUBLIC_DELETE_ACCOUNT_ENDPOINT
- EXPO_PUBLIC_YOUTUBE_API_KEY

### 16.2 Server/Admin Variables

- APPWRITE_API_KEY
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID
- APPWRITE_DATABASE_ID
- Function-specific collection ID variables for proxy runtimes
- DISCORD_REVIEW_WEBHOOK_URL (report-review-proxy)

---

## 17. Quantitative Project Metrics

Last measured snapshot for core app modules (app, database, services, appwrite-functions, tests, locales):

- Core source files (.js/.jsx): 277
- Core lines: 104,415
- Test files: 42
- Script files (scripts/\*.js): 14
- Appwrite serverless modules: 3

Module-level size distribution:

| Module             | Files |  Lines |
| ------------------ | ----: | -----: |
| app/auth           |     5 |  5,706 |
| app/tabs           |     5 |  9,478 |
| app/screens        |    55 | 29,435 |
| app/components     |    65 | 19,079 |
| app/context        |     3 |  1,429 |
| app/utils          |    33 |  3,597 |
| database           |    25 | 14,583 |
| services           |     5 |  1,856 |
| appwrite-functions |     3 |  1,163 |
| **tests**          |    42 |  5,362 |
| locales            |    22 |  7,743 |

Note: an alternate whole-repo counting script reported higher totals because it also scanned non-product directories such as .agent.

---

## 18. Major Engineering Decisions

1. BaaS-first architecture (Appwrite) over custom backend for speed of delivery.
2. JavaScript-only implementation to keep stack uniform.
3. MMKV wrapper instead of AsyncStorage for low-latency persistence.
4. Translation-key-first UI strategy for multilingual support.
5. Exponential backoff with jitter for realtime reliability.
6. Privileged operations moved into server-side function proxies.
7. ACL governance with explicit audit/fix tooling.
8. Guest role introduced with stricter rate limits and controlled privileges.

---

## 19. Risks and Limitations

1. Large monolithic UI files exist in several high-traffic modules (for example lecture/chat/auth screens), increasing maintenance complexity.
2. Some realtime robustness still depends on client-side retry behavior and Appwrite socket behavior.
3. Rate limit guard in securityGuards is in-memory per process; it is not a distributed throttling mechanism.
4. Project uses many third-party dependencies; periodic compatibility audits are required for SDK upgrades.
5. Data privacy and compliance must be monitored if deployed beyond campus use.

---

## 20. Future Enhancements

1. Split very large files into feature-focused submodules for maintainability.
2. Add richer analytics dashboards for admin/moderation insights.
3. Expand lecture workflows (assignment threads, structured curriculum tagging).
4. Introduce server-side or centralized rate limiting for stronger abuse prevention.
5. Expand E2EE guarantees and key lifecycle tooling for group chat edge cases.
6. Add broader integration and E2E automation coverage.
7. Introduce moderation review console for reports/suggestions.

---

## 21. Conclusion

College Community is a feature-rich mobile platform that combines social communication, academic collaboration, and class governance in one system. The codebase demonstrates practical production considerations including ACL hardening, role-based behavior, realtime recovery, telemetry instrumentation, multilingual support, and operational maintenance scripts.

From a graduation project perspective, the system is substantial in both breadth (many modules and workflows) and depth (security, reliability, data model, and deployment discipline). The architecture is extensible and suitable for iterative enhancement in real educational environments.

---

## Appendix A: Directory Map (Report-Oriented)

- app/
  - auth/: sign in/up, guest signup, verification, recovery
  - tabs/: Home, Chats, Post, Lecture, Profile
  - screens/: detailed functional screens and feature subfolders
  - components/: reusable UI and feature widgets
  - context/: app settings, user state, global alerts
  - hooks/: realtime/navigation/helpers
  - utils/: caching, telemetry, reconnect, ranking, storage, errors

- database/
  - auth/users/posts/replies/chats/lectures/notifications/elections/votes/suggestions/security

- services/
  - push notifications, Appwrite uploads, image/GIF integrations

- appwrite-functions/
  - delete-account-proxy
  - lecture-guard-proxy
  - report-review-proxy

- locales/
  - en/ar/ku split resources + i18n bootstrap

- **tests**/
  - regression-focused unit/integration-style behavior tests

- scripts/
  - schema management, ACL audit/fix, migration and maintenance utilities

---

## Appendix B: Suggested Graduation Viva Talking Points

1. Why Appwrite + Expo was chosen over custom backend and native-first code.
2. How ACL is enforced at table and row levels.
3. How guest role restrictions are implemented without breaking UX.
4. How realtime reliability is achieved using lifecycle-aware reconnect.
5. How multilingual and RTL support is architected.
6. How account deletion performs cross-domain data cleanup safely.
7. How testing strategy maps to high-risk modules.
8. What trade-offs remain and how future work addresses them.

---

## Appendix C: Quick Repro Setup Commands

1. npm install
2. npm run start
3. npm run android (or npm run ios)
4. npm run test
5. npm run lint

Optional maintenance:

- npm run audit:acl

---

## Appendix D: Document Use Notes

This report is written in Markdown but structured for easy transfer to Microsoft Word.

- Heading hierarchy is stable for automatic Table of Contents generation.
- Tables are simple and Word-compatible.
- You can add university cover page elements (student name, supervisor, department, year) above Section 1.
