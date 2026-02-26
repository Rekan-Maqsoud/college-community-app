---
applyTo: "**"
---

# 📊 COLLEGE COMMUNITY - DATABASE SCHEMA

> **Auto-generated from live Appwrite API on 2026-02-26.**
> **CRITICAL**: This is the complete Appwrite database schema. Always reference this when working with database operations.

---

## 🗂️ COLLECTION OVERVIEW

| Collection              | Purpose                       | Config Key                       | Collection Permissions                                                   |
| ----------------------- | ----------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| **users**               | User profiles & account info  | `usersCollectionId`              | `create("users")`, `read("users")`, `update("users")`                    |
| **posts**               | Posts/questions in the feed   | `postsCollectionId`              | `create("users")`, `read("users")`, `update("users")`                    |
| **replies**             | Replies/answers to posts      | `repliesCollectionId`            | `create("users")`, `read("users")`, `update("users")`                    |
| **chats**               | Chat rooms (groups & private) | `chatsCollectionId`              | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **messages**            | Chat messages                 | `messagesCollectionId`           | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **notifications**       | User notifications            | `notificationsCollectionId`      | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **userChatSettings**    | Per-user chat preferences     | `userChatSettingsCollectionId`   | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **pushTokens**          | Expo push notification tokens | `pushTokensCollectionId`         | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **repElections**        | Representative elections      | `repElectionsCollectionId`       | `create("users")`, `read("users")`, `update("users")`                    |
| **repVotes**            | Election votes                | `repVotesCollectionId`           | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **Lecture Channels**    | Lecture content channels      | `lectureChannelsCollectionId`    | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **Lecture Memberships** | Channel membership records    | `lectureMembershipsCollectionId` | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **Lecture Assets**      | Uploaded lecture files/links  | `lectureAssetsCollectionId`      | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |
| **lectureComments**     | Comments on lecture assets    | `lectureCommentsCollectionId`    | `create("users")`, `read("users")`, `update("users")`, `delete("users")` |

> All collections have `documentSecurity: true` — both collection-level AND document-level permissions are checked.

---

## 👤 USERS COLLECTION

Stores user profile information and account data.

**Document Permissions**: `read("users")`, `update("users")`, `delete("user:OWNER")`

| Column Name          | Type     | Size   | Required | Default | Array | Notes                            |
| -------------------- | -------- | ------ | -------- | ------- | ----- | -------------------------------- |
| `$id`                | string   | -      | auto     | -       | -     | Document ID (same as `userID`)   |
| `userID`             | string   | 255    | ✓        | -       | -     | Appwrite Auth user ID            |
| `name`               | string   | 255    | ✓        | -       | -     | Display name                     |
| `email`              | string   | 320    | ✓        | -       | -     | User email                       |
| `bio`                | string   | 500    | -        | NULL    | -     | Profile bio                      |
| `profilePicture`     | string   | 255    | -        | NULL    | -     | Profile image URL                |
| `isEmailVerified`    | boolean  | -      | ✓        | -       | -     | Email verification status        |
| `university`         | string   | 255    | -        | NULL    | -     | University name                  |
| `major`              | string   | 255    | -        | NULL    | -     | Major/college name               |
| `department`         | string   | 255    | -        | NULL    | -     | Department name                  |
| `year`               | integer  | -      | -        | 1       | -     | Academic year/stage (1-6)        |
| `followersCount`     | integer  | -      | -        | 0       | -     | Number of followers              |
| `followingCount`     | integer  | -      | -        | 0       | -     | Number following                 |
| `postsCount`         | integer  | -      | -        | 0       | -     | Total posts created              |
| `following`          | string   | 999999 | -        | NULL    | ✓     | Array of user IDs being followed |
| `followers`          | string   | 999999 | -        | NULL    | ✓     | Array of follower user IDs       |
| `blockedUsers`       | string   | 999999 | -        | NULL    | ✓     | Array of blocked user IDs        |
| `gender`             | string   | 30     | -        | NULL    | -     | User gender                      |
| `isActive`           | boolean  | -      | -        | true    | -     | Account active status            |
| `isPrivateProfile`   | boolean  | -      | -        | false   | -     | Profile privacy setting          |
| `coverPhoto`         | string   | 500    | -        | NULL    | -     | Cover photo URL                  |
| `lastSeen`           | datetime | -      | -        | NULL    | -     | Last activity timestamp          |
| `lastAcademicUpdate` | datetime | -      | -        | NULL    | -     | Last academic info update        |
| `profileViews`       | string   | 10000  | -        | NULL    | -     | Profile view tracking            |
| `publicKey`          | string   | 2560   | -        | NULL    | -     | E2E encryption public key        |
| `bookmarkedPostIds`  | longtext | -      | -        | NULL    | ✓     | Array of bookmarked post IDs     |
| `$createdAt`         | datetime | -      | auto     | -       | -     | Creation timestamp               |
| `$updatedAt`         | datetime | -      | auto     | -       | -     | Last update timestamp            |

