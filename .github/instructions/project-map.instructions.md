---
applyTo: "**"
---

# 🗺️ COLLEGE COMMUNITY - COMPLETE PROJECT MAP

> **CRITICAL FOR AI**: This file contains the complete project structure. Always consult this before making ANY changes to ensure you edit the correct file(s).

---

## 📱 PROJECT OVERVIEW

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| **Framework**  | React Native with Expo SDK 54          |
| **Backend**    | Appwrite (BaaS)                        |
| **Language**   | JavaScript (NO TypeScript)             |
| **Styling**    | StyleSheet (no styled-components)      |
| **Navigation** | React Navigation (Stack + Bottom Tabs) |
| **State**      | React Context API                      |
| **i18n**       | i18n-js with 3 languages (EN, AR, KU)  |

---

## 📁 FILE STRUCTURE WITH PURPOSES

### ROOT FILES

| File           | Purpose                                       |
| -------------- | --------------------------------------------- |
| `app.json`     | Expo configuration, app name, scheme, plugins |
| `package.json` | Dependencies and scripts                      |
| `index.js`     | Entry point - registers App component         |
| `eas.json`     | EAS Build profiles                            |

---

### 🔐 AUTH SCREENS (`app/auth/`)

| File              | Purpose                   | Key Functions                                       |
| ----------------- | ------------------------- | --------------------------------------------------- |
| `SignIn.jsx`      | Login screen              | `handleLogin()`, `handleGoogleSignIn()`             |
| `SignUp.jsx`      | Registration (multi-step) | `handleSignUp()`, university/college/dept selection |
| `VerifyEmail.jsx` | OTP verification          | `handleVerify()`, `handleResend()`                  |

**When to edit:**

- Login issues → `SignIn.jsx`
- Registration flow → `SignUp.jsx`
- Email verification → `VerifyEmail.jsx`

---

### 📱 TAB SCREENS (`app/tabs/`)

| File          | Purpose                   | Key State                                       |
| ------------- | ------------------------- | ----------------------------------------------- |
| `Home.jsx`    | Main feed, post listing   | `feedType`, `sortBy`, `selectedPostTypes`       |
| `Chats.jsx`   | Chat list                 | `defaultGroups`, `customGroups`, `privateChats` |
| `Post.jsx`    | Create new post           | `postType`, `content`, `images[]`, `tags[]`     |
| `Profile.jsx` | Current user profile      | `userPosts`, `activeTab`                        |
| `Lecture.jsx` | Placeholder (Coming Soon) | N/A                                             |

**When to edit:**

- Feed display/filtering → `Home.jsx`
- Chat list → `Chats.jsx`
- Post creation → `Post.jsx`
- Own profile display → `Profile.jsx`

---

### 🖥️ MAIN SCREENS (`app/screens/`)

| File                        | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `Settings.jsx`              | Settings hub navigation                                |
| `ChatRoom.jsx`              | Chat messaging UI (uses `chatRoom/` subfolder)         |
| `PostDetails.jsx`           | Full post with replies (uses `postDetails/` subfolder) |
| `CreatePost.jsx`            | Alternative post creation                              |
| `EditPost.jsx`              | Edit existing post                                     |
| `UserProfile.jsx`           | View other user's profile                              |
| `FollowList.jsx`            | Followers/following list                               |
| `Notifications.jsx`         | Notification center                                    |
| `ChangePassword.jsx`        | Password change                                        |
| `ManageRepresentatives.jsx` | Class rep management                                   |

---

### 📂 SCREEN SUBFOLDERS

#### `screens/chatRoom/` - Chat Room Components

| File                 | Purpose                      |
| -------------------- | ---------------------------- |
| `index.js`           | Main ChatRoom export         |
| `useChatRoom.js`     | Chat logic hook              |
| `ChatRoomModals.jsx` | Image preview, forward, etc. |
| `styles.js`          | ChatRoom styles              |

#### `screens/postDetails/` - Post Details Components

| File                    | Purpose                 |
| ----------------------- | ----------------------- |
| `index.js`              | Main PostDetails export |
| `ReplyItem.jsx`         | Single reply display    |
| `ReplyInputSection.jsx` | Reply input UI          |
| `ImageGalleryModal.jsx` | Image viewer modal      |
| `styles.js`             | PostDetails styles      |

#### `screens/chats/` - Chat Management Screens

| File                 | Purpose                  |
| -------------------- | ------------------------ |
| `NewChat.jsx`        | Start private chat       |
| `UserSearch.jsx`     | Search users for chat    |
| `CreateGroup.jsx`    | Create custom group      |
| `GroupSettings.jsx`  | Group management         |
| `AddMembers.jsx`     | Add members to group     |
| `ForwardMessage.jsx` | Forward message to chats |

#### `screens/settings/` - Settings Sub-screens

