---
applyTo: "**"
---

# 📊 COLLEGE COMMUNITY - DATABASE SCHEMA
NOTE This file is generated a month ago and the current database may have many changes . 

> **CRITICAL**: This is the complete Appwrite database schema. Always reference this when working with database operations.

---

## 🗂️ COLLECTION OVERVIEW

| Collection           | Purpose                       | Config Key                     |
| -------------------- | ----------------------------- | ------------------------------ |
| **users**            | User profiles & account info  | `usersCollectionId`            |
| **posts**            | Posts/questions in the feed   | `postsCollectionId`            |
| **replies**          | Replies/answers to posts      | `repliesCollectionId`          |
| **chats**            | Chat rooms (groups & private) | `chatsCollectionId`            |
| **messages**         | Chat messages                 | `messagesCollectionId`         |
| **notifications**    | User notifications            | `notificationsCollectionId`    |
| **userChatSettings** | Per-user chat preferences     | `userChatSettingsCollectionId` |
| **pushTokens**       | Expo push notification tokens | `pushTokensCollectionId`       |

---

## 👤 USERS COLLECTION

Stores user profile information and account data.

| Column Name          | Type     | Size   | Required | Default | Indexed | Notes                            |
| -------------------- | -------- | ------ | -------- | ------- | ------- | -------------------------------- |
| `$id`                | string   | -      | auto     | -       | ✓       | Document ID (same as `userID`)   |
| `userID`             | string   | 255    | ✓        | -       | -       | Appwrite Auth user ID            |
| `name`               | string   | 255    | ✓        | -       | ✓       | Display name                     |
| `email`              | string   | 320    | ✓        | -       | -       | User email                       |
| `bio`                | string   | 500    | -        | NULL    | -       | Profile bio                      |
| `profilePicture`     | string   | 255    | -        | NULL    | -       | Profile image URL                |
| `isEmailVerified`    | boolean  | -      | ✓        | -       | -       | Email verification status        |
| `university`         | string   | 255    | -        | NULL    | -       | University name                  |
| `major`              | string   | 255    | -        | NULL    | -       | Major/college name               |
| `department`         | string   | 255    | -        | NULL    | ✓       | Department name                  |
| `year`               | integer  | 1-6    | -        | 1       | -       | Academic year/stage              |
| `followersCount`     | integer  | Min: 0 | -        | 0       | -       | Number of followers              |
| `followingCount`     | integer  | Min: 0 | -        | 0       | -       | Number following                 |
| `postsCount`         | integer  | Min: 0 | -        | 0       | -       | Total posts created              |
| `following[]`        | string   | 999999 | -        | NULL    | -       | Array of user IDs being followed |
| `followers[]`        | string   | 999999 | -        | NULL    | -       | Array of follower user IDs       |
| `blockedUsers[]`     | string   | 999999 | -        | NULL    | -       | Array of blocked user IDs        |
| `pronouns`           | string   | 30     | -        | NULL    | -       | User pronouns                    |
| `isActive`           | boolean  | -      | -        | true    | -       | Account active status            |
| `isPrivateProfile`   | boolean  | -      | -        | false   | -       | Profile privacy setting          |
| `coverPhoto`         | string   | 500    | -        | NULL    | -       | Cover photo URL                  |
| `lastSeen`           | datetime | -      | -        | NULL    | -       | Last activity timestamp          |
| `lastAcademicUpdate` | datetime | -      | -        | NULL    | -       | Last academic info update        |
| `profileViews`       | string   | 10000  | -        | NULL    | -       | Profile view tracking            |
| `$createdAt`         | datetime | -      | auto     | -       | -       | Creation timestamp               |
| `$updatedAt`         | datetime | -      | auto     | -       | -       | Last update timestamp            |

**Key Functions**: `getUserById()`, `updateUser()`, `followUser()`, `unfollowUser()`, `searchUsers()`

---

## 📝 POSTS COLLECTION

Stores all posts/questions in the feed.