**Key Functions**: `getUserById()`, `updateUser()`, `followUser()`, `unfollowUser()`, `searchUsers()`, `blockUser()`

---

## 📝 POSTS COLLECTION

Stores all posts/questions in the feed.

**Document Permissions**: `read("users")`, `update("users")`, `delete("user:AUTHOR")`

| Column Name           | Type     | Size   | Required | Default | Array | Notes                             |
| --------------------- | -------- | ------ | -------- | ------- | ----- | --------------------------------- |
| `$id`                 | string   | -      | auto     | -       | -     | Document ID                       |
| `userId`              | string   | 500    | ✓        | -       | -     | Author user ID                    |
| `text`                | string   | 5000   | -        | NULL    | -     | Post content                      |
| `topic`               | string   | 255    | -        | NULL    | -     | Post title/topic                  |
| `department`          | string   | 255    | ✓        | -       | -     | Target department                 |
| `stage`               | string   | 255    | ✓        | -       | -     | Target stage (1-6 or "all")       |
| `postType`            | string   | 255    | ✓        | -       | -     | Type: question, note, resource... |
| `images`              | string   | 2000   | -        | NULL    | ✓     | Array of image URLs               |
| `imageDeleteUrls`     | string   | 2000   | -        | NULL    | ✓     | ImgBB delete URLs                 |
| `isResolved`          | boolean  | -      | -        | false   | -     | Question resolved status          |
| `viewCount`           | integer  | -      | -        | 0       | -     | Total views                       |
| `likeCount`           | integer  | -      | -        | 0       | -     | Total likes                       |
| `replyCount`          | integer  | -      | -        | 0       | -     | Total replies                     |
| `isEdited`            | boolean  | -      | -        | false   | -     | Edit status                       |
| `tags`                | string   | 2000   | -        | NULL    | ✓     | Hashtags array                    |
| `links`               | string   | 2000   | -        | NULL    | ✓     | Attached links                    |
| `likedBy`             | string   | 999999 | -        | NULL    | ✓     | Array of user IDs who liked       |
| `viewedBy`            | string   | 999999 | -        | NULL    | ✓     | Array of user IDs who viewed      |
| `isHiddenFromProfile` | boolean  | -      | -        | false   | -     | Hide from profile feed            |
| `semester`            | string   | 20     | -        | NULL    | -     | Academic semester                 |
| `canOthersRepost`     | boolean  | -      | -        | true    | -     | Allow reposts                     |
| `isRepost`            | boolean  | -      | -        | false   | -     | Is this a repost                  |
| `originalPostId`      | text     | -      | -        | NULL    | -     | Original post ID (repost)         |
| `originalPostOwnerId` | text     | -      | -        | NULL    | -     | Original post owner (repost)      |
| `originalPostTopic`   | text     | -      | -        | NULL    | -     | Original topic (repost)           |
| `originalPostPreview` | text     | -      | -        | NULL    | -     | Original preview (repost)         |
| `$createdAt`          | datetime | -      | auto     | -       | -     | Creation timestamp                |
| `$updatedAt`          | datetime | -      | auto     | -       | -     | Last update timestamp             |

**Post Types**: `question`, `note`, `resource`, `discussion`, `announcement`