| File                       | Purpose                     |
| -------------------------- | --------------------------- |
| `index.js`                 | Export all settings screens |
| `ProfileSettings.jsx`      | Edit profile info           |
| `AppearanceSettings.jsx`   | Theme, language, font       |
| `NotificationSettings.jsx` | Notification preferences    |
| `PrivacySettings.jsx`      | Password, security          |
| `ChatSettings.jsx`         | Chat customization          |
| `BlockList.jsx`            | Blocked users               |

---

### 🧩 COMPONENTS (`app/components/`)

#### Display Components

| File                     | Purpose                             | Used In                              |
| ------------------------ | ----------------------------------- | ------------------------------------ |
| `PostCard.jsx`           | Post display card                   | Home, Profile, UserProfile           |
| `ReplyCard.jsx`          | Reply display                       | PostDetails                          |
| `MessageBubble.jsx`      | Chat message                        | ChatRoom                             |
| `ChatListItem.jsx`       | Chat list entry                     | Chats tab                            |
| `UserCard.jsx`           | User info card                      | FollowList, UserSearch               |
| `ProfilePicture.jsx`     | Profile image with fallback         | Many screens                         |
| `ZoomableImageModal.jsx` | Zoomable image viewer with download | PostCard, MessageBubble, PostDetails |

#### Input Components

| File                        | Purpose               |
| --------------------------- | --------------------- |
| `MessageInput.jsx`          | Chat text input       |
| `SearchBar.jsx`             | Search input          |
| `ImagePicker.jsx`           | Image selection       |
| `SearchableDropdownNew.jsx` | Searchable select     |
| `LanguageDropdown.jsx`      | Language picker       |
| `LanguageSelector.jsx`      | Language selection UI |

#### UI Components

| File                       | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `GlassComponents.jsx`      | Glass morphism components (GlassCard, GlassButton, GlassInput) |
| `AnimatedBackground.jsx`   | Particle background                                            |
| `SkeletonLoader.jsx`       | Loading placeholders                                           |
| `ImageWithPlaceholder.jsx` | Image with blur loading                                        |
| `CustomAlert.jsx`          | Custom alert modal                                             |
| `KeyboardAwareView.jsx`    | Keyboard handling wrapper                                      |
| `ErrorBoundary.jsx`        | Error boundary                                                 |

#### Filter/Sort Components

| File                  | Purpose                            |
| --------------------- | ---------------------------------- |
| `FeedSelector.jsx`    | Feed type tabs (Dept/Major/Public) |
| `FilterSortModal.jsx` | Filtering/sorting modal            |
| `StageFilter.jsx`     | Stage/year filter                  |

#### `components/postCard/` - PostCard Subcomponents

| File                       | Purpose               |
| -------------------------- | --------------------- |
| `index.js`                 | Main PostCard export  |
| `PostCardImageGallery.jsx` | Image gallery in post |
| `PostCardMenu.jsx`         | Post action menu      |
| `styles.js`                | PostCard styles       |

---

### 🪝 HOOKS (`app/hooks/`)

| File                         | Purpose             | Key Exports                                                       |
| ---------------------------- | ------------------- | ----------------------------------------------------------------- |
| `useRealtimeSubscription.js` | Appwrite real-time  | `usePosts()`, `useChats()`, `useMessages()`, `useNotifications()` |
| `useCustomAlert.js`          | Alert modal hook    | `useCustomAlert()`                                                |
| `useTranslation.js`          | Translation wrapper | `useTranslation()`                                                |

---

### 🌍 CONTEXT (`app/context/`)

| File                     | Purpose                              | Key Exports                               |
| ------------------------ | ------------------------------------ | ----------------------------------------- |
| `UserContext.jsx`        | User state management                | `UserProvider`, `useUser()`               |
| `AppSettingsContext.jsx` | App settings (theme, language, etc.) | `AppSettingsProvider`, `useAppSettings()` |
| `LanguageContext.jsx`    | i18n management                      | `LanguageProvider`, `useLanguage()`       |

---

### 🗄️ DATABASE (`database/`)

| File                  | Purpose                         | Key Functions                                                                 |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `config.js`           | Appwrite client setup           | `client`, `account`, `databases`, `storage`, IDs                              |
| `index.js`            | Re-exports all database modules | -                                                                             |
| `auth.js`             | Authentication                  | `signIn()`, `signUp()`, `signOut()`, `getCurrentUser()`, `signInWithGoogle()` |
| `posts.js`            | Post CRUD                       | `createPost()`, `getPosts()`, `likePost()`, `bookmarkPost()`                  |
| `replies.js`          | Reply CRUD                      | `createReply()`, `getReplies()`, `likeReply()`                                |
| `chats.js`            | Chat/message operations         | `getChats()`, `sendMessage()`, `createPrivateChat()`, `createCustomGroup()`   |
| `chatHelpers.js`      | Chat utilities                  | `getChatPartnerInfo()`, `formatChatPreview()`                                 |
| `groupChatHelpers.js` | Group initialization            | `initializeDefaultGroups()`                                                   |
| `users.js`            | User management                 | `getUser()`, `updateUser()`, `followUser()`, `searchUsers()`                  |
| `notifications.js`    | Notification system             | `createNotification()`, `getNotifications()`, `markAsRead()`                  |
| `userChatSettings.js` | Per-chat settings               | Mute, bookmarks                                                               |