| Column Name           | Type     | Size   | Required | Default | Indexed | Notes                             |
| --------------------- | -------- | ------ | -------- | ------- | ------- | --------------------------------- |
| `$id`                 | string   | -      | auto     | -       | ✓       | Document ID                       |
| `userId`              | string   | 500    | ✓        | -       | ✓       | Author user ID                    |
| `text`                | string   | 5000   | -        | NULL    | -       | Post content                      |
| `topic`               | string   | 255    | -        | NULL    | -       | Post title/topic                  |
| `department`          | string   | 255    | ✓        | -       | ✓       | Target department                 |
| `stage`               | string   | 255    | ✓        | -       | ✓       | Target stage (1-6 or "all")       |
| `postType`            | string   | 255    | ✓        | -       | ✓       | Type: question, note, resource... |
| `images[]`            | string   | 2000   | -        | NULL    | -       | Array of image URLs               |
| `imageDeleteUrls[]`   | string   | 2000   | -        | NULL    | -       | ImgBB delete URLs                 |
| `isResolved`          | boolean  | -      | -        | false   | -       | Question resolved status          |
| `viewCount`           | integer  | -      | -        | 0       | -       | Total views                       |
| `likeCount`           | integer  | -      | -        | 0       | -       | Total likes                       |
| `replyCount`          | integer  | -      | -        | 0       | -       | Total replies                     |
| `isEdited`            | boolean  | -      | -        | false   | -       | Edit status                       |
| `tags[]`              | string   | 2000   | -        | NULL    | -       | Hashtags array                    |
| `links[]`             | string   | 2000   | -        | NULL    | -       | Attached links                    |
| `likedBy[]`           | string   | 999999 | -        | NULL    | -       | Array of user IDs who liked       |
| `viewedBy[]`          | string   | 999999 | -        | NULL    | -       | Array of user IDs who viewed      |
| `isHiddenFromProfile` | boolean  | -      | -        | false   | -       | Hide from profile feed            |
| `semester`            | string   | 20     | -        | NULL    | -       | Academic semester                 |
| `$createdAt`          | datetime | -      | auto     | -       | ✓       | Creation timestamp                |
| `$updatedAt`          | datetime | -      | auto     | -       | -       | Last update timestamp             |

**Post Types**: `question`, `note`, `resource`, `discussion`, `announcement`

**Key Functions**: `createPost()`, `getPost()`, `getPosts()`, `togglePostLike()`, `markQuestionAsResolved()`

---

## 💬 REPLIES COLLECTION

Stores replies/answers to posts.

| Column Name         | Type     | Size   | Required | Default | Indexed | Notes                           |
| ------------------- | -------- | ------ | -------- | ------- | ------- | ------------------------------- |
| `$id`               | string   | -      | auto     | -       | ✓       | Document ID                     |
| `postId`            | string   | 128    | ✓        | -       | ✓       | Parent post ID                  |
| `userId`            | string   | 128    | ✓        | -       | ✓       | Author user ID                  |
| `text`              | string   | 500    | ✓        | -       | -       | Reply content                   |
| `isAccepted`        | boolean  | -      | -        | NULL    | -       | Accepted answer status          |
| `images[]`          | string   | 2000   | -        | NULL    | -       | Array of image URLs             |
| `imageDeleteUrls[]` | string   | 2000   | -        | NULL    | -       | ImgBB delete URLs               |
| `isEdited`          | boolean  | -      | -        | false   | -       | Edit status                     |
| `parentReplyId`     | string   | 255    | -        | NULL    | -       | Parent reply for nested replies |
| `upCount`           | integer  | Min: 0 | -        | 0       | -       | Upvote count                    |
| `downCount`         | integer  | Min: 0 | -        | 0       | -       | Downvote count                  |
| `upvotedBy[]`       | string   | 50000  | -        | NULL    | -       | Users who upvoted               |
| `downvotedBy[]`     | string   | 50000  | -        | NULL    | -       | Users who downvoted             |
| `links[]`           | string   | 2000   | -        | NULL    | -       | Attached links                  |
| `$createdAt`        | datetime | -      | auto     | -       | ✓       | Creation timestamp              |
| `$updatedAt`        | datetime | -      | auto     | -       | -       | Last update timestamp           |