**Key Functions**: `createPost()`, `getPost()`, `getPosts()`, `togglePostLike()`, `markQuestionAsResolved()`

---

## 💬 REPLIES COLLECTION

Stores replies/answers to posts.

**Document Permissions**: `read("users")`, `update("users")`, `delete("user:AUTHOR")`

**Indexes**: `userId` (key, asc), `$createdAt` (key, asc)

| Column Name       | Type     | Size  | Required | Default | Array | Notes                           |
| ----------------- | -------- | ----- | -------- | ------- | ----- | ------------------------------- |
| `$id`             | string   | -     | auto     | -       | -     | Document ID                     |
| `postId`          | string   | 128   | ✓        | -       | -     | Parent post ID                  |
| `userId`          | string   | 128   | ✓        | -       | -     | Author user ID                  |
| `text`            | string   | 500   | ✓        | -       | -     | Reply content                   |
| `isAccepted`      | boolean  | -     | -        | NULL    | -     | Accepted answer status          |
| `images`          | string   | 2000  | -        | NULL    | ✓     | Array of image URLs             |
| `imageDeleteUrls` | string   | 2000  | -        | NULL    | ✓     | ImgBB delete URLs               |
| `likeCount`       | integer  | -     | -        | 0       | -     | Like count                      |
| `isEdited`        | boolean  | -     | -        | false   | -     | Edit status                     |
| `parentReplyId`   | string   | 255   | -        | NULL    | -     | Parent reply for nested replies |
| `upCount`         | integer  | -     | -        | 0       | -     | Upvote count                    |
| `downCount`       | integer  | -     | -        | 0       | -     | Downvote count                  |
| `upvotedBy`       | string   | 50000 | -        | NULL    | ✓     | Users who upvoted               |
| `downvotedBy`     | string   | 50000 | -        | NULL    | ✓     | Users who downvoted             |
| `links`           | string   | 2000  | -        | NULL    | ✓     | Attached links                  |
| `$createdAt`      | datetime | -     | auto     | -       | -     | Creation timestamp              |
| `$updatedAt`      | datetime | -     | auto     | -       | -     | Last update timestamp           |

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
| `lastMessageSenderId`    | string   | 255    | -        | NULL    | -       | Last message sender ID          |
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

**Document Permissions**: `read("user:OWNER")`, `update("user:OWNER")`, `delete("user:OWNER")`

| Column Name        | Type     | Size  | Required | Default | Array | Notes                    |
| ------------------ | -------- | ----- | -------- | ------- | ----- | ------------------------ |
| `$id`              | string   | -     | auto     | -       | -     | Document ID              |
| `userId`           | string   | 255   | ✓        | -       | -     | User ID                  |
| `chatId`           | string   | 255   | ✓        | -       | -     | Chat ID                  |
| `isMuted`          | boolean  | -     | -        | false   | -     | Mute status              |
| `muteExpiresAt`    | datetime | -     | -        | NULL    | -     | When mute expires        |
| `muteType`         | string   | 50    | -        | none    | -     | none, all, mentions_only |
| `bookmarkedMsgs`   | string   | 5000  | -        | NULL    | ✓     | Bookmarked message IDs   |
| `notifyOnMention`  | boolean  | -     | -        | true    | -     | Notify on @mention       |
| `notifyOnAll`      | boolean  | -     | -        | true    | -     | Notify on all messages   |
| `clearedAt`        | datetime | -     | -        | NULL    | -     | Chat cleared timestamp   |
| `hiddenMessageIds` | string   | 99999 | -        | NULL    | ✓     | Hidden message IDs       |
| `reactionDefaults` | text     | -     | -        | NULL    | -     | Default reactions JSON   |
| `isArchived`       | boolean  | -     | -        | false   | -     | Chat archived status     |
| `archivedAt`       | datetime | -     | -        | NULL    | -     | When archived            |
| `$createdAt`       | datetime | -     | auto     | -       | -     | Creation timestamp       |
| `$updatedAt`       | datetime | -     | auto     | -       | -     | Last update timestamp    |

