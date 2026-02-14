# 🎓 College Community

A comprehensive React Native mobile application designed exclusively for college and university students to communicate, collaborate, share academic resources, and build a connected campus community.

---

## 📱 App Overview

**College Community** is a full-featured social and academic platform that connects students within their university ecosystem. The app provides department-specific feeds, real-time group chats, Q&A forums, and a robust notification system - all while supporting multiple languages and offering a modern, customizable user experience.

### 🎯 Target Audience

- University and college students
- Academic institutions (specifically designed with educational email verification)
- Students in Iraq/Kurdistan region (with support for EPU - Erbil Polytechnic University)

### 🌍 Supported Languages

- **English** (en)
- **Arabic** (ar) - with RTL support
- **Kurdish** (ku)

---

## ✨ Complete Feature List

### 🔐 Authentication & Account Management

| Feature                            | Description                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| **Email/Password Sign Up**         | Multi-step registration with university, college, and department selection        |
| **Educational Email Verification** | Only educational email addresses are allowed (blocks Gmail, Yahoo, Outlook, etc.) |
| **Email OTP Verification**         | 6-digit code sent to verify email address                                         |
| **Sign In**                        | Email/password authentication with session persistence                            |
| **Google OAuth Sign In**           | Sign in with Google account (with additional profile completion)                  |
| **Password Recovery**              | Forgot password flow with email-based reset link                                  |
| **Password Change**                | Change password from within the app                                               |
| **Session Management**             | Automatic session checking and persistence                                        |
| **Sign Out**                       | Secure logout with session cleanup                                                |

### 📰 Home Feed & Posts

| Feature                  | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| **Multi-Feed Types**     | Switch between Department feed, Major/College feed, and Public feed |
| **Post Types**           | Question, Discussion, Note, Announcement - each with unique styling |
| **Stage/Year Filtering** | Filter posts by academic year (1st-6th year or "all")               |
| **Advanced Sorting**     | Sort by Newest, Oldest, or Most Popular                             |
| **Post Type Filtering**  | Filter by specific post types                                       |
| **Pull-to-Refresh**      | Refresh feed content                                                |
| **Infinite Scroll**      | Load more posts automatically                                       |
| **Real-time Updates**    | New posts appear automatically via Appwrite Realtime                |
| **Like/Unlike Posts**    | Heart reaction with like count                                      |
| **View Counter**         | Track post views (excludes own posts)                               |
| **Search Posts**         | Search within the feed                                              |
| **Scroll-to-Top**        | Quick button to return to top of feed                               |

### ✍️ Post Creation & Management

| Feature                     | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| **Rich Post Creation**      | Create posts with topic, description, images, tags, and links |
| **Multiple Images**         | Attach up to 10 images per post with compression              |
| **Image Gallery**           | View attached images in full-screen zoomable gallery          |
| **Hashtags/Tags**           | Add searchable tags to posts                                  |
| **External Links**          | Attach relevant URLs to posts                                 |
| **Public/Department Posts** | Choose to post publicly or to your department                 |
| **Stage Targeting**         | Target posts to specific academic years                       |
| **Edit Posts**              | Modify your posts after publishing                            |
| **Delete Posts**            | Remove your posts with confirmation                           |
| **Mark as Resolved**        | Mark question posts as resolved (for post owner)              |
| **Report Posts**            | Report inappropriate content                                  |

### 💬 Post Details & Replies

| Feature             | Description                                    |
| ------------------- | ---------------------------------------------- |
| **Full Post View**  | Detailed view of post with all content         |
| **Reply System**    | Add replies/answers to posts                   |
| **Reply Images**    | Attach up to 5 images per reply                |
| **Reply Links**     | Add links to replies                           |
| **Upvote/Downvote** | Vote on replies for quality                    |
| **Accept Answer**   | Post owner can mark a reply as accepted answer |
| **Edit Replies**    | Modify your replies                            |
| **Delete Replies**  | Remove your replies                            |
| **User Navigation** | Tap on reply author to view their profile      |

### 💭 Chat System

#### Group Chats

| Feature                      | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| **Default Stage Groups**     | Auto-created groups for each stage/year in your department  |
| **Default Department Group** | Auto-created group for entire department                    |
| **Custom Groups**            | Create your own groups with friends/classmates              |
| **Group Photos**             | Set custom group profile pictures                           |
| **Group Settings**           | Configure group name, description, and permissions          |
| **Admin Controls**           | Assign admins, manage members                               |
| **Representative System**    | Designate class representatives with special posting rights |
| **Only Admins Can Post**     | Optional setting to restrict posting                        |
| **Member Management**        | Add/remove members from custom groups                       |
| **Leave Group**              | Leave custom groups (cannot leave default groups)           |