**Key Functions**: `createReply()`, `getRepliesByPost()`, `updateReply()`, `deleteReply()`

---

## 🗨️ CHATS COLLECTION

Stores chat rooms (groups and private chats).

| Column Name              | Type     | Size   | Required | Default | Indexed | Notes                           |
| ------------------------ | -------- | ------ | -------- | ------- | ------- | ------------------------------- |
| `$id`                    | string   | -      | auto     | -       | ✓       | Document ID                     |
| `name`                   | string   | 128    | ✓        | -       | -       | Chat/group name                 |
| `department`             | string   | 128    | -        | NULL    | ✓       | Department (for default groups) |
| `type`                   | string   | 255    | ✓        | -       | -       | Chat type (see below)           |
| `stage`                  | string   | 128    | -        | NULL    | ✓       | Stage (for stage groups)        |
| `requiresRepresentative` | boolean  | -      | -        | false   | -       | Only reps can post              |
| `representatives[]`      | string   | 1000   | -        | NULL    | -       | Representative user IDs         |
| `description`            | string   | 1000   | -        | NULL    | -       | Group description               |
| `lastMessage`            | string   | 1000   | -        | NULL    | -       | Preview of last message         |
| `messageCount`           | integer  | Min: 0 | -        | 0       | -       | Total message count             |
| `lastMessageAt`          | datetime | -      | -        | NULL    | -       | Last message timestamp          |
| `participants[]`         | string   | 999999 | -        | NULL    | -       | Array of participant user IDs   |
| `chatKey`                | string   | 255    | -        | NULL    | ✓       | Unique key for private chats    |
| `admins[]`               | string   | 2000   | -        | NULL    | -       | Admin user IDs                  |
| `settings`               | string   | 2000   | -        | NULL    | -       | JSON settings object            |
| `groupPhoto`             | string   | 2000   | -        | NULL    | -       | Group photo URL                 |
| `pinnedMessages[]`       | string   | 2000   | -        | NULL    | -       | Pinned message IDs              |
| `typingUsers`            | string   | 2000   | -        | NULL    | -       | Currently typing users          |
| `course`                 | string   | 200    | -        | NULL    | -       | Course name (for study groups)  |
| `isStudyGroup`           | boolean  | -      | -        | false   | -       | Study group flag                |
| `$createdAt`             | datetime | -      | auto     | -       | ✓       | Creation timestamp              |
| `$updatedAt`             | datetime | -      | auto     | -       | -       | Last update timestamp           |

**Chat Types**:

- `stage_group` - Default stage/year group
- `department_group` - Default department group
- `custom_group` - User-created group
- `private` - Private 1-on-1 chat

**Key Functions**: `createChat()`, `getChats()`, `getUserGroupChats()`, `deleteChat()`

---

## 📨 MESSAGES COLLECTION

Stores individual chat messages.