**Key Functions**: `getUserChatSettings()`, `updateUserChatSettings()`, `muteChat()`, `unmuteChat()`

---

## 📱 PUSH TOKENS COLLECTION

Stores Expo push notification tokens.

**Document Permissions**: `read("user:OWNER")`, `update("user:OWNER")`, `delete("user:OWNER")`

**Indexes**: `userId` (key, ASC)

| Column Name  | Type     | Size | Required | Default | Array | Notes                 |
| ------------ | -------- | ---- | -------- | ------- | ----- | --------------------- |
| `$id`        | string   | -    | auto     | -       | -     | Document ID           |
| `userId`     | string   | 36   | ✓        | -       | -     | User ID               |
| `token`      | string   | 255  | ✓        | -       | -     | Expo push token       |
| `platform`   | string   | 10   | -        | NULL    | -     | ios or android        |
| `$createdAt` | datetime | -    | auto     | -       | -     | Creation timestamp    |
| `$updatedAt` | datetime | -    | auto     | -       | -     | Last update timestamp |

**Key Functions**: `savePushToken()`, `removePushToken()`, `getPushTokensForUser()`

---

## 🗳️ REP ELECTIONS COLLECTION

Manages representative election lifecycle.

**Document Permissions**: `read("users")`, `update("users")`

**Indexes**: `seatNumber` (key, asc)

| Column Name            | Type     | Size | Required | Default | Array | Notes                                              |
| ---------------------- | -------- | ---- | -------- | ------- | ----- | -------------------------------------------------- |
| `$id`                  | string   | -    | auto     | -       | -     | Document ID                                        |
| `department`           | text     | -    | ✓        | -       | -     | Department key                                     |
| `stage`                | text     | -    | ✓        | -       | -     | Stage key (firstYear, secondYear, etc.)            |
| `status`               | text     | -    | ✓        | -       | -     | active, completed, reselection_pending, tiebreaker |
| `seatNumber`           | integer  | -    | -        | 1       | -     | Which rep seat (1, 2, or 3)                        |
| `winner`               | text     | -    | -        | NULL    | -     | Winner user ID                                     |
| `totalStudents`        | integer  | -    | -        | 0       | -     | Snapshot of class size                             |
| `reselectionVoters`    | text     | -    | -        | NULL    | ✓     | Users who requested reselection                    |
| `reselectionThreshold` | integer  | -    | -        | 0       | -     | Half of totalStudents (cached)                     |
| `startedAt`            | datetime | -    | -        | NULL    | -     | When election started                              |
| `endedAt`              | datetime | -    | -        | NULL    | -     | When election was finalized                        |
| `$createdAt`           | datetime | -    | auto     | -       | -     | Creation timestamp                                 |
| `$updatedAt`           | datetime | -    | auto     | -       | -     | Last update timestamp                              |

**Election Statuses**: `active`, `completed`, `reselection_pending`, `tiebreaker`

**Key Functions**: `createElection()`, `getActiveElection()`, `finalizeElection()`, `requestReselection()`, `handleElectionTimerExpiry()`

---

## 🗳️ REP VOTES COLLECTION

Stores individual votes in elections.

**Document Permissions**: `read("users")`, `update("user:VOTER")`, `delete("user:VOTER")`

| Column Name   | Type     | Size | Required | Default | Array | Notes                         |
| ------------- | -------- | ---- | -------- | ------- | ----- | ----------------------------- |
| `$id`         | string   | -    | auto     | -       | -     | Document ID                   |
| `electionId`  | text     | -    | ✓        | -       | -     | Reference to repElections doc |
| `department`  | text     | -    | ✓        | -       | -     | Department key (for queries)  |
| `stage`       | text     | -    | ✓        | -       | -     | Stage key (for queries)       |
| `voterId`     | text     | -    | ✓        | -       | -     | User who cast the vote        |
| `candidateId` | text     | -    | ✓        | -       | -     | User being voted for          |
| `$createdAt`  | datetime | -    | auto     | -       | -     | Creation timestamp            |
| `$updatedAt`  | datetime | -    | auto     | -       | -     | Last update timestamp         |