#### Private Chats

| Feature               | Description                           |
| --------------------- | ------------------------------------- |
| **1-on-1 Messaging**  | Direct private conversations          |
| **Start New Chat**    | Search and start chats with any user  |
| **Chat from Profile** | Start chat directly from user profile |

#### Messaging Features

| Feature                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| **Real-time Messages** | Instant message delivery via Appwrite Realtime |
| **Text Messages**      | Send text content                              |
| **Image Messages**     | Send images (with compression)                 |
| **Message Replies**    | Reply to specific messages                     |
| **Forward Messages**   | Forward messages to other chats                |
| **Copy Messages**      | Copy message text to clipboard                 |
| **Delete Messages**    | Delete your own messages                       |
| **Pin Messages**       | Pin important messages (admin feature)         |
| **Bookmark Messages**  | Save messages for later                        |
| **@Mentions**          | Mention specific users or @everyone            |
| **Message Search**     | Search within chat messages                    |
| **Message Reactions**  | React to messages with emojis                  |
| **Read Receipts**      | See who has read messages                      |
| **Delivery Status**    | Message sent/delivered/read indicators         |
| **Typing Indicators**  | See when others are typing                     |
| **Unread Count Badge** | Badge showing unread messages                  |
| **Mute Chats**         | Mute notifications for specific chats          |

#### Chat Customization

| Feature               | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| **Bubble Styles**     | Choose from multiple message bubble styles (default, minimal, rounded, sharp) |
| **Bubble Colors**     | Customize sent message bubble color                                           |
| **Background Images** | Set chat background (gradients, images, or custom)                            |
| **Font Size**         | Adjust message font size                                                      |

### 👤 User Profiles

| Feature                       | Description                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| **Profile Picture**           | Upload and update profile photo                                     |
| **Bio**                       | Add personal biography                                              |
| **Academic Info**             | Display university, college, department, and year                   |
| **Social Links**              | Add Instagram, Twitter/X, LinkedIn, GitHub, and website links       |
| **Social Links Privacy**      | Control who sees your social links (everyone, followers, or no one) |
| **Post Count**                | Display total posts created                                         |
| **Follower/Following Counts** | Social connection statistics                                        |
| **User Posts Tab**            | View all posts by user                                              |
| **Edit Profile**              | Update all profile information                                      |
| **Academic Info Cooldown**    | 30-day cooldown on academic info changes to prevent abuse           |

### 👥 Social Features

| Feature                | Description                             |
| ---------------------- | --------------------------------------- |
| **Follow Users**       | Follow other users to see their content |
| **Unfollow Users**     | Unfollow users                          |
| **Followers List**     | View who follows you                    |
| **Following List**     | View who you follow                     |
| **Block Users**        | Block users from interacting with you   |
| **Blocked Users List** | Manage your blocked users               |
| **Share Profile**      | Share profile link with others          |
| **User Search**        | Search for users by name                |

### 🔔 Notifications

| Feature                        | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| **Push Notifications**         | Native push notifications via Expo             |
| **In-App Notifications**       | Notification center within the app             |
| **Post Like Notifications**    | Get notified when someone likes your post      |
| **Reply Notifications**        | Get notified when someone replies to your post |
| **Follow Notifications**       | Get notified when someone follows you          |
| **Mention Notifications**      | Get notified when mentioned in posts/chats     |
| **Chat Message Notifications** | Notifications for new chat messages            |
| **Grouped Notifications**      | Multiple likes grouped together                |
| **Mark as Read**               | Mark individual or all notifications as read   |
| **Delete Notifications**       | Remove individual or all notifications         |
| **Notification Badges**        | Unread count badges on tabs                    |

#### Notification Settings

| Feature                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| **Global Toggle**       | Enable/disable all notifications                |
| **Post Likes Toggle**   | Control post like notifications                 |
| **Post Replies Toggle** | Control reply notifications                     |
| **Mentions Toggle**     | Control mention notifications                   |
| **Direct Chat Toggle**  | Control private chat notifications              |
| **Group Chat Toggle**   | Control group chat notifications                |
| **Friend Posts Toggle** | Control notifications for followed users' posts |
| **Sound Settings**      | Enable/disable notification sounds              |
| **Vibration Settings**  | Enable/disable vibration                        |
| **Quiet Hours**         | Set do-not-disturb time periods                 |

### ⚙️ Settings & Customization

