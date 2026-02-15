# College Community

React Native (Expo) + Appwrite mobile app for university students to post, discuss, and chat in department/stage communities.

## Current Product State (code-verified)

### Authentication

- Email/password sign-up with educational-domain validation
- OTP email verification flow (`initiateSignup` + `verifyOTPCode`)
- Google OAuth sign-in with profile completion path
- Forgot-password deep-link recovery flow

### Feed & Posts

- Department / major / public feed modes
- Sort + filtering (post type, stage, unanswered questions)
- Realtime post updates via Appwrite subscriptions
- Post create/edit/delete with image upload (ImgBB), tags, links
- Post likes, view counting, report reasons, hidden-by-reports moderation
- Repost permission (`canOthersRepost`) and post sharing to chats

### Replies

- Threaded replies with images/links
- Upvote/downvote with vote-integrity checks
- Accepted-answer workflow for Q&A posts
- Reply-level navigation from notifications

### Chats

- Auto/default stage + department groups
- Custom groups with admins/representatives and settings
- Private chats with block/chat-block support
- Message types: text, image, GIF/sticker, location, voice note, post share
- Reactions, pin/unpin, bookmark, forward, reply, copy, delete-for-me
- Search-in-chat, unread tracking, read/delivery status, online/last-seen
- Chat mute/archive/clear and per-chat reaction defaults
- E2EE primitives for message content in `database/chats.js`

### Profiles, Social, Notifications

- Follow/unfollow, follower/following lists
- Block list and per-chat block options
- User profile share (deep link + QR export/share)
- In-app notifications + push notifications + category settings + quiet hours

### Settings & Personalization

- Theme modes: light/dark/system/scheduled
- Accent color, font scaling, compact mode, data saver, reduce motion
- Language switching (en/ar/ku)
- Chat appearance customization (bubble style/color/background)
- Cache clearing, reset settings, sign out

### Reliability & Infra

- Safe realtime subscribe/retry wrapper (`safeSubscribe`)
- App lifecycle realtime reconnect management
- Local caching for posts/chats/messages/replies/users
- OTA update prompt flow via Expo Updates

## Tech Stack

- Expo SDK 54 / React Native 0.81 / React 19
- Appwrite (Auth, Databases, Storage, Realtime)
- React Navigation (stack + tabs)
- i18n-js (`en`, `ar`, `ku`)
- Jest (`jest-expo`) for core utility/realtime/moderation tests

## Project Structure (high-level)

- `app/` UI (auth, tabs, screens, components, context, hooks, utils)
- `database/` Appwrite data/auth/chat/post modules
- `services/` push notifications, ImgBB, Giphy
- `locales/` translations
- `__tests__/` unit tests

## Environment Variables

Define these in your Expo env (`.env` / EAS secrets):

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=
EXPO_PUBLIC_APPWRITE_PROJECT_ID=
EXPO_PUBLIC_APPWRITE_DATABASE_ID=
EXPO_PUBLIC_APPWRITE_BUCKET_ID=
EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID=
EXPO_PUBLIC_APPWRITE_POST_REPORTS_COLLECTION_ID=
EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT=
```

## Run Locally

```bash
npm install
npm run start
```

Useful commands:

```bash
npm run android
npm run ios
npm run test
npm run test:critical
```

## Notes

- Project is JavaScript-only (no TypeScript).
- Translation keys are used throughout app UI.
- Root `README.md` reflects current implementation as of 2026-02-15.