**Key Functions**: `castVote()`, `removeVote()`, `getElectionResults()`, `getMyVote()`

---

## 📚 LECTURE CHANNELS COLLECTION

Stores lecture content channels.

**Indexes**: `name` (key, asc), `channelType` (key, asc), `ownerId` (key, asc)

| Column Name              | Type     | Size | Required | Default | Array | Notes                  |
| ------------------------ | -------- | ---- | -------- | ------- | ----- | ---------------------- |
| `$id`                    | string   | -    | auto     | -       | -     | Document ID            |
| `name`                   | string   | 255  | ✓        | -       | -     | Channel name           |
| `description`            | string   | 2000 | -        | NULL    | -     | Channel description    |
| `channelType`            | string   | -    | ✓        | -       | -     | Channel type           |
| `accessType`             | string   | -    | ✓        | -       | -     | Access type            |
| `ownerId`                | string   | 255  | ✓        | -       | -     | Channel owner user ID  |
| `managerIds`             | string   | 255  | -        | NULL    | -     | Manager user IDs       |
| `linkedChatId`           | string   | 255  | -        | NULL    | -     | Linked chat room ID    |
| `isActive`               | boolean  | -    | ✓        | -       | -     | Active status          |
| `membersCount`           | integer  | -    | -        | NULL    | -     | Member count           |
| `pendingCount`           | integer  | -    | -        | NULL    | -     | Pending requests count |
| `notificationsDefaultOn` | boolean  | -    | -        | true    | -     | Default notif setting  |
| `settingsJson`           | string   | 5000 | -        | NULL    | -     | JSON settings          |
| `tags`                   | longtext | -    | -        | NULL    | ✓     | Channel tags           |
| `coverImageUrl`          | longtext | -    | -        | NULL    | -     | Cover image URL        |
| `$createdAt`             | datetime | -    | auto     | -       | -     | Creation timestamp     |
| `$updatedAt`             | datetime | -    | auto     | -       | -     | Last update timestamp  |

---

## 📚 LECTURE MEMBERSHIPS COLLECTION

Stores channel membership records.

| Column Name            | Type     | Size | Required | Default | Array | Notes                 |
| ---------------------- | -------- | ---- | -------- | ------- | ----- | --------------------- |
| `$id`                  | string   | -    | auto     | -       | -     | Document ID           |
| `channelId`            | string   | 255  | ✓        | -       | -     | Channel ID            |
| `userId`               | string   | 255  | ✓        | -       | -     | User ID               |
| `joinStatus`           | string   | -    | ✓        | -       | -     | Join status           |
| `role`                 | string   | -    | ✓        | -       | -     | Member role           |
| `requestedAt`          | datetime | -    | ✓        | -       | -     | Request timestamp     |
| `approvedAt`           | datetime | -    | -        | NULL    | -     | Approval timestamp    |
| `notificationsEnabled` | boolean  | -    | -        | true    | -     | Notification setting  |
| `settingsJson`         | longtext | -    | -        | NULL    | -     | Member settings JSON  |
| `pinnedChannelsJson`   | longtext | -    | -        | NULL    | -     | Pinned channels JSON  |
| `$createdAt`           | datetime | -    | auto     | -       | -     | Creation timestamp    |
| `$updatedAt`           | datetime | -    | auto     | -       | -     | Last update timestamp |

---

## 📚 LECTURE ASSETS COLLECTION

Stores uploaded lecture files and links.

**Indexes**: `channelId` (key, asc), `uploadType` (key, asc)