#### Profile Settings

- Edit full name, bio, profile picture
- Update university, college, department, stage
- Manage social links and their visibility

#### Personalization Settings

| Feature                | Description                             |
| ---------------------- | --------------------------------------- |
| **Theme Mode**         | Light, Dark, or System default          |
| **Language Selection** | Switch between English, Arabic, Kurdish |
| **Compact Mode**       | Denser UI layout option                 |
| **Font Size**          | Adjust app-wide font size               |
| **Accent Color**       | Choose custom accent color              |

#### Chat Customization

| Feature                  | Description                          |
| ------------------------ | ------------------------------------ |
| **Message Bubble Style** | Default, Minimal, Rounded, Sharp     |
| **Sent Message Color**   | Custom color for your sent messages  |
| **Chat Background**      | Gradient backgrounds or custom image |
| **Message Font Size**    | Independent chat font size           |

#### Account Settings

| Feature             | Description                         |
| ------------------- | ----------------------------------- |
| **Change Password** | Update account password             |
| **Sign Out**        | Log out of account                  |
| **Delete Account**  | Permanently delete account and data |

### 🎨 UI/UX Features

| Feature                   | Description                          |
| ------------------------- | ------------------------------------ |
| **Glass Morphism Design** | Modern frosted glass UI elements     |
| **Animated Backgrounds**  | Particle animation backgrounds       |
| **Smooth Animations**     | Spring animations throughout the app |
| **Skeleton Loaders**      | Loading placeholders for better UX   |
| **Pull-to-Refresh**       | Standard refresh patterns            |
| **Keyboard Handling**     | Proper keyboard avoiding views       |
| **Safe Area Support**     | Notch and home indicator support     |
| **Responsive Design**     | Adapts to different screen sizes     |
| **RTL Support**           | Right-to-left layout for Arabic      |
| **Custom Alerts**         | Styled alert dialogs                 |
| **Image Zoom**            | Pinch-to-zoom on images              |
| **Image Download**        | Save images to device gallery        |
| **Error Boundaries**      | Graceful error handling              |

### 📚 Academic Features

| Feature                   | Description                                         |
| ------------------------- | --------------------------------------------------- |
| **University Hierarchy**  | Full university → college → department structure    |
| **Stage System**          | Support for 1-6 year academic programs              |
| **Department-based Feed** | Content filtered by academic department             |
| **College/Major Feed**    | Content from related departments                    |
| **Class Representatives** | Special role for class reps with posting privileges |
| **Lecture Tab**           | Placeholder for future lecture/timetable features   |

---

## 🏗️ Technical Architecture

### Tech Stack

| Technology             | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| **React Native**       | Cross-platform mobile framework                          |
| **Expo SDK 54**        | Development and build tooling                            |
| **Appwrite**           | Backend-as-a-Service (Auth, Database, Storage, Realtime) |
| **React Navigation 7** | Navigation (Stack + Bottom Tabs)                         |
| **React Context API**  | State management                                         |
| **i18n-js**            | Internationalization                                     |
| **Expo Notifications** | Push notifications                                       |
| **ImgBB API**          | Image hosting service                                    |
| **AsyncStorage**       | Local data persistence                                   |

### Key Dependencies

```json
{
  "expo": "~54.0.31",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "appwrite": "^21.2.1",
  "@react-navigation/native": "^7.1.18",
  "@react-navigation/stack": "^7.4.10",
  "@react-navigation/bottom-tabs": "^7.4.9",
  "i18n-js": "^4.5.1",
  "expo-notifications": "~0.32.16",
  "expo-image-picker": "~17.0.10",
  "expo-blur": "~15.0.8",
  "expo-linear-gradient": "~15.0.8"
}
```

### Database Collections (Appwrite)

| Collection           | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| **users**            | User profiles, followers, following, blocked users |
| **posts**            | Feed posts with likes, views, tags                 |
| **replies**          | Post replies with upvotes/downvotes                |
| **chats**            | Chat rooms (groups and private)                    |
| **messages**         | Chat messages with reactions, read receipts        |
| **notifications**    | User notifications                                 |
| **userChatSettings** | Per-user chat preferences (mute, bookmarks)        |
| **pushTokens**       | Expo push notification tokens                      |

### Project Structure