---

### 🌐 LOCALES (`locales/`)

| File      | Purpose                           |
| --------- | --------------------------------- |
| `i18n.js` | i18n setup, locale detection      |
| `en.js`   | English translations (~1100 keys) |
| `ar.js`   | Arabic translations (RTL)         |
| `ku.js`   | Kurdish translations              |

**Translation key structure:**

- `auth.*` - Authentication screens
- `posts.*` - Post-related
- `chats.*` - Chat-related
- `settings.*` - Settings screens
- `notifications.*` - Notifications
- `common.*` - Common UI elements
- `errors.*` - Error messages
- `universities.*`, `colleges.*`, `departments.*` - Academic data

---

### 🛠️ UTILS (`app/utils/`)

| File                     | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `cacheManager.js`        | AsyncStorage caching with TTL                     |
| `networkErrorHandler.js` | Network error handling                            |
| `responsive.js`          | Responsive sizing (`wp()`, `hp()`, `normalize()`) |
| `imageCompression.js`    | Image compression                                 |
| `postRanking.js`         | Post sorting algorithms                           |

---

### 📊 CONSTANTS (`app/constants/`)

| File                | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `postConstants.js`  | Post types, limits (10 images max, 5000 chars) |
| `feedCategories.js` | Feed types, major categories mapping           |

---

### 🎨 THEME (`app/theme/`)

| File              | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `designTokens.js` | Design system tokens (lightColors, darkColors, typography, spacing, shadows) |

---

### 📤 SERVICES (`services/`)

| File              | Purpose               |
| ----------------- | --------------------- |
| `imgbbService.js` | Image upload to ImgBB |

---

### 📊 DATA (`app/data/`)

| File                  | Purpose                                 |
| --------------------- | --------------------------------------- |
| `universitiesData.js` | University/college/department hierarchy |

---

## 🔍 COMMON EDIT SCENARIOS

### "Fix post creation"

→ Check: `app/tabs/Post.jsx`, `database/posts.js`

### "Fix chat messages"

→ Check: `app/screens/chatRoom/`, `database/chats.js`

### "Fix authentication"

→ Check: `app/auth/`, `database/auth.js`

### "Fix profile display"

→ Check: `app/tabs/Profile.jsx` (own), `app/screens/UserProfile.jsx` (others)

### "Fix post display"

→ Check: `app/components/PostCard.jsx`, `app/components/postCard/`

### "Fix settings"

→ Check: `app/screens/settings/`, `app/context/AppSettingsContext.jsx`

### "Add translation"

→ Check: `locales/en.js`, `locales/ar.js`, `locales/ku.js`

### "Fix styling/theme"

→ Check: `app/theme/designTokens.js`, component's local styles

### "Fix notifications"

→ Check: `app/screens/Notifications.jsx`, `database/notifications.js`

### "Fix feed/home"

→ Check: `app/tabs/Home.jsx`, `database/posts.js`


## 📱 NAVIGATION STRUCTURE

```
Stack Navigator (App.js)
├── SignIn
├── SignUp
├── VerifyEmail
├── MainTabs (Tab Navigator)
│   ├── Home
│   ├── Chats
│   ├── Post
│   ├── Lecture
│   └── Profile
├── Settings
├── ProfileSettings
├── AppearanceSettings
├── NotificationSettings
├── PrivacySettings
├── ChatSettings
├── BlockList
├── ChatRoom
├── PostDetails
├── EditPost
├── UserProfile
├── FollowList
├── Notifications
├── NewChat
├── CreateGroup
├── GroupSettings
├── AddMembers
├── ForwardMessage
├── ChangePassword
└── ManageRepresentatives
```

---

## 🔗 KEY DEPENDENCIES BETWEEN FILES

| When Editing             | Also Check                                |
| ------------------------ | ----------------------------------------- |
| `PostCard.jsx`           | `postCard/styles.js`, `database/posts.js` |
| `MessageBubble.jsx`      | `chatRoom/styles.js`, `database/chats.js` |
| `UserContext.jsx`        | `database/auth.js`, `database/users.js`   |
| `AppSettingsContext.jsx` | `theme/designTokens.js`                   |
| Any screen               | Corresponding `database/*.js` file        |
| Any component            | `locales/*.js` for new text               |
