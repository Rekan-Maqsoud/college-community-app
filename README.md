# College Community

React Native (Expo) + Appwrite mobile app for university students to post, discuss, chat, vote in representative elections, and collaborate in lecture channels.

Last verified against codebase: 2026-03-05.

## Current Product State

### Authentication

- Email/password sign-up with educational-domain validation
- OTP email verification flow (`initiateSignup` + `verifyOTPCode`)
- Google OAuth sign-in with profile completion path
- Forgot-password deep-link recovery flow

### Feed, Posts, Replies

- Department / major / public feed modes
- Sort + filtering (post type, stage, unanswered questions)
- Realtime post updates via Appwrite subscriptions
- Post create/edit/delete with image upload, tags, links
- Post likes, view counting, report reasons, hidden-by-reports moderation
- Repost permission (`canOthersRepost`) and post sharing to chats
- Threaded replies with images/links
- Upvote/downvote with vote-integrity checks
- Accepted-answer workflow for Q&A posts

### Chats

- Default stage + department groups
- Custom groups with admins/representatives and settings
- Private chats with block/chat-block support
- Message types: text, image, GIF/sticker, location, voice note, post share
- Reactions, pin/unpin, bookmark, forward, reply, copy, delete-for-me
- Search-in-chat, unread tracking, read/delivery status, online/last-seen
- Per-chat mute/archive/clear + reaction defaults
- E2EE primitives in `database/chats.js`

### Lecture Hub

- Lecture channels with membership and role flow
- Lecture assets (external links/files/youtube) with stats and pinning
- Lecture comments and moderation tools
- Download manager + lecture-specific action modals

### Representatives + Suggestions

- Representative elections lifecycle and vote tracking
- Reselection request flow
- In-app suggestions/feedback submission (`suggestions` collection)

### Notifications + Reliability

- In-app notifications and push-notification routing
- Notification preference controls and quiet-hours support
- Safe realtime subscribe/retry wrapper (`safeSubscribe`)
- App lifecycle reconnect handling for realtime
- Local cache utilities for posts/chats/messages/replies/users
- OTA update prompt flow via Expo Updates

## Tech Stack

- Expo SDK 55 / React Native 0.83.2 / React 19.2.4
- Appwrite 21.x (Auth, Databases, Storage, Realtime)
- React Navigation 7 (Stack + Bottom Tabs)
- react-i18next + i18next with lazy-loaded `en`, `ar`, and `ku` resources
- `@shopify/flash-list` v2 for high-volume list paths
- `react-native-mmkv` for local persistence and low-latency hydration
- `expo-video` and `expo-audio` for media flows
- Jest (`jest-expo`) for utility, realtime, moderation, lecture, and upload coverage

## Architecture Notes

- JavaScript-only Expo app with Appwrite-backed auth, data, storage, and realtime flows.
- `locales/i18n.js` is the active translation bootstrap; `i18n-js` is not the active architecture.
- The app already includes telemetry coverage in critical loading and refresh paths.
- Hermes V1 Android support is guarded in `app.config.js`: source builds are enabled only when explicitly requested and when local toolchain prerequisites are available, otherwise the app falls back to Expo's default Hermes configuration.

## Project Structure

- `app/` UI (auth, tabs, screens, components, context, hooks, utils)
- `database/` Appwrite data/auth/chat/post/lecture/rep/suggestion modules
- `services/` push notifications, uploads, Giphy integration
- `appwrite-functions/` serverless proxies used by app flows
- `locales/` translations
- `__tests__/` unit tests

## Environment Variables

Define these in Expo env (`.env` for local dev and EAS secrets for CI/build):

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=
EXPO_PUBLIC_APPWRITE_PROJECT_ID=
EXPO_PUBLIC_APPWRITE_DATABASE_ID=
EXPO_PUBLIC_APPWRITE_BUCKET_ID=
EXPO_PUBLIC_APPWRITE_STORAGE_ID=

EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_REP_ELECTIONS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_SUGGESTIONS_COLLECTION_ID=

EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID=

EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID_ANDROID=
EXPO_PUBLIC_APPWRITE_PUSH_PROVIDER_ID_IOS=
EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID=
EXPO_PUBLIC_APPWRITE_POST_REPORTS_COLLECTION_ID=

EXPO_PUBLIC_LECTURE_GUARD_ENDPOINT=
EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT=
EXPO_PUBLIC_DELETE_ACCOUNT_ENDPOINT=
EXPO_PUBLIC_YOUTUBE_API_KEY=
```

For Appwrite admin/audit scripts, also define:

```env
APPWRITE_API_KEY=
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_DATABASE_ID=
```

## Local Development

```bash
npm install
npm run start
```

Useful commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run test
npm run test:critical
npm run test:realtime
npm run test:lectures
npm run audit:acl
```

## Notes

- JavaScript-only project (no TypeScript).
- Translation keys are used for user-visible UI text.
- Live database schema reference: `.github/instructions/database-schema.instructions.md`.
- Hermes V1 Android source-build guard and ICU setup: `docs/hermes-v1-android.md`.