```
college-community/
├── app/
│   ├── App.js                 # Main app entry with navigation
│   ├── auth/                  # Authentication screens
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   ├── VerifyEmail.jsx
│   │   └── ForgotPassword.jsx
│   ├── tabs/                  # Bottom tab screens
│   │   ├── Home.jsx           # Main feed
│   │   ├── Chats.jsx          # Chat list
│   │   ├── Post.jsx           # Create post
│   │   ├── Lecture.jsx        # Coming soon
│   │   └── Profile.jsx        # User profile
│   ├── screens/               # Stack screens
│   │   ├── ChatRoom.jsx       # Chat messaging
│   │   ├── PostDetails.jsx    # Full post view
│   │   ├── UserProfile.jsx    # Other user profiles
│   │   ├── Notifications.jsx  # Notification center
│   │   ├── Settings.jsx       # Settings hub
│   │   ├── settings/          # Settings sub-screens
│   │   ├── chats/             # Chat management screens
│   │   └── ...
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context providers
│   ├── hooks/                 # Custom React hooks
│   ├── theme/                 # Design tokens
│   ├── utils/                 # Utility functions
│   ├── constants/             # App constants
│   └── data/                  # Static data (universities)
├── database/                  # Appwrite database functions
├── services/                  # External services (ImgBB, Push)
├── locales/                   # Translation files (en, ar, ku)
└── assets/                    # Images and icons
```

---

## 🔒 Privacy & Security Features

- **Educational Email Only**: Blocks public email providers to ensure only students can register
- **Email Verification**: OTP verification required before account activation
- **User Blocking**: Block unwanted users from interactions
- **Private Profiles**: Option to control who sees your information
- **Social Links Privacy**: Control visibility of social media links
- **Chat Muting**: Mute specific conversations
- **Report System**: Report inappropriate posts
- **Secure Authentication**: Appwrite-based secure auth with session management
- **Data Caching**: Secure local caching with TTL

---

## 📲 App Information

| Property                   | Value                            |
| -------------------------- | -------------------------------- |
| **App Name**               | College Community                |
| **Package Name (Android)** | com.college.community            |
| **Bundle ID (iOS)**        | com.college.community            |
| **Version**                | 1.0.0                            |
| **Orientation**            | Portrait only                    |
| **Min SDK**                | iOS 13+ / Android 6+ (API 23)    |
| **Primary Color**          | #007AFF (Blue)                   |
| **Background Color**       | #1a1a2e (Dark) / #FFFFFF (Light) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Appwrite backend instance (configured)
- ImgBB API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/college-community.git
   cd college-community
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables (create `.env` file):

   ```env
   EXPO_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite.io/v1
   EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
   EXPO_PUBLIC_APPWRITE_BUCKET_ID=your-bucket-id
   EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=your-users-collection
   EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID=your-posts-collection
   EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID=your-replies-collection
   EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=your-chats-collection
   EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=your-messages-collection
   EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID=your-notifications-collection
   EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID=your-settings-collection
   EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID=your-tokens-collection
   EXPO_PUBLIC_IMGBB_API_KEY=your-imgbb-key
   EXPO_PUBLIC_REPORT_REVIEW_ENDPOINT=https://your-backend.example.com/moderation/review-request
   ```

4. Start development server:

   ```bash
   npm start
   ```

5. Run on device:
   - Scan QR code with Expo Go app
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (macOS only)

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

---

## 📄 Data Collection & Usage

The app collects and stores the following user data:

| Data Type                     | Purpose                        | Storage              |
| ----------------------------- | ------------------------------ | -------------------- |
| Email Address                 | Authentication & Communication | Appwrite Auth        |
| Full Name                     | Display in app                 | Appwrite Database    |
| Profile Picture               | User identification            | ImgBB + Appwrite     |
| University/College/Department | Content filtering & grouping   | Appwrite Database    |
| Posts & Replies               | User-generated content         | Appwrite Database    |
| Chat Messages                 | Communication                  | Appwrite Database    |
| Follow Relationships          | Social features                | Appwrite Database    |
| Device Push Token             | Notifications                  | Appwrite Database    |
| App Preferences               | User experience                | AsyncStorage (local) |

---

## 🎯 Use Cases

1. **Academic Q&A**: Students can ask questions and get answers from classmates
2. **Resource Sharing**: Share notes, links, and study materials
3. **Class Communication**: Default groups for each class/stage
4. **Department Announcements**: Representatives can post announcements
5. **Peer Connection**: Find and follow classmates
6. **Private Discussions**: Direct messaging for personal conversations
7. **Study Groups**: Create custom groups for projects or study sessions

---

## 📞 Support & Contact

For issues, feature requests, or contributions, please open an issue on the repository.

---

## 📜 License

This project is proprietary software. All rights reserved.

---

_Last updated: January 2026_
