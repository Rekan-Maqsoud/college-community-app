---
applyTo: "**"
---

# COLLEGE COMMUNITY - PROJECT MAP (2026)

Use this map to route edits quickly and avoid broad, risky drift.

## Root

- `app/App.js` - providers, navigation root, startup orchestration, push/realtime boot
- `package.json` - dependency/runtime versions and scripts
- `README.md` - setup and architecture docs
- `__tests__/` - regression coverage for core app logic

## App Layer (`app/`)

### Auth (`app/auth/`)

- `SignIn.jsx` - sign-in, social auth entry, session bootstrap
- `SignUp.jsx` - registration flow
- `VerifyEmail.jsx` - OTP verification
- `ForgotPassword.jsx` - recovery flow

### Tabs (`app/tabs/`)

- `Home.jsx` - feed aggregation/filter/sort
- `Chats.jsx` - chat list and unread summary
- `Post.jsx` - create post flow
- `Lecture.jsx` - lecture hub overview
- `Profile.jsx` - current user profile

### Main Screens (`app/screens/`)

- `Settings.jsx`
- `ChatRoom.jsx`
- `PostDetails.jsx`
- `CreatePost.jsx`
- `EditPost.jsx`
- `UserProfile.jsx`
- `FollowList.jsx`
- `Notifications.jsx`
- `ChangePassword.jsx`
- `ManageRepresentatives.jsx`
- `LectureChannel.jsx`

### Screen Subfolders

- `app/screens/chatRoom/` - chat room components + `useChatRoom.js`
- `app/screens/postDetails/` - post details view logic/components
- `app/screens/chats/` - chat creation/group/member management/forwarding
- `app/screens/settings/` - profile, personalization, notifications, account, suggestions, chat prefs, block list, saved posts
- `app/screens/lectureChannel/` - lecture channel actions/modals/assets/comments
- `app/screens/representatives/` - elections, voting, reselection flows

### Other App Directories

- `app/components/` - shared UI + feature widgets
- `app/context/` - app/user/language/alerts state providers
- `app/hooks/` - reusable hooks (translation/realtime/navigation helpers)
- `app/utils/` - utilities (cache/network/telemetry/responsive)
- `app/constants/` - feed/chat/post constants
- `app/theme/` - design tokens and theme primitives
- `app/data/` - static/seeded academic metadata

## Database Layer (`database/`)

- `config.js` - Appwrite clients and env-backed IDs
- `auth.js` - account/session auth operations
- `users.js` - profile/follow/block/update operations
- `posts.js` - post CRUD, moderation, likes/reposts
- `replies.js` - replies and vote state
- `chats.js` - chat/message write/read flows
- `chatHelpers.js` - chat fetch/transform helpers
- `groupChatHelpers.js` - group defaults and setup helpers
- `notifications.js` - notification read/write
- `userChatSettings.js` - per-user per-chat preferences
- `lectures.js` - channels, assets, memberships, comments
- `lectureCleanup.js` - cleanup and maintenance helpers
- `repElections.js` - election lifecycle
- `repVotes.js` - voting writes/reads
- `suggestions.js` - user suggestion pipeline
- `securityGuards.js` - permission and ownership validation

## Services (`services/`)

- `appwriteFileUpload.js` - Appwrite file uploads
- `imgbbService.js` - image hosting uploads
- `uploadQueue.js` - upload retry/queue behavior
- `pushNotificationService.js` - push setup and handlers
- `giphyService.js` - GIF search integration

## Localization (`locales/`)

- `en.js`, `ar.js`, `ku.js` - current translation sources
- `i18n.js` - current i18n bootstrap
- `locales/en/`, `locales/ar/`, `locales/ku/` - language resource folders for progressive migration

## Modernization Hotspots

- Appwrite object-argument refactors: `database/`, `services/`, `appwrite-functions/`
- Realtime resilience/backoff: `app/utils/`, `database/chats.js`, `database/posts.js`, `app/App.js`
- Storage migration to MMKV wrappers: `app/utils/`, `database/`, feature cache consumers
- i18n migration to `react-i18next`: `locales/`, `app/hooks/`, screen/component translation usage
- FlashList migration/perf tuning: high-traffic lists in `app/tabs/`, `app/screens/`, `app/components/`
- Media migration (`expo-av` -> `expo-video` / `expo-audio`): lecture/chat media modules

## Common Edit Routing

- Feed/post behavior: `app/tabs/Home.jsx`, `app/components/PostCard.jsx`, `database/posts.js`
- Chat behavior/messages: `app/screens/chatRoom/`, `database/chats.js`, `database/userChatSettings.js`
- Lecture channels/assets/comments: `app/screens/LectureChannel.jsx`, `app/screens/lectureChannel/`, `database/lectures.js`
- Representatives voting: `app/screens/representatives/`, `database/repElections.js`, `database/repVotes.js`
- Suggestions flow: `app/screens/settings/SuggestionSettings.jsx`, `database/suggestions.js`
- Auth/profile: `app/auth/`, `database/auth.js`, `database/users.js`