| Column Name      | Type     | Size | Required | Default | Array | Notes                 |
| ---------------- | -------- | ---- | -------- | ------- | ----- | --------------------- |
| `$id`            | string   | -    | auto     | -       | -     | Document ID           |
| `channelId`      | string   | 255  | ✓        | -       | -     | Parent channel ID     |
| `title`          | string   | 255  | ✓        | -       | -     | Asset title           |
| `description`    | string   | 3000 | -        | NULL    | -     | Asset description     |
| `uploadType`     | string   | -    | ✓        | -       | -     | Upload type           |
| `uploaderId`     | string   | 255  | ✓        | -       | -     | Uploader user ID      |
| `youtubeUrl`     | string   | 2000 | -        | NULL    | -     | YouTube URL           |
| `externalUrl`    | string   | 2000 | -        | NULL    | -     | External URL          |
| `fileUrl`        | string   | 2000 | -        | NULL    | -     | File URL              |
| `fileId`         | string   | 255  | -        | NULL    | -     | Appwrite file ID      |
| `fileName`       | string   | 255  | -        | NULL    | -     | Original filename     |
| `fileSize`       | integer  | -    | -        | NULL    | -     | File size in bytes    |
| `mimeType`       | string   | 255  | -        | NULL    | -     | MIME type             |
| `isPinned`       | boolean  | -    | -        | false   | -     | Pinned status         |
| `tags`           | longtext | -    | -        | NULL    | ✓     | Asset tags            |
| `isActive`       | boolean  | -    | -        | true    | -     | Active status         |
| `viewsCount`     | integer  | -    | -        | 0       | -     | Total views           |
| `opensCount`     | integer  | -    | -        | 0       | -     | Total opens           |
| `downloadsCount` | integer  | -    | -        | 0       | -     | Total downloads       |
| `viewedBy`       | text     | -    | -        | NULL    | ✓     | Users who viewed      |
| `openedBy`       | text     | -    | -        | NULL    | ✓     | Users who opened      |
| `downloadedBy`   | text     | -    | -        | NULL    | ✓     | Users who downloaded  |
| `$createdAt`     | datetime | -    | auto     | -       | -     | Creation timestamp    |
| `$updatedAt`     | datetime | -    | auto     | -       | -     | Last update timestamp |

---

## 📚 LECTURE COMMENTS COLLECTION

Stores comments on lecture assets.

| Column Name       | Type     | Size | Required | Default | Array | Notes                  |
| ----------------- | -------- | ---- | -------- | ------- | ----- | ---------------------- |
| `$id`             | string   | -    | auto     | -       | -     | Document ID            |
| `commentId`       | string   | 640  | -        | NULL    | -     | Comment identifier     |
| `channelId`       | string   | 640  | -        | NULL    | -     | Parent channel ID      |
| `assetId`         | string   | 640  | -        | NULL    | -     | Parent asset ID        |
| `userId`          | string   | 640  | -        | NULL    | -     | Author user ID         |
| `text`            | string   | 3000 | -        | NULL    | -     | Comment text           |
| `parentCommentId` | string   | 640  | -        | NULL    | -     | Parent comment (reply) |
| `mentions`        | string   | -    | -        | NULL    | -     | Mentioned users        |
| `$createdAt`      | datetime | -    | auto     | -       | -     | Creation timestamp     |
| `$updatedAt`      | datetime | -    | auto     | -       | -     | Last update timestamp  |

---

## 🔗 RELATIONSHIPS