| Column Name      | Type     | Size  | Required | Default | Indexed | Notes                            |
| ---------------- | -------- | ----- | -------- | ------- | ------- | -------------------------------- |
| `$id`            | string   | -     | auto     | -       | ✓       | Document ID                      |
| `chatId`         | string   | 255   | ✓        | -       | ✓       | Parent chat ID                   |
| `senderId`       | string   | 255   | ✓        | -       | -       | Sender user ID                   |
| `senderName`     | string   | 255   | ✓        | -       | -       | Sender display name              |
| `content`        | string   | 2550  | -        | NULL    | -       | Message text                     |
| `images[]`       | string   | 10000 | -        | NULL    | -       | Array of image URLs              |
| `type`           | string   | 50    | -        | NULL    | -       | Message type (text, image, etc.) |
| `imageUrl`       | string   | 2000  | -        | NULL    | -       | Single image URL (preferred)     |
| `readBy[]`       | string   | 99999 | -        | NULL    | -       | Users who read the message       |
| `replyToId`      | string   | 255   | -        | NULL    | -       | Replied message ID               |
| `replyToContent` | string   | 200   | -        | NULL    | -       | Preview of replied message       |
| `replyToSender`  | string   | 255   | -        | NULL    | -       | Original sender name             |
| `isPinned`       | boolean  | -     | -        | false   | ✓       | Pinned status                    |
| `pinnedBy`       | string   | 255   | -        | NULL    | -       | User who pinned                  |
| `pinnedAt`       | datetime | -     | -        | NULL    | -       | When pinned                      |
| `mentionsAll`    | boolean  | -     | -        | false   | -       | @everyone mention                |
| `mentions[]`     | string   | 2000  | -        | NULL    | -       | Mentioned user IDs               |
| `reactions`      | string   | 5000  | -        | NULL    | -       | JSON reactions object            |
| `status`         | string   | 20    | -        | sent    | -       | Message status (sent/delivered)  |
| `deliveredTo[]`  | string   | 50000 | -        | NULL    | -       | Users who received push notif    |
| `$createdAt`     | datetime | -     | auto     | -       | ✓       | Creation timestamp               |
| `$updatedAt`     | datetime | -     | auto     | -       | -       | Last update timestamp            |

**Key Functions**: `sendMessage()`, `getMessages()`, `deleteMessage()`, `clearChatMessages()`

---

## 🔔 NOTIFICATIONS COLLECTION

Stores user notifications.

| Column Name            | Type     | Size | Required | Default | Indexed | Notes                         |
| ---------------------- | -------- | ---- | -------- | ------- | ------- | ----------------------------- |
| `$id`                  | string   | -    | auto     | -       | ✓       | Document ID                   |
| `userId`               | string   | 255  | ✓        | -       | ✓       | Recipient user ID             |
| `senderId`             | string   | 255  | ✓        | -       | -       | Action performer ID           |
| `senderName`           | string   | 255  | -        | NULL    | -       | Action performer name         |
| `senderProfilePicture` | string   | 999  | -        | NULL    | -       | Sender's profile picture      |
| `type`                 | string   | 255  | -        | NULL    | -       | Notification type (see below) |
| `postId`               | string   | 255  | -        | NULL    | -       | Related post ID               |
| `postPreview`          | string   | 1000 | -        | NULL    | -       | Preview of post content       |
| `new_follower`         | string   | 5000 | -        | NULL    | -       | Follower info (legacy)        |
| `isRead`               | boolean  | -    | -        | false   | -       | Read status                   |
| `$createdAt`           | datetime | -    | auto     | -       | ✓       | Creation timestamp            |
| `$updatedAt`           | datetime | -    | auto     | -       | -       | Last update timestamp         |

**Notification Types**:

- `post_like` - Someone liked a post
- `post_reply` - Someone replied to a post
- `mention` - Someone mentioned the user
- `friend_post` - A followed user posted
- `follow` - Someone started following

**Key Functions**: `createNotification()`, `getNotifications()`, `markNotificationAsRead()`, `markAllAsRead()`

---

## ⚙️ USER CHAT SETTINGS COLLECTION

Stores per-user, per-chat settings.

| Column Name        | Type     | Size | Required | Default | Indexed | Notes                    |
| ------------------ | -------- | ---- | -------- | ------- | ------- | ------------------------ |
| `$id`              | string   | -    | auto     | -       | ✓       | Document ID              |
| `userId`           | string   | 255  | ✓        | -       | ✓       | User ID                  |
| `chatId`           | string   | 255  | ✓        | -       | ✓       | Chat ID                  |
| `isMuted`          | boolean  | -    | -        | false   | -       | Mute status              |
| `muteExpiresAt`    | datetime | -    | -        | NULL    | -       | When mute expires        |
| `muteType`         | string   | 50   | -        | none    | -       | none, all, mentions_only |
| `bookmarkedMsgs[]` | string   | 5000 | -        | NULL    | -       | Bookmarked message IDs   |
| `notifyOnMention`  | boolean  | -    | -        | true    | -       | Notify on @mention       |
| `notifyOnAll`      | boolean  | -    | -        | true    | -       | Notify on all messages   |
| `$createdAt`       | datetime | -    | auto     | -       | -       | Creation timestamp       |
| `$updatedAt`       | datetime | -    | auto     | -       | -       | Last update timestamp    |

