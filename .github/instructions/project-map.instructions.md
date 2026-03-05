---
applyTo: "**"
---

# COLLEGE COMMUNITY - PROJECT MAP

Use this map to edit the correct file with minimal drift.

## Root

- `app/App.js` - App providers, navigation tree, push + realtime orchestration
- `package.json` - scripts/dependencies
- `README.md` - product + setup docs
- `__tests__/` - Jest tests for critical app logic

## App Layer (`app/`)

### Auth (`app/auth/`)
- `SignIn.jsx` - sign-in and social auth entry
- `SignUp.jsx` - registration flow
- `VerifyEmail.jsx` - OTP verification
- `ForgotPassword.jsx` - password recovery

### Tabs (`app/tabs/`)
- `Home.jsx` - feed listing/filter/sort
- `Chats.jsx` - chats overview
- `Post.jsx` - create post
- `Lecture.jsx` - lecture hub tab
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
- `app/screens/chatRoom/` - chat room UI and hook (`useChatRoom.js`)
- `app/screens/postDetails/` - post details subcomponents
- `app/screens/chats/` - new chat/group/add members/forward flows
- `app/screens/settings/`:
  - `ProfileSettings.jsx`
  - `PersonalizationSettings.jsx`
  - `NotificationSettings.jsx`
  - `SuggestionSettings.jsx`
  - `AccountSettings.jsx`
  - `ChatSettings.jsx`
  - `BlockList.jsx`
  - `SavedPosts.jsx`
- `app/screens/lectureChannel/` - lecture-channel modals and actions
- `app/screens/representatives/` - voting/reselection screens

### Other App Directories
- `app/components/` - reusable UI and feature components
- `app/context/` - user/app/language/global-alert contexts
- `app/hooks/` - custom hooks (translation/realtime/etc.)
- `app/utils/` - caching, network handling, responsive utils, telemetry
- `app/constants/` - feed/post constants
- `app/theme/` - design tokens
- `app/data/` - academic metadata

## Database Layer (`database/`)

- `config.js` - Appwrite client and env-backed IDs
- `auth.js` - auth operations
- `users.js` - user profile/follow/block/update
- `posts.js` - post CRUD, likes, repost/moderation fields
- `replies.js` - reply CRUD and votes
- `chats.js` - chats + messages core operations
- `chatHelpers.js` - chat utility reads/formatters
- `groupChatHelpers.js` - default group setup
- `notifications.js` - notifications read/write helpers
- `userChatSettings.js` - per-chat user preferences
- `lectures.js` - lecture channels/assets/comments membership flows
- `lectureCleanup.js` - lecture cleanup helpers
- `repElections.js` - election lifecycle
- `repVotes.js` - election votes
- `suggestions.js` - user feedback/suggestions
- `securityGuards.js` - permission/validation guard logic

## Services (`services/`)

- `imgbbService.js` - image upload
- `appwriteFileUpload.js` - Appwrite storage uploads
- `uploadQueue.js` - upload queue/retry support
- `pushNotificationService.js` - push registration/handlers
- `giphyService.js` - Giphy integration

## Locales (`locales/`)

- `en.js`, `ar.js`, `ku.js` translations
- `i18n.js` setup

## Common Edit Routing

- Post creation/display/moderation: `app/tabs/Post.jsx`, `app/components/PostCard.jsx`, `database/posts.js`
- Chat behavior/messages: `app/screens/chatRoom/`, `database/chats.js`, `database/userChatSettings.js`
- Lecture channels/assets/comments: `app/screens/LectureChannel.jsx`, `app/screens/lectureChannel/`, `database/lectures.js`
- Representatives voting: `app/screens/representatives/`, `database/repElections.js`, `database/repVotes.js`
- Suggestions flow: `app/screens/settings/SuggestionSettings.jsx`, `database/suggestions.js`
- Auth/profile: `app/auth/`, `database/auth.js`, `database/users.js`