```
users ─┬─────────────────> posts (userId)
       ├─────────────────> replies (userId)
       ├─────────────────> notifications (userId, senderId)
       ├─────────────────> chats.participants[]
       ├─────────────────> messages (senderId)
       ├─────────────────> userChatSettings (userId)
       ├─────────────────> pushTokens (userId)
       ├─────────────────> repVotes (voterId, candidateId)
       ├─────────────────> repElections (winner)
       └─────────────────> lectureMemberships (userId)

posts ───────────────────> replies (postId)
      └──────────────────> notifications (postId)

chats ───────────────────> messages (chatId)
      └──────────────────> userChatSettings (chatId)

repElections ────────────> repVotes (electionId)

lectureChannels ─────────> lectureAssets (channelId)
                └────────> lectureMemberships (channelId)
                └────────> lectureComments (channelId)

lectureAssets ───────────> lectureComments (assetId)
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
Query.search("name", searchTerm);
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

## 🔒 PERMISSIONS MODEL

### Collection-Level Permissions

All collections have **documentSecurity: true**. Collection-level permissions define the maximum allowed operations. Document-level permissions further restrict per-row access.

### Document-Level Permission Patterns

| Collection       | Read                 | Update                 | Delete                  |
| ---------------- | -------------------- | ---------------------- | ----------------------- |
| users            | `read("users")`      | `update("users")`      | `delete("user:OWNER")`  |
| posts            | `read("users")`      | `update("users")`      | `delete("user:AUTHOR")` |
| replies          | `read("users")`      | `update("users")`      | `delete("user:AUTHOR")` |
| chats            | per-participant      | per-participant        | per-participant         |
| messages         | per-participant      | per-participant        | per-participant         |
| notifications    | `read("user:RECIP")` | `update("user:RECIP")` | `delete("user:RECIP")`  |
| userChatSettings | `read("user:OWNER")` | `update("user:OWNER")` | `delete("user:OWNER")`  |
| pushTokens       | `read("user:OWNER")` | `update("user:OWNER")` | `delete("user:OWNER")`  |
| repElections     | `read("users")`      | `update("users")`      | —                       |
| repVotes         | `read("users")`      | `update("user:VOTER")` | `delete("user:VOTER")`  |

> **Why users has `update("users")`**: Follow/unfollow and block operations update the target user's `followers[]` and `blockedUsers[]` arrays. Any authenticated user must be able to update any user document.

---

## ⚠️ IMPORTANT NOTES

1. **Arrays are stored as string arrays** — Appwrite handles JSON serialization
2. **Settings field** in chats is a JSON string — Parse before use
3. **Image URLs** — Posts use imgBB, messages can use imgBB or Appwrite storage
4. **Delete URLs** — Store imgBB delete URLs to allow image cleanup
5. **Counts must be maintained** — Update `likeCount`, `replyCount`, etc. when data changes
6. **Always validate IDs** — Check for valid string IDs before queries
7. **`update("users")` on users/posts/replies** — Required so any authenticated user can like, follow, vote, etc.
8. **Rep Elections timer** — Active elections auto-finalize after 24h; tiebreakers after 1h

---

## 🔧 COLLECTION IDS (Environment Variables)

```env
EXPO_PUBLIC_APPWRITE_PROJECT_ID=6973c51d0000bdd71f7a
EXPO_PUBLIC_APPWRITE_PROJECT_NAME="Collage Community"
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_DATABASE_ID=68fc78fd0030f049a781
EXPO_PUBLIC_APPWRITE_BUCKET_ID=68fc79a9003c8167318a
EXPO_PUBLIC_APPWRITE_STORAGE_ID=6983a02b001adc87b213
EXPO_PUBLIC_APPWRITE_POSTS_COLLECTION_ID=68ff7914000948dbd572
EXPO_PUBLIC_APPWRITE_REPLIES_COLLECTION_ID=68ff7b8f000492463724
EXPO_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=chats
EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=messages
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=68fc7b42001bf7efbba3
EXPO_PUBLIC_APPWRITE_USER_CHAT_SETTINGS_COLLECTION_ID=69500c9c000bd955c984
EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID=69554fd5001d447c8c1c
EXPO_PUBLIC_APPWRITE_PUSH_TOKENS_COLLECTION_ID=pushtokens
EXPO_PUBLIC_APPWRITE_LECTURE_STORAGE_ID=69972f75001c64d4bea4
EXPO_PUBLIC_APPWRITE_LECTURE_CHANNELS_COLLECTION_ID=699733ee001cbf86e7a4
EXPO_PUBLIC_APPWRITE_LECTURE_MEMBERSHIPS_COLLECTION_ID=699734170003f998b862
EXPO_PUBLIC_APPWRITE_LECTURE_ASSETS_COLLECTION_ID=6997342b0012ee32448b
EXPO_PUBLIC_APPWRITE_LECTURE_COMMENTS_COLLECTION_ID=69973f680024de7fd9fe
EXPO_PUBLIC_APPWRITE_VOICE_MESSAGES_STORAGE_ID=698f206500249f16a72b
EXPO_PUBLIC_APPWRITE_REP_ELECTIONS_COLLECTION_ID=6999f9de00313552a9c9
EXPO_PUBLIC_APPWRITE_REP_VOTES_COLLECTION_ID=6999fed2001ac021d056
```