**Key Functions**: `getUserChatSettings()`, `updateUserChatSettings()`, `muteChat()`, `unmuteChat()`

---

## 📱 PUSH TOKENS COLLECTION

Stores Expo push notification tokens.

| Column Name  | Type     | Size | Required | Default | Indexed | Notes                 |
| ------------ | -------- | ---- | -------- | ------- | ------- | --------------------- |
| `$id`        | string   | -    | auto     | -       | ✓       | Document ID           |
| `userId`     | string   | 36   | ✓        | -       | ✓       | User ID               |
| `token`      | string   | 255  | ✓        | -       | -       | Expo push token       |
| `platform`   | string   | 10   | -        | NULL    | -       | ios or android        |
| `$createdAt` | datetime | -    | auto     | -       | -       | Creation timestamp    |
| `$updatedAt` | datetime | -    | auto     | -       | -       | Last update timestamp |

**Key Functions**: `savePushToken()`, `removePushToken()`, `getPushTokensForUser()`

---

## 🔗 RELATIONSHIPS

```
users ─┬─────────────────> posts (userId)
       │
       ├─────────────────> replies (userId)
       │
       ├─────────────────> notifications (userId, senderId)
       │
       ├─────────────────> chats.participants[]
       │
       ├─────────────────> messages (senderId)
       │
       ├─────────────────> userChatSettings (userId)
       │
       └─────────────────> pushTokens (userId)

posts ───────────────────> replies (postId)
      └──────────────────> notifications (postId)

chats ───────────────────> messages (chatId)
      └──────────────────> userChatSettings (chatId)
```

---

## 📋 QUERY PATTERNS

### Common Queries

```javascript
// Get user's posts
Query.equal("userId", userId);

// Get posts by department and stage
(Query.equal("department", department), Query.equal("stage", stage));

// Get chat messages
(Query.equal("chatId", chatId), Query.orderDesc("$createdAt"));

// Get unread notifications
(Query.equal("userId", userId), Query.equal("isRead", false));

// Search users by name
Query.search("name", searchTerm); // or
Query.contains("name", [searchTerm]);
```

### Pagination

```javascript
(Query.limit(20), Query.offset(page * 20));
```

### Sorting

```javascript
Query.orderDesc("$createdAt"); // Newest first
Query.orderAsc("$createdAt"); // Oldest first
Query.orderDesc("likeCount"); // Most popular
Query.orderDesc("upCount"); // Top replies
```

---

## ⚠️ IMPORTANT NOTES

1. **Arrays are stored as strings** - Use JSON.parse/stringify when needed
2. **Settings field** in chats is a JSON string - Parse before use
3. **Image URLs** - Posts use imgBB, messages can use imgBB or Appwrite storage
4. **Delete URLs** - Store imgBB delete URLs to allow image cleanup
5. **Counts must be maintained** - Update `likeCount`, `replyCount`, etc. when data changes
6. **Always validate IDs** - Check for valid string IDs before queries

---

## 🔧 COLLECTION IDS (Environment Variables)

```env
EXPO_PUBLIC_APPWRITE_PROJECT_ID=68fc77710039413087aa
EXPO_PUBLIC_APPWRITE_PROJECT_NAME="Collage Community"
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_DATABASE_ID=68fc78fd0030f049a781
EXPO_PUBLIC_APPWRITE_BUCKET_ID=68fc79a9003c8167318a
EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID=68ff7914000948dbd572
EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID=68ff7b8f000492463724
EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=chats
EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=messages
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=68fc7b42001bf7efbba3
EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID=69500c9c000bd955c984
EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID=69554fd5001d447c8c1c
EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID=pushtokens
```
